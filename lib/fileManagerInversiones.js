import sql from './db.js';
import { limpiarEntrada } from './security.js';
import { fechaHoyColombia, horaActualColombia } from './fechaColombia.js';
import { tallasPara } from './inventarioConstants.js';
import { agregarProductoConVariantes, listarVariantes } from './fileManagerProductos.js';

// Auto-migración idempotente: agrega las columnas/tabla necesarias para Inversiones si la BD aún no las tiene.
let schemaInversionReady = null;
function ensureSchemaInversion() {
  if (!schemaInversionReady) {
    schemaInversionReady = (async () => {
      await sql`
        ALTER TABLE productos
          ADD COLUMN IF NOT EXISTS precio_compra NUMERIC(12,2),
          ADD COLUMN IF NOT EXISTS tipo TEXT,
          ADD COLUMN IF NOT EXISTS sub_tipo TEXT
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS inversiones (
          id                  INTEGER PRIMARY KEY,
          codigo              TEXT UNIQUE NOT NULL,
          fecha               TEXT NOT NULL,
          hora                TEXT NOT NULL,
          usuario_id          INTEGER NOT NULL,
          usuario_nombre      TEXT NOT NULL,
          nombre_base         TEXT NOT NULL,
          tipo                TEXT NOT NULL,
          sub_tipo            TEXT,
          valor_compra        NUMERIC(12,2) NOT NULL,
          valor_venta         NUMERIC(12,2) NOT NULL,
          total_unidades      INTEGER NOT NULL,
          total_invertido     NUMERIC(12,2) NOT NULL,
          detalle             JSONB NOT NULL,
          metodo_pago         TEXT NOT NULL DEFAULT 'EFECTIVO',
          medio_pago          TEXT,
          valor_efectivo      NUMERIC(12,2),
          valor_transferencia NUMERIC(12,2),
          gasto_id            INTEGER
        )
      `;
    })().catch(err => { schemaInversionReady = null; throw err; });
  }
  return schemaInversionReady;
}

function generarCodigoProducto(id)  { return `PROD-${String(id).padStart(4, '0')}`; }
function generarCodigoGasto(id)     { return `GST-${String(id).padStart(4, '0')}`; }
function generarCodigoInversion(id) { return `INV-${String(id).padStart(4, '0')}`; }

