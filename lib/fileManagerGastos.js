import sql from './db.js';
import { limpiarEntrada } from './security.js';

function mapGasto(row) {
  return {
    id:          row.id,
    codigo:      row.codigo,
    nombre:      row.nombre,
    valor:       parseFloat(row.valor),
    fecha:       row.fecha,
    categoria:   row.categoria,
    descripcion: row.descripcion || '',
    estado:      row.estado,
  };
}

function hoy() { return new Date().toISOString().slice(0, 10); }
function generarCodigo(id) { return `GST-${String(id).padStart(4, '0')}`; }

export async function listarGastos() {
  const rows = await sql`SELECT * FROM gastos WHERE estado = 'ACTIVO' ORDER BY id DESC`;
  return rows.map(mapGasto);
}

export async function buscarPorId(id) {
  const rows = await sql`SELECT * FROM gastos WHERE id = ${id}`;
  return rows.length ? mapGasto(rows[0]) : null;
}

export async function filtrarPorCategoria(categoria) {
  if (!categoria) return listarGastos();
  const rows = await sql`SELECT * FROM gastos WHERE estado = 'ACTIVO' AND LOWER(categoria) = ${categoria.toLowerCase()} ORDER BY id DESC`;
  return rows.map(mapGasto);
}

export async function crear(datos) {
  const nombre = limpiarEntrada(datos.nombre || '');
  if (!nombre || !datos.valor) return { error: 'Nombre y valor son obligatorios.' };

  const maxRows = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM gastos`;
  const id      = maxRows[0].max + 1;
  const codigo  = generarCodigo(id);

  await sql`
    INSERT INTO gastos (id, codigo, nombre, valor, fecha, categoria, descripcion, estado)
    VALUES (${id}, ${codigo}, ${nombre}, ${parseFloat(datos.valor)},
            ${datos.fecha || hoy()}, ${datos.categoria || 'GASTO_DIARIO'},
            ${limpiarEntrada(datos.descripcion || '')}, 'ACTIVO')
  `;
  return { ok: true };
}

export async function actualizar(id, datos) {
  const rows = await sql`SELECT * FROM gastos WHERE id = ${id}`;
  if (!rows.length) return { error: 'Gasto no encontrado.' };
  const g = mapGasto(rows[0]);

  await sql`
    UPDATE gastos SET
      nombre      = ${datos.nombre      ? limpiarEntrada(datos.nombre)      : g.nombre},
      valor       = ${datos.valor !== undefined ? parseFloat(datos.valor)   : g.valor},
      fecha       = ${datos.fecha       || g.fecha},
      categoria   = ${datos.categoria   || g.categoria},
      descripcion = ${datos.descripcion !== undefined ? limpiarEntrada(datos.descripcion) : g.descripcion}
    WHERE id = ${id}
  `;
  return { ok: true };
}

export async function eliminar(id) {
  const res = await sql`DELETE FROM gastos WHERE id = ${id} RETURNING id`;
  if (!res.length) return { error: 'Gasto no encontrado.' };
  return { ok: true };
}

export async function totalGastosMes() {
  const mes = hoy().slice(0, 7);
  const rows = await sql`SELECT COALESCE(SUM(valor), 0)::float AS t FROM gastos WHERE estado = 'ACTIVO' AND fecha LIKE ${mes + '%'}`;
  return rows[0].t;
}

export async function gastosPorCategoria() {
  const mes  = hoy().slice(0, 7);
  const rows = await sql`
    SELECT categoria, COALESCE(SUM(valor), 0)::float AS total
    FROM gastos
    WHERE estado = 'ACTIVO' AND fecha LIKE ${mes + '%'}
    GROUP BY categoria
  `;
  const mapa = { SERVICIO: 0, INVERSION: 0, COMPRA: 0, GASTO_DIARIO: 0 };
  for (const r of rows) {
    if (mapa[r.categoria] !== undefined) mapa[r.categoria] = r.total;
  }
  return mapa;
}
