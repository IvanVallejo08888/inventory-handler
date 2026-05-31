import { redirect } from 'next/navigation';
import { obtenerSesion } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export default async function MainLayout({ children }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');

  return (
    <div className="app-shell">
      <Navbar sesion={sesion} />
      <main className="main-content" id="main-content">
        {children}
      </main>
    </div>
  );
}
