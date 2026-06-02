import { NextResponse } from 'next/server';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { agregar, eliminar } from '@/lib/fileManagerRecomendaciones';

export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  try {
    const body   = await request.json();
    const accion = body.accion;

    if (accion === 'guardar') {
      if (esAdmin(sesion)) return NextResponse.json({ error: 'Solo vendedores pueden enviar recomendaciones.' }, { status: 403 });
      const res = await agregar({ contenido: body.contenido, vendedor: sesion.nombreCompleto });
      if (res.error) return NextResponse.json(res, { status: 400 });
      return NextResponse.json(res);
    }

    if (accion === 'eliminar') {
      if (!esAdmin(sesion)) return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 });
      const res = await eliminar(parseInt(body.id));
      if (res.error) return NextResponse.json(res, { status: 400 });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (err) {
    console.error('[API recomendaciones]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
