import fs from 'fs';
import path from 'path';
import { descontarStock, agregarStock } from './fileManagerProductos.js';

const DATA_DIR      = path.join(process.cwd(), 'data');
const VENTAS_FILE   = path.join(DATA_DIR, 'ventas.txt');
const DETALLES_FILE = path.join(DATA_DIR, 'detalles_ventas.txt');

const CABECERA_VENTAS = [
  '# Area17 - ventas.txt',
  '# id|codigo|fecha|hora|vendedorId|vendedorNombre|subtotal|descuentoProductos|descuentoTotal|descuentoTipo|total|estado|tipoPago|valorEfectivo|valorTransferencia',
];
const CABECERA_DETALLES = [
  '# Area17 - detalles_ventas.txt',
  '# id|ventaId|productoCodigo|productoNombre|cantidad|precioUnitario|descuentoUnidad|subtotal',
];

function asegurarArchivos() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(VENTAS_FILE))
    fs.writeFileSync(VENTAS_FILE, CABECERA_VENTAS.join('\n') + '\n', 'utf8');
  if (!fs.existsSync(DETALLES_FILE))
    fs.writeFileSync(DETALLES_FILE, CABECERA_DETALLES.join('\n') + '\n', 'utf8');
}

/* ── Parsers ── */

function parsearVenta(linea) {
  const p = linea.replace(/\r/g, '').split('|');
  if (p.length < 12) return null;
  try {
    return {
      id:                   parseInt(p[0].trim()),
      codigo:               p[1].trim(),
      fecha:                p[2].trim(),
      hora:                 p[3].trim(),
      vendedorId:           parseInt(p[4].trim()),
      vendedorNombre:       p[5].trim(),
      subtotal:             parseFloat(p[6].trim()),
      descuentoProductos:   parseFloat(p[7].trim()) || 0,
      descuentoTotal:       parseFloat(p[8].trim()) || 0,
      descuentoTipo:        p[9].trim() || 'NINGUNO',
      total:                parseFloat(p[10].trim()),
      estado:               p[11].trim(),
      tipoPago:             p[12]?.trim() || 'EFECTIVO',
      valorEfectivo:        parseFloat(p[13]?.trim()) || 0,
      valorTransferencia:   parseFloat(p[14]?.trim()) || 0,
    };
  } catch { return null; }
}

function parsearDetalle(linea) {
  const p = linea.replace(/\r/g, '').split('|');
  if (p.length < 7) return null;
  try {
    const cantidad      = parseInt(p[4].trim());
    const precioUnit    = parseFloat(p[5].trim());
    const descuento     = parseFloat(p[6]?.trim()) || 0;
    const subtotal      = p[7] ? parseFloat(p[7].trim()) : Math.max(0, cantidad * precioUnit - descuento);
    return {
      id:              parseInt(p[0].trim()),
      ventaId:         parseInt(p[1].trim()),
      productoCodigo:  p[2].trim(),
      productoNombre:  p[3].trim(),
      cantidad,
      precioUnitario:  precioUnit,
      descuentoUnidad: descuento,
      subtotal,
    };
  } catch { return null; }
}

function ventaToTxt(v) {
  return [
    v.id, v.codigo, v.fecha, v.hora, v.vendedorId, v.vendedorNombre,
    v.subtotal, v.descuentoProductos, v.descuentoTotal, v.descuentoTipo,
    v.total, v.estado,
    v.tipoPago || 'EFECTIVO',
    v.valorEfectivo || 0,
    v.valorTransferencia || 0,
  ].join('|');
}

function detalleToTxt(d) {
  return [
    d.id, d.ventaId, d.productoCodigo, d.productoNombre,
    d.cantidad, d.precioUnitario, d.descuentoUnidad, d.subtotal,
  ].join('|');
}

/* ── Lectura ── */

