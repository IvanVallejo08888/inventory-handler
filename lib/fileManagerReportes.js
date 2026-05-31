import {
  ventasHoy, ventasMes, listarVentas, listarTodosDetalles,
  productoMasVendido, vendedorDelMes,
  totalEfectivoHoy, totalTransferenciaHoy,
  totalEfectivoMes, totalTransferenciaMes,
  ventasPorDia, productosMasVendidosMes,
} from './fileManagerVentas.js';
import { listarGastos, totalGastosMes, gastosPorCategoria } from './fileManagerGastos.js';

function hoy() { return new Date().toISOString().slice(0, 10); }

function primerDiaMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
}

export function generarReporteHoy() {
  const fecha  = hoy();
  const ventas = ventasHoy();
  const totalIngresos = ventas.reduce((s, v) => s + v.total, 0);
  const gastosHoy = listarGastos()
    .filter(g => g.fecha?.replace(/\r/g,'').trim() === fecha)
    .reduce((s, g) => s + g.valor, 0);
  return {
    periodo:'DIARIO', fechaInicio:fecha, fechaFin:fecha,
    totalVentas:ventas.length, totalIngresos,
    totalGastos:gastosHoy, utilidad:totalIngresos - gastosHoy,
    productoMasVendido:productoMasVendido(),
    vendedorTop:vendedorDelMes(), ventasVendedorTop:0, cantidadProductoTop:0,
  };
}

export function generarReporteMes() {
  const ventas = ventasMes();
  const totalIngresos = ventas.reduce((s, v) => s + v.total, 0);
  const totalGastos   = totalGastosMes();

  const mapVend = {};
  for (const v of ventas) mapVend[v.vendedorNombre] = (mapVend[v.vendedorNombre]||0)+1;
  const topVend = Object.entries(mapVend).sort((a,b) => b[1]-a[1])[0];

  const idsVentasMes = new Set(ventas.map(v => v.id));
  const mapProd = {};
  for (const d of listarTodosDetalles()) {
    if (idsVentasMes.has(d.ventaId)) mapProd[d.productoNombre] = (mapProd[d.productoNombre]||0)+d.cantidad;
  }
  const topProd = Object.entries(mapProd).sort((a,b) => b[1]-a[1])[0];

  return {
    periodo:'MENSUAL', fechaInicio:primerDiaMes(), fechaFin:hoy(),
    totalVentas:ventas.length, totalIngresos, totalGastos,
    utilidad:totalIngresos - totalGastos,
    productoMasVendido:topProd ? topProd[0] : 'N/A',
    cantidadProductoTop:topProd ? topProd[1] : 0,
    vendedorTop:topVend ? topVend[0] : 'N/A',
    ventasVendedorTop:topVend ? topVend[1] : 0,
  };
}

export function getDatosReportes() {
  return {
    reporteHoy:        generarReporteHoy(),
    reporteMes:        generarReporteMes(),
    ventasPorDia:      ventasPorDia(),
    productosMasVendidos: productosMasVendidosMes(),
    gastosPorCategoria:   gastosPorCategoria(),
    efectivoHoy:          totalEfectivoHoy(),
    transferenciaHoy:     totalTransferenciaHoy(),
    efectivoMes:          totalEfectivoMes(),
    transferenciaMes:     totalTransferenciaMes(),
  };
}
