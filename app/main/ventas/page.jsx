import { redirect } from 'next/navigation';
import { obtenerSesion } from '@/lib/auth';
import { listarProductosConVariantes } from '@/lib/fileManagerProductos';
import VentasClient from '@/components/ventas/VentasClient';

export const metadata = { title: 'Registrar Venta — Área 17' };

export default async function VentasPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');

  const productos = (await listarProductosConVariantes()).filter(p => p.estado === 'ACTIVO');

  return <VentasClient productos={productos} sesion={sesion} />;
}
