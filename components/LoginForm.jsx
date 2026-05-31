'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registroOk = searchParams.get('registro') === 'ok';
  const logoutOk   = searchParams.get('logout')    === 'ok';

  const [identificacion, setIdentificacion] = useState('');
  const [contrasena, setContrasena]         = useState('');
  const [mostrarPw, setMostrarPw]           = useState(false);
  const [error, setError]                   = useState('');
  const [cargando, setCargando]             = useState(false);

  // Validación cliente
  function validar() {
    if (!identificacion.trim()) return 'Ingresa tu número de identificación.';
    if (!contrasena)            return 'Ingresa tu contraseña.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const err = validar();
    if (err) { setError(err); return; }

    setCargando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificacion: identificacion.trim(), contrasena }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión.');
      } else {
        // FIX: Siempre ir a /main/dashboard (la API devuelve destino fijo)
        router.push(data.destino || '/main/dashboard');
        router.refresh();
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <div className="auth-logo">A17</div>
          <h1 className="auth-title">Área 17</h1>
          <p className="auth-subtitle">Sistema de Gestión Empresarial</p>
        </div>

        {registroOk && (
          <div className="alert alert-success" role="alert">
            Registro exitoso. Ya puedes ingresar.
          </div>
        )}

        {logoutOk && (
          <div className="alert alert-success" role="alert">
            Sesión cerrada correctamente.
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">{error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate aria-label="Formulario de inicio de sesión">
          <div className="form-group">
            <label className="form-label" htmlFor="identificacion">
              Número de Identificación
            </label>
            <input
              id="identificacion"
              className="form-control"
              type="text"
              inputMode="numeric"
              maxLength={20}
              placeholder="Ej: 1023456789"
              value={identificacion}
              // FIX: Solo permitir dígitos en el campo de identificación
              onChange={e => setIdentificacion(e.target.value.replace(/\D/g, ''))}
              autoComplete="username"
              required
              aria-required="true"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="contrasena">
              Contraseña
            </label>
            <div className="input-wrap">
              <input
                id="contrasena"
                className="form-control has-toggle"
                type={mostrarPw ? 'text' : 'password'}
                placeholder="Tu contraseña"
                value={contrasena}
                onChange={e => setContrasena(e.target.value)}
                autoComplete="current-password"
                required
                aria-required="true"
              />
              <button
                type="button"
                className="toggle-pw"
                onClick={() => setMostrarPw(v => !v)}
                aria-label={mostrarPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={mostrarPw}
              >
                {mostrarPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={cargando}
            style={{ marginTop: '0.5rem' }}
            aria-busy={cargando}
          >
            {cargando ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <div className="auth-divider">o</div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.push('/registro')}
        >
          Crear cuenta nueva
        </button>
      </div>
    </div>
  );
}
