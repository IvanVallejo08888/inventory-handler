import { NextResponse } from 'next/server';
import { buscarPorIdentificacion } from '@/lib/fileManager';
import { hashSHA256, sanitizar } from '@/lib/security';
import { crearSesion } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const identificacion = sanitizar(body.identificacion || '');
    const contrasena = body.contrasena || '';

    // Validación servidor: campos vacíos
    if (!identificacion || !contrasena) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios.' },
        { status: 400 }
      );
    }

    // Buscar usuario por identificación
    const usuario = buscarPorIdentificacion(identificacion);

    if (!usuario) {
      return NextResponse.json(
        { error: 'Identificación o contraseña incorrectos.' },
        { status: 401 }
      );
    }

    // Verificar contraseña (SHA-256)
    if (hashSHA256(contrasena) !== usuario.contrasena) {
      return NextResponse.json(
        { error: 'Identificación o contraseña incorrectos.' },
        { status: 401 }
      );
    }

    // Verificar que esté activo
    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'Tu cuenta está inactiva. Contacta al administrador.' },
        { status: 403 }
      );
    }

    // Crear sesión JWT
    await crearSesion(usuario);

    const destino = usuario.rol === 'ADMINISTRADOR'
      ? '/dashboard?rol=admin'
      : '/dashboard?rol=vendedor';

    return NextResponse.json({ ok: true, destino, rol: usuario.rol });
  } catch (err) {
    console.error('Error en login:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
