// Migración: unifica productos repetidos por talla en un producto base + variantes.
// Uso (cargar variables de entorno con --env-file=.env.local, Node 20.6+):
//   node --env-file=.env.local scripts/migrar-variantes-talla.mjs                  -> dry-run (no escribe nada)
//   node --env-file=.env.local scripts/migrar-variantes-talla.mjs --aplicar         -> ejecuta la migración (con backup)
//   node --env-file=.env.local scripts/migrar-variantes-talla.mjs --rollback FECHA  -> restaura desde productos_backup_FECHA
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function ensureSchema() {
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
  await sql`ALTER TABLE detalles_ventas ADD COLUMN IF NOT EXISTS talla TEXT`;
}

const TALLA_RE = /^(.+)\sTALLA\s+(\S+)$/i;

function normalizar(s) {
  return s.trim().toUpperCase().replace(/\s+/g, ' ');
}

async function construirGrupos() {
  const productos = await sql`
    SELECT * FROM productos
    WHERE merged_into IS NULL AND estado <> 'FUSIONADO'
    ORDER BY id
  `;

  const grupos = new Map(); // claveGrupo -> { base, tipo, subTipo, precio, miembros: [...] }

  for (const p of productos) {
    const m = TALLA_RE.exec(p.nombre || '');
    if (!m) continue; // no es candidato (GENERAL / sin talla) -> no se toca
    const base = normalizar(m[1]);
    const talla = m[2].trim().toUpperCase();
    const clave = `${base}__${p.tipo || ''}__${p.sub_tipo || ''}__${p.precio}`;

    if (!grupos.has(clave)) {
      grupos.set(clave, { base, tipo: p.tipo, subTipo: p.sub_tipo, precio: p.precio, miembros: [] });
    }
    grupos.get(clave).miembros.push({ ...p, talla });
  }

  // Solo nos interesan los grupos con 2+ miembros (los de 1 solo no necesitan fusión,
  // pero igual se podrían normalizar a producto+variante de 1 sola talla si se quisiera;
  // por seguridad y mínimo blast radius, solo tocamos grupos con 2+ productos).
  return Array.from(grupos.values()).filter(g => g.miembros.length >= 2);
}

async function dryRun() {
  await ensureSchema();
  const grupos = await construirGrupos();
  const totalProductosAfectados = grupos.reduce((s, g) => s + g.miembros.length, 0);
  const totalUnidadesAfectadas  = grupos.reduce((s, g) => s + g.miembros.reduce((s2, m) => s2 + m.cantidad, 0), 0);

  const totalesRow = await sql`SELECT COUNT(*)::int AS c, COALESCE(SUM(cantidad),0)::int AS u FROM productos WHERE merged_into IS NULL AND estado <> 'FUSIONADO'`;

  console.log('=== DRY RUN — Migración de variantes por talla ===');
  console.log(`Productos activos actuales (sin fusionar): ${totalesRow[0].c}`);
  console.log(`Unidades totales actuales: ${totalesRow[0].u}`);
  console.log(`Grupos detectados (2+ tallas del mismo artículo): ${grupos.length}`);
  console.log(`Productos que se fusionarían: ${totalProductosAfectados}`);
  console.log(`Unidades involucradas en la fusión: ${totalUnidadesAfectadas}`);
  console.log(`Productos resultantes después de fusionar: ${totalesRow[0].c - totalProductosAfectados + grupos.length}`);
  console.log('');
  console.log('Muestra de hasta 10 grupos:');
  for (const g of grupos.slice(0, 10)) {
    const tallas = g.miembros.map(m => `${m.talla}=${m.cantidad}`).join(', ');
    console.log(`  - "${g.base}" (tipo=${g.tipo||'-'} sub=${g.subTipo||'-'} precio=${g.precio}) -> ${g.miembros.length} tallas: ${tallas}`);
  }
}

