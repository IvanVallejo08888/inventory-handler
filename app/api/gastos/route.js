import { NextResponse } from 'next/server';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { crear, actualizar, eliminar } from '@/lib/fileManagerGastos';
import { limpiarEntrada, truncar } from '@/lib/security';

const CATEGORIAS_VALIDAS = ['SERVICIO', 'INVERSION', 'COMPRA', 'GASTO_DIARIO'];

export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  try {
    const body   = await request.json();
    const accion = body.accion;

    if ((accion === 'eliminar' || accion === 'editar') && !esAdmin(sesion)) {
      return NextResponse.json({ error: 'Sin permisos para esta acción.' }, { status: 403 });
    }

    if (accion === 'agregar') {
      const nombre      = limpiarEntrada(truncar(body.nombre || '', 200));
      const valor       = parseFloat(body.valor) || 0;
      const categoria   = body.categoria || 'GASTO_DIARIO';
      const descripcion = limpiarEntrada(truncar(body.descripcion || '', 500));

      if (!nombre)  return NextResponse.json({ error: 'El nombre es obligatorio.' },        { status: 400 });
      if (!valor || valor <= 0) return NextResponse.json({ error: 'El valor debe ser mayor a 0.' }, { status: 400 });
      if (valor > 999_999_999)  return NextResponse.json({ error: 'Valor demasiado alto.' }, { status: 400 });
      if (categoria && !CATEGORIAS_VALIDAS.includes(categoria))
        return NextResponse.json({ error: 'Categoría no válida.' }, { status: 400 });

      const res = await crear({ nombre, valor, fecha: body.fecha, categoria, descripcion });
      if (res.error) return NextResponse.json(res, { status: 400 });
      return NextResponse.json(res);
    }

    if (accion === 'editar') {
      const id          = parseInt(body.id);
      const nombre      = limpiarEntrada(truncar(body.nombre || '', 200));
      const valor       = parseFloat(body.valor) || 0;
      const categoria   = body.categoria || 'GASTO_DIARIO';
      const descripcion = limpiarEntrada(truncar(body.descripcion || '', 500));

      if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
      if (!nombre)   return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
      if (categoria && !CATEGORIAS_VALIDAS.includes(categoria))
        return NextResponse.json({ error: 'Categoría no válida.' }, { status: 400 });

      const res = await actualizar(id, { nombre, valor, fecha: body.fecha, categoria, descripcion });
      if (res.error) return NextResponse.json(res, { status: 400 });
      return NextResponse.json(res);
    }

    if (accion === 'eliminar') {
      const id = parseInt(body.id);
      if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
      const res = await eliminar(id);
      if (res.error) return NextResponse.json(res, { status: 400 });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (err) {
    console.error('[API gastos]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
