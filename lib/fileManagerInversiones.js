import sql from './db.js';
import { limpiarEntrada } from './security.js';
import { fechaHoyColombia, horaActualColombia } from './fechaColombia.js';
import { tallasPara } from './inventarioConstants.js';

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
// Todo se ejecuta en una sola transacción atómica: si algo falla, no se persiste nada.
export async function crearInversion(datos, sesion) {
  await ensureSchemaInversion();

  const nombreBase  = limpiarEntrada(datos.nombre || '').toUpperCase();
  const tipo        = datos.tipo;
  const subTipo     = datos.subTipo || null;
  const valorCompra = parseFloat(datos.valorCompra);
  const valorVenta  = parseFloat(datos.valorVenta);

  if (!nombreBase) return { error: 'El nombre del producto es obligatorio.' };

  // Construir las variantes (una por talla con cantidad > 0, o una sola para productos generales).
  let variantes;
  if (tipo === 'ROPA' || tipo === 'CALZADO') {
    variantes = tallasPara(tipo, subTipo)
      .map(talla => ({ talla, cantidad: parseInt(datos.tallas?.[talla]) || 0 }))
      .filter(v => v.cantidad > 0)
      .map(v => ({ nombre: `${nombreBase} TALLA ${v.talla}`, cantidad: v.cantidad, talla: v.talla }));
  } else {
    variantes = [{ nombre: nombreBase, cantidad: Math.max(0, parseInt(datos.cantidad) || 0), talla: null }];
  }

  if (!variantes.length || variantes.every(v => v.cantidad <= 0)) {
    return { error: 'No hay productos para registrar.' };
  }

  const totalUnidades  = variantes.reduce((s, v) => s + v.cantidad, 0);
  const totalInvertido = Math.round(totalUnidades * valorCompra * 100) / 100;

  // Lecturas previas (fuera de la transacción): ¿el producto ya existe?
  for (const v of variantes) {
    const nombreNorm = v.nombre.toLowerCase().replace(/\s+/g, ' ');
    const existentes = await sql`SELECT * FROM productos WHERE LOWER(REGEXP_REPLACE(nombre, '\\s+', ' ', 'g')) = ${nombreNorm}`;
    v.existente = existentes.length ? existentes[0] : null;
  }

  const nuevos = variantes.filter(v => !v.existente);
  if (nuevos.length) {
    const maxProductos = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM productos`;
    let nextId = maxProductos[0].max;
    for (const v of nuevos) { nextId += 1; v.nuevoId = nextId; }
  }

  const maxGastos      = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM gastos`;
  const gastoId        = maxGastos[0].max + 1;
  const maxInversiones = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM inversiones`;
  const inversionId    = maxInversiones[0].max + 1;

  const fecha = fechaHoyColombia();
  const hora  = horaActualColombia();

  const queries = [];
  const productosDetalle = [];

  for (const v of variantes) {
    if (v.existente) {
      const p = v.existente;
      const cantidadAnterior      = p.cantidad;
      const nuevaCantidad         = cantidadAnterior + v.cantidad;
      const precioCompraAnterior  = p.precio_compra != null ? parseFloat(p.precio_compra) : 0;
      const nuevoPrecioCompra     = precioCompraAnterior > 0
        ? Math.round(((precioCompraAnterior * cantidadAnterior) + (valorCompra * v.cantidad)) / nuevaCantidad * 100) / 100
        : valorCompra;

      queries.push(sql`
        UPDATE productos SET
          cantidad = ${nuevaCantidad},
          precio = ${valorVenta},
          precio_compra = ${nuevoPrecioCompra},
          tipo = ${tipo},
          sub_tipo = ${subTipo}
        WHERE id = ${p.id}
      `);

      productosDetalle.push({
        codigo: p.codigo, nombre: p.nombre, talla: v.talla, esNuevo: false,
        cantidadAportada: v.cantidad, cantidadTotal: nuevaCantidad,
      });
    } else {
      const codigo = generarCodigoProducto(v.nuevoId);
      queries.push(sql`
        INSERT INTO productos (id, codigo, nombre, precio, cantidad, fecha_registro, estado, precio_compra, tipo, sub_tipo)
        VALUES (${v.nuevoId}, ${codigo}, ${v.nombre}, ${valorVenta}, ${v.cantidad}, ${fecha}, 'ACTIVO', ${valorCompra}, ${tipo}, ${subTipo})
      `);

      productosDetalle.push({
        codigo, nombre: v.nombre, talla: v.talla, esNuevo: true,
        cantidadAportada: v.cantidad, cantidadTotal: v.cantidad,
      });
    }
  }

  const gastoCodigo = generarCodigoGasto(gastoId);
  const resumen = variantes[0].talla
    ? variantes.map(v => `${v.talla}: ${v.cantidad}`).join(', ')
    : `${totalUnidades} unidad${totalUnidades > 1 ? 'es' : ''}`;
  const descripcionGasto = `Compra de mercancía — ${nombreBase} (${resumen})`;

  queries.push(sql`
    INSERT INTO gastos (id, codigo, nombre, valor, fecha, categoria, descripcion, estado, metodo_pago, medio_pago, valor_efectivo, valor_transferencia)
    VALUES (${gastoId}, ${gastoCodigo}, ${'Inversión: ' + nombreBase}, ${totalInvertido}, ${fecha}, 'INVERSION',
            ${descripcionGasto}, 'ACTIVO', ${datos.metodoPago}, ${datos.medioPago}, ${datos.valorEfectivo}, ${datos.valorTransferencia})
  `);

  const inversionCodigo = generarCodigoInversion(inversionId);
  const detalle = {
    tallas: variantes[0].talla ? Object.fromEntries(variantes.map(v => [v.talla, v.cantidad])) : null,
    cantidad: variantes[0].talla ? null : totalUnidades,
    productos: productosDetalle,
  };

  queries.push(sql`
    INSERT INTO inversiones (
      id, codigo, fecha, hora, usuario_id, usuario_nombre, nombre_base, tipo, sub_tipo,
      valor_compra, valor_venta, total_unidades, total_invertido, detalle,
      metodo_pago, medio_pago, valor_efectivo, valor_transferencia, gasto_id
    ) VALUES (
      ${inversionId}, ${inversionCodigo}, ${fecha}, ${hora}, ${sesion.id}, ${sesion.nombreCompleto}, ${nombreBase}, ${tipo}, ${subTipo},
      ${valorCompra}, ${valorVenta}, ${totalUnidades}, ${totalInvertido}, ${JSON.stringify(detalle)}::jsonb,
      ${datos.metodoPago}, ${datos.medioPago}, ${datos.valorEfectivo}, ${datos.valorTransferencia}, ${gastoId}
    )
  `);

  try {
    await sql.transaction(queries);
  } catch (err) {
    console.error('[crearInversion]', err);
    return { error: 'No se pudo registrar la inversión. No se realizaron cambios.' };
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
