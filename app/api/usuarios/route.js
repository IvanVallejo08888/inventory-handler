import { NextResponse } from 'next/server';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { leerUsuarios, actualizarUsuario, eliminarUsuario } from '@/lib/fileManager';
import { hashSHA256, esCorreoValido, esContrasenaValida, limpiarEntrada } from '@/lib/security';

const SUPERADMIN_ID = 1000;

export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion)          return NextResponse.json({ error: 'No autenticado.' },   { status: 401 });
  if (!esAdmin(sesion)) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

  try {
    const body   = await request.json();
    const accion = body.accion;

    if (accion === 'editar') {
      const id = parseInt(body.id);
      if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

      const lista = leerUsuarios();
      const usuario = lista.find(u => u.id === id);
      if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

      // FIX: Protección — no puede auto-degradarse ni desactivarse
      let rol    = body.rol    || usuario.rol;
      let activo = body.activo !== undefined ? body.activo === 'true' : usuario.activo;
      if (id === sesion.id) {
        rol    = 'ADMINISTRADOR';
        activo = true;
      }

      // FIX: Validaciones de campos
      const nombreCompleto = limpiarEntrada(body.nombreCompleto || '');
      if (!nombreCompleto) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });

      const correo = body.correo ? limpiarEntrada(body.correo.toLowerCase()) : usuario.correo;
      if (correo && !esCorreoValido(correo)) {
        return NextResponse.json({ error: 'Correo inválido.' }, { status: 400 });
      }

      // FIX: Verificar correo duplicado (excluyendo al mismo usuario)
      if (body.correo && body.correo.toLowerCase() !== usuario.correo.toLowerCase()) {
        const correoExiste = lista.find(u => u.id !== id && u.correo.toLowerCase() === correo);
        if (correoExiste) return NextResponse.json({ error: 'El correo ya está en uso.' }, { status: 409 });
      }

      // Contraseña opcional
      let contrasena = usuario.contrasena;
      if (body.nuevaContrasena) {
        if (!esContrasenaValida(body.nuevaContrasena))
          return NextResponse.json({ error: 'La contraseña debe tener mínimo 8 caracteres.' }, { status: 400 });
        if (body.nuevaContrasena !== body.confirmarContrasena)
          return NextResponse.json({ error: 'Las contraseñas no coinciden.' }, { status: 400 });
        contrasena = hashSHA256(body.nuevaContrasena);
      }

      const res = actualizarUsuario(usuario.identificacion, {
        nombreCompleto,
        identificacion: body.identificacion || usuario.identificacion,
        celular:        body.celular        || usuario.celular,
        tipoSangre:     body.tipoSangre     || usuario.tipoSangre,
        correo,
        rol,
        activo,
        contrasena,
      });

      if (res.error) return NextResponse.json(res, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (accion === 'eliminar') {
      const id = parseInt(body.id);
      if (id === SUPERADMIN_ID) return NextResponse.json({ error: 'El superadministrador no puede ser eliminado.' }, { status: 403 });
      if (id === sesion.id)     return NextResponse.json({ error: 'No puedes eliminar tu propio usuario.' },          { status: 403 });

      const todos   = leerUsuarios();
      const target  = todos.find(u => u.id === id);
      if (!target) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

      const res = eliminarUsuario(target.identificacion);
      if (res.error) return NextResponse.json(res, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (err) {
    console.error('[API usuarios]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
