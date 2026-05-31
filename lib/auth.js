import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'area17_session';
// FIX: Sesión de 8 horas (en lugar de 30 minutos para no expirar en jornada laboral)
const DURACION_SEGUNDOS = 8 * 60 * 60;

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    // FIX SEGURIDAD: Advertir en desarrollo si falta la variable de entorno
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] JWT_SECRET no está definido en .env.local — usando clave de desarrollo insegura');
    }
    return new TextEncoder().encode('area17-secret-key-universidad-mariana-2026-INSECURE');
  }
  return new TextEncoder().encode(s);
}

export async function crearSesion(usuario) {
  const token = await new SignJWT({
    id: usuario.id,
    nombreCompleto: usuario.nombreCompleto,
    identificacion: usuario.identificacion,
    correo: usuario.correo,
    rol: usuario.rol,
    // FIX: incluir fotoPerfil en el token para que Navbar lo lea correctamente
    fotoPerfil: usuario.fotoPerfil || '',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${DURACION_SEGUNDOS}s`)
    .setIssuedAt()
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: DURACION_SEGUNDOS,
    path: '/',
  });

  return token;
}

export async function obtenerSesion() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    // FIX: token inválido o expirado → retornar null limpiamente
    return null;
  }
}

export async function cerrarSesion() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function esAdmin(sesion) {
  return sesion?.rol === 'ADMINISTRADOR';
}