async function aplicar() {
  await ensureSchema();
  const fecha = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const backupTable = `productos_backup_${fecha}`;

  console.log(`Creando backup: ${backupTable}`);
  await sql.query(`CREATE TABLE IF NOT EXISTS ${backupTable} AS SELECT * FROM productos`);

  const totalAntesRow = await sql`SELECT COUNT(*)::int AS c, COALESCE(SUM(cantidad),0)::int AS u FROM productos WHERE merged_into IS NULL AND estado <> 'FUSIONADO'`;
  const totalAntes = totalAntesRow[0];
  console.log(`Antes: ${totalAntes.c} productos activos, ${totalAntes.u} unidades.`);

  const grupos = await construirGrupos();
  console.log(`Aplicando fusión de ${grupos.length} grupos...`);

  for (const g of grupos) {
    const ganador = g.miembros.reduce((a, b) => (a.id < b.id ? a : b));
    const noGanadores = g.miembros.filter(m => m.id !== ganador.id);

    for (const m of g.miembros) {
      await sql`
        INSERT INTO product_variants (product_id, talla, cantidad, precio_compra_unitario)
        VALUES (${ganador.id}, ${m.talla}, ${m.cantidad}, ${m.precio_compra || 0})
        ON CONFLICT (product_id, talla)
        DO UPDATE SET cantidad = product_variants.cantidad + EXCLUDED.cantidad, updated_at = now()
      `;
    }

    const sumaRow = await sql`SELECT COALESCE(SUM(cantidad),0)::int AS s FROM product_variants WHERE product_id = ${ganador.id}`;
    const primeraVariante = await sql`SELECT precio_compra_unitario FROM product_variants WHERE product_id = ${ganador.id} ORDER BY id LIMIT 1`;

    await sql`
      UPDATE productos SET
        nombre = ${g.base},
        cantidad = ${sumaRow[0].s},
        precio_compra = ${primeraVariante[0]?.precio_compra_unitario || 0}
      WHERE id = ${ganador.id}
    `;

    for (const m of noGanadores) {
      await sql`UPDATE productos SET estado = 'FUSIONADO', merged_into = ${ganador.id} WHERE id = ${m.id}`;
    }
  }

  const totalDespuesRow = await sql`SELECT COALESCE(SUM(cantidad),0)::int AS u FROM productos WHERE merged_into IS NULL AND estado <> 'FUSIONADO'`;
  const totalFilasRow   = await sql`SELECT COUNT(*)::int AS c FROM productos`;
  const activasRow      = await sql`SELECT COUNT(*)::int AS c FROM productos WHERE merged_into IS NULL AND estado <> 'FUSIONADO'`;
  const fusionadasRow   = await sql`SELECT COUNT(*)::int AS c FROM productos WHERE merged_into IS NOT NULL`;

  console.log('');
  console.log('=== Verificación ===');
  console.log(`Unidades antes: ${totalAntes.u}  |  Unidades después: ${totalDespuesRow[0].u}`);
  console.log(`Filas totales en productos: ${totalFilasRow[0].c}  =  activas (${activasRow[0].c}) + fusionadas (${fusionadasRow[0].c})`);

  if (totalAntes.u !== totalDespuesRow[0].u) {
    throw new Error(`ASERCIÓN FALLIDA: las unidades no coinciden (${totalAntes.u} vs ${totalDespuesRow[0].u}). Revisa y usa --rollback ${fecha} si es necesario.`);
  }
  if (totalFilasRow[0].c !== activasRow[0].c + fusionadasRow[0].c) {
    throw new Error(`ASERCIÓN FALLIDA: filas totales no coinciden con activas+fusionadas. Usa --rollback ${fecha}.`);
  }

  console.log('');
  console.log('✓ Migración aplicada correctamente. Backup disponible en:', backupTable);
}

async function rollback(fecha) {
  const backupTable = `productos_backup_${fecha}`;
  console.log(`Restaurando productos desde ${backupTable}...`);
  const exists = await sql.query(`SELECT to_regclass('${backupTable}') AS t`);
  if (!exists[0].t) throw new Error(`No existe la tabla de backup ${backupTable}`);

  await sql.query(`DELETE FROM product_variants`);
  await sql.query(`DELETE FROM productos`);
  await sql.query(`INSERT INTO productos SELECT * FROM ${backupTable}`);
  console.log('✓ Rollback completado.');
}

const arg = process.argv[2];
if (arg === '--aplicar') {
  aplicar().catch(err => { console.error(err); process.exit(1); });
} else if (arg === '--rollback') {
  const fecha = process.argv[3];
  if (!fecha) { console.error('Uso: --rollback YYYYMMDD'); process.exit(1); }
  rollback(fecha).catch(err => { console.error(err); process.exit(1); });
} else {
  dryRun().catch(err => { console.error(err); process.exit(1); });
}
