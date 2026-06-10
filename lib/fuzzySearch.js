/**
 * Utilidades de búsqueda difusa (fuzzy) para el inventario.
 * Permite encontrar productos por coincidencia parcial de palabras,
 * abreviaciones e iniciales, ignorando tildes, mayúsculas y caracteres especiales.
 */

/** Normaliza texto: minúsculas, sin tildes/diacríticos, sin caracteres especiales, espacios colapsados */
export function normalizarTexto(texto) {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes y diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')    // quita caracteres especiales
    .replace(/\s+/g, ' ')
    .trim();
}

/** Convierte un texto en una lista de palabras normalizadas (tokens) */
export function tokenizar(texto) {
  const n = normalizarTexto(texto);
  return n ? n.split(' ') : [];
}

/** True si `patron` aparece como subsecuencia de `texto` (mismo orden, no necesariamente contiguo) */
function esSubsecuencia(patron, texto) {
  if (!patron) return true;
  let i = 0;
  for (let j = 0; j < texto.length && i < patron.length; j++) {
    if (patron[i] === texto[j]) i++;
  }
  return i === patron.length;
}

/** Score de coincidencia de un token contra una palabra (menor = mejor); null si no coincide */
function scoreToken(token, palabra) {
  if (!palabra) return null;
  if (palabra === token)        return 0; // coincidencia exacta
  if (palabra.startsWith(token)) return 1; // prefijo
  if (palabra.includes(token))   return 2; // substring
  if (esSubsecuencia(token, palabra)) return 3; // abreviación / iniciales
  return null;
}

/**
 * Calcula el score de coincidencia de un producto (lista de palabras) contra
 * los tokens de búsqueda. Cada token debe coincidir con al menos una palabra
 * del producto (en cualquier orden). Devuelve `null` si algún token no coincide
 * con ninguna palabra (el producto no debe mostrarse).
 * Menor score = coincidencia más cercana.
 */
export function scoreCoincidencia(palabrasProducto, tokensBusqueda) {
  if (!tokensBusqueda.length) return 0;

  let total = 0;
  for (const token of tokensBusqueda) {
    let mejor = null;
    for (const palabra of palabrasProducto) {
      const s = scoreToken(token, palabra);
      if (s !== null && (mejor === null || s < mejor)) mejor = s;
      if (mejor === 0) break;
    }
    if (mejor === null) return null;
    total += mejor;
  }
  return total;
}
