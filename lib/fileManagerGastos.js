import fs from 'fs';
import path from 'path';
import { limpiarEntrada } from './security.js';

const DATA_DIR    = path.join(process.cwd(), 'data');
const GASTOS_FILE = path.join(DATA_DIR, 'gastos.txt');

const CABECERA = [
  '# Area17 - gastos.txt',
  '# id|codigo|nombre|valor|fecha|categoria|descripcion|estado',
];

function asegurarArchivo() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(GASTOS_FILE))
    fs.writeFileSync(GASTOS_FILE, CABECERA.join('\n') + '\n', 'utf8');
}

function parsearGasto(linea) {
  const p = linea.replace(/\r/g, '').split('|');
  if (p.length < 8) return null;
  try {
    const id = parseInt(p[0].trim());
    if (isNaN(id) || id <= 0) return null;
    return {
      id,
      codigo:      p[1].trim(),
      nombre:      p[2].trim(),
      valor:       parseFloat(p[3].trim()),
      fecha:       p[4].trim(),
      categoria:   p[5].trim(),
      descripcion: p[6].trim(),
      estado:      p[7].trim(),
    };
  } catch { return null; }
}

// FIX: Usar limpiarEntrada para prevenir pipe injection en descripción
function toTxt(g) {
  const desc = limpiarEntrada(g.descripcion || '');
  return [
    g.id,
    (g.codigo || '').replace(/\|/g, ''),
    (g.nombre || '').replace(/\|/g, ''),
    g.valor,
    (g.fecha || '').replace(/\|/g, ''),
    (g.categoria || '').replace(/\|/g, ''),
    desc,
    (g.estado || '').replace(/\|/g, ''),
  ].join('|');
}

function listarTodos() {
  asegurarArchivo();
  const lista = fs.readFileSync(GASTOS_FILE, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(parsearGasto)
    .filter(Boolean);
  lista.sort((a, b) => b.id - a.id);
  return lista;
}

export function listarGastos() {
  return listarTodos().filter(g => g.estado === 'ACTIVO');
}

export function buscarPorId(id) {
  return listarTodos().find(g => g.id === id) || null;
}

export function filtrarPorCategoria(categoria) {
  if (!categoria) return listarGastos();
  return listarGastos().filter(g => g.categoria.toLowerCase() === categoria.toLowerCase());
}

function reescribirArchivo(lista) {
  const contenido = CABECERA.join('\n') + '\n' + lista.map(toTxt).join('\n') + '\n';
  fs.writeFileSync(GASTOS_FILE, contenido, 'utf8');
}

function siguienteId() {
  return listarTodos().reduce((max, g) => Math.max(max, g.id), 0) + 1;
}

function generarCodigo(id) {
  return `GST-${String(id).padStart(4, '0')}`;
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export function crear(datos) {
  const nombre = limpiarEntrada(datos.nombre || '');
  if (!nombre || !datos.valor) return { error: 'Nombre y valor son obligatorios.' };

  const id = siguienteId();
  const nuevo = {
    id,
    codigo:      generarCodigo(id),
    nombre,
    valor:       parseFloat(datos.valor),
    fecha:       datos.fecha || hoy(),
    categoria:   datos.categoria || 'GASTO_DIARIO',
    descripcion: limpiarEntrada(datos.descripcion || ''),
    estado:      'ACTIVO',
  };

  asegurarArchivo();
  fs.appendFileSync(GASTOS_FILE, toTxt(nuevo) + '\n', 'utf8');
  return { ok: true };
}

export function actualizar(id, datos) {
  const lista = listarTodos();
  const idx = lista.findIndex(g => g.id === id);
  if (idx === -1) return { error: 'Gasto no encontrado.' };

  lista[idx] = {
    ...lista[idx],
    nombre:      datos.nombre     ? limpiarEntrada(datos.nombre)      : lista[idx].nombre,
    valor:       datos.valor !== undefined ? parseFloat(datos.valor)  : lista[idx].valor,
    fecha:       datos.fecha      || lista[idx].fecha,
    categoria:   datos.categoria  || lista[idx].categoria,
    descripcion: datos.descripcion !== undefined ? limpiarEntrada(datos.descripcion) : lista[idx].descripcion,
  };
  reescribirArchivo(lista);
  return { ok: true };
}

/** Eliminación física */
export function eliminar(id) {
  const lista = listarTodos();
  const nuevo = lista.filter(g => g.id !== id);
  if (nuevo.length === lista.length) return { error: 'Gasto no encontrado.' };
  reescribirArchivo(nuevo);
  return { ok: true };
}

/** Total del mes actual, solo ACTIVOS */
export function totalGastosMes() {
  const mes = hoy().slice(0, 7);
  return listarTodos()
    .filter(g => g.estado === 'ACTIVO' && g.fecha?.startsWith(mes))
    .reduce((s, g) => s + g.valor, 0);
}

/** Totales por categoría del mes actual */
export function gastosPorCategoria() {
  const mes = hoy().slice(0, 7);
  const mapa = { SERVICIO: 0, INVERSION: 0, COMPRA: 0, GASTO_DIARIO: 0 };
  for (const g of listarTodos()) {
    if (g.estado === 'ACTIVO' && g.fecha?.startsWith(mes)) {
      if (mapa[g.categoria] !== undefined) mapa[g.categoria] += g.valor;
    }
  }
  return mapa;
}
