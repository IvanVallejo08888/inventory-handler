import { NextResponse } from 'next/server';
import { obtenerSesion, crearSesion } from '@/lib/auth';
import { hashSHA256, esCorreoValido, esArchivoSeguro, limpiarEntrada } from '@/lib/security';
import { leerUsuarios, actualizarUsuario } from '@/lib/fileManager';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR   = path.join(process.cwd(), 'public', 'uploads');
const EXTS_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const contentType = request.headers.get('content-type') || '';

  // ── Subida de foto (multipart) ───────────────────────────────────────────
  if (contentType.includes('multipart/form-data')) {
    try {
      const form = await request.formData();
      const foto = form.get('fotoPerfil');
      if (!foto || !foto.name) return NextResponse.json({ error: 'Debes seleccionar una imagen.' }, { status: 400 });

      const ext = foto.name.split('.').pop().toLowerCase();
      if (!EXTS_PERMITIDAS.includes(ext))
        return NextResponse.json({ error: 'Solo se permiten imágenes JPG, PNG o WEBP.' }, { status: 400 });

      const bytes = await foto.arrayBuffer();
      if (bytes.byteLength > MAX_SIZE)
        return NextResponse.json({ error: 'La imagen no puede superar 2 MB.' }, { status: 400 });

      // FIX: Verificar magic bytes (header de la imagen) para validar tipo real
      const header = new Uint8Array(bytes.slice(0, 4));
      const esImagenValida = (
        // JPEG: FF D8 FF
        (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) ||
        // PNG: 89 50 4E 47
        (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) ||
        // WEBP: empieza con RIFF (52 49 46 46)
        (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46)
      );
      if (!esImagenValida)
        return NextResponse.json({ error: 'El archivo no es una imagen válida.' }, { status: 400 });

      if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

      // FIX: Nombre de archivo fijo basado en ID del usuario (no en el nombre original del archivo)
      const nombreArchivo = `foto_${sesion.id}.${ext}`;

      // FIX: Eliminar fotos anteriores del usuario con diferente extensión
      for (const extVieja of EXTS_PERMITIDAS) {
        const rutaVieja = path.join(UPLOADS_DIR, `foto_${sesion.id}.${extVieja}`);
        if (extVieja !== ext && fs.existsSync(rutaVieja)) {
          fs.unlinkSync(rutaVieja);
        }
      }

      fs.writeFileSync(path.join(UPLOADS_DIR, nombreArchivo), Buffer.from(bytes));

      // FIX: Usar función centralizada para actualizar usuario
      const res = actualizarUsuario(sesion.identificacion, { fotoPerfil: nombreArchivo });
      if (res.error) return NextResponse.json({ error: res.error }, { status: 404 });

      // Renovar sesión con nueva foto
      await crearSesion({ ...sesion, fotoPerfil: nombreArchivo });
      return NextResponse.json({ ok: true, fotoPerfil: nombreArchivo });
    } catch (err) {
      console.error('[API perfil foto]', err);
      return NextResponse.json({ error: 'Error al procesar la imagen.' }, { status: 500 });
    }
  }

  // ── JSON actions ─────────────────────────────────────────────────────────
  try {
    const body   = await request.json();
    const accion = body.accion;

    if (accion === 'editarDatos') {
      const nombreCompleto = limpiarEntrada(body.nombreCompleto || '');
      const celular        = limpiarEntrada(body.celular || '');
      const tipoSangre     = limpiarEntrada(body.tipoSangre || '');
      const correo         = limpiarEntrada((body.correo || '').toLowerCase());

      if (!nombreCompleto) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
      if (correo && !esCorreoValido(correo)) return NextResponse.json({ error: 'Formato de correo inválido.' }, { status: 400 });

      const lista = leerUsuarios();
      const usuario = lista.find(u => u.id === sesion.id);
      if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

      // FIX: Verificar correo duplicado si cambió
      if (correo && correo !== usuario.correo.toLowerCase()) {
        const existe = lista.find(u => u.id !== sesion.id && u.correo.toLowerCase() === correo);
        if (existe) return NextResponse.json({ error: 'El correo ya está en uso.' }, { status: 409 });
      }

      const res = actualizarUsuario(sesion.identificacion, {
        nombreCompleto,
        celular:    celular    || usuario.celular,
        tipoSangre: tipoSangre || usuario.tipoSangre,
        correo:     correo     || usuario.correo,
      });
      if (res.error) return NextResponse.json(res, { status: 404 });

      // FIX: Renovar sesión con datos actualizados
      await crearSesion({ ...sesion, nombreCompleto, correo: correo || usuario.correo });
      return NextResponse.json({ ok: true });
    }

    if (accion === 'cambiarContrasena') {
      const { contrasenaActual, nuevaContrasena, confirmarContrasena } = body;

      const lista = leerUsuarios();
      const usuario = lista.find(u => u.id === sesion.id);
      if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

      if (hashSHA256(contrasenaActual) !== usuario.contrasena)
        return NextResponse.json({ error: 'La contraseña actual es incorrecta.' }, { status: 400 });

      if (!nuevaContrasena || nuevaContrasena.length < 8)
        return NextResponse.json({ error: 'La nueva contraseña debe tener mínimo 8 caracteres.' }, { status: 400 });

      if (nuevaContrasena !== confirmarContrasena)
        return NextResponse.json({ error: 'Las contraseñas no coinciden.' }, { status: 400 });

      // FIX: Verificar que la nueva contraseña sea diferente a la actual
      if (hashSHA256(nuevaContrasena) === usuario.contrasena)
        return NextResponse.json({ error: 'La nueva contraseña debe ser diferente a la actual.' }, { status: 400 });

      const res = actualizarUsuario(sesion.identificacion, { contrasena: hashSHA256(nuevaContrasena) });
      if (res.error) return NextResponse.json(res, { status: 404 });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (err) {
    console.error('[API perfil]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
