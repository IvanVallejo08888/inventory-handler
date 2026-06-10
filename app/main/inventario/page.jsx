import { redirect } from 'next/navigation';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import {
  buscar, contarProductos, contarProductosActivos,
  totalUnidades, valorTotalInventario, listarProductos,
} from '@/lib/fileManagerProductos';
import InventarioClient from '@/components/inventario/InventarioClient';

export const metadata = { title: 'Inventario — Área 17' };

const LOW_STOCK_LIMIT = 5;
const CRITICAL_LIMIT  = 2;

function calcularNivel(stock) {
  if (stock === 0)             return 'AGOTADO';
  if (stock <= CRITICAL_LIMIT) return 'CRITICO';
  return 'BAJO';
}

export default async function InventarioPage({ searchParams }) {
  const sesion = await obtenerSesion();
  if (!sesion)          redirect('/login');
  if (!esAdmin(sesion)) redirect('/main/dashboard');

  const params  = await searchParams;
  const termino = params.buscar || '';
  const estado  = params.estado || 'TODOS';

  const [lista, todos, total, activos, unidades, valorInv] = await Promise.all([
    buscar(termino, estado),
    listarProductos(),
    contarProductos(),
    contarProductosActivos(),
    totalUnidades(),
    valorTotalInventario(),
  ]);

  const stockBajo = todos
    .filter(p => p.estado === 'ACTIVO' && p.cantidad <= LOW_STOCK_LIMIT)
    .map(p => ({
      id:       p.id,
      codigo:   p.codigo,
      nombre:   p.nombre,
      precio:   p.precio,
      cantidad: p.cantidad,
      estado:   p.estado,
      stock:    p.cantidad,
      nivel:    calcularNivel(p.cantidad),
    }))
    .sort((a, b) => a.stock - b.stock);

  return (
    <InventarioClient
      lista={lista}
      todosProductos={todos}
      totalProductos={total}
      productosActivos={activos}
      totalUnidades={unidades}
      valorInventario={valorInv}
      buscar={termino}
      filtroEstado={estado}
      stockBajo={stockBajo}
    />
  );
}
