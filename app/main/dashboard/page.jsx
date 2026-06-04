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

  const [ventasDeHoy, todasVentas, ventasSem, ventasDeMes,
         cajaHoy, ingresosMes, gastosMesVal, productoTop, vendedorMes, t3Prod] = await Promise.all([
    ventasHoy(),
    listarVentas(),
    ventasSemana(),
    ventasMes(),
    totalDia(),
    ventasMes().then(v => v.reduce((s, x) => s + x.total, 0)),
    totalGastosMes(),
    productoMasVendido(),
    vendedorDelMes(),
    top3ProductosMes(),
  ]);
  const utilidadMes = ingresosMes - gastosMesVal;

  if (admin) {
    const [usuarios, productos, gastosRecientes,
           vpd, t3Vend, t3Prod, gastosCat, efHoy, trHoy, efMes, trMes, ultimasVentas] = await Promise.all([
      leerUsuarios(),
      listarProductos(),
      listarGastos().then(g => g.slice(0, 5)),
      ventasPorDia(),
      top3VendedoresMes(),
      top3ProductosMes(),
      gastosPorCategoria(),
      totalEfectivoHoy(),
      totalTransferenciaHoy(),
      totalEfectivoMes(),
      totalTransferenciaMes(),
      Promise.resolve(todasVentas.slice(0, 5)),
    ]);

    const activos = productos.filter(p => p.estado === 'ACTIVO');
    const productosStockBajo = activos.filter(p => p.cantidad <= 5).sort((a, b) => a.cantidad - b.cantidad);
    const fotosPorVendedor = {};
    for (const u of usuarios) {
      if (u.fotoPerfil) fotosPorVendedor[u.id] = u.fotoPerfil;
    }

    return (
      <DashboardAdmin
        sesion={sesion}
        totalUsuarios={usuarios.length}
        totalProductos={activos.length}
        stockBajo={productosStockBajo.length}
        productosStockBajo={productosStockBajo}
        ventasHoy={ventasDeHoy.length}
        cajaHoy={cajaHoy}
        ventasSemana={ventasSem.length}
        ingresosMes={ingresosMes}
        gastosMes={gastosMesVal}
        utilidadMes={utilidadMes}
        productoTop={productoTop}
        vendedorMes={vendedorMes}
        ventasPorDia={vpd}
        ultimasVentas={ultimasVentas}
        top3Vendedores={t3Vend}
        top3Productos={t3Prod}
        gastosCat={gastosCat}
        gastosRecientes={gastosRecientes}
        fotosPorVendedor={fotosPorVendedor}
        efectivoHoy={efHoy}
        transferenciaHoy={trHoy}
        efectivoMes={efMes}
        transferenciaMes={trMes}
      />
    );
  }

  const uid = sesion.id;
  const misVentasHoy = ventasDeHoy.filter(v => v.vendedorId === uid);
  const misVentasMes = ventasDeMes.filter(v => v.vendedorId === uid);
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
      top3Productos={t3Prod}
    />
  );
}
