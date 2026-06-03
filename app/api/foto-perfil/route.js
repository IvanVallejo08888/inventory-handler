import { NextResponse } from 'next/server';
import { obtenerSesion } from '@/lib/auth';
import sql from '@/lib/db';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const archivo = searchParams.get('archivo');

  if (!archivo) return NextResponse.json({ error: 'Parámetro requerido.' }, { status: 400 });

  // Validar formato: foto_{userId}.{ext}
  const match = archivo.match(/^foto_(\d+)\.(jpg|jpeg|png|webp)$/i);
  if (!match) return NextResponse.json({ error: 'Archivo no válido.' }, { status: 400 });

  const userId = parseInt(match[1], 10);

  // 1. Intentar leer desde la DB (base64 data URL — funciona en Vercel)
  try {
    const rows = await sql`SELECT foto_perfil FROM usuarios WHERE id = ${userId}`;
    if (rows.length && rows[0].foto_perfil && rows[0].foto_perfil.startsWith('data:')) {
      const dataUrl  = rows[0].foto_perfil;
      const mimeType = dataUrl.substring(5, dataUrl.indexOf(';'));
      const b64Data  = dataUrl.split(',')[1];
      const buffer   = Buffer.from(b64Data, 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'private, max-age=300, must-revalidate',
        },
      });
    }
  } catch (err) {
    console.error('[foto-perfil] Error leyendo DB:', err);
  }

  // 2. Fallback: leer desde filesystem (solo funciona en localhost con archivos legacy)
  const rutaArchivo = path.resolve(UPLOADS_DIR, archivo);
  if (!rutaArchivo.startsWith(path.resolve(UPLOADS_DIR))) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }
  if (fs.existsSync(rutaArchivo)) {
    const ext     = archivo.split('.').pop().toLowerCase();
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    const buffer  = fs.readFileSync(rutaArchivo);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeMap[ext] || 'image/jpeg',
        'Cache-Control': 'private, max-age=300, must-revalidate',
      },
    });
  }

  return NextResponse.json({ error: 'Foto no encontrada.' }, { status: 404 });
}
