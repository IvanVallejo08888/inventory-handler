'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader    from '@/components/ui/PageHeader';
import Alert        from '@/components/ui/Alert';
import ProductModal from '@/components/inventario/ProductModal';

const SUPERADMIN_ID = 1000;

function getIni(nombre) {
  const p = (nombre || '').trim().split(' ').filter(Boolean);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : (p[0]?.[0] || 'U').toUpperCase();
}

const VACIO_EDITAR = {
  id: null, nombreCompleto:'', identificacion:'', celular:'',
  tipoSangre:'', correo:'', rol:'VENDEDOR', activo:'true',
  nuevaContrasena:'', confirmarContrasena:'',
};

export default function UsuariosClient({ lista, totalUsuarios, totalAdmins, totalVendedores, buscar, filtroRol, sesionId }) {
  const router    = useRouter();
  const [, start] = useTransition();

  const [msg,     setMsg]     = useState(null);
  const [msgTipo, setMsgTipo] = useState('success');
  const [cargando, setCargando] = useState(false);

  const [modalEditar, setModalEditar] = useState(false);
  const [confirmId,   setConfirmId]   = useState(null);
  const [form,        setForm]        = useState(VACIO_EDITAR);
  const [mostrarPw,   setMostrarPw]   = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function abrirEditar(u) {
    setMostrarPw(false);
    setForm({
      id: u.id, nombreCompleto: u.nombreCompleto, identificacion: u.identificacion,
      celular: u.celular, tipoSangre: u.tipoSangre, correo: u.correo,
      rol: u.rol, activo: String(u.activo), nuevaContrasena:'', confirmarContrasena:'',
    });
    setModalEditar(true);
  }

  function cerrarEditar() {
    setModalEditar(false);
    setForm(VACIO_EDITAR);
  }

  async function enviar(accion) {
    setCargando(true);
    try {
      const body = accion === 'eliminar' ? { accion, id: confirmId } : { accion, ...form };
      const res  = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMsgTipo('error'); setMsg(data.error || 'Error.');
      } else {
        setMsgTipo('success');
        setMsg(accion === 'editar' ? 'Usuario actualizado exitosamente.' : 'Usuario eliminado exitosamente.');
        cerrarEditar();
        setConfirmId(null);
        start(() => router.refresh());
      }
    } catch { setMsgTipo('error'); setMsg('Error de conexión.'); }
    finally  { setCargando(false); }
  }

  return (
    <div className="content-area">
      <PageHeader title="Gestión de Usuarios" subtitle="Administración de cuentas y roles" />

      {msg && <Alert tipo={msgTipo} mensaje={msg} onClose={() => setMsg(null)} />}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
        {[
          { label:'Total usuarios',  valor: totalUsuarios,   icono:'👥', clase:'purple' },
          { label:'Administradores', valor: totalAdmins,     icono:'🔑', clase:'blue'   },
          { label:'Vendedores',      valor: totalVendedores, icono:'🛒', clase:'green'  },
        ].map(c => (
          <div className="stat-card" key={c.label}>
            <div className={`stat-icon ${c.clase}`}>{c.icono}</div>
            <div className="stat-info">
              <div className="stat-value">{c.valor}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <form method="GET" className="search-bar">
        <input name="buscar" defaultValue={buscar} placeholder="Buscar por nombre, correo o identificación..." style={{ flex:1 }} />
        <select name="rol" defaultValue={filtroRol}>
          <option value="TODOS">Todos los roles</option>
          <option value="ADMINISTRADOR">Administrador</option>
          <option value="VENDEDOR">Vendedor</option>
        </select>
        <button type="submit" className="btn btn-primary" style={{ padding:'0.5rem 1rem', fontSize:'0.85rem' }}>Buscar</button>
        {(buscar || filtroRol !== 'TODOS') && (
          <a href="/main/usuarios" className="btn btn-secondary" style={{ padding:'0.5rem 1rem', fontSize:'0.85rem' }}>Limpiar</a>
        )}
      </form>

      {/* Tabla */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Usuarios registrados</span>
          <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{lista.length} registros</span>
        </div>
        <div className="table-responsive">
          <table className="area17-table">
            <thead>
              <tr>
                <th>Usuario</th><th>Identificación</th><th>Correo</th>
                <th>Rol</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                      {u.fotoPerfil
                        ? <img src={`/api/foto-perfil?archivo=${u.fotoPerfil}`} className="usuario-foto" alt="" />
                        : <div className="usuario-avatar">{getIni(u.nombreCompleto)}</div>
                      }
                      <span>{u.nombreCompleto}</span>
                      {u.id === SUPERADMIN_ID && (
                        <span style={{ fontSize:'0.65rem', color:'var(--primary)', fontWeight:700 }}>SUPERADMIN</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontFamily:'monospace', fontSize:'0.85rem' }}>{u.identificacion}</td>
                  <td style={{ fontSize:'0.82rem' }}>{u.correo}</td>
                  <td>
                    <span
                      className={u.rol === 'ADMINISTRADOR' ? 'badge-activo' : ''}
                      style={u.rol !== 'ADMINISTRADOR' ? { color:'var(--text-secondary)', fontSize:'0.82rem' } : {}}
                    >
                      {u.rol}
                    </span>
                  </td>
                  <td>
                    <span className={u.activo ? 'badge-activo' : 'badge-inactivo'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn" title="Editar" onClick={() => abrirEditar(u)}>✏️</button>
                    {u.id !== SUPERADMIN_ID && u.id !== sesionId && (
                      <button className="action-btn" title="Eliminar" onClick={() => setConfirmId(u.id)}>🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>
                    Sin usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Editar Usuario ───────────────────────────────── */}
      <ProductModal
        isOpen={modalEditar}
        onClose={cerrarEditar}
        title="Editar usuario"
        maxWidth={560}
        footer={
          <>
            <button className="btn btn-secondary" onClick={cerrarEditar}>Cancelar</button>
            <button className="btn btn-primary" disabled={cargando} onClick={() => enviar('editar')}>
              {cargando ? 'Guardando...' : 'Actualizar'}
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <input className="form-control" autoFocus value={form.nombreCompleto}
              onChange={e => set('nombreCompleto', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Identificación</label>
            <input className="form-control" value={form.identificacion}
              onChange={e => set('identificacion', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Celular</label>
            <input className="form-control" value={form.celular}
              onChange={e => set('celular', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de sangre</label>
            <select className="form-control" value={form.tipoSangre} onChange={e => set('tipoSangre', e.target.value)}>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Correo</label>
          <input className="form-control" type="email" value={form.correo}
            onChange={e => set('correo', e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Rol</label>
            <select className="form-control" value={form.rol}
              onChange={e => set('rol', e.target.value)}
              disabled={form.id === sesionId}>
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              <option value="VENDEDOR">VENDEDOR</option>
            </select>
            {form.id === sesionId && (
              <p className="readonly-note">No puedes cambiar tu propio rol</p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-control" value={form.activo}
              onChange={e => set('activo', e.target.value)}
              disabled={form.id === sesionId}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
        </div>

        {/* Cambiar contraseña */}
        <p style={{
          fontSize:'0.78rem', fontWeight:700, color:'var(--primary)',
          textTransform:'uppercase', borderTop:'1px solid var(--border-color)',
          paddingTop:'1rem', marginTop:'0.25rem', marginBottom:'0.5rem',
        }}>
          Cambiar contraseña (opcional)
        </p>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nueva contraseña</label>
            <div style={{ position:'relative' }}>
              <input className="form-control"
                type={mostrarPw ? 'text' : 'password'}
                value={form.nuevaContrasena}
                onChange={e => set('nuevaContrasena', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                style={{ paddingRight:'2.5rem' }}
              />
              <button type="button" onClick={() => setMostrarPw(v => !v)}
                style={{ position:'absolute', right:'0.6rem', top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}>
                {mostrarPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar contraseña</label>
            <input className="form-control" type="password"
              value={form.confirmarContrasena}
              onChange={e => set('confirmarContrasena', e.target.value)} />
            {form.nuevaContrasena && form.confirmarContrasena && (
              <p style={{
                fontSize:'0.72rem', marginTop:'0.25rem', fontWeight:600,
                color: form.nuevaContrasena === form.confirmarContrasena ? 'var(--primary)' : '#ef4444',
              }}>
                {form.nuevaContrasena === form.confirmarContrasena ? '✓ Coinciden' : '✗ No coinciden'}
              </p>
            )}
          </div>
        </div>
      </ProductModal>

      {/* ── Confirmar Eliminar ─────────────────────────────────── */}
      {confirmId !== null && (
        <ProductModal
          isOpen
          onClose={() => setConfirmId(null)}
          title="Eliminar usuario"
          maxWidth={400}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConfirmId(null)}>Cancelar</button>
              <button className="btn" style={{ background:'var(--danger)', color:'#fff' }}
                disabled={cargando} onClick={() => enviar('eliminar')}>
                {cargando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </>
          }
        >
          <div style={{ textAlign:'center', padding:'0.5rem 0' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>⚠️</div>
            <p style={{ color:'var(--text-primary)', fontWeight:600, marginBottom:'0.4rem' }}>
              ¿Eliminar este usuario?
            </p>
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>
              Esta acción no se puede deshacer. El usuario perderá acceso al sistema.
            </p>
          </div>
        </ProductModal>
      )}
    </div>
  );
}
