import fs from 'fs';
import path from 'path';
import { hashSHA256 } from './security.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const USUARIOS_FILE = path.join(DATA_DIR, 'usuarios.txt');

const SUPERADMIN = {
  id: 1000,
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
    fs.writeFileSync(USUARIOS_FILE, linea + '\n', 'utf8');
  }
}

function usuarioATxt(u) {
  return [
    u.id,
    u.nombreCompleto,
    u.identificacion,
    u.celular,
    u.tipoSangre,
    u.correo,
    u.contrasena,
    u.rol,
    u.activo,
    u.fotoPerfil || '',
  ].join('|');
}

function txtAUsuario(linea) {
  const p = linea.split('|');
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
    .map(txtAUsuario);
}

function escribirUsuarios(usuarios) {
  asegurarArchivo();
  const texto = usuarios.map(usuarioATxt).join('\n') + '\n';
  fs.writeFileSync(USUARIOS_FILE, texto, 'utf8');
}

export function buscarPorIdentificacion(identificacion) {
  return leerUsuarios().find(u => u.identificacion.trim() === identificacion.trim()) || null;
}

export function buscarPorCorreo(correo) {
  return leerUsuarios().find(u => u.correo.toLowerCase() === correo.toLowerCase()) || null;
}

export function contarUsuarios()   { return leerUsuarios().length; }
export function contarAdmins()     { return leerUsuarios().filter(u => u.rol === 'ADMINISTRADOR').length; }
export function contarVendedores() { return leerUsuarios().filter(u => u.rol === 'VENDEDOR').length; }

export function actualizarUsuario(identificacion, datos) {
  const usuarios = leerUsuarios();
  const idx = usuarios.findIndex(u => u.identificacion === identificacion);
  if (idx === -1) return { error: 'Usuario no encontrado.' };
  usuarios[idx] = { ...usuarios[idx], ...datos };
  escribirUsuarios(usuarios);
  return { ok: true };
}

export function eliminarUsuario(identificacion) {
  const usuarios = leerUsuarios();
  const idx = usuarios.findIndex(u => u.identificacion === identificacion);
  if (idx === -1) return { error: 'Usuario no encontrado.' };
  usuarios.splice(idx, 1);
  escribirUsuarios(usuarios);
  return { ok: true };
}

export function registrarUsuario(datos) {
  const usuarios = leerUsuarios();

  if (usuarios.some(u => u.correo.toLowerCase() === datos.correo.toLowerCase())) {
    return { error: 'El correo ya está registrado.' };
  }
  if (usuarios.some(u => u.identificacion.trim() === datos.identificacion.trim())) {
    return { error: 'La identificación ya está registrada.' };
  }

  const maxId = usuarios.reduce((max, u) => Math.max(max, u.id), 0);
  const nuevo = {
    id: maxId + 1,
    nombreCompleto: datos.nombreCompleto,
    identificacion: datos.identificacion,
    celular: datos.celular,
    tipoSangre: datos.tipoSangre,
    correo: datos.correo,
    contrasena: hashSHA256(datos.contrasena),
    rol: datos.rol,
    activo: true,
    fotoPerfil: '',
  };

  usuarios.push(nuevo);
  escribirUsuarios(usuarios);
  return { ok: true, usuario: nuevo };
}
