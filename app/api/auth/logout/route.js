import { NextResponse } from 'next/server';
import { cerrarSesion } from '@/lib/auth';

export async function POST() {
  await cerrarSesion();

  const response = NextResponse.json({ ok: true });
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}
