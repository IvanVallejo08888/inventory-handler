import sql from './db.js';
import { limpiarEntrada } from './security.js';
import { fechaHoyColombia } from './fechaColombia.js';

function mapProducto(row) {
  return {
    id:            row.id,
    codigo:        row.codigo,
    nombre:        row.nombre,
    precio:        parseFloat(row.precio),
    cantidad:      row.cantidad,
    fechaRegistro: row.fecha_registro,
    estado:        row.estado,
  };
}

function hoy() { return fechaHoyColombia(); }
function generarCodigo(id) { return `PROD-${String(id).padStart(4, '0')}`; }

export async function listarProductos() {
  const rows = await sql`SELECT * FROM productos ORDER BY id`;
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
      rows = await sql`SELECT * FROM productos WHERE LOWER(nombre) LIKE ${t} OR LOWER(codigo) LIKE ${t} ORDER BY id`;
    }
  } else if (estado && estado !== 'TODOS') {
    rows = await sql`SELECT * FROM productos WHERE estado = ${estado} ORDER BY id`;
  } else {
    rows = await sql`SELECT * FROM productos ORDER BY id`;
  }
  return rows.map(mapProducto);
}

export async function agregarProducto(datos) {
  const nombre = limpiarEntrada(datos.nombre || '');
  if (!nombre) return { error: 'El nombre del producto es obligatorio.' };
  if (datos.precio < 0) return { error: 'El precio no puede ser negativo.' };
  if (datos.cantidad < 0) return { error: 'La cantidad no puede ser negativa.' };

  const nombreNorm = nombre.toLowerCase().replace(/\s+/g, ' ');
  const existentes = await sql`SELECT * FROM productos WHERE LOWER(REGEXP_REPLACE(nombre, '\\s+', ' ', 'g')) = ${nombreNorm}`;

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
  const rows = await sql`SELECT COUNT(*)::int AS c FROM productos`;
  return rows[0].c;
}

export async function contarProductosActivos() {
  const rows = await sql`SELECT COUNT(*)::int AS c FROM productos WHERE estado = 'ACTIVO'`;
  return rows[0].c;
}

export async function totalUnidades() {
  const rows = await sql`SELECT COALESCE(SUM(cantidad), 0)::int AS t FROM productos`;
  return rows[0].t;
}

export async function valorTotalInventario() {
  const rows = await sql`SELECT COALESCE(SUM(precio * cantidad), 0)::float AS t FROM productos WHERE estado = 'ACTIVO'`;
  return rows[0].t;
}
