'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Alert     from '@/components/ui/Alert';

const TIPOS_SANGRE = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

function getIni(nombre) {
  const p = (nombre || '').trim().split(' ').filter(Boolean);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : (p[0]?.[0] || 'U').toUpperCase();
}

// Comprime la imagen en el cliente con Canvas API antes de subir
async function comprimirImagen(file, maxPx = 500, quality = 0.82) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > maxPx || h > maxPx) {
        if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx; }
        else        { w = Math.round(w * maxPx / h); h = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(blob => resolve(blob || file), mime, quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

const IconLogout = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconCamera = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const IconEye    = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeOff = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const IconSave   = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconLock   = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

export default function PerfilClient({ sesion }) {
  const router = useRouter();
  const fileRef = useRef(null);

  const [msg, setMsg]           = useState(null);
  const [msgTipo, setMsgTipo]   = useState('success');
  const [cargando, setCargando] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoFile,    setFotoFile]    = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [mostrarPw, setMostrarPw]   = useState({ actual: false, nueva: false, conf: false });
  const [modalLogout, setModalLogout] = useState(false);
  const [isMobile, setIsMobile]     = useState(false);

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
    ? `/api/foto-perfil?archivo=${encodeURIComponent(sesion.fotoPerfil)}`
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

  function showMsg(tipo, texto) {
    setMsgTipo(tipo);
    setMsg(texto);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function guardarDatos() {
    if (!formDatos.nombreCompleto.trim()) return showMsg('error', 'El nombre es obligatorio.');
    setCargando(true);
    try {
      const res  = await fetch('/api/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'editarDatos', ...formDatos }),
      });
      const data = await res.json();
      if (!res.ok || data.error) showMsg('error', data.error || 'Error al guardar.');
      else { showMsg('success', 'Datos actualizados exitosamente.'); router.refresh(); }
    } catch { showMsg('error', 'Error de conexión.'); }
    finally  { setCargando(false); }
  }

  async function cambiarContrasena() {
    if (!formPw.contrasenaActual)                                   return showMsg('error', 'Ingresa tu contraseña actual.');
    if (!formPw.nuevaContrasena || formPw.nuevaContrasena.length < 8) return showMsg('error', 'La nueva contraseña debe tener mínimo 8 caracteres.');
    if (formPw.nuevaContrasena !== formPw.confirmarContrasena)       return showMsg('error', 'Las contraseñas no coinciden.');
    setCargando(true);
    try {
      const res  = await fetch('/api/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'cambiarContrasena', ...formPw }),
      });
      const data = await res.json();
      if (!res.ok || data.error) showMsg('error', data.error || 'Error.');
      else {
        showMsg('success', 'Contraseña actualizada exitosamente.');
        setFormPw({ contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '' });
      }
    } catch { showMsg('error', 'Error de conexión.'); }
    finally  { setCargando(false); }
  }

  async function subirFoto() {
    if (!fotoFile) return;
    setSubiendoFoto(true);
    try {
      // Comprimir en cliente antes de enviar (Canvas API)
      const compressed = await comprimirImagen(fotoFile, 500, 0.82);
      const fd = new FormData();
      fd.append('accion', 'subirFoto');
      fd.append('fotoPerfil', compressed, fotoFile.name);

      const res  = await fetch('/api/perfil', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.error) showMsg('error', data.error || 'Error al subir foto.');
      else {
        showMsg('success', 'Foto de perfil actualizada correctamente.');
        setFotoFile(null);
        setFotoPreview(null);
        router.refresh();
      }
    } catch { showMsg('error', 'Error al procesar la imagen. Intenta de nuevo.'); }
    finally  { setSubiendoFoto(false); }
  }

  function onFotoChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { showMsg('error', 'La imagen no puede superar 5 MB.'); return; }
    setFotoFile(f);
    const reader = new FileReader();
    reader.onload = ev => setFotoPreview(ev.target.result);
    reader.readAsDataURL(f);
  }

  async function confirmarLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* continuar */ }
    try { localStorage.clear(); } catch { /**/ }
    try { sessionStorage.clear(); } catch { /**/ }
    router.replace('/login?logout=ok');
  }

  const avatarUrl = fotoPreview || fotoUrl;
  const initials  = getIni(sesion.nombreCompleto);
  const pwMatch   = formPw.nuevaContrasena && formPw.confirmarContrasena
    ? formPw.nuevaContrasena === formPw.confirmarContrasena
    : null;

  return (
    <div className="content-area">
      <PageHeader title="Mi Perfil" subtitle="Administra tu cuenta y seguridad" />

      {msg && <Alert tipo={msgTipo} mensaje={msg} onClose={() => setMsg(null)} />}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '290px 1fr',
        gap: '1.5rem',
        alignItems: 'start',
      }}>

        {/* ── PANEL IZQUIERDO: Foto + info ───────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Tarjeta de foto */}
          <div className="panel" style={{ textAlign: 'center', padding: isMobile ? '1.75rem 1.25rem' : '2rem 1.5rem' }}>

            {/* Avatar circular */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Foto de perfil"
                  style={{
                    width: isMobile ? 110 : 130,
                    height: isMobile ? 110 : 130,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block',
                    border: '3px solid var(--primary)',
                    boxShadow: '0 0 28px var(--primary-glow), 0 4px 20px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                  }}
                />
              ) : (
                <div style={{
                  width: isMobile ? 110 : 130,
                  height: isMobile ? 110 : 130,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? 38 : 44,
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, var(--primary-dark), #0a3d22)',
                  border: '3px solid var(--primary)',
                  boxShadow: '0 0 28px var(--primary-glow), 0 4px 20px rgba(0,0,0,0.5)',
                  color: 'var(--primary)',
                  userSelect: 'none',
                }}>
                  {initials}
                </div>
              )}

              {/* Botón de cámara superpuesto */}
              <button
                onClick={() => fileRef.current?.click()}
                title="Cambiar foto"
                style={{
                  position: 'absolute', bottom: 2, right: 2,
                  width: 34, height: 34,
                  borderRadius: '50%',
                  background: 'var(--primary-dark)',
                  border: '2px solid var(--bg-card)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-dark)'}
              >
                <IconCamera />
              </button>
            </div>

            {/* Nombre y rol */}
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {sesion.nombreCompleto}
            </div>
            <div style={{
              display: 'inline-block',
              marginTop: '0.4rem',
              padding: '0.2rem 0.85rem',
              borderRadius: 20,
              background: 'rgba(45,206,107,0.1)',
              border: '1px solid rgba(45,206,107,0.25)',
              fontSize: '0.68rem',
              fontWeight: 700,
              color: 'var(--primary-light)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '1.25rem',
            }}>
              {sesion.rol}
            </div>

            {/* Input oculto + área de selección */}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={onFotoChange}
            />

            {fotoFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-glow)',
                  borderRadius: '0.6rem',
                  padding: '0.6rem',
                }}>
                  {fotoFile.name}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: '0.82rem' }}
                    disabled={subiendoFoto}
                    onClick={subirFoto}
                  >
                    {subiendoFoto ? 'Subiendo...' : 'Guardar foto'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.6rem 0.9rem' }}
                    onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.82rem', gap: '0.5rem' }}
                onClick={() => fileRef.current?.click()}
              >
                <IconCamera /> Cambiar foto
              </button>
            )}

            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.6rem', lineHeight: 1.4 }}>
              JPG, PNG o WEBP · Máx 5 MB
            </p>
          </div>

          {/* Información de sesión */}
          <div className="panel" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.9rem' }}>
              Información de cuenta
            </div>
            {[
              { label: 'ID', value: sesion.id },
              { label: 'Identificación', value: sesion.identificacion },
              { label: 'Correo', value: sesion.correo },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: '0.65rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Estado</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6ee7a0', background: 'rgba(45,206,107,0.09)', border: '1px solid rgba(45,206,107,0.2)', borderRadius: 20, padding: '0.15rem 0.7rem' }}>
                Activo
              </span>
            </div>
          </div>

          {/* Botón Cerrar Sesión */}
          <button
            className="btn btn-danger"
            style={{ width: '100%', gap: '0.6rem', minHeight: 44, fontSize: '0.88rem' }}
            onClick={() => setModalLogout(true)}
          >
            <IconLogout />
            Cerrar Sesión
          </button>
        </div>

        {/* ── PANEL DERECHO: Datos + Contraseña ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Datos personales */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Datos personales</span>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Nombre completo *</label>
                  <input
                    className="form-control"
                    value={formDatos.nombreCompleto}
                    onChange={e => setDatos('nombreCompleto', e.target.value)}
                    placeholder="Tu nombre completo"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Correo electrónico *</label>
                  <input
                    className="form-control"
                    type="email"
                    value={formDatos.correo}
                    onChange={e => setDatos('correo', e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Celular</label>
                  <input
                    className="form-control"
                    value={formDatos.celular}
                    onChange={e => setDatos('celular', e.target.value)}
                    placeholder="3001234567"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Tipo de sangre</label>
                  <select
                    className="form-control"
                    value={formDatos.tipoSangre}
                    onChange={e => setDatos('tipoSangre', e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    {TIPOS_SANGRE.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Identificación</label>
                <input className="form-control" value={sesion.identificacion} readOnly />
                <p className="readonly-note">No puede modificarse</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ gap: '0.5rem', minWidth: 160 }}
                  disabled={cargando}
                  onClick={guardarDatos}
                >
                  <IconSave />
                  {cargando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>

          {/* Cambiar contraseña */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Cambiar contraseña</span>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Contraseña actual *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-control"
                    type={mostrarPw.actual ? 'text' : 'password'}
                    value={formPw.contrasenaActual}
                    onChange={e => setPw('contrasenaActual', e.target.value)}
                    placeholder="Tu contraseña actual"
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPw(v => ({ ...v, actual: !v.actual }))}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                  >
                    {mostrarPw.actual ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Nueva contraseña *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-control"
                      type={mostrarPw.nueva ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={formPw.nuevaContrasena}
                      onChange={e => setPw('nuevaContrasena', e.target.value)}
                      style={{ paddingRight: '2.75rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPw(v => ({ ...v, nueva: !v.nueva }))}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                    >
                      {mostrarPw.nueva ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Confirmar contraseña *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-control"
                      type={mostrarPw.conf ? 'text' : 'password'}
                      placeholder="Repite la contraseña"
                      value={formPw.confirmarContrasena}
                      onChange={e => setPw('confirmarContrasena', e.target.value)}
                      style={{
                        paddingRight: '2.75rem',
                        borderColor: pwMatch === null ? undefined : pwMatch ? 'var(--primary)' : 'var(--danger)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPw(v => ({ ...v, conf: !v.conf }))}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                    >
                      {mostrarPw.conf ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {pwMatch !== null && (
                    <p style={{ fontSize: '0.72rem', marginTop: '0.3rem', fontWeight: 600,
                      color: pwMatch ? 'var(--primary)' : 'var(--danger)' }}>
                      {pwMatch ? '✓ Las contraseñas coinciden' : '✗ No coinciden'}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ gap: '0.5rem', minWidth: 180 }}
                  disabled={cargando}
                  onClick={cambiarContrasena}
                >
                  <IconLock />
                  {cargando ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── MODAL CERRAR SESIÓN ─────────────────────────────── */}
      {modalLogout && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setModalLogout(false); }}
        >
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <IconLogout /> Cerrar Sesión
              </h3>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', gap: '0.6rem' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)',
                border: '2px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto',
                color: '#ef4444',
              }}>
                <IconLogout />
              </div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
                ¿Deseas cerrar sesión?
              </p>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Se eliminará tu sesión actual y serás redirigido al inicio de sesión.
              </p>
            </div>
            <div className="modal-footer" style={{ gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setModalLogout(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1, gap: '0.5rem' }}
                onClick={confirmarLogout}
              >
                <IconLogout /> Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
