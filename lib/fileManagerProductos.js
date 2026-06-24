import sql from './db.js';
import { limpiarEntrada } from './security.js';
import { fechaHoyColombia } from './fechaColombia.js';

// Auto-migración idempotente: agrega merged_into (producto fusionado) y la tabla de variantes
// por talla, si la BD aún no las tiene.
let schemaVariantesReady = null;
function ensureSchemaVariantes() {
  if (!schemaVariantesReady) {
    schemaVariantesReady = (async () => {
      await sql`ALTER TABLE productos ADD COLUMN IF NOT EXISTS merged_into INTEGER`;
      await sql`
        CREATE TABLE IF NOT EXISTS product_variants (
          id                      SERIAL PRIMARY KEY,
          product_id              INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
          talla                   TEXT NOT NULL,
          cantidad                INTEGER NOT NULL DEFAULT 0,
          precio_compra_unitario  NUMERIC(12,2) NOT NULL DEFAULT 0,
          created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (product_id, talla)
        )
      `;
    })().catch(err => { schemaVariantesReady = null; throw err; });
  }
  return schemaVariantesReady;
}

function mapProducto(row) {
  return {
    id:            row.id,
    codigo:        row.codigo,
    nombre:        row.nombre,
    precio:        parseFloat(row.precio),
    cantidad:      row.cantidad,
    fechaRegistro: row.fecha_registro,
    estado:        row.estado,
    precioCompra:  row.precio_compra != null ? parseFloat(row.precio_compra) : 0,
    tipo:          row.tipo || null,
    subTipo:       row.sub_tipo || null,
  };
}

function mapVariante(row) {
  return {
    id:               row.id,
    productId:        row.product_id,
    talla:            row.talla,
    cantidad:         row.cantidad,
    precioCompra:     parseFloat(row.precio_compra_unitario) || 0,
  };
}

function hoy() { return fechaHoyColombia(); }
function generarCodigo(id) { return `PROD-${String(id).padStart(4, '0')}`; }

export async function listarProductos() {
  const rows = await sql`SELECT * FROM productos WHERE estado <> 'FUSIONADO' ORDER BY id`;
  return rows.map(mapProducto);
}

export async function buscarPorId(id) {
  const rows = await sql`SELECT * FROM productos WHERE id = ${id}`;
  return rows.length ? mapProducto(rows[0]) : null;
}

export async function buscarPorCodigo(codigo) {
  if (!codigo) return null;
  const rows = await sql`SELECT * FROM productos WHERE LOWER(codigo) = ${codigo.toLowerCase()}`;
  return rows.length ? mapProducto(rows[0]) : null;
}

export async function buscar(termino, estado) {
  let rows;
  if (termino && termino.trim()) {
    const t = `%${termino.trim().toLowerCase()}%`;
    if (estado && estado !== 'TODOS') {
      rows = await sql`SELECT * FROM productos WHERE (LOWER(nombre) LIKE ${t} OR LOWER(codigo) LIKE ${t}) AND estado = ${estado} ORDER BY id`;
    } else {
      rows = await sql`SELECT * FROM productos WHERE (LOWER(nombre) LIKE ${t} OR LOWER(codigo) LIKE ${t}) AND estado <> 'FUSIONADO' ORDER BY id`;
    }
  } else if (estado && estado !== 'TODOS') {
    rows = await sql`SELECT * FROM productos WHERE estado = ${estado} ORDER BY id`;
  } else {
    rows = await sql`SELECT * FROM productos WHERE estado <> 'FUSIONADO' ORDER BY id`;
  }
  return rows.map(mapProducto);
}

