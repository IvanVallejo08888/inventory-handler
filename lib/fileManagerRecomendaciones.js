import sql from './db.js';

function mapReco(row) {
  return {
    id:        row.id,
    fecha:     row.fecha,
    vendedor:  row.vendedor,
    contenido: row.contenido,
    estado:    row.estado,
  };
}

export async function listarRecomendaciones() {
  const rows = await sql`SELECT * FROM recomendaciones ORDER BY id DESC`;
  return rows.map(mapReco);
}

export async function buscar(termino, fechaDesde, fechaHasta) {
  let rows = await listarRecomendaciones();
  if (termino?.trim()) {
    const t = termino.trim().toLowerCase();
    rows = rows.filter(r =>
      r.contenido.toLowerCase().includes(t) || r.vendedor.toLowerCase().includes(t)
    );
  }
  if (fechaDesde?.trim()) rows = rows.filter(r => r.fecha >= fechaDesde.trim());
  if (fechaHasta?.trim()) rows = rows.filter(r => r.fecha <= fechaHasta.trim());
  return rows;
}

export async function agregar(datos) {
  if (!datos.contenido?.trim()) return { error: 'La recomendación no puede estar vacía.' };
  if (!datos.vendedor?.trim())  return { error: 'El nombre del vendedor es obligatorio.' };

  const maxRows = await sql`SELECT COALESCE(MAX(id), 0)::int AS max FROM recomendaciones`;
  const id      = maxRows[0].max + 1;

  await sql`
    INSERT INTO recomendaciones (id, fecha, vendedor, contenido, estado)
    VALUES (${id}, ${datos.fecha || new Date().toISOString().slice(0, 10)},
            ${datos.vendedor.trim()}, ${datos.contenido.trim()}, 'ACTIVA')
  `;
  return { ok: true };
}

export async function eliminar(id) {
  const res = await sql`DELETE FROM recomendaciones WHERE id = ${id} RETURNING id`;
  if (!res.length) return { error: 'Recomendación no encontrada.' };
  return { ok: true };
}

export async function contar() {
  const rows = await sql`SELECT COUNT(*)::int AS c FROM recomendaciones`;
  return rows[0].c;
}
