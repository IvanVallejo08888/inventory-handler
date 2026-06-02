/**
 * Formatea un valor monetario de forma compacta.
 *   1 010 000  → $1.0M
 *   6 800 000  → $6.8M
 *  25 500 000  → $25.5M
 *   1 200 000 000 → $1.2B
 *      950 000 → $950K
 *        1 200 → $1.2K
 */
export function fmtCompact(valor) {
  const v = Number(valor) || 0;
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `$${(v / 1_000).toFixed(1)}K`;
  return `$${Math.round(v).toLocaleString('es-CO')}`;
}

/** Formato largo (para tablas detalladas) */
export function fmtLargo(valor) {
  return `$${Number(valor || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