export async function agregarProducto(datos) {
  const nombre = limpiarEntrada(datos.nombre || '');
  if (!nombre) return { error: 'El nombre del producto es obligatorio.' };
  if (datos.precio < 0) return { error: 'El precio no puede ser negativo.' };
  if (datos.cantidad < 0) return { error: 'La cantidad no puede ser negativa.' };

  const nombreNorm = nombre.toLowerCase().replace(/\s+/g, ' ');
  const existentes = await sql`SELECT * FROM productos WHERE LOWER(REGEXP_REPLACE(nombre, '\\s+', ' ', 'g')) = ${nombreNorm} AND estado <> 'FUSIONADO'`;

  if (existentes.length) {
    const p = mapProducto(existentes[0]);
    const nuevaCantidad = p.cantidad + datos.cantidad;
    const nuevoPrecio   = datos.precio > 0 && datos.precio !== p.precio ? datos.precio : p.precio;
    await sql`UPDATE productos SET cantidad = ${nuevaCantidad}, precio = ${nuevoPrecio} WHERE id = ${p.id}`;
    return { ok: true, acumulado: true, nombre: p.nombre, cantidad: nuevaCantidad };
  }

  const maxRows = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM productos`;
  const id = maxRows[0].max + 1;
  const codigo = generarCodigo(id);

  await sql`
    INSERT INTO productos (id, codigo, nombre, precio, cantidad, fecha_registro, estado)
    VALUES (${id}, ${codigo}, ${nombre}, ${datos.precio}, ${datos.cantidad},
            ${datos.fechaRegistro || hoy()}, ${datos.estado || 'ACTIVO'})
  `;
  return { ok: true, acumulado: false };
}

export async function editarProducto(actualizado) {
  const rows = await sql`SELECT * FROM productos WHERE id = ${actualizado.id}`;
  if (!rows.length) return { error: 'Producto no encontrado.' };
  const p = mapProducto(rows[0]);

  await sql`
    UPDATE productos SET
      nombre   = ${limpiarEntrada(actualizado.nombre || p.nombre)},
      precio   = ${actualizado.precio},
      cantidad = ${actualizado.cantidad},
      estado   = ${actualizado.estado || p.estado}
    WHERE id = ${actualizado.id}
  `;
  return { ok: true };
}

export async function eliminarProducto(id) {
  // product_variants.product_id es ON DELETE RESTRICT: hay que borrar primero
  // las variantes del producto o el DELETE de abajo falla con FK violation.
  await ensureSchemaVariantes();
  await sql`DELETE FROM product_variants WHERE product_id = ${id}`;
  const res = await sql`DELETE FROM productos WHERE id = ${id} RETURNING id`;
  if (!res.length) return { error: 'Producto no encontrado.' };
  return { ok: true };
}

export async function descontarStock(codigo, cantidad) {
  const rows = await sql`SELECT id, cantidad FROM productos WHERE LOWER(codigo) = ${codigo.toLowerCase()}`;
  if (!rows.length) return false;
  const p = rows[0];
  if (p.cantidad < cantidad) return false;
  await sql`UPDATE productos SET cantidad = ${p.cantidad - cantidad} WHERE id = ${p.id}`;
  return true;
}

export async function agregarStock(codigo, cantidad) {
  const rows = await sql`SELECT id, cantidad FROM productos WHERE LOWER(codigo) = ${codigo.toLowerCase()}`;
  if (!rows.length) return false;
  const p = rows[0];
  await sql`UPDATE productos SET cantidad = ${p.cantidad + cantidad} WHERE id = ${p.id}`;
  return true;
}

export async function contarProductos() {
  const rows = await sql`SELECT COUNT(*)::int AS c FROM productos WHERE estado <> 'FUSIONADO'`;
  return rows[0].c;
}

export async function contarProductosActivos() {
  const rows = await sql`SELECT COUNT(*)::int AS c FROM productos WHERE estado = 'ACTIVO'`;
  return rows[0].c;
}

export async function totalUnidades() {
  const rows = await sql`SELECT COALESCE(SUM(cantidad), 0)::int AS t FROM productos WHERE estado <> 'FUSIONADO'`;
  return rows[0].t;
}

export async function valorTotalInventario() {
  const rows = await sql`SELECT COALESCE(SUM(precio * cantidad), 0)::float AS t FROM productos WHERE estado = 'ACTIVO'`;
  return rows[0].t;
}

/* ── Variantes por talla ──────────────────────────────────────────────────── */

export async function listarVariantes(productId) {
  await ensureSchemaVariantes();
  const rows = await sql`SELECT * FROM product_variants WHERE product_id = ${productId} ORDER BY id`;
  return rows.map(mapVariante);
}

// Adjunta `variantes` a cada producto de la lista (una sola consulta para todos los ids).
export async function listarProductosConVariantes() {
  await ensureSchemaVariantes();
  const productos = await listarProductos();
  const ids = productos.map(p => p.id);
  if (!ids.length) return productos;
  const rows = await sql`SELECT * FROM product_variants WHERE product_id = ANY(${ids}) ORDER BY id`;
  const porProducto = new Map();
  for (const r of rows) {
    const v = mapVariante(r);
    if (!porProducto.has(v.productId)) porProducto.set(v.productId, []);
    porProducto.get(v.productId).push(v);
  }
  return productos.map(p => ({ ...p, variantes: porProducto.get(p.id) || [] }));
}

// Recalcula productos.cantidad (suma de variantes) y precio_compra (primera variante).
async function recalcularProducto(productId) {
  const sumaRow = await sql`SELECT COALESCE(SUM(cantidad), 0)::int AS s FROM product_variants WHERE product_id = ${productId}`;
  const primera  = await sql`SELECT precio_compra_unitario FROM product_variants WHERE product_id = ${productId} ORDER BY id LIMIT 1`;
  await sql`
    UPDATE productos SET
      cantidad = ${sumaRow[0].s},
      precio_compra = ${primera[0]?.precio_compra_unitario || 0}
    WHERE id = ${productId}
  `;
}

// Reemplaza el set de variantes de un producto: upsert de las recibidas, borra las que ya no estén.
async function guardarVariantes(productId, variantes) {
  await ensureSchemaVariantes();
  const tallas = variantes.map(v => v.talla);

  if (tallas.length) {
    await sql`DELETE FROM product_variants WHERE product_id = ${productId} AND NOT (talla = ANY(${tallas}))`;
  } else {
    await sql`DELETE FROM product_variants WHERE product_id = ${productId}`;
  }

  for (const v of variantes) {
    await sql`
      INSERT INTO product_variants (product_id, talla, cantidad, precio_compra_unitario)
      VALUES (${productId}, ${v.talla}, ${v.cantidad}, ${v.precioCompra || 0})
      ON CONFLICT (product_id, talla)
      DO UPDATE SET cantidad = EXCLUDED.cantidad, precio_compra_unitario = EXCLUDED.precio_compra_unitario, updated_at = now()
    `;
  }

  await recalcularProducto(productId);
}

// Crea UN producto base con sus variantes por talla (reemplaza el flujo que creaba 1 producto por talla).
export async function agregarProductoConVariantes(datos) {
  await ensureSchemaVariantes();
  const nombre = limpiarEntrada(datos.nombre || '');
  if (!nombre) return { error: 'El nombre del producto es obligatorio.' };
  if (datos.precio < 0) return { error: 'El precio no puede ser negativo.' };

  const variantes = (datos.variantes || []).filter(v => v.talla && v.cantidad > 0);
  if (!variantes.length) return { error: 'Agrega al menos una talla con cantidad mayor a 0.' };

  const nombreNorm = nombre.toLowerCase().replace(/\s+/g, ' ');
  const existentes = await sql`SELECT * FROM productos WHERE LOWER(REGEXP_REPLACE(nombre, '\\s+', ' ', 'g')) = ${nombreNorm} AND estado <> 'FUSIONADO'`;

  let productId;
  if (existentes.length) {
    productId = existentes[0].id;
    const actuales = await listarVariantes(productId);
    const porTalla = new Map(actuales.map(v => [v.talla, v]));
    for (const v of variantes) {
      const actual = porTalla.get(v.talla);
      porTalla.set(v.talla, {
        talla: v.talla,
        cantidad: (actual?.cantidad || 0) + v.cantidad,
        precioCompra: v.precioCompra || actual?.precioCompra || 0,
      });
    }
    await guardarVariantes(productId, Array.from(porTalla.values()));
    await sql`UPDATE productos SET precio = ${datos.precio}, estado = ${datos.estado || 'ACTIVO'}, tipo = ${datos.tipo || null}, sub_tipo = ${datos.subTipo || null} WHERE id = ${productId}`;
    return { ok: true, acumulado: true, id: productId };
  }

  const maxRows = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM productos`;
  productId = maxRows[0].max + 1;
  const codigo = generarCodigo(productId);

  await sql`
    INSERT INTO productos (id, codigo, nombre, precio, cantidad, fecha_registro, estado, tipo, sub_tipo, precio_compra)
    VALUES (${productId}, ${codigo}, ${nombre}, ${datos.precio}, 0, ${hoy()}, ${datos.estado || 'ACTIVO'}, ${datos.tipo || null}, ${datos.subTipo || null}, 0)
  `;
  await guardarVariantes(productId, variantes);

  return { ok: true, acumulado: false, id: productId, codigo };
}

