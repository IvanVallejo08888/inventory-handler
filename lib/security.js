import crypto from 'crypto';

export function hashSHA256(texto) {
  return crypto.createHash('sha256').update(texto).digest('hex');
}

export function esCorreoValido(correo) {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(correo);
}

export function limpiarCelular(celular) {
  return celular.replace(/[\s\-()\+]/g, '');
}

export function esCelularValido(celular) {
  const limpio = limpiarCelular(celular);
  return /^[0-9]{7,15}$/.test(limpio);
}

export function esContrasenaValida(contrasena) {
  return typeof contrasena === 'string' && contrasena.length >= 8;
}

export function determinarRol(claveEspecial) {
  if (claveEspecial === 'Area172026ADM') return 'ADMINISTRADOR';
  if (claveEspecial === 'vendedorArea17') return 'VENDEDOR';
  return null;
}

/** Sanitización HTML para salida en UI */
export function sanitizar(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * FIX: Limpia entradas de texto para almacenarlas en archivos TXT delimitados por pipes.
 * Elimina el delimitador | para evitar corrupción del formato.
 */
export function limpiarEntrada(texto) {
  if (typeof texto !== 'string') return '';
  return texto.replace(/\|/g, '').trim();
}

/**
 * FIX SEGURIDAD: Valida que un nombre de archivo sea seguro (sin path traversal).
 */
export function esArchivoSeguro(nombre) {
  if (!nombre || typeof nombre !== 'string') return false;
  if (nombre.includes('..') || nombre.includes('/') || nombre.includes('\\')) return false;
  // Solo letras, números, guiones, puntos y guiones bajos
  return /^[a-zA-Z0-9._-]+$/.test(nombre);
}

/**
 * FIX SEGURIDAD: Limita el tamaño de strings para prevenir DoS.
 */
export function truncar(texto, max = 500) {
  if (typeof texto !== 'string') return '';
  return texto.slice(0, max);
}
