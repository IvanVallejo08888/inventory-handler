import { NextResponse } from 'next/server';
import { buscarPorIdentificacion } from '@/lib/fileManager';
import { hashSHA256 } from '@/lib/security';
import { crearSesion } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();

    // FIX: No usar sanitizar() (que codifica HTML) en identificación numérica — solo trim
    const identificacion = (body.identificacion || '').trim().replace(/\D/g, '');
    const contrasena = body.contrasena || '';

    // Validación servidor: campos vacíos
    if (!identificacion || !contrasena) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios.' },
        { status: 400 }
      );
    }

    // FIX: Limitar longitud para prevenir DoS
    if (identificacion.length > 20 || contrasena.length > 200) {
      return NextResponse.json(
        { error: 'Datos inválidos.' },
        { status: 400 }
      );
    }

    // Buscar usuario por identificación
    const usuario = buscarPorIdentificacion(identificacion);

    // FIX SEGURIDAD: Usar timing constante para evitar timing attacks
    // (comparar siempre, independientemente de si el usuario existe)
    const hashIngresado = hashSHA256(contrasena);
    const hashCorrecto = usuario?.contrasena || 'hash-invalido-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

    if (!usuario || hashIngresado !== hashCorrecto) {
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

    // FIX: Redirigir siempre al mismo dashboard (la ruta /dashboard detecta el rol)
    const destino = '/dashboard';

    return NextResponse.json({ ok: true, destino, rol: usuario.rol });
  } catch (err) {
    console.error('Error en login:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
