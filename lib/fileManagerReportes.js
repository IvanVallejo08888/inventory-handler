import {
  ventasHoy, ventasMes, listarVentas, listarTodosDetalles,
  productoMasVendido, vendedorDelMes,
  totalEfectivoHoy, totalTransferenciaHoy,
  totalEfectivoMes, totalTransferenciaMes,
  totalAddiHoy, totalAddiMes,
  ventasPorDia, productosMasVendidosMes,
} from './fileManagerVentas.js';
import { listarGastos, totalGastosMes, gastosPorCategoria } from './fileManagerGastos.js';
import { fechaHoyColombia, primerDiaMesColombia } from './fechaColombia.js';

function hoy() { return fechaHoyColombia(); }
function primerDiaMes() { return primerDiaMesColombia(); }

export async function generarReporteHoy() {
  const fecha  = hoy();
  const [ventas, gastosActivos] = await Promise.all([ventasHoy(), listarGastos()]);
  const totalIngresos = ventas.reduce((s, v) => s + v.total, 0);
  const gastosHoy = gastosActivos
    .filter(g => g.fecha?.replace(/\r/g,'').trim() === fecha)
    .reduce((s, g) => s + g.valor, 0);
  const [prodTop, vendTop] = await Promise.all([productoMasVendido(), vendedorDelMes()]);
  return {
    periodo:'DIARIO', fechaInicio:fecha, fechaFin:fecha,
    totalVentas:ventas.length, totalIngresos,
    totalGastos:gastosHoy, utilidad:totalIngresos - gastosHoy,
    productoMasVendido: prodTop,
    vendedorTop: vendTop, ventasVendedorTop:0, cantidadProductoTop:0,
  };
}

export async function generarReporteMes() {
  const [ventas, gastosTotalMes] = await Promise.all([ventasMes(), totalGastosMes()]);
  const totalIngresos = ventas.reduce((s, v) => s + v.total, 0);

  const mapVend = {};
  for (const v of ventas) mapVend[v.vendedorNombre] = (mapVend[v.vendedorNombre]||0)+1;
  const topVend = Object.entries(mapVend).sort((a,b) => b[1]-a[1])[0];

  const idsVentasMes = new Set(ventas.map(v => v.id));
  const detalles     = await listarTodosDetalles();
  const mapProd = {};
  for (const d of detalles) {
    if (idsVentasMes.has(d.ventaId)) mapProd[d.productoNombre] = (mapProd[d.productoNombre]||0)+d.cantidad;
  }
  const topProd = Object.entries(mapProd).sort((a,b) => b[1]-a[1])[0];

  return {
    periodo:'MENSUAL', fechaInicio:primerDiaMes(), fechaFin:hoy(),
    totalVentas:ventas.length, totalIngresos, totalGastos: gastosTotalMes,
    utilidad:totalIngresos - gastosTotalMes,
    productoMasVendido: topProd ? topProd[0] : 'N/A',
    cantidadProductoTop: topProd ? topProd[1] : 0,
    vendedorTop: topVend ? topVend[0] : 'N/A',
    ventasVendedorTop: topVend ? topVend[1] : 0,
  };
}

export async function getDatosReportes() {
  const [
    reporteHoy, reporteMes, vpd, pMasVendidos, gxCat,
    efHoy, trHoy, efMes, trMes, adHoy, adMes,
  ] = await Promise.all([
    generarReporteHoy(),
    generarReporteMes(),
    ventasPorDia(),
    productosMasVendidosMes(),
    gastosPorCategoria(),
    totalEfectivoHoy(),
    totalTransferenciaHoy(),
    totalEfectivoMes(),
    totalTransferenciaMes(),
    totalAddiHoy(),
    totalAddiMes(),
  ]);
  return {
    reporteHoy,
    reporteMes,
    ventasPorDia:         vpd,
    productosMasVendidos: pMasVendidos,
    gastosPorCategoria:   gxCat,
    efectivoHoy:          efHoy,
    transferenciaHoy:     trHoy,
    efectivoMes:          efMes,
    transferenciaMes:     trMes,
    addiHoy:              adHoy,
    addiMes:              adMes,
  };
}
