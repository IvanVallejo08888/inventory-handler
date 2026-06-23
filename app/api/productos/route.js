import { NextResponse } from 'next/server';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import {
  agregarProducto, editarProducto, eliminarProducto,
  agregarProductoConVariantes, editarProductoConVariantes,
  buscarPorId, listarVariantes,
} from '@/lib/fileManagerProductos';
import { limpiarEntrada, truncar } from '@/lib/security';

const TALLAS_VALIDAS = (arr) => Array.isArray(arr) && arr.every(v =>
  v && typeof v.talla === 'string' && Number.isFinite(parseInt(v.cantidad)) && parseInt(v.cantidad) >= 0
);

function normalizarVariantes(raw) {
  if (!TALLAS_VALIDAS(raw)) return null;
  return raw
    .map(v => ({ talla: String(v.talla).trim().toUpperCase(), cantidad: Math.max(0, parseInt(v.cantidad) || 0), precioCompra: Math.max(0, parseFloat(v.precioCompra) || 0) }))
    .filter(v => v.talla);
}

export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion)          return NextResponse.json({ error: 'No autenticado.' },   { status: 401 });
  if (!esAdmin(sesion)) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id'));
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

  const producto = await buscarPorId(id);
  if (!producto) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
  const variantes = await listarVariantes(id);
  return NextResponse.json({ producto, variantes });
}

export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion)          return NextResponse.json({ error: 'No autenticado.' },   { status: 401 });
  if (!esAdmin(sesion)) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

  try {
    const body   = await request.json();
    const accion = body.accion;

    if (accion === 'agregar') {
      const nombre    = limpiarEntrada(truncar(body.nombre || '', 200));
      const precio    = parseFloat(body.precio)   || 0;
      const variantes = normalizarVariantes(body.variantes);

      if (!nombre)    return NextResponse.json({ error: 'El nombre es obligatorio.' },           { status: 400 });
      if (precio < 0) return NextResponse.json({ error: 'El precio no puede ser negativo.' },    { status: 400 });
      if (precio > 999_999_999)  return NextResponse.json({ error: 'Precio demasiado alto.' },   { status: 400 });

      if (variantes && variantes.length) {
        const res = await agregarProductoConVariantes({
          nombre, precio, estado: body.estado || 'ACTIVO',
          tipo: body.tipo || null, subTipo: body.subTipo || null,
          variantes,
        });
        if (res.error) return NextResponse.json(res, { status: 400 });
        return NextResponse.json(res);
      }

      const cantidad = parseInt(body.cantidad) || 0;
      if (cantidad < 0) return NextResponse.json({ error: 'La cantidad no puede ser negativa.' },{ status: 400 });
      if (cantidad > 999_999)    return NextResponse.json({ error: 'Cantidad demasiado alta.' },  { status: 400 });

      const res = await agregarProducto({ nombre, precio, cantidad, estado: body.estado || 'ACTIVO' });
      if (res.error) return NextResponse.json(res, { status: 400 });
      return NextResponse.json(res);
    }

    if (accion === 'editar') {
      const nombre    = limpiarEntrada(truncar(body.nombre || '', 200));
      const precio    = parseFloat(body.precio)   || 0;
      const id        = parseInt(body.id);
      const variantes = normalizarVariantes(body.variantes);

      if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
      if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

      if (variantes) {
        const res = await editarProductoConVariantes({ id, nombre, precio, estado: body.estado || 'ACTIVO', variantes });
        if (res.error) return NextResponse.json(res, { status: 400 });
        return NextResponse.json(res);
      }

      const cantidad = parseInt(body.cantidad) || 0;
      const res = await editarProducto({ id, nombre, precio, cantidad, estado: body.estado || 'ACTIVO' });
      if (res.error) return NextResponse.json(res, { status: 400 });
      return NextResponse.json(res);
    }

    if (accion === 'eliminar') {
      const id = parseInt(body.id);
      if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
      const res = await eliminarProducto(id);
      if (res.error) return NextResponse.json(res, { status: 400 });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (err) {
    console.error('[API productos]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
