import { redirect }      from 'next/navigation';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { getDatosReportes }  from '@/lib/fileManagerReportes';
import ReportesClient from '@/components/reportes/ReportesClient';

export const metadata = { title: 'Reportes y Estadísticas — Área 17' };

export default async function ReportesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');
  if (!esAdmin(sesion)) redirect('/dashboard');

  const datos = await getDatosReportes();

  return (
    <ReportesClient
      reporteHoy={datos.reporteHoy}
      reporteMes={datos.reporteMes}
      ventasPorDia={datos.ventasPorDia}
      productosMasVendidos={datos.productosMasVendidos}
      gastosPorCategoria={datos.gastosPorCategoria}
      efectivoHoy={datos.efectivoHoy}
      transferenciaHoy={datos.transferenciaHoy}
      efectivoMes={datos.efectivoMes}
      transferenciaMes={datos.transferenciaMes}
    />
  );
}
