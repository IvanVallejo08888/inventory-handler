import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

const RUTAS_PUBLICAS = ['/login', '/registro', '/api/auth/login', '/api/auth/registro'];

function getSecret() {
  const s = process.env.JWT_SECRET || 'area17-secret-key-universidad-mariana-2026';
  return new TextEncoder().encode(s);
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (
    RUTAS_PUBLICAS.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Redirigir raíz a login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const token = request.cookies.get('area17_session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('area17_session');
    return res;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
