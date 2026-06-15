// Tallas disponibles por tipo/sub-tipo de producto — usadas tanto por el formulario
// de Inventario como por el formulario de Inversión (Gastos), para que ambos generen
// exactamente los mismos nombres de variante (p. ej. "CAMISA COLOMBIA TALLA S").

export const TALLAS_ROPA      = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
export const TALLAS_ROPA_NINO = Array.from({ length: 15 }, (_, i) => String(i * 2)); // 0,2,4,...,28
export const TALLAS_NINO      = Array.from({ length: 17 }, (_, i) => String(i));
export const TALLAS_ADULTO    = Array.from({ length: 19 }, (_, i) => String(i + 24));

// Devuelve el arreglo de tallas correspondiente a un tipo/sub-tipo de producto.
// Para GENERAL (o combinaciones sin tallas) devuelve un arreglo vacío.
export function tallasPara(tipo, subTipo) {
  if (tipo === 'ROPA'    && subTipo === 'ADULTO') return TALLAS_ROPA;
  if (tipo === 'ROPA'    && subTipo === 'NINO')   return TALLAS_ROPA_NINO;
  if (tipo === 'CALZADO' && subTipo === 'NINO')   return TALLAS_NINO;
  if (tipo === 'CALZADO' && subTipo === 'ADULTO') return TALLAS_ADULTO;
  return [];
}