export function listarVentas() {
  asegurarArchivos();
  const lista = fs.readFileSync(VENTAS_FILE, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(parsearVenta)
    .filter(Boolean);
  lista.sort((a, b) => b.id - a.id);
  return lista;
}

export function listarDetallesPorVenta(ventaId) {
  asegurarArchivos();
  return fs.readFileSync(DETALLES_FILE, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(parsearDetalle)
    .filter(d => d && d.ventaId === ventaId);
}

export function listarTodosDetalles() {
  asegurarArchivos();
  return fs.readFileSync(DETALLES_FILE, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(parsearDetalle)
    .filter(Boolean);
}

/* ── Utilitarios ── */

function siguienteId(archivo) {
  if (!fs.existsSync(archivo)) return 1;
  const lineas = fs.readFileSync(archivo, 'utf8').split('\n');
  let max = 0;
  for (const l of lineas) {
    const t = l.replace(/\r/g, '').trim();
    if (t && !t.startsWith('#')) {
      const id = parseInt(t.split('|')[0]);
      if (!isNaN(id) && id > max) max = id;
    }
  }
  return max + 1;
}

function generarCodigo(id) { return `VTA-${String(id).padStart(4, '0')}`; }

function hoyStr() { return new Date().toISOString().slice(0, 10); }
function horaStr() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;
}

function mesActual() { return hoyStr().slice(0, 7); }

/* ── Escritura ── */

/**
 * Crea una venta con sus detalles. Descuenta stock.
 * @param {Object} venta - datos de la venta (sin id/codigo/fecha/hora)
 * @param {Array}  detalles - array de { productoCodigo, productoNombre, cantidad, precioUnitario, descuentoUnidad }
 * @returns {{ ok: boolean, error?: string }}
 */
export function crearVenta(venta, detalles) {
  asegurarArchivos();

  // Calcular subtotales de detalles
  for (const d of detalles) {
    d.subtotal = Math.max(0, d.cantidad * d.precioUnitario - (d.descuentoUnidad || 0));
  }

  const subtotalBruto   = detalles.reduce((s, d) => s + d.cantidad * d.precioUnitario, 0);
  const descProductos   = detalles.reduce((s, d) => s + (d.descuentoUnidad || 0), 0);

  const id     = siguienteId(VENTAS_FILE);
  const detId0 = siguienteId(DETALLES_FILE);

  const ventaCompleta = {
    id,
    codigo:              generarCodigo(id),
    fecha:               venta.fecha || hoyStr(),
    hora:                venta.hora  || horaStr(),
    vendedorId:          venta.vendedorId,
    vendedorNombre:      venta.vendedorNombre,
    subtotal:            subtotalBruto,
    descuentoProductos:  descProductos,
    descuentoTotal:      venta.descuentoTotal  || 0,
    descuentoTipo:       venta.descuentoTipo   || 'NINGUNO',
    total:               venta.total,
    estado:              'COMPLETADA',
    tipoPago:            venta.tipoPago        || 'EFECTIVO',
    valorEfectivo:       venta.valorEfectivo   || 0,
    valorTransferencia:  venta.valorTransferencia || 0,
  };

  // Guardar venta
  fs.appendFileSync(VENTAS_FILE, ventaToTxt(ventaCompleta) + '\n', 'utf8');

  // Guardar detalles y descontar stock
  let detId = detId0;
  for (const d of detalles) {
    d.id      = detId++;
    d.ventaId = id;
    fs.appendFileSync(DETALLES_FILE, detalleToTxt(d) + '\n', 'utf8');
    descontarStock(d.productoCodigo, d.cantidad);
  }

  return { ok: true, ventaId: id, codigo: ventaCompleta.codigo };
}

/** Cancela una venta y repone el stock */
export function cancelarVenta(id) {
  const lista = listarVentas();
  const target = lista.find(v => v.id === id);
  if (!target)                        return { error: 'Venta no encontrada.' };
  if (target.estado === 'CANCELADA')  return { error: 'La venta ya estaba cancelada.' };

  target.estado = 'CANCELADA';

  // Reponer stock
  const detalles = listarDetallesPorVenta(id);
  for (const d of detalles) agregarStock(d.productoCodigo, d.cantidad);

  // Reescribir archivo
  const contenido = CABECERA_VENTAS.join('\n') + '\n' + lista.map(ventaToTxt).join('\n') + '\n';
  fs.writeFileSync(VENTAS_FILE, contenido, 'utf8');
  return { ok: true };
}

/* ── Filtros por período ── */

export function ventasHoy() {
  const h = hoyStr();
  return listarVentas().filter(v => v.fecha === h && v.estado === 'COMPLETADA');
}

export function ventasSemana() {
  const desde = new Date();
  desde.setDate(desde.getDate() - 6);
  const desdeStr = desde.toISOString().slice(0, 10);
  return listarVentas().filter(v => v.fecha >= desdeStr && v.estado === 'COMPLETADA');
}

export function ventasMes() {
  const mes = mesActual();
  return listarVentas().filter(v => v.fecha.startsWith(mes) && v.estado === 'COMPLETADA');
}

export function ventasFiltradas(periodo) {
  if (periodo === 'HOY')    return ventasHoy();
  if (periodo === 'SEMANA') return ventasSemana();
  if (periodo === 'MES')    return ventasMes();
  if (periodo === 'TODO')   return listarVentas().filter(v => v.estado === 'COMPLETADA');
  return ventasHoy();
}

/* ── Estadísticas ── */

export function totalDia() {
  return ventasHoy().reduce((s, v) => s + v.total, 0);
}

export function productoMasVendido() {
  const mapa = {};
  for (const d of listarTodosDetalles()) {
    mapa[d.productoNombre] = (mapa[d.productoNombre] || 0) + d.cantidad;
  }
  const top = Object.entries(mapa).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : 'N/A';
}

export function vendedorDelMes() {
  const mapa = {};
  for (const v of ventasMes()) mapa[v.vendedorNombre] = (mapa[v.vendedorNombre] || 0) + v.total;
  const top = Object.entries(mapa).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : 'N/A';
}

export function ventasPorDia() {
  const mapa = {};
  for (const v of ventasSemana()) mapa[v.fecha] = (mapa[v.fecha] || 0) + v.total;
  return mapa;
}

export function productosMasVendidosMes() {
  const idsVentasMes = new Set(ventasMes().map(v => v.id));
  const mapa = {};
  for (const d of listarTodosDetalles()) {
    if (idsVentasMes.has(d.ventaId)) mapa[d.productoNombre] = (mapa[d.productoNombre] || 0) + d.cantidad;
  }
  return Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});
}

