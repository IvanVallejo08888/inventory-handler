import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'area17_session';
const DURACION_SEGUNDOS = 30 * 60;

function getSecret() {
  const s = process.env.JWT_SECRET || 'area17-secret-key-universidad-mariana-2026';
  return new TextEncoder().encode(s);
}

export async function crearSesion(usuario) {
  const token = await new SignJWT({
    id: usuario.id,
    nombreCompleto: usuario.nombreCompleto,
    identificacion: usuario.identificacion,
    correo: usuario.correo,
    rol: usuario.rol,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${DURACION_SEGUNDOS}s`)
    .setIssuedAt()
    .sign(getSecret());

  // Next.js 15/16: cookies() es async
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
