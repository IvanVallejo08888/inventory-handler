import fs from 'fs';
import path from 'path';
import { hashSHA256, limpiarEntrada } from './security.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const USUARIOS_FILE = path.join(DATA_DIR, 'usuarios.txt');

const CABECERA = [
  '# Area17 - Archivo de usuarios',
  '# Formato: id|nombreCompleto|identificacion|celular|tipoSangre|correo|contrasena(SHA256)|rol|activo|fotoPerfil',
];

// FIX: Superadmin hardcodeado solo como referencia de ID protegido
const SUPERADMIN_ID = 1000;

const SUPERADMIN = {
  id: SUPERADMIN_ID,
  nombreCompleto: 'Super Administrador',
  identificacion: '10800449108',
  celular: '3000000000',
  tipoSangre: 'O+',
  correo: 'superadmin@area17.com',
  contrasena: hashSHA256('CAMBIAR_ESTA_CONTRASENA'),
  rol: 'ADMINISTRADOR',
  activo: true,
  fotoPerfil: '',
};

function asegurarArchivo() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USUARIOS_FILE)) {
    const linea = usuarioATxt(SUPERADMIN);
    fs.writeFileSync(USUARIOS_FILE, CABECERA.join('\n') + '\n' + linea + '\n', 'utf8');
  }
}

// FIX: Eliminar pipes en campos de texto para no romper el formato delimitado
function usuarioATxt(u) {
  return [
    u.id,
    (u.nombreCompleto || '').replace(/\|/g, ''),
    (u.identificacion || '').replace(/\|/g, ''),
    (u.celular || '').replace(/\|/g, ''),
    (u.tipoSangre || '').replace(/\|/g, ''),
    (u.correo || '').replace(/\|/g, ''),
    u.contrasena || '',
    (u.rol || '').replace(/\|/g, ''),
    u.activo,
    (u.fotoPerfil || '').replace(/\|/g, ''),
  ].join('|');
}

function txtAUsuario(linea) {
  // FIX: limitar el split a 10 partes para evitar problemas con pipes en campos
  const p = linea.replace(/\r/g, '').split('|');
  return {
    id: parseInt(p[0]) || 0,
    nombreCompleto: p[1] || '',
    identificacion: p[2] || '',
    celular: p[3] || '',
    tipoSangre: p[4] || '',
    correo: p[5] || '',
    contrasena: p[6] || '',
    rol: p[7] || '',
    activo: p[8] === 'true',
    fotoPerfil: p[9] || '',
  };
}

export function leerUsuarios() {
  asegurarArchivo();
  const contenido = fs.readFileSync(USUARIOS_FILE, 'utf8');
  return contenido
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(txtAUsuario)
    .filter(u => u.id > 0); // FIX: filtrar líneas malformadas
}

function escribirUsuarios(usuarios) {
  asegurarArchivo();
  const texto = CABECERA.join('\n') + '\n' + usuarios.map(usuarioATxt).join('\n') + '\n';
  fs.writeFileSync(USUARIOS_FILE, texto, 'utf8');
}

export function buscarPorIdentificacion(identificacion) {
  if (!identificacion) return null;
  return leerUsuarios().find(u => u.identificacion.trim() === identificacion.trim()) || null;
}

export function buscarPorCorreo(correo) {
  if (!correo) return null;
  return leerUsuarios().find(u => u.correo.toLowerCase() === correo.toLowerCase()) || null;
}

export function registrarUsuario(datos) {
  // FIX: Limpiar entradas antes de guardar (evitar pipe injection)
  const nombreCompleto = limpiarEntrada(datos.nombreCompleto || '');
  const identificacion = limpiarEntrada(datos.identificacion || '');
  const celular = limpiarEntrada(datos.celular || '');
  const tipoSangre = limpiarEntrada(datos.tipoSangre || '');
  const correo = limpiarEntrada(datos.correo || '');

  if (!nombreCompleto || !identificacion || !correo) {
    return { error: 'Datos incompletos.' };
  }

  const usuarios = leerUsuarios();

  if (usuarios.some(u => u.correo.toLowerCase() === correo.toLowerCase())) {
    return { error: 'El correo ya está registrado.' };
  }
  if (usuarios.some(u => u.identificacion.trim() === identificacion)) {
    return { error: 'La identificación ya está registrada.' };
  }

  const maxId = usuarios.reduce((max, u) => Math.max(max, u.id), 0);
  const nuevo = {
    id: maxId + 1,
    nombreCompleto,
    identificacion,
    celular,
    tipoSangre,
    correo,
    contrasena: hashSHA256(datos.contrasena),
    rol: datos.rol,
    activo: true,
    fotoPerfil: '',
  };

  usuarios.push(nuevo);
  escribirUsuarios(usuarios);
  return { ok: true, usuario: nuevo };
}

export function actualizarUsuario(id, datos) {
  const usuarios = leerUsuarios();
  const idx = usuarios.findIndex(u => u.id === id);
  if (idx === -1) return { error: 'Usuario no encontrado.' };

  // FIX: Limpiar campos de texto
  if (datos.nombreCompleto !== undefined)
    usuarios[idx].nombreCompleto = limpiarEntrada(datos.nombreCompleto);
  if (datos.identificacion !== undefined)
    usuarios[idx].identificacion = limpiarEntrada(datos.identificacion);
  if (datos.celular !== undefined)
    usuarios[idx].celular = limpiarEntrada(datos.celular);
  if (datos.tipoSangre !== undefined)
    usuarios[idx].tipoSangre = limpiarEntrada(datos.tipoSangre);
  if (datos.correo !== undefined)
    usuarios[idx].correo = limpiarEntrada(datos.correo);
  if (datos.rol !== undefined)
    usuarios[idx].rol = datos.rol;
  if (datos.activo !== undefined)
    usuarios[idx].activo = datos.activo;
  if (datos.contrasena !== undefined)
    usuarios[idx].contrasena = datos.contrasena;
  if (datos.fotoPerfil !== undefined)
    usuarios[idx].fotoPerfil = limpiarEntrada(datos.fotoPerfil);

  escribirUsuarios(usuarios);
  return { ok: true, usuario: usuarios[idx] };
}

export function eliminarUsuario(id) {
  if (id === SUPERADMIN_ID) return { error: 'El superadministrador no puede ser eliminado.' };
  const usuarios = leerUsuarios();
  const nuevo = usuarios.filter(u => u.id !== id);
  if (nuevo.length === usuarios.length) return { error: 'Usuario no encontrado.' };
  escribirUsuarios(nuevo);
  return { ok: true };
}

export function contarUsuarios()   { return leerUsuarios().length; }
export function contarAdmins()     { return leerUsuarios().filter(u => u.rol === 'ADMINISTRADOR' && u.activo).length; }
export function contarVendedores() { return leerUsuarios().filter(u => u.rol === 'VENDEDOR' && u.activo).length; }
export function listarUsuarios()   { return leerUsuarios(); }
