import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

// FIX: Rutas públicas completas (sin autenticación)
const RUTAS_PUBLICAS = [
  '/login',
  '/registro',
  '/api/auth/login',
  '/api/auth/registro',
  '/offline.html',
];

// FIX: Rutas que requieren rol de ADMINISTRADOR
const RUTAS_SOLO_ADMIN = [
  '/main/usuarios',
  '/main/inventario',
  '/main/reportes',
  '/api/productos',
  '/api/reportes',
  '/api/usuarios',
];

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    return new TextEncoder().encode('area17-secret-key-universidad-mariana-2026-INSECURE');
  }
  return new TextEncoder().encode(s);
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Permitir archivos estáticos y rutas públicas
  if (
    RUTAS_PUBLICAS.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/sw.js')
  ) {
    return NextResponse.next();
  }

  // Redirigir raíz
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const token = request.cookies.get('area17_session')?.value;

  if (!token) {
    // FIX: Guardar la URL original para redirigir después del login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());

    // FIX: Verificar rutas de solo admin
    if (RUTAS_SOLO_ADMIN.some(r => pathname.startsWith(r)) && payload.rol !== 'ADMINISTRADOR') {
      // Redirigir a dashboard sin acceso
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch {
    // Token inválido o expirado → redirigir a login y limpiar cookie
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('area17_session');
    return res;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|offline.html).*)'],
};