export function top3VendedoresMes() {
  const totales = {}, conteos = {}, ids = {};
  for (const v of ventasMes()) {
    totales[v.vendedorNombre] = (totales[v.vendedorNombre] || 0) + v.total;
    conteos[v.vendedorNombre] = (conteos[v.vendedorNombre] || 0) + 1;
    ids[v.vendedorNombre] = ids[v.vendedorNombre] ?? v.vendedorId;
  }
  return Object.entries(totales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([nombre, total]) => ({
      nombre, total,
      cantidad:   conteos[nombre] || 0,
      vendedorId: ids[nombre]     || 0,
    }));
}

export function top3ProductosMes() {
  const idsVentasMes = new Set(ventasMes().map(v => v.id));
  const cantidades = {}, ingresosMap = {};
  for (const d of listarTodosDetalles()) {
    if (idsVentasMes.has(d.ventaId)) {
      cantidades[d.productoNombre]  = (cantidades[d.productoNombre]  || 0) + d.cantidad;
      ingresosMap[d.productoNombre] = (ingresosMap[d.productoNombre] || 0) + d.subtotal;
    }
  }
  return Object.entries(cantidades)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([nombre, cantidad]) => ({ nombre, cantidad, ingresos: ingresosMap[nombre] || 0 }));
}

export function totalEfectivoMes()        { return ventasMes().reduce((s, v) => s + v.valorEfectivo, 0); }
export function totalTransferenciaMes()   { return ventasMes().reduce((s, v) => s + v.valorTransferencia, 0); }
export function totalEfectivoHoy()        { return ventasHoy().reduce((s, v) => s + v.valorEfectivo, 0); }
export function totalTransferenciaHoy()   { return ventasHoy().reduce((s, v) => s + v.valorTransferencia, 0); }

/** Resumen por vendedor de una fecha (yyyy-MM-dd), solo ventas COMPLETADAS */
export function resumenVendedoresDia(fecha) {
  const dia = fecha?.trim() || hoyStr();
  const acc  = {};

  for (const v of listarVentas()) {
    if (v.fecha !== dia || v.estado !== 'COMPLETADA') continue;
    const vid = v.vendedorId;
    if (!acc[vid]) {
      acc[vid] = {
        vendedorId: vid, vendedorNombre: v.vendedorNombre,
        totalVendido: 0, totalEfectivo: 0, totalTransferencia: 0,
        cantidadVentas: 0, ultimaHora: '',
      };
    }
    acc[vid].totalVendido       += v.total;
    acc[vid].totalEfectivo      += v.valorEfectivo;
    acc[vid].totalTransferencia += v.valorTransferencia;
    acc[vid].cantidadVentas     += 1;
    if (v.hora > acc[vid].ultimaHora) acc[vid].ultimaHora = v.hora;
  }

  const lista = Object.values(acc);

  // Calcular mediana de totales para determinar actividad
  const sortedTotales = lista.map(r => r.totalVendido).sort((a, b) => a - b);
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

  lista.sort((a, b) => b.totalVendido - a.totalVendido);
  return lista;
}

export function totalGeneralVendedoresDia(fecha) {
  return resumenVendedoresDia(fecha).reduce((s, r) => s + r.totalVendido, 0);
}

export function vendedoresSinVentas(fecha, todosLosVendedores) {
  if (!todosLosVendedores?.length) return [];
  const conVentas = new Set(resumenVendedoresDia(fecha).map(r => r.vendedorNombre));
  return todosLosVendedores.filter(n => !conVentas.has(n));
}
