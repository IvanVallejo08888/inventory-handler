import { redirect }      from 'next/navigation';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { listarGastos, filtrarPorCategoria, totalGastosMes, gastosPorCategoria } from '@/lib/fileManagerGastos';
import { listarProductos } from '@/lib/fileManagerProductos';
import GastosClient from '@/components/gastos/GastosClient';

export const metadata = { title: 'Gastos Empresariales — Área 17' };

export default async function GastosPage({ searchParams }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');

  const params    = await searchParams;
  const categoria = params.categoria || '';
  const admin     = esAdmin(sesion);

  const [lista, totalMes, gastosCat, productos] = await Promise.all([
    categoria ? filtrarPorCategoria(categoria) : listarGastos(),
    totalGastosMes(),
    gastosPorCategoria(),
    admin ? listarProductos() : Promise.resolve([]),
  ]);

  return (
    <GastosClient
      lista={lista}
      categoriaActual={categoria}
      totalMes={totalMes}
      gastosPorCat={gastosCat}
      esAdmin={admin}
      productosExistentes={productos.map(p => p.nombre)}
    />
  );
}
