import fs from 'fs';
import path from 'path';

const DATA_DIR   = path.join(process.cwd(), 'data');
const RECO_FILE  = path.join(DATA_DIR, 'recomendaciones.txt');

const CABECERA = [
  '# Area17 - Archivo de recomendaciones',
  '# Formato: id|fecha|vendedor|contenido|estado',
];

function asegurarArchivo() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RECO_FILE))
    fs.writeFileSync(RECO_FILE, CABECERA.join('\n') + '\n', 'utf8');
}

function parsearReco(linea) {
  const p = linea.replace(/\r/g, '').split('|');
  if (p.length < 5) return null;
  try {
    return {
      id:       parseInt(p[0].trim()),
      fecha:    p[1].trim(),
      vendedor: p[2].trim(),
      contenido: p[3].trim().replace(/&#124;/g, '|').replace(/&#10;/g, '\n'),
      estado:   p[4].trim(),
    };
  } catch { return null; }
}

function toTxt(r) {
  const safeContenido = (r.contenido || '')
    .replace(/\|/g, '&#124;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '');
  return [r.id, r.fecha, r.vendedor, safeContenido, r.estado].join('|');
}

export function listarRecomendaciones() {
  asegurarArchivo();
  return fs.readFileSync(RECO_FILE, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(parsearReco)
    .filter(Boolean);
}

export function buscar(termino, fechaDesde, fechaHasta) {
  let lista = listarRecomendaciones();
  if (termino?.trim()) {
    const t = termino.trim().toLowerCase();
    lista = lista.filter(r =>
      r.contenido.toLowerCase().includes(t) || r.vendedor.toLowerCase().includes(t)
    );
  }
  if (fechaDesde?.trim()) lista = lista.filter(r => r.fecha >= fechaDesde.trim());
  if (fechaHasta?.trim()) lista = lista.filter(r => r.fecha <= fechaHasta.trim());
  return lista;
}

function siguienteId() {
  return listarRecomendaciones().reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

export function agregar(datos) {
  if (!datos.contenido?.trim()) return { error: 'La recomendación no puede estar vacía.' };
  if (!datos.vendedor?.trim())  return { error: 'El nombre del vendedor es obligatorio.' };

  const nueva = {
    id:       siguienteId(),
    fecha:    datos.fecha || new Date().toISOString().slice(0, 10),
    vendedor: datos.vendedor.trim(),
    contenido: datos.contenido.trim(),
    estado:   'ACTIVA',
  };

  asegurarArchivo();
  fs.appendFileSync(RECO_FILE, toTxt(nueva) + '\n', 'utf8');
  return { ok: true };
}

function reescribirArchivo(lista) {
  const contenido = CABECERA.join('\n') + '\n' + lista.map(toTxt).join('\n') + '\n';
  fs.writeFileSync(RECO_FILE, contenido, 'utf8');
}

export function eliminar(id) {
  const lista = listarRecomendaciones();
  const nuevo = lista.filter(r => r.id !== id);
  if (nuevo.length === lista.length) return { error: 'Recomendación no encontrada.' };
  reescribirArchivo(nuevo);
  return { ok: true };
}

export function contar() { return listarRecomendaciones().length; }
