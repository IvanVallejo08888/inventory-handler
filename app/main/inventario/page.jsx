import { redirect }       from 'next/navigation';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { buscar, contarProductos, contarProductosActivos, totalUnidades, valorTotalInventario } from '@/lib/fileManagerProductos';
import InventarioClient from '@/components/inventario/InventarioClient';

export const metadata = { title: 'Inventario — Área 17' };

export default async function InventarioPage({ searchParams }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');
  if (!esAdmin(sesion)) redirect('/dashboard');

  const params  = await searchParams;
  const termino = params.buscar || '';
  const estado  = params.estado || 'TODOS';

  const lista = buscar(termino, estado);

  return (
    <InventarioClient
      lista={lista}
      totalProductos={contarProductos()}
      productosActivos={contarProductosActivos()}
      totalUnidades={totalUnidades()}
      valorInventario={valorTotalInventario()}
      buscar={termino}
      filtroEstado={estado}
    />
  );
}
