import { redirect } from 'next/navigation';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import {
  ventasFiltradas,
  resumenVendedoresDia, totalGeneralVendedoresDia, vendedoresSinVentas,
} from '@/lib/fileManagerVentas';
import { leerUsuarios } from '@/lib/fileManager';
import HistorialClient from '@/components/ventas/HistorialClient';

export const metadata = { title: 'Historial de Ventas — Área 17' };

export default async function HistorialPage({ searchParams }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');

  const params  = await searchParams;
  const periodo = params.periodo || 'HOY';
  const admin   = esAdmin(sesion);

  let lista = await ventasFiltradas(periodo);
  if (!admin) lista = lista.filter(v => v.vendedorId === sesion.id);

  const totalVentas        = lista.reduce((s, v) => s + v.total, 0);
  const totalEfectivo      = lista.reduce((s, v) => s + (v.valorEfectivo || 0), 0);
  const totalTransferencia = lista.reduce((s, v) => s + (v.valorTransferencia || 0), 0);

  let resumenVend = [], totalGeneralDia = 0, vendedoresSin = [], fechaResumen = '';
  if (admin) {
    const fecha = params.fecha || '';
    fechaResumen    = fecha || new Date().toISOString().slice(0, 10);
    const [resumen, total, usuarios] = await Promise.all([
      resumenVendedoresDia(fecha),
      totalGeneralVendedoresDia(fecha),
      leerUsuarios(),
    ]);
    resumenVend     = resumen;
    totalGeneralDia = total;
    const nombresVend = usuarios
      .filter(u => u.rol === 'VENDEDOR' && u.activo)
      .map(u => u.nombreCompleto);
    vendedoresSin = await vendedoresSinVentas(fecha, nombresVend);
  }

  return (
    <HistorialClient
      ventas={lista}
      periodo={periodo}
      esAdmin={admin}
      totalVentas={totalVentas}
      totalEfectivo={totalEfectivo}
      totalTransferencia={totalTransferencia}
      resumenVendedores={resumenVend}
      totalGeneralDia={totalGeneralDia}
      vendedoresSinVentas={vendedoresSin}
      fechaResumen={fechaResumen}
    />
  );
}
