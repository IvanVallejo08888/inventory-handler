import fs from 'fs';
import path from 'path';
import { limpiarEntrada } from './security.js';

const DATA_DIR       = path.join(process.cwd(), 'data');
const PRODUCTOS_FILE = path.join(DATA_DIR, 'productos.txt');

const CABECERA = [
  '# Area17 - Archivo de productos',
  '# Formato: id|codigo|nombre|precio|cantidad|fechaRegistro|estado',
];

function asegurarArchivo() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PRODUCTOS_FILE))
    fs.writeFileSync(PRODUCTOS_FILE, CABECERA.join('\n') + '\n', 'utf8');
}

function parsearProducto(linea) {
  const p = linea.replace(/\r/g, '').split('|');
  if (p.length < 7) return null;
  try {
    const id = parseInt(p[0].trim());
    if (isNaN(id) || id <= 0) return null;
    return {
      id,
      codigo:        p[1].trim(),
      nombre:        p[2].trim(),
      precio:        parseFloat(p[3].trim()),
      cantidad:      parseInt(p[4].trim()),
      fechaRegistro: p[5].trim(),
      estado:        p[6].trim(),
    };
  } catch { return null; }
}

// FIX: Limpiar campos de texto antes de serializar
function toTxt(p) {
  return [
    p.id,
    (p.codigo || '').replace(/\|/g, ''),
    (p.nombre || '').replace(/\|/g, ''),
    p.precio,
    p.cantidad,
    (p.fechaRegistro || '').replace(/\|/g, ''),
    (p.estado || '').replace(/\|/g, ''),
  ].join('|');
}

export function listarProductos() {
  asegurarArchivo();
  return fs.readFileSync(PRODUCTOS_FILE, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(parsearProducto)
    .filter(Boolean);
}

export function buscarPorId(id) {
  return listarProductos().find(p => p.id === id) || null;
}

export function buscarPorCodigo(codigo) {
  if (!codigo) return null;
  return listarProductos().find(p => p.codigo.toLowerCase() === codigo.toLowerCase()) || null;
}

export function buscar(termino, estado) {
  let lista = listarProductos();
  if (termino && termino.trim()) {
    const t = termino.trim().toLowerCase();
    lista = lista.filter(p =>
      p.nombre.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t)
    );
  }
  if (estado && estado !== 'TODOS') {
    lista = lista.filter(p => p.estado === estado);
  }
  return lista;
}

function reescribirArchivo(lista) {
  const contenido = CABECERA.join('\n') + '\n' + lista.map(toTxt).join('\n') + '\n';
  fs.writeFileSync(PRODUCTOS_FILE, contenido, 'utf8');
}

function siguienteId(lista) {
  return lista.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}

function generarCodigo(id) {
  return `PROD-${String(id).padStart(4, '0')}`;
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Agrega un producto. Si ya existe uno con el mismo nombre, acumula stock.
 */
export function agregarProducto(datos) {
  // FIX: Limpiar nombre de pipes y espacios extra
  const nombre = limpiarEntrada(datos.nombre || '');
  if (!nombre) return { error: 'El nombre del producto es obligatorio.' };
  if (datos.precio < 0) return { error: 'El precio no puede ser negativo.' };
  if (datos.cantidad < 0) return { error: 'La cantidad no puede ser negativa.' };

  const lista = listarProductos();
  const nombreNorm = nombre.toLowerCase().replace(/\s+/g, ' ');

  // Buscar duplicado por nombre normalizado
  const existente = lista.find(p =>
    p.nombre.trim().toLowerCase().replace(/\s+/g, ' ') === nombreNorm
  );

  if (existente) {
    existente.cantidad += datos.cantidad;
    if (datos.precio > 0 && datos.precio !== existente.precio)
      existente.precio = datos.precio;
    reescribirArchivo(lista);
    return { ok: true, acumulado: true, nombre: existente.nombre, cantidad: existente.cantidad };
  }

  const id = siguienteId(lista);
  const nuevo = {
    id,
    codigo:        generarCodigo(id),
    nombre,
    precio:        datos.precio,
    cantidad:      datos.cantidad,
    fechaRegistro: datos.fechaRegistro || hoy(),
    estado:        datos.estado || 'ACTIVO',
  };

  lista.push(nuevo);
  reescribirArchivo(lista);
  return { ok: true, acumulado: false };
}

export function editarProducto(actualizado) {
  const lista = listarProductos();
  const idx = lista.findIndex(p => p.id === actualizado.id);
  if (idx === -1) return { error: 'Producto no encontrado.' };

  lista[idx] = {
    ...lista[idx],
    nombre:   limpiarEntrada(actualizado.nombre || lista[idx].nombre),
    precio:   actualizado.precio,
    cantidad: actualizado.cantidad,
    estado:   actualizado.estado || lista[idx].estado,
    // FIX: Preservar codigo y fechaRegistro originales
  };
  reescribirArchivo(lista);
  return { ok: true };
}

export function eliminarProducto(id) {
  const lista = listarProductos();
  const nuevo = lista.filter(p => p.id !== id);
  if (nuevo.length === lista.length) return { error: 'Producto no encontrado.' };
  reescribirArchivo(nuevo);
  return { ok: true };
}

/** Descuenta stock */
export function descontarStock(codigo, cantidad) {
  const lista = listarProductos();
  const p = lista.find(x => x.codigo.toLowerCase() === codigo.toLowerCase());
  if (!p) return false;
  // FIX: Permitir que el stock llegue a 0 (no bloquear si cantidad === p.cantidad)
  if (p.cantidad < cantidad) return false;
  p.cantidad -= cantidad;
  reescribirArchivo(lista);
  return true;
}

/** Restaura stock (cancelación de venta) */
export function agregarStock(codigo, cantidad) {
  const lista = listarProductos();
  const p = lista.find(x => x.codigo.toLowerCase() === codigo.toLowerCase());
  if (!p) return false;
  p.cantidad += cantidad;
  reescribirArchivo(lista);
  return true;
}

export function contarProductos()        { return listarProductos().length; }
export function contarProductosActivos() { return listarProductos().filter(p => p.estado === 'ACTIVO').length; }
export function totalUnidades()          { return listarProductos().reduce((s, p) => s + p.cantidad, 0); }
export function valorTotalInventario() {
  return listarProductos()
    .filter(p => p.estado === 'ACTIVO')
    .reduce((s, p) => s + p.precio * p.cantidad, 0);
}
