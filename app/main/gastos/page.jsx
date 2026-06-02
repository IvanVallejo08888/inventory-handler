import { redirect }      from 'next/navigation';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { listarGastos, filtrarPorCategoria, totalGastosMes, gastosPorCategoria } from '@/lib/fileManagerGastos';
import GastosClient from '@/components/gastos/GastosClient';

export const metadata = { title: 'Gastos Empresariales — Área 17' };

export default async function GastosPage({ searchParams }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');

  const params   = await searchParams;
  const categoria = params.categoria || '';
  const lista     = categoria ? filtrarPorCategoria(categoria) : listarGastos();

  return (
    <GastosClient
      lista={lista}
      categoriaActual={categoria}
      totalMes={totalGastosMes()}
      gastosPorCat={gastosPorCategoria()}
      esAdmin={esAdmin(sesion)}
    />
  );
}
