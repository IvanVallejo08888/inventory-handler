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

export function limpiarEntrada(texto) {
  if (typeof texto !== 'string') return '';
  return texto.replace(/[|\n\r]/g, '').trim();
}

export function truncar(texto, max = 200) {
  if (typeof texto !== 'string') return '';
  return texto.slice(0, max);
}
