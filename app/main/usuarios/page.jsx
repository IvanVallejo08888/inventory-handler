import { redirect }      from 'next/navigation';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { leerUsuarios, contarUsuarios, contarAdmins, contarVendedores } from '@/lib/fileManager';
import UsuariosClient from '@/components/usuarios/UsuariosClient';

export const metadata = { title: 'Gestión de Usuarios — Área 17' };

export default async function UsuariosPage({ searchParams }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');
  if (!esAdmin(sesion)) redirect('/dashboard');

  const params    = await searchParams;
  const buscar    = params.buscar   || '';
  const filtroRol = params.rol      || 'TODOS';

  let lista = leerUsuarios();
  if (buscar.trim()) {
    const t = buscar.trim().toLowerCase();
    lista = lista.filter(u =>
      u.nombreCompleto.toLowerCase().includes(t) ||
      u.correo.toLowerCase().includes(t) ||
      u.identificacion.includes(t)
    );
  }
  if (filtroRol !== 'TODOS') lista = lista.filter(u => u.rol === filtroRol);

  return (
    <UsuariosClient
      lista={lista}
      totalUsuarios={contarUsuarios()}
      totalAdmins={contarAdmins()}
      totalVendedores={contarVendedores()}
      buscar={buscar}
      filtroRol={filtroRol}
      sesionId={sesion.id}
    />
  );
}
