import sql from './db.js';
import { hashSHA256 } from './security.js';

const SUPERADMIN = {
  id:             1000,
  nombreCompleto: 'Super Administrador',
  identificacion: '10800449108',
  celular:        '3000000000',
  tipoSangre:     'O+',
  correo:         'superadmin@area17.com',
  contrasena:     hashSHA256('CAMBIAR_ESTA_CONTRASENA'),
  rol:            'ADMINISTRADOR',
  activo:         true,
  fotoPerfil:     '',
};

function mapUsuario(row) {
  let fotoPerfil = row.foto_perfil || '';
  // Si la DB almacena base64 (nuevo formato), devolvemos el nombre estándar.
  // La API /api/foto-perfil busca el base64 en la DB por ID.
  if (fotoPerfil.startsWith('data:')) {
    const ext = fotoPerfil.includes('image/png') ? 'png'
              : fotoPerfil.includes('image/webp') ? 'webp'
              : 'jpg';
    fotoPerfil = `foto_${row.id}.${ext}`;
  }
  return {
    id:             row.id,
    nombreCompleto: row.nombre_completo,
    identificacion: row.identificacion,
    celular:        row.celular        || '',
    tipoSangre:     row.tipo_sangre    || '',
    correo:         row.correo,
    contrasena:     row.contrasena,
    rol:            row.rol,
    activo:         row.activo,
    fotoPerfil,
  };
}

async function asegurarSuperAdmin() {
  const rows = await sql`SELECT id FROM usuarios WHERE id = 1000`;
  if (!rows.length) {
    await sql`
      INSERT INTO usuarios (id, nombre_completo, identificacion, celular, tipo_sangre, correo, contrasena, rol, activo, foto_perfil)
      VALUES (${SUPERADMIN.id}, ${SUPERADMIN.nombreCompleto}, ${SUPERADMIN.identificacion}, ${SUPERADMIN.celular},
              ${SUPERADMIN.tipoSangre}, ${SUPERADMIN.correo}, ${SUPERADMIN.contrasena}, ${SUPERADMIN.rol},
              ${SUPERADMIN.activo}, ${SUPERADMIN.fotoPerfil})
      ON CONFLICT DO NOTHING
    `;
  }
}

export async function leerUsuarios() {
  await asegurarSuperAdmin();
  const rows = await sql`SELECT * FROM usuarios ORDER BY id`;
  return rows.map(mapUsuario);
}

export async function buscarPorIdentificacion(identificacion) {
  await asegurarSuperAdmin();
  const rows = await sql`SELECT * FROM usuarios WHERE identificacion = ${identificacion.trim()}`;
  return rows.length ? mapUsuario(rows[0]) : null;
}

export async function buscarPorCorreo(correo) {
  const rows = await sql`SELECT * FROM usuarios WHERE LOWER(correo) = ${correo.toLowerCase()}`;
  return rows.length ? mapUsuario(rows[0]) : null;
}

export async function contarUsuarios() {
  const rows = await sql`SELECT COUNT(*)::int AS c FROM usuarios`;
  return rows[0].c;
}

export async function contarAdmins() {
  const rows = await sql`SELECT COUNT(*)::int AS c FROM usuarios WHERE rol = 'ADMINISTRADOR'`;
  return rows[0].c;
}

export async function contarVendedores() {
  const rows = await sql`SELECT COUNT(*)::int AS c FROM usuarios WHERE rol = 'VENDEDOR'`;
  return rows[0].c;
}

export async function actualizarUsuario(identificacion, datos) {
  const rows = await sql`SELECT * FROM usuarios WHERE identificacion = ${identificacion.trim()}`;
  if (!rows.length) return { error: 'Usuario no encontrado.' };
  const u = mapUsuario(rows[0]);

  await sql`
    UPDATE usuarios SET
      nombre_completo = ${datos.nombreCompleto  ?? u.nombreCompleto},
      identificacion  = ${datos.identificacion  ?? u.identificacion},
      celular         = ${datos.celular         ?? u.celular},
      tipo_sangre     = ${datos.tipoSangre      ?? u.tipoSangre},
      correo          = ${datos.correo          ?? u.correo},
      rol             = ${datos.rol             ?? u.rol},
      activo          = ${datos.activo          !== undefined ? datos.activo : u.activo},
      contrasena      = ${datos.contrasena      ?? u.contrasena},
      foto_perfil     = ${datos.fotoPerfil      ?? u.fotoPerfil}
    WHERE identificacion = ${identificacion.trim()}
  `;
  return { ok: true };
}

export async function eliminarUsuario(identificacion) {
  const res = await sql`DELETE FROM usuarios WHERE identificacion = ${identificacion.trim()} RETURNING id`;
  if (!res.length) return { error: 'Usuario no encontrado.' };
  return { ok: true };
}

export async function registrarUsuario(datos) {
  const byCorreo = await sql`SELECT id FROM usuarios WHERE LOWER(correo) = ${datos.correo.toLowerCase()}`;
  if (byCorreo.length) return { error: 'El correo ya está registrado.' };

  const byId = await sql`SELECT id FROM usuarios WHERE identificacion = ${datos.identificacion.trim()}`;
  if (byId.length) return { error: 'La identificación ya está registrada.' };

  const maxRows = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM usuarios`;
  const id = maxRows[0].max + 1;

  await sql`
    INSERT INTO usuarios (id, nombre_completo, identificacion, celular, tipo_sangre, correo, contrasena, rol, activo, foto_perfil)
    VALUES (${id}, ${datos.nombreCompleto}, ${datos.identificacion}, ${datos.celular},
            ${datos.tipoSangre}, ${datos.correo}, ${hashSHA256(datos.contrasena)}, ${datos.rol}, true, '')
  `;
  return { ok: true, usuario: { id, ...datos } };
}
