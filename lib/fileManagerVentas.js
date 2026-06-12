import sql from './db.js';
import { descontarStock, agregarStock } from './fileManagerProductos.js';
import { fechaHoyColombia, horaActualColombia, fechaHaceDiasColombia } from './fechaColombia.js';

// Auto-migración idempotente: agrega la columna valor_addi si la BD aún no la tiene.
let schemaAddiReady = null;
function ensureSchemaAddi() {
  if (!schemaAddiReady) {
    schemaAddiReady = sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS valor_addi NUMERIC(12,2) NOT NULL DEFAULT 0`
      .catch(err => { schemaAddiReady = null; throw err; });
  }
  return schemaAddiReady;
}

// Auto-migración idempotente: agrega las columnas de costo adicional si la BD aún no las tiene.
let schemaCostoAdicionalReady = null;
function ensureSchemaCostoAdicional() {
  if (!schemaCostoAdicionalReady) {
    schemaCostoAdicionalReady = sql`
      ALTER TABLE ventas
        ADD COLUMN IF NOT EXISTS costo_adicional NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS costo_adicional_tipo TEXT NOT NULL DEFAULT 'NINGUNO'
    `.catch(err => { schemaCostoAdicionalReady = null; throw err; });
  }
  return schemaCostoAdicionalReady;
}

function mapVenta(row) {
  return {
    id:                  row.id,
    codigo:              row.codigo,
    fecha:               row.fecha,
    hora:                row.hora,
    vendedorId:          row.vendedor_id,
    vendedorNombre:      row.vendedor_nombre,
    subtotal:            parseFloat(row.subtotal),
    descuentoProductos:  parseFloat(row.descuento_productos),
    descuentoTotal:      parseFloat(row.descuento_total),
    descuentoTipo:       row.descuento_tipo,
    total:               parseFloat(row.total),
    estado:              row.estado,
    tipoPago:            row.tipo_pago,
    valorEfectivo:       parseFloat(row.valor_efectivo),
    valorTransferencia:  parseFloat(row.valor_transferencia),
    valorAddi:           parseFloat(row.valor_addi || 0),
    costoAdicional:      parseFloat(row.costo_adicional || 0),
    costoAdicionalTipo:  row.costo_adicional_tipo || 'NINGUNO',
  };
}

function mapDetalle(row) {
  return {
    id:              row.id,
    ventaId:         row.venta_id,
    productoCodigo:  row.producto_codigo,
    productoNombre:  row.producto_nombre,
    cantidad:        row.cantidad,
    precioUnitario:  parseFloat(row.precio_unitario),
    descuentoUnidad: parseFloat(row.descuento_unidad),
    subtotal:        parseFloat(row.subtotal),
  };
}

function hoyStr() { return fechaHoyColombia(); }
function horaStr() { return horaActualColombia(); }
function mesActual() { return hoyStr().slice(0, 7); }
function generarCodigo(id) { return `VTA-${String(id).padStart(4, '0')}`; }

/* ── Lectura ── */

export async function listarVentas() {
  const rows = await sql`SELECT * FROM ventas ORDER BY id DESC`;
  return rows.map(mapVenta);
}

export async function listarDetallesPorVenta(ventaId) {
  const rows = await sql`SELECT * FROM detalles_ventas WHERE venta_id = ${ventaId}`;
  return rows.map(mapDetalle);
}

export async function listarTodosDetalles() {
  const rows = await sql`SELECT * FROM detalles_ventas ORDER BY id`;
  return rows.map(mapDetalle);
}

/* ── Escritura ── */

export async function crearVenta(venta, detalles) {
  await ensureSchemaAddi();
  await ensureSchemaCostoAdicional();

  for (const d of detalles) {
    d.subtotal = Math.max(0, d.cantidad * d.precioUnitario - (d.descuentoUnidad || 0));
  }

  const subtotalBruto  = detalles.reduce((s, d) => s + d.cantidad * d.precioUnitario, 0);
  const descProductos  = detalles.reduce((s, d) => s + (d.descuentoUnidad || 0), 0);

  const maxVenta   = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM ventas`;
  const id         = maxVenta[0].max + 1;
  const maxDetalle = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM detalles_ventas`;
  let detId        = maxDetalle[0].max + 1;

  const ventaCompleta = {
    id,
    codigo:             generarCodigo(id),
    fecha:              venta.fecha  || hoyStr(),
    hora:               venta.hora   || horaStr(),
    vendedorId:         venta.vendedorId,
    vendedorNombre:     venta.vendedorNombre,
    subtotal:           subtotalBruto,
    descuentoProductos: descProductos,
    descuentoTotal:     venta.descuentoTotal  || 0,
    descuentoTipo:      venta.descuentoTipo   || 'NINGUNO',
    total:              venta.total,
    estado:             'COMPLETADA',
    tipoPago:           venta.tipoPago        || 'EFECTIVO',
    valorEfectivo:      venta.valorEfectivo   || 0,
    valorTransferencia: venta.valorTransferencia || 0,
    valorAddi:          venta.valorAddi       || 0,
    costoAdicional:     venta.costoAdicional      || 0,
    costoAdicionalTipo: venta.costoAdicionalTipo  || 'NINGUNO',
  };

  await sql`
    INSERT INTO ventas (id, codigo, fecha, hora, vendedor_id, vendedor_nombre, subtotal,
                        descuento_productos, descuento_total, descuento_tipo, total, estado,
                        tipo_pago, valor_efectivo, valor_transferencia, valor_addi,
                        costo_adicional, costo_adicional_tipo)
    VALUES (${ventaCompleta.id}, ${ventaCompleta.codigo}, ${ventaCompleta.fecha}, ${ventaCompleta.hora},
            ${ventaCompleta.vendedorId}, ${ventaCompleta.vendedorNombre}, ${ventaCompleta.subtotal},
            ${ventaCompleta.descuentoProductos}, ${ventaCompleta.descuentoTotal}, ${ventaCompleta.descuentoTipo},
            ${ventaCompleta.total}, ${ventaCompleta.estado}, ${ventaCompleta.tipoPago},
            ${ventaCompleta.valorEfectivo}, ${ventaCompleta.valorTransferencia}, ${ventaCompleta.valorAddi},
            ${ventaCompleta.costoAdicional}, ${ventaCompleta.costoAdicionalTipo})
  `;

  for (const d of detalles) {
    d.id      = detId++;
    d.ventaId = id;
    await sql`
      INSERT INTO detalles_ventas (id, venta_id, producto_codigo, producto_nombre, cantidad, precio_unitario, descuento_unidad, subtotal)
      VALUES (${d.id}, ${d.ventaId}, ${d.productoCodigo}, ${d.productoNombre}, ${d.cantidad},
              ${d.precioUnitario}, ${d.descuentoUnidad || 0}, ${d.subtotal})
    `;
    await descontarStock(d.productoCodigo, d.cantidad);
  }

  return { ok: true, ventaId: id, codigo: ventaCompleta.codigo };
}

export async function cancelarVenta(id, vendedorId = null) {
  const rows = await sql`SELECT * FROM ventas WHERE id = ${id}`;
  if (!rows.length)                     return { error: 'Venta no encontrada.' };
  if (rows[0].estado === 'CANCELADA')   return { error: 'La venta ya estaba cancelada.' };
  if (vendedorId !== null && rows[0].vendedor_id !== vendedorId) {
    return { error: 'No tienes permiso para cancelar esta venta.' };
  }

  await sql`UPDATE ventas SET estado = 'CANCELADA' WHERE id = ${id}`;

  const detalles = await listarDetallesPorVenta(id);
  for (const d of detalles) await agregarStock(d.productoCodigo, d.cantidad);

  return { ok: true };
}

/* ── Filtros por período ── */

export async function ventasHoy() {
  const h = hoyStr();
  const rows = await sql`SELECT * FROM ventas WHERE fecha = ${h} AND estado = 'COMPLETADA' ORDER BY id DESC`;
  return rows.map(mapVenta);
}

export async function ventasSemana() {
  const desdeStr = fechaHaceDiasColombia(6);
  const rows = await sql`SELECT * FROM ventas WHERE fecha >= ${desdeStr} AND estado = 'COMPLETADA' ORDER BY id DESC`;
  return rows.map(mapVenta);
}

export async function ventasMes() {
  const mes = mesActual();
  const rows = await sql`SELECT * FROM ventas WHERE fecha LIKE ${mes + '%'} AND estado = 'COMPLETADA' ORDER BY id DESC`;
  return rows.map(mapVenta);
}

export async function ventasFiltradas(periodo) {
  if (periodo === 'HOY')    return ventasHoy();
  if (periodo === 'SEMANA') return ventasSemana();
  if (periodo === 'MES')    return ventasMes();
  if (periodo === 'TODO') {
    const rows = await sql`SELECT * FROM ventas WHERE estado = 'COMPLETADA' ORDER BY id DESC`;
    return rows.map(mapVenta);
  }
  return ventasHoy();
}

/* ── Estadísticas ── */

export async function totalDia() {
  const ventas = await ventasHoy();
  return ventas.reduce((s, v) => s + v.total, 0);
}

export async function productoMasVendido() {
  const rows = await sql`
    SELECT producto_nombre, SUM(cantidad)::int AS total
    FROM detalles_ventas
    GROUP BY producto_nombre
    ORDER BY total DESC
    LIMIT 1
  `;
  return rows.length ? rows[0].producto_nombre : 'N/A';
}

export async function vendedorDelMes() {
  const mes = mesActual();
  const rows = await sql`
    SELECT vendedor_nombre, SUM(total)::float AS total
    FROM ventas
    WHERE fecha LIKE ${mes + '%'} AND estado = 'COMPLETADA'
    GROUP BY vendedor_nombre
    ORDER BY total DESC
    LIMIT 1
  `;
  return rows.length ? rows[0].vendedor_nombre : 'N/A';
}

export async function ventasPorDia() {
  const desdeStr = fechaHaceDiasColombia(6);
  const rows = await sql`
    SELECT fecha, SUM(total)::float AS total
    FROM ventas
    WHERE fecha >= ${desdeStr} AND estado = 'COMPLETADA'
    GROUP BY fecha
    ORDER BY fecha
  `;
  return Object.fromEntries(rows.map(r => [r.fecha, r.total]));
}

export async function productosMasVendidosMes() {
  const mes = mesActual();
  const rows = await sql`
    SELECT dv.producto_nombre, SUM(dv.cantidad)::int AS cantidad
    FROM detalles_ventas dv
    JOIN ventas v ON v.id = dv.venta_id
    WHERE v.fecha LIKE ${mes + '%'} AND v.estado = 'COMPLETADA'
    GROUP BY dv.producto_nombre
    ORDER BY cantidad DESC
    LIMIT 5
  `;
  return rows.reduce((acc, r) => { acc[r.producto_nombre] = r.cantidad; return acc; }, {});
}

export async function top3VendedoresMes() {
  const mes = mesActual();
  const rows = await sql`
    SELECT vendedor_id, vendedor_nombre,
           SUM(total)::float AS total,
           COUNT(*)::int      AS cantidad
    FROM ventas
    WHERE fecha LIKE ${mes + '%'} AND estado = 'COMPLETADA'
    GROUP BY vendedor_id, vendedor_nombre
    ORDER BY total DESC
    LIMIT 3
  `;
  return rows.map(r => ({
    nombre:     r.vendedor_nombre,
    total:      r.total,
    cantidad:   r.cantidad,
    vendedorId: r.vendedor_id,
  }));
}

export async function top3ProductosMes() {
  const mes = mesActual();
  const rows = await sql`
    SELECT dv.producto_nombre,
           SUM(dv.cantidad)::int   AS cantidad,
           SUM(dv.subtotal)::float AS ingresos
    FROM detalles_ventas dv
    JOIN ventas v ON v.id = dv.venta_id
    WHERE v.fecha LIKE ${mes + '%'} AND v.estado = 'COMPLETADA'
    GROUP BY dv.producto_nombre
    ORDER BY cantidad DESC
    LIMIT 3
  `;
  return rows.map(r => ({ nombre: r.producto_nombre, cantidad: r.cantidad, ingresos: r.ingresos }));
}

export async function totalEfectivoMes() {
  const mes = mesActual();
  const rows = await sql`SELECT COALESCE(SUM(valor_efectivo), 0)::float AS t FROM ventas WHERE fecha LIKE ${mes + '%'} AND estado = 'COMPLETADA'`;
  return rows[0].t;
}

export async function totalTransferenciaMes() {
  const mes = mesActual();
  const rows = await sql`SELECT COALESCE(SUM(valor_transferencia), 0)::float AS t FROM ventas WHERE fecha LIKE ${mes + '%'} AND estado = 'COMPLETADA'`;
  return rows[0].t;
}

export async function totalEfectivoHoy() {
  const h = hoyStr();
  const rows = await sql`SELECT COALESCE(SUM(valor_efectivo), 0)::float AS t FROM ventas WHERE fecha = ${h} AND estado = 'COMPLETADA'`;
  return rows[0].t;
}

export async function totalTransferenciaHoy() {
  const h = hoyStr();
  const rows = await sql`SELECT COALESCE(SUM(valor_transferencia), 0)::float AS t FROM ventas WHERE fecha = ${h} AND estado = 'COMPLETADA'`;
  return rows[0].t;
}

export async function totalAddiMes() {
  await ensureSchemaAddi();
  const mes = mesActual();
  const rows = await sql`SELECT COALESCE(SUM(valor_addi), 0)::float AS t FROM ventas WHERE fecha LIKE ${mes + '%'} AND estado = 'COMPLETADA'`;
  return rows[0].t;
}

export async function totalAddiHoy() {
  await ensureSchemaAddi();
  const h = hoyStr();
  const rows = await sql`SELECT COALESCE(SUM(valor_addi), 0)::float AS t FROM ventas WHERE fecha = ${h} AND estado = 'COMPLETADA'`;
  return rows[0].t;
}

export async function resumenVendedoresDia(fecha) {
  await ensureSchemaAddi();
  const dia = fecha?.trim() || hoyStr();
  const rows = await sql`
    SELECT vendedor_id, vendedor_nombre,
           SUM(total)::float              AS total_vendido,
           SUM(valor_efectivo)::float     AS total_efectivo,
           SUM(valor_transferencia)::float AS total_transferencia,
           SUM(valor_addi)::float         AS total_addi,
           COUNT(*)::int                  AS cantidad_ventas,
           MAX(hora)                      AS ultima_hora
    FROM ventas
    WHERE fecha = ${dia} AND estado = 'COMPLETADA'
    GROUP BY vendedor_id, vendedor_nombre
    ORDER BY total_vendido DESC
  `;

  const lista = rows.map(r => ({
    vendedorId:         r.vendedor_id,
    vendedorNombre:     r.vendedor_nombre,
    totalVendido:       r.total_vendido,
    totalEfectivo:      r.total_efectivo,
    totalTransferencia: r.total_transferencia,
    totalAddi:          r.total_addi,
    cantidadVentas:     r.cantidad_ventas,
    ultimaHora:         r.ultima_hora,
    actividad:          'BAJA',
  }));

  const sortedTotales = [...lista].map(r => r.totalVendido).sort((a, b) => a - b);
  let mediana = 0;
  if (sortedTotales.length) {
    const mid = Math.floor(sortedTotales.length / 2);
    mediana = sortedTotales.length % 2 === 0
      ? (sortedTotales[mid - 1] + sortedTotales[mid]) / 2
      : sortedTotales[mid];
  }
  for (const r of lista) {
    r.actividad = (r.totalVendido >= mediana && r.totalVendido > 0) || r.cantidadVentas >= 3
      ? 'ALTA' : 'BAJA';
  }
  return lista;
}

export async function totalGeneralVendedoresDia(fecha) {
  const lista = await resumenVendedoresDia(fecha);
  return lista.reduce((s, r) => s + r.totalVendido, 0);
}

export async function vendedoresSinVentas(fecha, todosLosVendedores) {
  if (!todosLosVendedores?.length) return [];
  const lista = await resumenVendedoresDia(fecha);
  const conVentas = new Set(lista.map(r => r.vendedorNombre));
  return todosLosVendedores.filter(n => !conVentas.has(n));
}
