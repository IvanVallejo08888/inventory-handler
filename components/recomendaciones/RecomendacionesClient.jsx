'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader    from '@/components/ui/PageHeader';
import Alert        from '@/components/ui/Alert';
import ProductModal from '@/components/inventario/ProductModal';

export default function RecomendacionesClient({ lista, esAdmin, sesion, total, buscar, fechaDesde, fechaHasta }) {
  const router    = useRouter();
  const [, start] = useTransition();
  const [msg, setMsg]         = useState(null);
  const [msgTipo, setMsgTipo] = useState('success');
  const [contenido, setContenido] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [cargando, setCargando]   = useState(false);

  async function enviarRecomendacion() {
    if (!contenido.trim()) return;
    setCargando(true);
    try {
      const res  = await fetch('/api/recomendaciones', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ accion:'guardar', contenido, vendedor: sesion.nombreCompleto }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setMsgTipo('error'); setMsg(data.error || 'Error.'); }
      else { setMsgTipo('success'); setMsg('¡Recomendación guardada exitosamente!'); setContenido(''); start(() => router.refresh()); }
    } catch { setMsgTipo('error'); setMsg('Error de conexión.'); }
    finally   { setCargando(false); }
  }

  async function eliminar() {
    if (!confirmId) return;
    setCargando(true);
    try {
      const res  = await fetch('/api/recomendaciones', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ accion:'eliminar', id: confirmId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setMsgTipo('error'); setMsg(data.error || 'Error.'); }
      else { setMsgTipo('success'); setMsg('Recomendación eliminada.'); setConfirmId(null); start(() => router.refresh()); }
    } catch { setMsgTipo('error'); setMsg('Error de conexión.'); }
    finally   { setCargando(false); }
  }

  return (
    <div className="content-area" style={{ maxWidth: 900, margin:'0 auto' }}>
      <PageHeader title="Recomendaciones" subtitle={esAdmin ? `${total} recomendaciones recibidas` : 'Envía sugerencias al administrador'} />
      {msg && <Alert tipo={msgTipo} mensaje={msg} onClose={() => setMsg(null)} />}

      {/* Formulario vendedor */}
      {!esAdmin && (
        <div className="panel" style={{ marginBottom:'1.5rem' }}>
          <div className="panel-header"><span className="panel-title">💬 Nueva recomendación</span></div>
          <div className="panel-body">
            <div className="form-group">
              <label className="form-label">Vendedor</label>
              <input className="form-control" value={sesion.nombreCompleto} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Recomendación *</label>
              <textarea className="form-control" rows={4} value={contenido}
                onChange={e => setContenido(e.target.value)}
                placeholder="Escribe tu sugerencia, comentario o recomendación para mejorar el sistema..." />
            </div>
            <div className="btn-row">
              <button className="btn btn-primary" disabled={cargando || !contenido.trim()} onClick={enviarRecomendacion}>
                {cargando ? 'Enviando...' : 'Enviar recomendación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista admin: filtros + tabla */}
      {esAdmin && (
        <>
          <form method="GET" className="search-bar" style={{ marginBottom:'1.5rem' }}>
            <input name="buscar" defaultValue={buscar} placeholder="Buscar por contenido o vendedor..." style={{ flex:1 }} />
            <input name="fechaDesde" type="date" defaultValue={fechaDesde} style={{ background:'var(--bg-input)', border:'1.5px solid var(--border-color)', borderRadius:'0.6rem', color:'var(--text-primary)', padding:'0.55rem 0.9rem', fontSize:'0.87rem', minHeight:38 }} />
            <input name="fechaHasta" type="date" defaultValue={fechaHasta} style={{ background:'var(--bg-input)', border:'1.5px solid var(--border-color)', borderRadius:'0.6rem', color:'var(--text-primary)', padding:'0.55rem 0.9rem', fontSize:'0.87rem', minHeight:38 }} />
            <button type="submit" className="btn btn-primary" style={{ padding:'0.5rem 1rem', fontSize:'0.85rem' }}>Filtrar</button>
            {(buscar || fechaDesde || fechaHasta) && (
              <a href="/main/recomendaciones" className="btn btn-secondary" style={{ padding:'0.5rem 1rem', fontSize:'0.85rem' }}>Limpiar</a>
            )}
          </form>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">📋 Recomendaciones recibidas</span>
              <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{lista.length} registros</span>
            </div>
            <div style={{ padding:'1rem' }}>
              {lista.map(r => (
                <div key={r.id} style={{
                  background:'var(--bg-input)', border:'1px solid var(--border-color)',
                  borderRadius:'0.75rem', padding:'1.1rem 1.25rem', marginBottom:'0.75rem',
                  borderLeft:'3px solid var(--primary-dark)',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.5rem' }}>
                        <span style={{ fontWeight:700, color:'var(--primary-light)', fontSize:'0.88rem' }}>💬 {r.vendedor}</span>
                        <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{r.fecha}</span>
                        <span style={{ fontSize:'0.65rem', background:'rgba(45,206,107,0.1)', color:'var(--primary)', padding:'0.1rem 0.5rem', borderRadius:10, fontWeight:700 }}>{r.estado}</span>
                      </div>
                      <p style={{ color:'var(--text-primary)', fontSize:'0.88rem', lineHeight:1.55, margin:0, whiteSpace:'pre-wrap' }}>{r.contenido}</p>
                    </div>
                    <button className="action-btn" title="Eliminar" onClick={() => setConfirmId(r.id)}>🗑️</button>
                  </div>
                </div>
              ))}
              {!lista.length && (
                <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>Sin recomendaciones</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Modal eliminar recomendación ── */}
      <ProductModal
        isOpen={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title="Eliminar recomendación"
        maxWidth={400}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmId(null)}>
              Cancelar
            </button>
            <button
              className="btn"
              style={{ background:'var(--danger)', color:'#fff' }}
              disabled={cargando}
              onClick={eliminar}
            >
              {cargando ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
          </>
        }
      >
        <div style={{ textAlign:'center', padding:'0.5rem 0' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>🗑️</div>
          <p style={{ color:'var(--text-primary)', fontWeight:600, marginBottom:'0.4rem' }}>
            ¿Deseas eliminar esta recomendación?
          </p>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>
            Esta acción no se puede deshacer.
          </p>
        </div>
      </ProductModal>
    </div>
  );
}
