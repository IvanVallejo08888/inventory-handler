import { redirect }      from 'next/navigation';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { buscar, listarRecomendaciones, contar } from '@/lib/fileManagerRecomendaciones';
import RecomendacionesClient from '@/components/recomendaciones/RecomendacionesClient';

export const metadata = { title: 'Recomendaciones — Área 17' };

export default async function RecomendacionesPage({ searchParams }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');

  const admin  = esAdmin(sesion);
  const params = await searchParams;

  const [lista, total] = await Promise.all([
    admin
      ? buscar(params.buscar || '', params.fechaDesde || '', params.fechaHasta || '')
      : Promise.resolve([]),
    contar(),
  ]);

  return (
    <RecomendacionesClient
      lista={lista}
      esAdmin={admin}
      sesion={sesion}
      total={total}
      buscar={params.buscar    || ''}
      fechaDesde={params.fechaDesde || ''}
      fechaHasta={params.fechaHasta || ''}
    />
  );
}
