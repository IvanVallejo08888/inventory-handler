import { NextResponse }  from 'next/server';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { listarProductos }        from '@/lib/fileManagerProductos';

export const LOW_STOCK_LIMIT = 5;
export const CRITICAL_LIMIT  = 2;

export function calcularNivel(stock) {
  if (stock === 0)              return 'AGOTADO';
  if (stock <= CRITICAL_LIMIT)  return 'CRITICO';
  if (stock <= LOW_STOCK_LIMIT) return 'BAJO';
  return 'NORMAL';
}

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion)          return NextResponse.json({ error: 'No autenticado.' },  { status: 401 });
  if (!esAdmin(sesion)) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

  const productos = (await listarProductos())
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

  return NextResponse.json(productos);
}
