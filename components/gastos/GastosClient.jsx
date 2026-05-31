'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Alert     from '@/components/ui/Alert';

const fmt = v => `$${Number(v || 0).toLocaleString('es-CO', { minimumFractionDigits:0, maximumFractionDigits:0 })}`;
const HOY = () => new Date().toISOString().slice(0, 10);

const CATS = [
  { key:'SERVICIO',     label:'Servicio',     icono:'💼', cls:'c-serv'   },
  { key:'INVERSION',    label:'Inversión',    icono:'📈', cls:'c-inv'    },
  { key:'COMPRA',       label:'Compra',       icono:'🛒', cls:'c-comp'   },
  { key:'GASTO_DIARIO', label:'Gasto diario', icono:'📅', cls:'c-diario' },
];

const VACIO = { nombre:'', valor:'', fecha:HOY(), categoria:'SERVICIO', descripcion:'' };

export default function GastosClient({ lista, categoriaActual, totalMes, gastosPorCat, esAdmin }) {
  const router    = useRouter();
  const [, start] = useTransition();
  const [msg, setMsg]         = useState(null);
  const [msgTipo, setMsgTipo] = useState('success');
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar,  setModalEditar]  = useState(null);
  const [confirmId,    setConfirmId]    = useState(null);
  const [form, setForm] = useState(VACIO);
  const [cargando, setCargando] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function abrirEditar(g) {
    setForm({ id: g.id, nombre: g.nombre, valor: g.valor, fecha: g.fecha, categoria: g.categoria, descripcion: g.descripcion || '' });
    setModalEditar(g);
  }

  async function enviar(accion) {
    setCargando(true);
    try {
      const body = accion === 'eliminar' ? { accion, id: confirmId } : { accion, ...form };
      const res  = await fetch('/api/gastos', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) { setMsgTipo('error'); setMsg(data.error || 'Error.'); }
      else {
        setMsgTipo('success');
        setMsg(accion === 'agregar' ? 'Gasto registrado exitosamente.' : accion === 'editar' ? 'Gasto actualizado.' : 'Gasto eliminado.');
        setModalAgregar(false); setModalEditar(null); setConfirmId(null);
        setForm(VACIO);
        start(() => router.refresh());
      }
    } catch { setMsgTipo('error'); setMsg('Error de conexión.'); }
    finally  { setCargando(false); }
  }

  return (
    <div className="content-area">
      <PageHeader title="Gastos Empresariales" subtitle="Control de egresos y categorías">
        <button className="btn btn-primary" style={{ padding:'0.5rem 1.2rem', fontSize:'0.85rem' }}
          onClick={() => { setForm(VACIO); setModalAgregar(true); }}>
          + Registrar gasto
        </button>
      </PageHeader>

      {msg && <Alert tipo={msgTipo} mensaje={msg} onClose={() => setMsg(null)} />}

      {/* Categorías KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        {CATS.map(c => (
          <a key={c.key} href={categoriaActual === c.key ? '/gastos' : `/gastos?categoria=${c.key}`}
            className={`panel ${categoriaActual === c.key ? 'active' : ''}`}
            style={{ textDecoration:'none', textAlign:'center', padding:'1.25rem 1rem', cursor:'pointer',
              borderColor: categoriaActual === c.key ? 'var(--border-glow)' : undefined }}>
            <div style={{ fontSize:'1.75rem', marginBottom:'0.4rem' }}>{c.icono}</div>
            <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-secondary)', marginBottom:'0.25rem', textTransform:'uppercase' }}>{c.label}</div>
            <div style={{ fontSize:'1.1rem', fontWeight:900, color:'var(--primary)', fontFamily:"'Rajdhani',sans-serif" }}>
              {fmt(gastosPorCat[c.key] || 0)}
            </div>
          </a>
        ))}
      </div>

      {/* Total mes */}
      <div className="stat-card" style={{ marginBottom:'1.5rem', maxWidth:320 }}>
        <div className="stat-icon red">💸</div>
        <div className="stat-info">
          <div className="stat-value">{fmt(totalMes)}</div>
          <div className="stat-label">Total gastos del mes</div>
        </div>
      </div>

      {/* Tabla */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Registro de gastos {categoriaActual && `— ${categoriaActual}`}</span>
          <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{lista.length} registros</span>
        </div>
        <div className="table-responsive">
          <table className="area17-table">
            <thead>
              <tr><th>Código</th><th>Nombre</th><th>Valor</th><th>Fecha</th><th>Categoría</th>{esAdmin && <th>Acciones</th>}</tr>
            </thead>
            <tbody>
              {lista.map(g => (
                <tr key={g.id}>
                  <td><span className="codigo-badge">{g.codigo}</span></td>
                  <td>{g.nombre}</td>
                  <td style={{ color:'#ef4444', fontWeight:600 }}>{fmt(g.valor)}</td>
                  <td style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>{g.fecha}</td>
                  <td><span className={`badge-cat badge-${g.categoria}`}>{g.categoria.replace('_',' ')}</span></td>
                  {esAdmin && (
                    <td>
                      <button className="action-btn" onClick={() => abrirEditar(g)}>✏️</button>
                      <button className="action-btn" onClick={() => setConfirmId(g.id)}>🗑️</button>
                    </td>
                  )}
                </tr>
              ))}
              {!lista.length && (
                <tr><td colSpan={esAdmin ? 6 : 5} style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>
                  Sin gastos registrados
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar */}
      {modalAgregar && (
        <div className="confirm-overlay active" onClick={() => setModalAgregar(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border-subtle)', margin:0 }}>Registrar gasto</h3>
            <div style={{ padding:'1.5rem' }}>
              <FormGasto form={form} set={set} />
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={() => setModalAgregar(false)}>Cancelar</button>
                <button className="btn btn-primary" disabled={cargando} onClick={() => enviar('agregar')}>
                  {cargando ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar && (
        <div className="confirm-overlay active" onClick={() => setModalEditar(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border-subtle)', margin:0 }}>Editar gasto</h3>
            <div style={{ padding:'1.5rem' }}>
              <FormGasto form={form} set={set} />
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={() => setModalEditar(null)}>Cancelar</button>
                <button className="btn btn-primary" disabled={cargando} onClick={() => enviar('editar')}>
                  {cargando ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Eliminar */}
      {confirmId && (
        <div className="confirm-overlay active">
          <div className="confirm-box">
            <h4>¿Eliminar gasto?</h4>
            <p>Esta acción no se puede deshacer.</p>
            <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmId(null)}>Cancelar</button>
              <button className="btn" style={{ background:'var(--danger)', color:'#fff' }}
                disabled={cargando} onClick={() => enviar('eliminar')}>
                {cargando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormGasto({ form, set }) {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Nombre *</label>
          <input className="form-control" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Descripción del gasto" />
        </div>
        <div className="form-group">
          <label className="form-label">Valor *</label>
          <input className="form-control" type="number" min="0" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fecha *</label>
          <input className="form-control" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Categoría *</label>
          <select className="form-control" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
            <option value="SERVICIO">Servicio</option>
            <option value="INVERSION">Inversión</option>
            <option value="COMPRA">Compra</option>
            <option value="GASTO_DIARIO">Gasto Diario</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea className="form-control" rows={2} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Descripción adicional (opcional)" />
      </div>
    </>
  );
}
