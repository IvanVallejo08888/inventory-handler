import { NextResponse } from 'next/server';
import {
  esCorreoValido,
  esCelularValido,
  limpiarCelular,
  esContrasenaValida,
  determinarRol,
  limpiarEntrada,
  truncar,
} from '@/lib/security';
import { registrarUsuario } from '@/lib/fileManager';

const TIPOS_SANGRE_VALIDOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export async function POST(request) {
  try {
    const body = await request.json();

    // FIX: Usar limpiarEntrada (no sanitizar HTML) para datos que se almacenan
    const nombreCompleto = limpiarEntrada(truncar(body.nombreCompleto || '', 100));
    const identificacion = (body.identificacion || '').replace(/\D/g, '').slice(0, 20);
    const celularRaw = body.celular || '';
    const tipoSangre = limpiarEntrada(body.tipoSangre || '');
    const correo = limpiarEntrada(truncar((body.correo || '').toLowerCase(), 150));
    const contrasena = body.contrasena || '';
    const confirmar = body.confirmar || '';
    const claveEspecial = body.claveEspecial || '';

    // 1. Campos vacíos
    if (!nombreCompleto || !identificacion || !celularRaw || !tipoSangre || !correo || !contrasena || !confirmar || !claveEspecial) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    // 2. Formato correo
    if (!esCorreoValido(correo)) {
      return NextResponse.json({ error: 'El correo no tiene un formato válido.' }, { status: 400 });
    }

    // 3. Celular
    if (!esCelularValido(celularRaw)) {
      return NextResponse.json({ error: 'El celular debe tener entre 7 y 15 dígitos.' }, { status: 400 });
    }

    // 4. Contraseña mínimo 8 caracteres
    if (!esContrasenaValida(contrasena)) {
      return NextResponse.json({ error: 'La contraseña debe tener mínimo 8 caracteres.' }, { status: 400 });
    }

    // 5. Contraseñas coinciden
    if (contrasena !== confirmar) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden.' }, { status: 400 });
    }

    // 6. Clave especial → determinar rol
    const rol = determinarRol(claveEspecial);
    if (!rol) {
      return NextResponse.json({ error: 'La clave especial no es válida.' }, { status: 400 });
    }

    // 7. Tipo de sangre válido
    if (!TIPOS_SANGRE_VALIDOS.includes(tipoSangre)) {
      return NextResponse.json({ error: 'Tipo de sangre no válido.' }, { status: 400 });
    }

    // Registrar usuario
    const resultado = registrarUsuario({
      nombreCompleto,
      identificacion,
      celular: limpiarCelular(celularRaw),
      tipoSangre,
      correo,
      contrasena,
      rol,
    });

    if (resultado.error) {
      return NextResponse.json({ error: resultado.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error en registro:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
