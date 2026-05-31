import { redirect }      from 'next/navigation';
import { obtenerSesion } from '@/lib/auth';
import PerfilClient from '@/components/perfil/PerfilClient';

export const metadata = { title: 'Mi Perfil — Área 17' };

export default async function PerfilPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');
  return <PerfilClient sesion={sesion} />;
}