// Registra una inversión (compra de mercancía): crea/actualiza producto(s) en inventario,
// registra el gasto correspondiente (categoría INVERSION) y guarda el historial detallado.
// Para ROPA/CALZADO, el producto se crea/actualiza como UN solo artículo con variantes por
// talla (igual que el formulario de Inventario) en lugar de un producto por talla.
export async function crearInversion(datos, sesion) {
  await ensureSchemaInversion();

  const nombreBase  = limpiarEntrada(datos.nombre || '').toUpperCase();
  const tipo        = datos.tipo;
  const subTipo     = datos.subTipo || null;
  const valorCompra = parseFloat(datos.valorCompra);
  const valorVenta  = parseFloat(datos.valorVenta);

  if (!nombreBase) return { error: 'El nombre del producto es obligatorio.' };

  const fecha = fechaHoyColombia();
  const hora  = horaActualColombia();

  let totalUnidades;
  let productosDetalle;
  let tallasDetalle = null;
  let cantidadDetalle = null;

  if (tipo === 'ROPA' || tipo === 'CALZADO') {
    const tallasConCantidad = tallasPara(tipo, subTipo)
      .map(talla => ({ talla, cantidad: parseInt(datos.tallas?.[talla]) || 0 }))
      .filter(v => v.cantidad > 0);

    if (!tallasConCantidad.length) return { error: 'No hay productos para registrar.' };

    totalUnidades = tallasConCantidad.reduce((s, v) => s + v.cantidad, 0);

    const res = await agregarProductoConVariantes({
      nombre: nombreBase,
      precio: valorVenta,
      estado: 'ACTIVO',
      tipo, subTipo,
      variantes: tallasConCantidad.map(v => ({ talla: v.talla, cantidad: v.cantidad, precioCompra: valorCompra })),
    });
    if (res.error) return res;

    const variantesActuales = await listarVariantes(res.id);
    const cantidadPorTalla  = new Map(variantesActuales.map(v => [v.talla, v.cantidad]));
    const codigo = res.codigo || generarCodigoProducto(res.id);

    productosDetalle = tallasConCantidad.map(v => ({
      codigo, nombre: nombreBase, talla: v.talla, esNuevo: !res.acumulado,
      cantidadAportada: v.cantidad, cantidadTotal: cantidadPorTalla.get(v.talla) ?? v.cantidad,
    }));
    tallasDetalle = Object.fromEntries(tallasConCantidad.map(v => [v.talla, v.cantidad]));
  } else {
    const cantidad = Math.max(0, parseInt(datos.cantidad) || 0);
    if (cantidad <= 0) return { error: 'No hay productos para registrar.' };
    totalUnidades = cantidad;

    const nombreNorm = nombreBase.toLowerCase().replace(/\s+/g, ' ');
    const existentes = await sql`SELECT * FROM productos WHERE LOWER(REGEXP_REPLACE(nombre, '\\s+', ' ', 'g')) = ${nombreNorm} AND estado <> 'FUSIONADO'`;

    let codigo, esNuevo, cantidadTotal;
    if (existentes.length) {
      const p = existentes[0];
      const cantidadAnterior     = p.cantidad;
      const nuevaCantidad        = cantidadAnterior + cantidad;
      const precioCompraAnterior = p.precio_compra != null ? parseFloat(p.precio_compra) : 0;
      const nuevoPrecioCompra    = precioCompraAnterior > 0
        ? Math.round(((precioCompraAnterior * cantidadAnterior) + (valorCompra * cantidad)) / nuevaCantidad * 100) / 100
        : valorCompra;

      await sql`
        UPDATE productos SET
          cantidad = ${nuevaCantidad}, precio = ${valorVenta}, precio_compra = ${nuevoPrecioCompra},
          tipo = ${tipo}, sub_tipo = ${subTipo}
        WHERE id = ${p.id}
      `;
      codigo = p.codigo; esNuevo = false; cantidadTotal = nuevaCantidad;
    } else {
      const maxProductos = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM productos`;
      const nuevoId = maxProductos[0].max + 1;
      codigo = generarCodigoProducto(nuevoId);
      await sql`
        INSERT INTO productos (id, codigo, nombre, precio, cantidad, fecha_registro, estado, precio_compra, tipo, sub_tipo)
        VALUES (${nuevoId}, ${codigo}, ${nombreBase}, ${valorVenta}, ${cantidad}, ${fecha}, 'ACTIVO', ${valorCompra}, ${tipo}, ${subTipo})
      `;
      esNuevo = true; cantidadTotal = cantidad;
    }

    productosDetalle = [{ codigo, nombre: nombreBase, talla: null, esNuevo, cantidadAportada: cantidad, cantidadTotal }];
    cantidadDetalle = totalUnidades;
  }

  const totalInvertido = Math.round(totalUnidades * valorCompra * 100) / 100;

  const maxGastos      = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM gastos`;
  const gastoId        = maxGastos[0].max + 1;
  const maxInversiones = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM inversiones`;
  const inversionId    = maxInversiones[0].max + 1;

  const gastoCodigo = generarCodigoGasto(gastoId);
  const resumen = tallasDetalle
    ? Object.entries(tallasDetalle).map(([t, c]) => `${t}: ${c}`).join(', ')
    : `${totalUnidades} unidad${totalUnidades > 1 ? 'es' : ''}`;
  const descripcionGasto = `Compra de mercancía — ${nombreBase} (${resumen})`;

  const inversionCodigo = generarCodigoInversion(inversionId);
  const detalle = { tallas: tallasDetalle, cantidad: cantidadDetalle, productos: productosDetalle };

  try {
    await sql.transaction([
      sql`
        INSERT INTO gastos (id, codigo, nombre, valor, fecha, categoria, descripcion, estado, metodo_pago, medio_pago, valor_efectivo, valor_transferencia)
        VALUES (${gastoId}, ${gastoCodigo}, ${'Inversión: ' + nombreBase}, ${totalInvertido}, ${fecha}, 'INVERSION',
                ${descripcionGasto}, 'ACTIVO', ${datos.metodoPago}, ${datos.medioPago}, ${datos.valorEfectivo}, ${datos.valorTransferencia})
      `,
      sql`
        INSERT INTO inversiones (
          id, codigo, fecha, hora, usuario_id, usuario_nombre, nombre_base, tipo, sub_tipo,
          valor_compra, valor_venta, total_unidades, total_invertido, detalle,
          metodo_pago, medio_pago, valor_efectivo, valor_transferencia, gasto_id
        ) VALUES (
          ${inversionId}, ${inversionCodigo}, ${fecha}, ${hora}, ${sesion.id}, ${sesion.nombreCompleto}, ${nombreBase}, ${tipo}, ${subTipo},
          ${valorCompra}, ${valorVenta}, ${totalUnidades}, ${totalInvertido}, ${JSON.stringify(detalle)}::jsonb,
          ${datos.metodoPago}, ${datos.medioPago}, ${datos.valorEfectivo}, ${datos.valorTransferencia}, ${gastoId}
        )
      `,
    ]);
  } catch (err) {
    console.error('[crearInversion]', err);
    return { error: 'El producto se registró en inventario, pero no se pudo guardar el gasto/inversión asociado.' };
  }

  return {
    ok: true,
    codigo: inversionCodigo,
    gastoCodigo,
    totalInvertido,
    totalUnidades,
    productos: productosDetalle,
  };
}
