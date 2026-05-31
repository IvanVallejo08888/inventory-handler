import { redirect } from 'next/navigation';
import { obtenerSesion } from '@/lib/auth';

// FIX: Este dashboard de legacy redirige al nuevo /main/dashboard
// que tiene el layout con Navbar y sidebar correctamente
export default async function DashboardPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');
  redirect('/main/dashboard');
}
