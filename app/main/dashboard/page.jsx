import { redirect } from 'next/navigation';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import DashboardAdmin    from '@/components/dashboard/DashboardAdmin';
import DashboardVendedor from '@/components/dashboard/DashboardVendedor';

import {
  ventasHoy, ventasSemana, ventasMes, totalDia,
  productoMasVendido, vendedorDelMes, ventasPorDia,
  productosMasVendidosMes, top3VendedoresMes, top3ProductosMes,
  listarVentas, totalEfectivoHoy, totalTransferenciaHoy,
  totalEfectivoMes, totalTransferenciaMes,
} from '@/lib/fileManagerVentas';
import { listarProductos }   from '@/lib/fileManagerProductos';
import { totalGastosMes, gastosPorCategoria, listarGastos } from '@/lib/fileManagerGastos';
import { leerUsuarios }      from '@/lib/fileManager';

export const metadata = { title: 'Dashboard — Área 17' };

export default async function DashboardPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');
  const admin = esAdmin(sesion);

  // ── KPIs comunes ──────────────────────────────────────────────────────────
  const ventasDeHoy   = ventasHoy();
  const cajaHoy       = totalDia();
  const ingresosMes   = ventasMes().reduce((s, v) => s + v.total, 0);
  const gastosMesVal  = totalGastosMes();
  const utilidadMes   = ingresosMes - gastosMesVal;
  const ventasSem     = ventasSemana();
  const productoTop   = productoMasVendido();
  const vendedorMes   = vendedorDelMes();

  if (admin) {
    const usuarios     = leerUsuarios();
    const productos    = listarProductos();
    const activos      = productos.filter(p => p.estado === 'ACTIVO');
    const productosStockBajo = activos.filter(p => p.cantidad <= 5).sort((a, b) => a.cantidad - b.cantidad);
    const ultimasVentas = listarVentas().slice(0, 5);
    const gastosRecientes = listarGastos().slice(0, 5);
    const fotosPorVendedor = {};
    for (const u of usuarios) {
      if (u.fotoPerfil) fotosPorVendedor[u.id] = u.fotoPerfil;
    }

    const props = {
      sesion,
      totalUsuarios:  usuarios.length,
      totalProductos: activos.length,
      stockBajo:      productosStockBajo.length,
      productosStockBajo,
      ventasHoy:      ventasDeHoy.length,
      cajaHoy,
      ventasSemana:   ventasSem.length,
      ingresosMes,
      gastosMes:      gastosMesVal,
      utilidadMes,
      productoTop,
      vendedorMes,
      ventasPorDia:   ventasPorDia(),
      ultimasVentas,
      top3Vendedores: top3VendedoresMes(),
      top3Productos:  top3ProductosMes(),
      gastosCat:      gastosPorCategoria(),
      gastosRecientes,
      fotosPorVendedor,
      efectivoHoy:         totalEfectivoHoy(),
      transferenciaHoy:    totalTransferenciaHoy(),
      efectivoMes:         totalEfectivoMes(),
      transferenciaMes:    totalTransferenciaMes(),
    };

    return <DashboardAdmin {...props} />;
  }

  // Vendedor: solo sus propias ventas
  const uid = sesion.id;
  const todasVentas  = listarVentas();
  const misVentasHoy = ventasDeHoy.filter(v => v.vendedorId === uid);
  const misVentasMes = ventasMes().filter(v => v.vendedorId === uid);
  const misVentasRecientes = todasVentas.filter(v => v.vendedorId === uid).slice(0, 5);

  return (
    <DashboardVendedor
      sesion={sesion}
      ventasHoy={misVentasHoy.length}
      cajaHoy={misVentasHoy.reduce((s, v) => s + v.total, 0)}
      ventasMes={misVentasMes.length}
      ingresosMes={misVentasMes.reduce((s, v) => s + v.total, 0)}
      ventasRecientes={misVentasRecientes}
      productoTop={productoTop}
    />
  );
}
