'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Alert     from '@/components/ui/Alert';

const fmt = v => `$${Number(v || 0).toLocaleString('es-CO', { minimumFractionDigits:0, maximumFractionDigits:0 })}`;

const ESTADO_VACIO = { nombre:'', precio:'', cantidad:'', estado:'ACTIVO' };

export default function InventarioClient({ lista, totalProductos, productosActivos, totalUnidades, valorInventario, buscar, filtroEstado }) {
  const router      = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg]       = useState(null);
  const [msgTipo, setMsgTipo] = useState('success');
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar,  setModalEditar]  = useState(null);
  const [confirmId,    setConfirmId]    = useState(null);
  const [form, setForm] = useState(ESTADO_VACIO);
  const [cargando, setCargando] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function abrirEditar(p) {
    setForm({ nombre: p.nombre, precio: p.precio, cantidad: p.cantidad, estado: p.estado, id: p.id });
    setModalEditar(p);
  }

  async function enviar(accion) {
    setCargando(true);
    try {
      const body = accion === 'eliminar' ? { accion, id: confirmId } : { accion, ...form };
      const res  = await fetch('/api/productos', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMsgTipo('error'); setMsg(data.error || 'Error al procesar.');
      } else {
        setMsgTipo('success');
        setMsg(accion === 'agregar' ? (data.acumulado ? `✓ Stock acumulado: "${data.nombre}" ahora tiene ${data.cantidad} unidades.` : 'Producto agregado exitosamente.')
             : accion === 'editar'  ? 'Producto actualizado exitosamente.'
             : 'Producto eliminado exitosamente.');
        setModalAgregar(false); setModalEditar(null); setConfirmId(null);
        setForm(ESTADO_VACIO);
        startTransition(() => router.refresh());
      }
    } catch { setMsgTipo('error'); setMsg('Error de conexión.'); }
    finally  { setCargando(false); }
  }

  return (
    <div className="content-area">
      <PageHeader title="Inventario" subtitle="Gestión de productos y stock">
        <button className="btn btn-primary" style={{ padding:'0.5rem 1.2rem', fontSize:'0.85rem' }}
          onClick={() => { setForm(ESTADO_VACIO); setModalAgregar(true); }}>
          + Agregar producto
        </button>
      </PageHeader>

      {msg && <Alert tipo={msgTipo} mensaje={msg} onClose={() => setMsg(null)} />}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
        {[
          { label:'Total productos', valor: totalProductos,  icono:'📦' },
          { label:'Activos',         valor: productosActivos, icono:'✅' },
          { label:'Total unidades',  valor: totalUnidades,    icono:'🔢' },
          { label:'Valor inventario',valor: fmt(valorInventario), icono:'💰' },
        ].map(c => (
          <div className="stat-card" key={c.label}>
            <div className="stat-icon green">{c.icono}</div>
            <div className="stat-info">
              <div className="stat-value">{c.valor}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Búsqueda */}
      <form method="GET" className="search-bar">
        <input name="buscar" defaultValue={buscar} placeholder="Buscar por nombre o código..." style={{ flex:1, minWidth:180 }} />
        <select name="estado" defaultValue={filtroEstado}>
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
        <button type="submit" className="btn btn-primary" style={{ padding:'0.5rem 1rem', fontSize:'0.85rem' }}>Buscar</button>
        {(buscar || filtroEstado !== 'TODOS') && (
          <a href="/inventario" className="btn btn-secondary" style={{ padding:'0.5rem 1rem', fontSize:'0.85rem' }}>Limpiar</a>
        )}
      </form>

      {/* Tabla */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Lista de productos</span>
          <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{lista.length} registros</span>
        </div>
        <div className="table-responsive">
          <table className="area17-table">
            <thead>
              <tr>
                <th>Código</th><th>Nombre</th><th>Precio</th>
                <th>Cantidad</th><th>Fecha registro</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(p => (
                <tr key={p.id}>
                  <td><span className="codigo-badge">{p.codigo}</span></td>
                  <td>{p.nombre}</td>
                  <td style={{ color:'var(--primary)' }}>{fmt(p.precio)}</td>
                  <td>
                    <span style={{ color: p.cantidad <= 5 ? '#f59e0b' : 'inherit', fontWeight: p.cantidad <= 5 ? 700 : 400 }}>
                      {p.cantidad} {p.cantidad <= 5 && '⚠️'}
                    </span>
                  </td>
                  <td style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>{p.fechaRegistro}</td>
                  <td>
                    <span className={p.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'}>
                      {p.estado}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn" title="Editar" onClick={() => abrirEditar(p)}>✏️</button>
                    <button className="action-btn" title="Eliminar" onClick={() => setConfirmId(p.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>
                  No se encontraron productos
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
            <h3 style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border-subtle)', margin:0 }}>Agregar producto</h3>
            <div style={{ padding:'1.5rem' }}>
              <FormProducto form={form} set={set} />
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={() => setModalAgregar(false)}>Cancelar</button>
                <button className="btn btn-primary" disabled={cargando} onClick={() => enviar('agregar')}>
                  {cargando ? 'Guardando...' : 'Agregar'}
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
            <h3 style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border-subtle)', margin:0 }}>Editar producto</h3>
            <div style={{ padding:'1.5rem' }}>
              <FormProducto form={form} set={set} />
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
            <h4>¿Eliminar producto?</h4>
            <p>Esta acción no se puede deshacer.</p>
            <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmId(null)}>Cancelar</button>
              <button className="btn" style={{ background:'var(--danger)', color:'#fff' }} disabled={cargando}
                onClick={() => enviar('eliminar')}>
                {cargando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormProducto({ form, set }) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">Nombre *</label>
        <input className="form-control" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del producto" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Precio *</label>
          <input className="form-control" type="number" min="0" step="0.01" value={form.precio} onChange={e => set('precio', e.target.value)} placeholder="0.00" />
        </div>
        <div className="form-group">
          <label className="form-label">Cantidad *</label>
          <input className="form-control" type="number" min="0" value={form.cantidad} onChange={e => set('cantidad', e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Estado</label>
        <select className="form-control" value={form.estado} onChange={e => set('estado', e.target.value)}>
          <option value="ACTIVO">ACTIVO</option>
          <option value="INACTIVO">INACTIVO</option>
        </select>
      </div>
    </>
  );
}
