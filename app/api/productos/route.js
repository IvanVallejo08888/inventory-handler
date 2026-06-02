import { NextResponse } from 'next/server';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { agregarProducto, editarProducto, eliminarProducto } from '@/lib/fileManagerProductos';
import { limpiarEntrada, truncar } from '@/lib/security';

export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion)          return NextResponse.json({ error: 'No autenticado.' },   { status: 401 });
  if (!esAdmin(sesion)) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

  try {
    const body   = await request.json();
    const accion = body.accion;

    if (accion === 'agregar') {
      const nombre   = limpiarEntrada(truncar(body.nombre || '', 200));
      const precio   = parseFloat(body.precio)   || 0;
      const cantidad = parseInt(body.cantidad)   || 0;

      if (!nombre)    return NextResponse.json({ error: 'El nombre es obligatorio.' },           { status: 400 });
      if (precio < 0) return NextResponse.json({ error: 'El precio no puede ser negativo.' },    { status: 400 });
      if (cantidad < 0) return NextResponse.json({ error: 'La cantidad no puede ser negativa.' },{ status: 400 });
      if (precio > 999_999_999)  return NextResponse.json({ error: 'Precio demasiado alto.' },   { status: 400 });
      if (cantidad > 999_999)    return NextResponse.json({ error: 'Cantidad demasiado alta.' },  { status: 400 });

      const res = await agregarProducto({ nombre, precio, cantidad, estado: body.estado || 'ACTIVO' });
      if (res.error) return NextResponse.json(res, { status: 400 });
      return NextResponse.json(res);
    }

    if (accion === 'editar') {
      const nombre   = limpiarEntrada(truncar(body.nombre || '', 200));
      const precio   = parseFloat(body.precio)   || 0;
      const cantidad = parseInt(body.cantidad)   || 0;

      if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });

      const res = await editarProducto({ id: parseInt(body.id), nombre, precio, cantidad, estado: body.estado || 'ACTIVO' });
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
