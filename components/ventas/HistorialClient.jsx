'use client';
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader    from '@/components/ui/PageHeader';
import Alert        from '@/components/ui/Alert';
import ProductModal from '@/components/inventario/ProductModal';

const fmt  = n => Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmt2 = n => Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PERIODOS = [['HOY','📅 Hoy'],['SEMANA','📆 Esta Semana'],['MES','🗓️ Este Mes'],['TODO','📊 Todos']];

const BADGE_PAGO = {
  EFECTIVO:      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:700, background:'rgba(74,222,128,.15)', color:'#4ade80', border:'1px solid rgba(74,222,128,.3)' }}>💵 Efectivo</span>,
  TRANSFERENCIA: <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:700, background:'rgba(96,165,250,.15)', color:'#60a5fa', border:'1px solid rgba(96,165,250,.3)' }}>🏦 Transf.</span>,
  MIXTO:         <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:700, background:'rgba(251,191,36,.15)',  color:'#fbbf24', border:'1px solid rgba(251,191,36,.3)'  }}>💳 Mixto</span>,
};

function getIni(nombre) {
  const p = (nombre || '').trim().split(' ').filter(Boolean);
  return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : (p[0]?.[0]||'?').toUpperCase();
}

export default function HistorialClient({
  ventas, periodo, esAdmin,
  totalVentas, totalEfectivo, totalTransferencia,
  resumenVendedores, totalGeneralDia, vendedoresSinVentas, fechaResumen,
}) {
  const router    = useRouter();
  const [, start] = useTransition();
  const [msg, setMsg]           = useState(null);
  const [msgTipo, setMsgTipo]   = useState('success');
  const [buscar, setBuscar]     = useState('');
  const [rvdOculto, setRvdOculto] = useState(false);
  const [rvdBuscar, setRvdBuscar] = useState('');
  const [ingExpandido, setIngExpandido] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [factura, setFactura]   = useState(null);
  const [generandoImg, setGenerandoImg] = useState(false);
  const [loadingDots, setLoadingDots]   = useState('');

  // Animación de puntos durante generación
  useEffect(() => {
    if (!generandoImg) { setLoadingDots(''); return; }
    let c = 0;
    const id = setInterval(() => { c = (c + 1) % 4; setLoadingDots('·'.repeat(c || 1)); }, 300);
    return () => clearInterval(id);
  }, [generandoImg]);

  const promedio    = ventas.length > 0 ? totalVentas / ventas.length : 0;
  const completadas = ventas.filter(v => v.estado === 'COMPLETADA').length;

  const ventasFiltradas = buscar.trim()
    ? ventas.filter(v => JSON.stringify(v).toLowerCase().includes(buscar.toLowerCase()))
    : ventas;

  // ── Cancelar venta ──────────────────────────────────────────────────────────
  async function cancelar() {
    if (!confirmCancelar) return;
    setCargando(true);
    try {
      const res  = await fetch('/api/ventas', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ accion:'cancelar', id: confirmCancelar.id }) });
      const data = await res.json();
      if (!res.ok || data.error) { setMsgTipo('error'); setMsg(data.error || 'Error.'); }
      else { setMsgTipo('success'); setMsg('✅ Venta cancelada y stock repuesto.'); setConfirmCancelar(null); start(() => router.refresh()); }
    } catch { setMsgTipo('error'); setMsg('Error de conexión.'); }
    finally   { setCargando(false); }
  }

  // ── Factura ─────────────────────────────────────────────────────────────────
  async function abrirFactura(v) {
    try {
      const res  = await fetch(`/api/ventas?accion=detalleJson&id=${v.id}`);
      const data = await res.json();
      setFactura({ ...v, detalles: data.items || [], dataPago: data });
    } catch { setFactura({ ...v, detalles: [], dataPago: {} }); }
  }

  function imprimirFactura() { window.print(); }

  function resumenTexto(f) {
    return [
      `*FACTURA #${f.codigo} — Área 17*`,
      `La Mejor Tienda Deportiva`,
      ``,
      `📅 Fecha: ${f.fecha}  |  🕐 Hora: ${f.hora}`,
      `👤 Vendedor: ${f.vendedorNombre}`,
      `💳 Pago: ${f.tipoPago}`,
      ``,
      `💰 *TOTAL: $${fmt2(f.total)}*`,
      ``,
      `¡Gracias por su compra!`,
    ].join('\n');
  }

  // ── Carga html2canvas desde CDN ────────────────────────────────────────────
  async function cargarHtml2Canvas() {
    if (window.html2canvas) return window.html2canvas;
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload  = () => resolve(window.html2canvas);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ── Descarga imagen (fallback) ─────────────────────────────────────────────
  async function descargarImagen() {
    if (!factura) return;
    const h2c = await cargarHtml2Canvas();
    const el  = document.getElementById('factura-contenido');
    if (!el) { window.print(); return; }
    const canvas = await h2c(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `factura-${factura.codigo}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // ── COMPARTIR — flujo directo: imagen → panel nativo del SO ───────────────
  async function compartirFactura() {
    if (!factura) return;
    setGenerandoImg(true);
    try {
      const h2c = await cargarHtml2Canvas();
      // Capturamos el contenido de la factura visible en pantalla
      const el  = document.getElementById('factura-contenido');
      if (!el) { await descargarImagen(); return; }

      const canvas = await h2c(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
      if (!blob) { await descargarImagen(); return; }

      const file = new File([blob], `factura-${factura.codigo}.png`, { type: 'image/png' });

      // Nivel 2 — compartir imagen con apps nativas (Android / iOS / Edge)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Factura ${factura.codigo} — Área 17`,
          text:  resumenTexto(factura),
        });
        return;
      }

      // Nivel 1 — compartir solo texto (Chrome escritorio, Firefox)
      if (navigator.share) {
        await navigator.share({
          title: `Factura ${factura.codigo} — Área 17`,
          text:  resumenTexto(factura),
        });
        return;
      }

      // Fallback — descargar imagen directamente
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `factura-${factura.codigo}.png`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);

    } catch (err) {
      if (err?.name !== 'AbortError') {
        // El usuario canceló: no hacer nada. Otro error: intentar descarga.
        try { await descargarImagen(); } catch { /* silencioso */ }
      }
    } finally {
      setGenerandoImg(false);
    }
  }

  const rvdFiltrados = rvdBuscar.trim()
    ? resumenVendedores.filter(r => r.vendedorNombre.toLowerCase().includes(rvdBuscar.toLowerCase()) || String(r.vendedorId).includes(rvdBuscar))
    : resumenVendedores;

  return (
    <div className="content-area">
      <PageHeader title="📋 Historial de Ventas" subtitle="Consulta, gestión y facturación de ventas registradas">
        <a href="/main/ventas" className="btn btn-primary" style={{ padding:'0.5rem 1rem', fontSize:'0.85rem' }}>➕ Nueva Venta</a>
      </PageHeader>

      {msg && <Alert tipo={msgTipo} mensaje={msg} onClose={() => setMsg(null)} />}

      {/* Tabs período */}
      <div style={{ display:'flex', gap:10, marginBottom:28, flexWrap:'wrap' }}>
        {PERIODOS.map(([p, lbl]) => (
          <a key={p} href={`/main/ventas/historial?periodo=${p}`} style={{
            padding:'10px 22px', borderRadius:'var(--radius-sm)', border:'1px solid',
            fontWeight:700, fontSize:'0.85rem', textDecoration:'none', letterSpacing:1, transition:'var(--transition)',
            borderColor: periodo === p ? 'var(--primary)' : 'var(--border-color)',
            background:  periodo === p ? 'linear-gradient(135deg,var(--primary-dark),var(--primary))' : 'var(--bg-card)',
            color:       periodo === p ? '#000' : 'var(--text-secondary)',
          }}>{lbl}</a>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:28 }}>
        <div onClick={() => setIngExpandido(v => !v)} style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', padding:'20px 18px', textAlign:'center', cursor:'pointer', position:'relative', overflow:'visible', transition:'var(--transition)' }}>
          <div style={{ fontSize:'1.6rem', marginBottom:8 }}>💰</div>
          <div style={{ fontSize:'1.7rem', fontWeight:900, color:'var(--primary)', fontFamily:"'Rajdhani',sans-serif" }}>${fmt(totalVentas)}</div>
          <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1 }}>Total ingresos</div>
          {ingExpandido && (
            <div style={{ position:'absolute', top:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)', width:220, padding:'12px 14px 10px', background:'var(--bg-card)', border:'1px solid rgba(57,255,20,.25)', borderRadius:10, boxShadow:'0 8px 28px rgba(0,0,0,.6)', textAlign:'left', zIndex:100 }}>
              {[['💵 Efectivo', '#4ade80', totalEfectivo],['🏦 Transferencia','#60a5fa', totalTransferencia]].map(([lbl, col, val]) => (
                <div key={lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12, padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                  <span style={{ color: col }}>{lbl}</span>
                  <strong style={{ color: col }}>${fmt(val)}</strong>
                </div>
              ))}
              <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', textAlign:'center', marginTop:8, paddingTop:6, borderTop:'1px dashed rgba(255,255,255,.08)' }}>Total: ${fmt(totalVentas)}</div>
            </div>
          )}
        </div>
        {[
          ['🧾', ventas.length,  'Ventas en período'],
          ['📈', `$${fmt(promedio)}`, 'Promedio por venta'],
          ['✅', completadas,    'Completadas'],
        ].map(([ico, val, lbl]) => (
          <div key={lbl} style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', padding:'20px 18px', textAlign:'center' }}>
            <div style={{ fontSize:'1.6rem', marginBottom:8 }}>{ico}</div>
            <div style={{ fontSize:'1.7rem', fontWeight:900, color:'var(--primary)', fontFamily:"'Rajdhani',sans-serif" }}>{val}</div>
            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* ══ Resumen vendedores del día (solo admin) ══ */}
      {esAdmin && (
        <div style={{ marginBottom:22 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', padding:'16px 18px', background:'linear-gradient(135deg,rgba(57,255,20,.10),transparent)', borderBottom:'1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize:'1.05rem', fontWeight:800 }}>👥 Resumen de vendedores del día</div>
                <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', marginTop:2 }}>Actividad y producción por vendedor · {fechaResumen}</div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <form method="GET" action="/main/ventas/historial" style={{ display:'flex', gap:8, alignItems:'center', margin:0 }}>
                  <input type="hidden" name="periodo" value={periodo} />
                  <input type="date" name="fecha" defaultValue={fechaResumen} onChange={e => e.target.form.submit()}
                    style={{ background:'var(--bg-input)', border:'1px solid var(--border-color)', color:'var(--text-primary)', borderRadius:10, padding:'8px 11px', fontSize:'0.82rem', minHeight:40 }} />
                </form>
                <input value={rvdBuscar} onChange={e => setRvdBuscar(e.target.value)} placeholder="🔍 Buscar nombre o ID…"
                  style={{ background:'var(--bg-input)', border:'1px solid var(--border-color)', color:'var(--text-primary)', borderRadius:10, padding:'8px 11px', fontSize:'0.82rem', minHeight:40 }} />
                <button onClick={() => setRvdOculto(v => !v)} style={{ background:'var(--primary-subtle)', color:'var(--primary)', border:'1px solid rgba(57,255,20,.3)', borderRadius:10, padding:'8px 14px', fontWeight:700, fontSize:'0.82rem', cursor:'pointer', minHeight:40 }}>
                  {rvdOculto ? 'Mostrar' : 'Ocultar'}
                </button>
              </div>
            </div>

            {!rvdOculto && (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'12px 18px', borderBottom:'1px dashed var(--border-color)', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'0.78rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.04em' }}>💰 Total general producido</span>
                  <span style={{ fontSize:'1.45rem', fontWeight:900, color:'var(--primary)' }}>${fmt(totalGeneralDia)}</span>
                </div>

                {vendedoresSinVentas.length > 0 && (
                  <div style={{ margin:'0 18px 16px', padding:'11px 14px', borderRadius:12, background:'rgba(251,191,36,.10)', border:'1px solid rgba(251,191,36,.28)', color:'#fbbf24', fontSize:'0.82rem', fontWeight:600, display:'flex', gap:8 }}>
                    <span>⚠️</span>
                    <span><strong>{vendedoresSinVentas.length}</strong> vendedor(es) sin ventas: {vendedoresSinVentas.join(', ')}</span>
                  </div>
                )}

                {rvdFiltrados.length === 0 ? (
                  <div style={{ padding:'34px 18px', textAlign:'center', color:'var(--text-muted)' }}>📭 Ningún vendedor registró ventas en esta fecha.</div>
                ) : (
                  <div style={{ display:'grid', gap:12, padding:'16px 18px', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))' }}>
                    {rvdFiltrados.map(r => {
                      const pct = totalGeneralDia > 0 ? (r.totalVendido / totalGeneralDia) * 100 : 0;
                      return (
                        <div key={r.vendedorId} style={{ background:'rgba(255,255,255,.025)', border:'1px solid var(--border-color)', borderRadius:14, padding:'14px 15px', transition:'transform .15s, border-color .15s' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                            <div style={{ width:42, height:42, flexShrink:0, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'1rem', color:'#04140a', background:'linear-gradient(135deg,#39ff14,#1a8a00)' }}>
                              {getIni(r.vendedorNombre)}
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:800, fontSize:'0.95rem' }}>{r.vendedorNombre}</div>
                              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>ID: {r.vendedorId}</div>
                            </div>
                            <span style={{ fontSize:'0.66rem', fontWeight:800, padding:'3px 9px', borderRadius:20, textTransform:'uppercase', whiteSpace:'nowrap',
                              background: r.actividad === 'ALTA' ? 'rgba(74,222,128,.15)' : 'rgba(251,191,36,.15)',
                              color:      r.actividad === 'ALTA' ? '#4ade80'              : '#fbbf24',
                              border:`1px solid ${r.actividad === 'ALTA' ? 'rgba(74,222,128,.3)' : 'rgba(251,191,36,.3)'}`,
                            }}>
                              {r.actividad === 'ALTA' ? '🔥 Alta' : '🐌 Baja'}
                            </span>
                          </div>
                          <div style={{ fontSize:'1.3rem', fontWeight:900, color:'var(--text-primary)', margin:'2px 0 8px' }}>${fmt(r.totalVendido)}</div>
                          <div style={{ height:8, borderRadius:6, background:'rgba(255,255,255,.07)', overflow:'hidden', marginBottom:10 }}>
                            <span style={{ display:'block', height:'100%', borderRadius:6, background:'linear-gradient(90deg,#1a8a00,#39ff14)', width:`${pct.toFixed(1)}%`, transition:'width .6s ease' }} />
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 10px', fontSize:'0.78rem' }}>
                            {[
                              ['💵 Efectivo',     '#4ade80', `$${fmt(r.totalEfectivo)}`],
                              ['🏦 Transferencia','#60a5fa', `$${fmt(r.totalTransferencia)}`],
                              ['🧾 N° ventas',    'inherit', r.cantidadVentas],
                              ['⏰ Última venta', 'inherit', r.ultimaHora || '—'],
                            ].map(([lbl, col, val]) => (
                              <div key={lbl} style={{ display:'flex', flexDirection:'column' }}>
                                <span style={{ color:'var(--text-muted)', fontSize:'0.68rem' }}>{lbl}</span>
                                <span style={{ fontWeight:700, color: col }}>{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ Tabla ventas ══ */}
      <div className="panel">
        <div className="panel-header" style={{ flexWrap:'wrap', gap:12 }}>
          <span className="panel-title">Ventas registradas <span style={{ background:'var(--primary-subtle)', color:'var(--primary)', fontSize:'0.75rem', padding:'2px 10px', borderRadius:20, border:'1px solid rgba(57,255,20,.2)', marginLeft:8 }}>{ventasFiltradas.length} registros</span></span>
          <div style={{ position:'relative' }}>
            <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="🔍 Buscar por código, vendedor…"
              style={{ background:'var(--bg-dark)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)', color:'var(--text-primary)', padding:'8px 14px 8px 36px', fontSize:'0.85rem', width:240, outline:'none' }} />
          </div>
        </div>
        <div className="table-responsive">
          <table className="area17-table">
            <thead>
              <tr>
                <th>Código</th><th>Fecha</th><th>Hora</th><th>Vendedor</th>
                <th>Subtotal</th><th>Descuento</th><th>Total</th>
                <th>Pago</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map(v => {
                const totalDesc = (v.descuentoProductos || 0) + (v.descuentoTotal || 0);
                return (
                  <tr key={v.id}>
                    <td><span className="codigo-badge">{v.codigo}</span></td>
                    <td style={{ color:'var(--text-secondary)', fontSize:'0.83rem' }}>📅 {v.fecha}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:'0.80rem', fontFamily:'monospace' }}>{v.hora}</td>
                    <td style={{ fontWeight:600 }}>👤 {v.vendedorNombre}</td>
                    <td style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>${fmt2(v.subtotal)}</td>
                    <td style={{ color:'#e53e3e', fontSize:'0.85rem' }}>{totalDesc > 0 ? `-$${fmt2(totalDesc)}` : '—'}</td>
                    <td style={{ fontSize:'1rem', fontWeight:800, color:'var(--primary)', fontFamily:"'Rajdhani',sans-serif" }}>${fmt2(v.total)}</td>
                    <td>{BADGE_PAGO[v.tipoPago] || BADGE_PAGO.EFECTIVO}</td>
                    <td>
                      {v.estado === 'COMPLETADA'
                        ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(57,255,20,.1)', color:'var(--primary)', border:'1px solid rgba(57,255,20,.25)', padding:'4px 12px', borderRadius:20, fontSize:'0.72rem', fontWeight:700 }}>● COMPLETADA</span>
                        : <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(255,68,68,.1)', color:'#ff6b6b', border:'1px solid rgba(255,68,68,.25)', padding:'4px 12px', borderRadius:20, fontSize:'0.72rem', fontWeight:700 }}>● CANCELADA</span>
                      }
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <button onClick={() => abrirFactura(v)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 14px', background:'linear-gradient(135deg,var(--primary-dark),var(--primary))', color:'#000', border:'none', borderRadius:'var(--radius-sm)', fontSize:'0.78rem', fontWeight:800, cursor:'pointer' }}>
                          🖨️ Factura
                        </button>
                        {v.estado === 'COMPLETADA' && (
                          <button onClick={() => setConfirmCancelar(v)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 14px', background:'rgba(255,68,68,.1)', color:'#ff6b6b', border:'1px solid rgba(255,68,68,.3)', borderRadius:'var(--radius-sm)', fontSize:'0.78rem', fontWeight:700, cursor:'pointer' }}>
                            ✕ Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!ventasFiltradas.length && (
                <tr><td colSpan={10}>
                  <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)' }}>
                    <div style={{ fontSize:'3rem', opacity:.5, marginBottom:12 }}>📭</div>
                    <p>Sin ventas registradas en este período</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal cancelar venta */}
      <ProductModal
        isOpen={confirmCancelar !== null}
        onClose={() => setConfirmCancelar(null)}
        title="Cancelar Venta"
        maxWidth={420}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmCancelar(null)}>No, volver</button>
            <button className="btn" style={{ background:'var(--danger)', color:'#fff' }}
              disabled={cargando} onClick={cancelar}>
              {cargando ? 'Cancelando…' : 'Sí, cancelar'}
            </button>
          </>
        }
      >
        <div style={{ textAlign:'center', padding:'0.25rem 0' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>⚠️</div>
          <p style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:'0.35rem' }}>
            ¿Cancelar la venta <span style={{ color:'var(--danger)' }}>{confirmCancelar?.codigo}</span>?
          </p>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>
            El stock de los productos será repuesto automáticamente.
          </p>
        </div>
      </ProductModal>

      {/* ══ Factura imprimible ════════════════════════════════════════════════ */}
      {factura && (
        <div style={{ position:'fixed', inset:0, background:'#fff', zIndex:2000, overflowY:'auto', padding:'88px 40px 40px', color:'#111', fontFamily:"'Inter',Arial,sans-serif" }}>

          {/* Barra acciones */}
          <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:2001, display:'flex', gap:10, alignItems:'center', justifyContent:'flex-end', padding:'12px 16px', background:'rgba(10,12,16,.92)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
            <button onClick={imprimirFactura} style={{ display:'inline-flex', alignItems:'center', gap:7, border:'1px solid rgba(255,255,255,.12)', borderRadius:10, padding:'11px 18px', fontSize:'.9rem', fontWeight:700, cursor:'pointer', minHeight:44, background:'#1f2937', color:'#fff' }}>
              🖨️ Imprimir
            </button>

            {/* Compartir — un solo clic genera imagen y abre panel nativo */}
            <button
              onClick={compartirFactura}
              disabled={generandoImg}
              style={{ display:'inline-flex', alignItems:'center', gap:7, border:'1px solid rgba(255,255,255,.12)', borderRadius:10, padding:'11px 18px', fontSize:'.9rem', fontWeight:700, cursor: generandoImg ? 'wait' : 'pointer', minHeight:44, background: generandoImg ? '#0d2d1a' : '#1f2937', color: generandoImg ? '#2dce6b' : '#fff', transition:'background 0.2s, color 0.2s', position:'relative' }}
            >
              {generandoImg
                ? <><span style={{ display:'inline-block', animation:'pulse 0.8s ease-in-out infinite' }}>⏳</span> Generando{loadingDots}</>
                : '📤 Compartir'
              }
            </button>

            <button onClick={() => setFactura(null)} style={{ display:'inline-flex', alignItems:'center', gap:7, borderRadius:10, padding:'11px 18px', fontSize:'.9rem', fontWeight:700, cursor:'pointer', minHeight:44, background:'rgba(239,68,68,.15)', color:'#f87171', border:'1px solid rgba(239,68,68,.35)' }}>✕ Cerrar</button>
          </div>

          {/* Contenido imprimible */}
          <div id="factura-contenido">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingBottom:20, borderBottom:'3px solid #1a8a00', marginBottom:24 }}>
              <div>
                <h1 style={{ fontSize:'2rem', fontWeight:900, color:'#1a8a00', letterSpacing:2, marginBottom:2 }}>▲ ÁREA 17</h1>
                <p style={{ fontSize:'0.85rem', color:'#555' }}>La Mejor Tienda Deportiva</p>
                <p style={{ fontSize:'0.85rem', color:'#888', marginTop:4 }}>NIT: 900.XXX.XXX-X | Tel: 316-207-9303</p>
                <p style={{ color:'#888', fontSize:'0.85rem' }}>Pasto, Nariño, Colombia</p>
              </div>
              <div style={{ background:'#f4fdf0', border:'1px solid #b6e8a0', borderRadius:8, padding:'14px 20px', textAlign:'right', minWidth:200 }}>
                <div style={{ fontSize:'1.2rem', fontWeight:800, color:'#1a8a00' }}>FACTURA {factura.codigo}</div>
                <p style={{ fontSize:'0.8rem', color:'#555', marginTop:4 }}>Fecha: {factura.fecha} &nbsp; Hora: {factura.hora}</p>
                <div style={{ marginTop:8 }}>
                  {factura.estado === 'COMPLETADA'
                    ? <span style={{ display:'inline-block', background:'#d1fae5', color:'#065f46', padding:'3px 12px', borderRadius:20, fontSize:'0.75rem', fontWeight:700 }}>✓ COMPLETADA</span>
                    : <span style={{ display:'inline-block', background:'#fee2e2', color:'#991b1b', padding:'3px 12px', borderRadius:20, fontSize:'0.75rem', fontWeight:700 }}>✗ CANCELADA</span>
                  }
                </div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
              {[
                ['INFORMACIÓN DEL VENDEDOR', [factura.vendedorNombre, 'Área 17 - Equipo de ventas']],
                ['DATOS DE LA TRANSACCIÓN', [`Código: ${factura.codigo}`, `Fecha: ${factura.fecha}`, `Hora: ${factura.hora}`]],
              ].map(([titulo, lineas]) => (
                <div key={titulo} style={{ background:'#f9f9f9', borderRadius:8, padding:'14px 18px', borderLeft:'4px solid #1a8a00' }}>
                  <h4 style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1.5px', color:'#888', marginBottom:8 }}>{titulo}</h4>
                  {lineas.map((l, i) => <p key={i} style={{ fontSize:'0.9rem', color:'#222', marginBottom:3 }}>{l}</p>)}
                </div>
              ))}
            </div>

            <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:24 }}>
              <thead>
                <tr>{['Código','Producto','Cant.','Precio Unit.','Descuento','Subtotal'].map(h => (
                  <th key={h} style={{ background:'#1a8a00', color:'#fff', padding:'10px 14px', fontSize:'0.78rem', textTransform:'uppercase', letterSpacing:1, textAlign: h === 'Producto' || h === 'Código' ? 'left' : 'right' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {(factura.detalles || []).map((d, i) => (
                  <tr key={i} style={{ background: i % 2 === 1 ? '#f4fdf0' : '#fff' }}>
                    <td style={{ padding:'10px 14px', fontSize:'0.88rem', borderBottom:'1px solid #e5f0e0', color:'#222' }}>{d.productoCodigo}</td>
                    <td style={{ padding:'10px 14px', fontSize:'0.88rem', borderBottom:'1px solid #e5f0e0', color:'#222' }}>{d.productoNombre}</td>
                    <td style={{ padding:'10px 14px', fontSize:'0.88rem', borderBottom:'1px solid #e5f0e0', color:'#222', textAlign:'right' }}>{d.cantidad}</td>
                    <td style={{ padding:'10px 14px', fontSize:'0.88rem', borderBottom:'1px solid #e5f0e0', color:'#222', textAlign:'right' }}>${fmt2(d.precioUnitario)}</td>
                    <td style={{ padding:'10px 14px', fontSize:'0.88rem', borderBottom:'1px solid #e5f0e0', color:'#e53e3e', textAlign:'right' }}>{d.descuentoUnidad > 0 ? `-$${fmt2(d.descuentoUnidad)}` : '—'}</td>
                    <td style={{ padding:'10px 14px', fontSize:'0.88rem', borderBottom:'1px solid #e5f0e0', color:'#222', textAlign:'right' }}>${fmt2(d.subtotal)}</td>
                  </tr>
                ))}
                {!factura.detalles?.length && <tr><td colSpan={6} style={{ textAlign:'center', color:'#888', padding:20 }}>Sin productos registrados</td></tr>}
              </tbody>
            </table>

            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:24 }}>
              <div style={{ minWidth:260, border:'1px solid #b6e8a0', borderRadius:8, overflow:'hidden' }}>
                {[
                  ['Subtotal bruto', `$${fmt2(factura.dataPago?.subtotal || factura.total)}`],
                  factura.dataPago?.descuentoProductos > 0 && ['Desc. productos', `-$${fmt2(factura.dataPago.descuentoProductos)}`],
                  factura.dataPago?.descuentoTotal > 0 && ['Desc. general', `-$${fmt2(factura.dataPago.descuentoTotal)}`],
                  ['IVA (0%)', '$0.00'],
                ].filter(Boolean).map(([lbl, val], i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 16px', fontSize:'0.88rem', borderBottom:'1px solid #e5f0e0' }}>
                    <span>{lbl}</span><span>{val}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 16px', background:'#1a8a00', color:'#fff', fontWeight:800, fontSize:'1rem' }}>
                  <span>TOTAL</span><span>${fmt2(factura.total)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 16px', fontSize:'0.8rem', color:'#555', borderTop:'1px dashed #e5f0e0' }}>
                  <span>Método de pago</span>
                  <span>{factura.tipoPago === 'TRANSFERENCIA' ? '🏦 Transf.' : factura.tipoPago === 'MIXTO' ? '💳 Mixto' : '💵 Efectivo'}</span>
                </div>
                {factura.tipoPago === 'MIXTO' && (
                  <>
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 16px', fontSize:'0.78rem', color:'#4ade80' }}><span>└ Efectivo</span><span>${fmt2(factura.valorEfectivo)}</span></div>
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 16px', fontSize:'0.78rem', color:'#60a5fa' }}><span>└ Transferencia</span><span>${fmt2(factura.valorTransferencia)}</span></div>
                  </>
                )}
              </div>
            </div>

            <div style={{ textAlign:'center', paddingTop:20, borderTop:'2px dashed #b6e8a0', fontSize:'0.8rem', color:'#888' }}>
              <p>Gracias por su compra en <strong style={{ color:'#1a8a00' }}>Área 17 - La Mejor Tienda Deportiva</strong></p>
              <p style={{ marginTop:6 }}>Documento generado el {new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })}</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
