import { NextResponse } from 'next/server';
import { obtenerSesion } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// FIX CRÍTICO DE SEGURIDAD: Validación estricta de path traversal
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const archivo = searchParams.get('archivo');

  if (!archivo) {
    return NextResponse.json({ error: 'Archivo no válido.' }, { status: 400 });
  }

  // Verificar que el archivo solamente sea de foto de perfil (formato foto_ID.ext)
  const regexFoto = /^foto_\d+\.(jpg|jpeg|png|webp)$/i;
  if (!regexFoto.test(archivo)) {
    return NextResponse.json({ error: 'Archivo no válido.' }, { status: 400 });
  }

  // FIX: Resolver path y verificar que esté dentro de UPLOADS_DIR (doble verificación)
  const rutaArchivo = path.resolve(UPLOADS_DIR, archivo);
  if (!rutaArchivo.startsWith(path.resolve(UPLOADS_DIR))) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  if (!fs.existsSync(rutaArchivo)) {
    return NextResponse.json({ error: 'Foto no encontrada.' }, { status: 404 });
  }

  const ext = archivo.split('.').pop().toLowerCase();
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const mimeType = mimeMap[ext] || 'application/octet-stream';

  const buffer = fs.readFileSync(rutaArchivo);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      // FIX: Cache corto (1 hora) con revalidación para fotos de perfil actualizadas
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  });
}