// Actualiza un producto base y reemplaza sus variantes por talla.
export async function editarProductoConVariantes(actualizado) {
  await ensureSchemaVariantes();
  const rows = await sql`SELECT * FROM productos WHERE id = ${actualizado.id}`;
  if (!rows.length) return { error: 'Producto no encontrado.' };
  const p = mapProducto(rows[0]);

  await sql`
    UPDATE productos SET
      nombre = ${limpiarEntrada(actualizado.nombre || p.nombre)},
      precio = ${actualizado.precio},
      estado = ${actualizado.estado || p.estado}
    WHERE id = ${actualizado.id}
  `;

  const variantes = (actualizado.variantes || []).filter(v => v.talla && v.cantidad >= 0);
  await guardarVariantes(actualizado.id, variantes);

  return { ok: true };
}

// Descuenta/restituye stock de una talla específica (ventas) y recalcula el producto.
export async function descontarStockVariante(productId, talla, cantidad) {
  await ensureSchemaVariantes();
  const rows = await sql`SELECT id, cantidad FROM product_variants WHERE product_id = ${productId} AND talla = ${talla}`;
  if (!rows.length || rows[0].cantidad < cantidad) return false;
  await sql`UPDATE product_variants SET cantidad = cantidad - ${cantidad}, updated_at = now() WHERE id = ${rows[0].id}`;
  await recalcularProducto(productId);
  return true;
}

export async function agregarStockVariante(productId, talla, cantidad) {
  await ensureSchemaVariantes();
  const rows = await sql`SELECT id FROM product_variants WHERE product_id = ${productId} AND talla = ${talla}`;
  if (!rows.length) return false;
  await sql`UPDATE product_variants SET cantidad = cantidad + ${cantidad}, updated_at = now() WHERE id = ${rows[0].id}`;
  await recalcularProducto(productId);
  return true;
}
