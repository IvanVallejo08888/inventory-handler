'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LogoArea17 from '@/components/ui/LogoArea17';

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function calcularFuerzaPw(pw) {
  if (!pw) return { score: 0, label: '', color: '#3d6342' };
  let score = 0;
  if (pw.length >= 8)                score++;
  if (/[A-Z]/.test(pw))             score++;
  if (/[0-9]/.test(pw))             score++;
  if (/[^A-Za-z0-9]/.test(pw))      score++;
  const map = {
    1: { label: 'Débil',    color: '#ef4444' },
    2: { label: 'Regular',  color: '#f97316' },
    3: { label: 'Buena',    color: '#3b82f6' },
    4: { label: 'Fuerte',   color: '#2dce6b' },
  };
  return { score, ...(map[score] || { label: '', color: '#3d6342' }) };
}

export default function RegistroForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombreCompleto: '',
    identificacion: '',
    celular: '',
    tipoSangre: '',
    correo: '',
    contrasena: '',
    confirmar: '',
    claveEspecial: '',
  });

  const [mostrarPw, setMostrarPw]         = useState(false);
  const [mostrarClave, setMostrarClave]   = useState(false);
  const [error, setError]                 = useState('');
  const [cargando, setCargando]           = useState(false);
  const fuerza = calcularFuerzaPw(form.contrasena);
  const pwCoincide = form.confirmar && form.contrasena === form.confirmar;

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }

  function validarCliente() {
    const { nombreCompleto, identificacion, celular, tipoSangre, correo, contrasena, confirmar, claveEspecial } = form;
    if (!nombreCompleto.trim())  return 'El nombre completo es obligatorio.';
    if (!identificacion.trim())  return 'La identificación es obligatoria.';
    if (!celular.trim())         return 'El celular es obligatorio.';
    if (!tipoSangre)             return 'Selecciona el tipo de sangre.';
    if (!correo.trim())          return 'El correo es obligatorio.';
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(correo))
      return 'El correo no tiene formato válido.';
    if (!contrasena)             return 'La contraseña es obligatoria.';
    if (contrasena.length < 8)   return 'La contraseña debe tener mínimo 8 caracteres.';
    if (contrasena !== confirmar) return 'Las contraseñas no coinciden.';
    if (!claveEspecial)          return 'La clave especial es obligatoria.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const err = validarCliente();
    if (err) { setError(err); return; }

    setCargando(true);
    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al registrar.');
      } else {
        router.push('/login?registro=ok');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card wide">
        <div className="auth-logo-wrap">
          <LogoArea17 size={90} />
          <h1 className="auth-title">Crear Cuenta</h1>
          <p className="auth-subtitle">Completa todos los campos para registrarte</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Nombre */}
          <div className="form-group">
            <label className="form-label" htmlFor="nombreCompleto">Nombre Completo</label>
            <input
              id="nombreCompleto"
              className="form-control"
              type="text"
              placeholder="Luchando los Diaz"
              value={form.nombreCompleto}
              onChange={e => set('nombreCompleto', e.target.value)}
              required
            />
          </div>

          {/* Identificación + Celular */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="identificacion">Identificación</label>
              <input
                id="identificacion"
                className="form-control"
                type="text"
                inputMode="numeric"
                maxLength={15}
                placeholder="Número de documento"
                value={form.identificacion}
                onChange={e => set('identificacion', e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="celular">Celular</label>
              <input
                id="celular"
                className="form-control"
                type="tel"
                placeholder=" 300 123 4567"
                value={form.celular}
                onChange={e => set('celular', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Tipo Sangre + Correo */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="tipoSangre">Tipo de Sangre</label>
              <select
                id="tipoSangre"
                className="form-control"
                value={form.tipoSangre}
                onChange={e => set('tipoSangre', e.target.value)}
                required
              >
                <option value="">Seleccionar</option>
                {TIPOS_SANGRE.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="correo">Correo Electrónico</label>
              <input
                id="correo"
                className="form-control"
                type="email"
                placeholder="correo@gmail.com"
                value={form.correo}
                onChange={e => set('correo', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="form-group">
            <label className="form-label" htmlFor="contrasena">Contraseña</label>
            <div className="input-wrap">
              <input
                id="contrasena"
                className="form-control has-toggle"
                type={mostrarPw ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={form.contrasena}
                onChange={e => set('contrasena', e.target.value)}
                required
              />
              <button type="button" className="toggle-pw" onClick={() => setMostrarPw(v => !v)}>
                {mostrarPw ? '🙈' : '👁️'}
              </button>
            </div>
            {form.contrasena && (
              <div className="pw-strength">
                <div className="pw-strength-bar">
                  <div
                    className="pw-strength-fill"
                    style={{ width: `${(fuerza.score / 4) * 100}%`, background: fuerza.color }}
                  />
                </div>
                <p className="pw-strength-label" style={{ color: fuerza.color }}>
                  {fuerza.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirmar">Confirmar Contraseña</label>
            <input
              id="confirmar"
              className={`form-control ${form.confirmar && !pwCoincide ? 'error-field' : ''}`}
              type="password"
              placeholder="Repite la contraseña"
              value={form.confirmar}
              onChange={e => set('confirmar', e.target.value)}
              required
            />
            {form.confirmar && !pwCoincide && (
              <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem' }}>
                Las contraseñas no coinciden
              </p>
            )}
          </div>

          {/* Clave especial */}
          <div className="form-group">
            <label className="form-label" htmlFor="claveEspecial">Clave Especial de Rol</label>
            <div className="input-wrap">
              <input
                id="claveEspecial"
                className="form-control has-toggle"
                type={mostrarClave ? 'text' : 'password'}
                placeholder="Proporcionada por el administrador"
                value={form.claveEspecial}
                onChange={e => set('claveEspecial', e.target.value)}
                required
              />
              <button type="button" className="toggle-pw" onClick={() => setMostrarClave(v => !v)}>
                {mostrarClave ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={cargando}
            style={{ marginTop: '0.5rem' }}
          >
            {cargando ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="auth-divider">¿ya tienes cuenta?</div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.push('/login')}
        >
          Iniciar Sesión
        </button>
      </div>
    </div>
  );
}
