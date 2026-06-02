'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Alert     from '@/components/ui/Alert';

const TIPOS_SANGRE = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

function getIni(nombre) {
  const p = (nombre||'').trim().split(' ').filter(Boolean);
  return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : (p[0]?.[0]||'U').toUpperCase();
}

export default function PerfilClient({ sesion }) {
  const router = useRouter();
  const [msg, setMsg]           = useState(null);
  const [msgTipo, setMsgTipo]   = useState('success');
  const [cargando, setCargando] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoFile,    setFotoFile]    = useState(null);
  const [mostrarPw, setMostrarPw]     = useState(false);
  const [isMobile, setIsMobile]       = useState(false);

  const [formDatos, setFormDatos] = useState({
    nombreCompleto: sesion.nombreCompleto || '',
    celular:        sesion.celular        || '',
    tipoSangre:     sesion.tipoSangre     || '',
    correo:         sesion.correo         || '',
  });
  const [formPw, setFormPw] = useState({
    contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '',
  });

  const fotoUrl = sesion.fotoPerfil
    ? `/api/foto-perfil?archivo=${sesion.fotoPerfil}`
    : null;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    setIsMobile(mq.matches);
    const fn = e => setIsMobile(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  function setDatos(k, v) { setFormDatos(f => ({ ...f, [k]: v })); }
  function setPw(k, v)    { setFormPw(f => ({ ...f, [k]: v })); }

  async function guardarDatos() {
    setCargando(true);
    try {
      const res  = await fetch('/api/perfil', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion:'editarDatos', ...formDatos }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setMsgTipo('error'); setMsg(data.error || 'Error.'); }
      else { setMsgTipo('success'); setMsg('Datos actualizados exitosamente.'); router.refresh(); }
    } catch { setMsgTipo('error'); setMsg('Error de conexión.'); }
    finally   { setCargando(false); }
  }

  async function cambiarContrasena() {
    if (!formPw.contrasenaActual)                              return alert('Ingresa tu contraseña actual.');
    if (!formPw.nuevaContrasena || formPw.nuevaContrasena.length < 8) return alert('Mínimo 8 caracteres.');
    if (formPw.nuevaContrasena !== formPw.confirmarContrasena) return alert('Las contraseñas no coinciden.');
    setCargando(true);
    try {
      const res  = await fetch('/api/perfil', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion:'cambiarContrasena', ...formPw }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setMsgTipo('error'); setMsg(data.error || 'Error.'); }
      else {
        setMsgTipo('success'); setMsg('Contraseña actualizada exitosamente.');
        setFormPw({ contrasenaActual:'', nuevaContrasena:'', confirmarContrasena:'' });
      }
    } catch { setMsgTipo('error'); setMsg('Error de conexión.'); }
    finally   { setCargando(false); }
  }

  async function subirFoto() {
    if (!fotoFile) return;
    const fd = new FormData();
    fd.append('accion', 'subirFoto');
    fd.append('fotoPerfil', fotoFile);
    setCargando(true);
    try {
      const res  = await fetch('/api/perfil', { method:'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.error) { setMsgTipo('error'); setMsg(data.error || 'Error al subir foto.'); }
      else { setMsgTipo('success'); setMsg('Foto actualizada.'); setFotoFile(null); router.refresh(); }
    } catch { setMsgTipo('error'); setMsg('Error de conexión.'); }
    finally   { setCargando(false); }
  }

  function onFotoChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFotoFile(f);
    const reader = new FileReader();
    reader.onload = ev => setFotoPreview(ev.target.result);
    reader.readAsDataURL(f);
  }

  const avatarUrl = fotoPreview || fotoUrl;

  return (
    <div className="content-area">
      <PageHeader title="Mi Perfil" subtitle="Configuración de cuenta y seguridad" />
      {msg && <Alert tipo={msgTipo} mensaje={msg} onClose={() => setMsg(null)} />}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '300px 1fr',
        gap: '1.5rem',
        alignItems: 'start',
      }}>

        {/* ── Foto de perfil ─────────────────────────────────── */}
        <div className="panel" style={{
          textAlign: 'center',
          padding: isMobile ? '1.5rem 1rem' : '2rem 1.5rem',
        }}>
          {/* Avatar */}
          {avatarUrl
            ? <img src={avatarUrl} alt="Foto de perfil"
                style={{ width: isMobile ? 100 : 120, height: isMobile ? 100 : 120,
                  borderRadius: '50%', objectFit: 'cover',
                  margin: '0 auto 0.75rem', display: 'block',
                  border: '3px solid var(--primary)',
                  boxShadow: '0 0 20px var(--primary-glow)' }} />
            : <div style={{
                width: isMobile ? 100 : 120, height: isMobile ? 100 : 120,
                borderRadius: '50%', margin: '0 auto 0.75rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isMobile ? 34 : 40, fontWeight: 900,
                background: 'linear-gradient(135deg,var(--primary-dark),var(--bg-sidebar))',
                border: '3px solid var(--primary)',
                boxShadow: '0 0 20px var(--primary-glow)',
                color: 'var(--primary)',
              }}>
                {getIni(sesion.nombreCompleto)}
              </div>
          }

          <div style={{ fontWeight: 700, fontSize: isMobile ? '1rem' : '0.95rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
            {sesion.nombreCompleto}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '1.25rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {sesion.rol}
          </div>

          {/* Selector de foto */}
          <label style={{
            display: 'block', cursor: 'pointer',
            background: 'var(--bg-input)',
            border: '1px dashed var(--border-glow)',
            borderRadius: '0.6rem', padding: '0.75rem',
            marginBottom: '0.75rem',
          }}>
            <input type="file" accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }} onChange={onFotoChange} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {fotoFile ? `📎 ${fotoFile.name}` : '📷 Cambiar foto (JPG, PNG, WEBP — máx 2 MB)'}
            </span>
          </label>

          {fotoFile && (
            <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem' }}
              disabled={cargando} onClick={subirFoto}>
              {cargando ? 'Subiendo...' : 'Subir foto'}
            </button>
          )}
        </div>

        {/* ── Datos + Contraseña ─────────────────────────────── */}
        <div>
          {/* Datos personales */}
          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-header"><span className="panel-title">Datos personales</span></div>
            <div className="panel-body">

              <div className="form-group">
                <label className="form-label">Nombre completo *</label>
                <input className="form-control" value={formDatos.nombreCompleto}
                  onChange={e => setDatos('nombreCompleto', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Correo electrónico *</label>
                <input className="form-control" type="email" value={formDatos.correo}
                  onChange={e => setDatos('correo', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Celular</label>
                <input className="form-control" value={formDatos.celular}
                  onChange={e => setDatos('celular', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de sangre</label>
                <select className="form-control" value={formDatos.tipoSangre}
                  onChange={e => setDatos('tipoSangre', e.target.value)}>
                  <option value="">Seleccionar</option>
                  {TIPOS_SANGRE.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Identificación</label>
                <input className="form-control" value={sesion.identificacion} readOnly />
                <p className="readonly-note">La identificación no puede modificarse</p>
              </div>

              <div className="btn-row">
                <button className="btn btn-primary" disabled={cargando} onClick={guardarDatos}>
                  {cargando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>

          {/* Contraseña */}
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Cambiar contraseña</span></div>
            <div className="panel-body">

              <div className="form-group">
                <label className="form-label">Contraseña actual *</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-control"
                    type={mostrarPw ? 'text' : 'password'}
                    value={formPw.contrasenaActual}
                    onChange={e => setPw('contrasenaActual', e.target.value)}
                    style={{ paddingRight: '2.5rem' }} />
                  <button type="button" onClick={() => setMostrarPw(v => !v)}
                    style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {mostrarPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nueva contraseña *</label>
                <input className="form-control" type="password" placeholder="Mínimo 8 caracteres"
                  value={formPw.nuevaContrasena}
                  onChange={e => setPw('nuevaContrasena', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Confirmar contraseña *</label>
                <input className="form-control" type="password"
                  value={formPw.confirmarContrasena}
                  onChange={e => setPw('confirmarContrasena', e.target.value)} />
                {formPw.nuevaContrasena && formPw.confirmarContrasena && (
                  <p style={{ fontSize: '0.72rem', marginTop: '0.25rem', fontWeight: 600,
                    color: formPw.nuevaContrasena === formPw.confirmarContrasena ? 'var(--primary)' : '#ef4444' }}>
                    {formPw.nuevaContrasena === formPw.confirmarContrasena ? '✓ Coinciden' : '✗ No coinciden'}
                  </p>
                )}
              </div>

              <div className="btn-row">
                <button className="btn btn-primary" disabled={cargando} onClick={cambiarContrasena}>
                  {cargando ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
