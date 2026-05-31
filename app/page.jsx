import { redirect } from 'next/navigation';
import { obtenerSesion } from '@/lib/auth';

export default async function RootPage() {
  const sesion = await obtenerSesion();
  // FIX: Redirigir siempre a /main/dashboard (donde está el layout con Navbar)
  redirect(sesion ? '/main/dashboard' : '/login');
}
