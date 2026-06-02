import { redirect } from 'next/navigation';
import { obtenerSesion } from '@/lib/auth';
import RegistroForm from '@/components/RegistroForm';

export const metadata = { title: 'Crear Cuenta — Área 17' };

export default async function RegistroPage() {
  // Si ya hay sesión activa, redirigir al dashboard
  const sesion = await obtenerSesion();
  if (sesion) redirect('/dashboard');

  return <RegistroForm />;
}
