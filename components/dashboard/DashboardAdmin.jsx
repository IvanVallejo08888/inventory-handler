'use client';
import { useState, useEffect } from 'react';

/* ── Formatos ─────────────────────────────────────────────────────────── */
function fmt(val) {
  if (val == null) return '$0';
  const v = Math.abs(val);
  const s = val < 0 ? '-' : '';
  if (v >= 1e9)  return `${s}$${(v/1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `${s}$${(v/1e6).toFixed(1)}M`;
  if (v >= 1000) return `${s}$${(v/1000).toFixed(1)}K`;
  return `${s}$${Math.round(v).toLocaleString('es-CO')}`;
}
function fmtFull(val) {
  if (val == null) return '$0';
  const s = val < 0 ? '-' : '';
  return `${s}$${Math.abs(Math.round(val)).toLocaleString('es-CO')}`;
}

/* ── Avatar iniciales ─────────────────────────────────────────────────── */
function InicialAvatar({ nombre, size = 36 }) {
  const partes = (nombre || '').trim().split(' ').filter(Boolean);
  const ini = partes.length >= 2
    ? (partes[0][0] + partes[1][0]).toUpperCase()
    : (partes[0]?.[0] || 'U').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#1a6b40,#0a3d22)',
      border: '2px solid rgba(45,206,107,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36, color: '#c8f0d8',
    }}>{ini}</div>
  );
}

/* ── Gráfica barras — ventas por día ──────────────────────────────────── */
function GraficaVentasDia({ datos }) {
  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const entries = Object.entries(datos || {}).sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) {
    return <p style={{ color:'var(--text-muted)', textAlign:'center', padding:'1.5rem 0', fontSize:'0.82rem' }}>Sin ventas esta semana</p>;
  }
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:'110px', padding:'0 4px' }}>
      {entries.map(([fecha, total]) => {
        const d   = new Date(fecha + 'T12:00:00');
        const pct = Math.max((total / max) * 75, 4);
        return (
          <div key={fecha} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
            <div style={{ fontSize:'0.58rem', color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', maxWidth:'100%', textOverflow:'ellipsis', textAlign:'center' }}>{fmt(total)}</div>
            <div style={{ width:'100%', height:`${pct}px`, background:'linear-gradient(to top,#1aaa52,#2dce6b)', borderRadius:'4px 4px 0 0' }} />
            <div style={{ fontSize:'0.63rem', color:'var(--text-muted)' }}>{DIAS[d.getDay()]}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Gráfica gastos por categoría ─────────────────────────────────────── */
function GraficaGastos({ datos, total }) {
  const CATS = [
    { key:'COMPRA',       label:'Compras',      color:'#3b82f6' },
    { key:'INVERSION',    label:'Inversión',    color:'#8b5cf6' },
    { key:'SERVICIO',     label:'Servicios',    color:'#f59e0b' },
    { key:'GASTO_DIARIO', label:'Gasto diario', color:'#ef4444' },
  ];
  if (!total) {
    return <p style={{ color:'var(--text-muted)', textAlign:'center', padding:'1.5rem 0', fontSize:'0.82rem' }}>Sin gastos este mes</p>;
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
      {CATS.map(({ key, label, color }) => {
        const val = datos?.[key] || 0;
        const pct = total ? Math.round((val / total) * 100) : 0;
        return (
          <div key={key}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
              <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{fmt(val)} ({pct}%)</span>
            </div>
            <div style={{ height:'5px', background:'rgba(255,255,255,0.06)', borderRadius:'4px', overflow:'hidden' }}>
              <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:'4px', transition:'width 0.4s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Stock bajo colapsable (dashboard) ───────────────────────────────── */
function StockBajoDash({ productos }) {
  const [abierto, setAbierto] = useState(false);
  const agotados = productos.filter(p => p.cantidad === 0).length;
  const criticos = productos.filter(p => p.cantidad > 0 && p.cantidad <= 2).length;

  return (
    <div style={{
      background:'rgba(245,158,11,0.04)', border:'1px solid rgba(245,158,11,0.28)',
      borderRadius:'var(--radius-lg)', marginBottom:'1.25rem', overflow:'hidden',
    }}>
      {/* Header clickeable */}
      <div
        onClick={() => setAbierto(v => !v)}
        style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0.875rem 1.25rem', cursor:'pointer', userSelect:'none',
        }}
      >
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <span style={{ fontSize:'0.95rem', fontWeight:700, color:'#f59e0b' }}>
              ⚠️ Alertas de Stock
            </span>
            <span style={{ fontSize:'0.72rem', fontWeight:700, background:'rgba(245,158,11,0.2)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.35)', borderRadius:20, padding:'1px 8px' }}>
              {productos.length}
            </span>
          </div>
          <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.2rem' }}>
            {agotados > 0 && <span style={{ fontSize:'0.7rem', color:'#ef4444', fontWeight:600 }}>{agotados} agotado{agotados > 1?'s':''}</span>}
            {criticos > 0 && <span style={{ fontSize:'0.7rem', color:'#f97316', fontWeight:600 }}>{criticos} crítico{criticos > 1?'s':''}</span>}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <a href="/main/inventario" onClick={e => e.stopPropagation()} style={{ fontSize:'0.72rem', color:'#f59e0b', textDecoration:'none', fontWeight:600 }}>
            Gestionar →
          </a>
          <span style={{ color:'var(--text-muted)', fontSize:'0.8rem', display:'inline-block', transform: abierto ? 'rotate(180deg)' : 'none', transition:'transform 0.25s' }}>▼</span>
        </div>
      </div>

      {/* Tabla colapsable */}
      <div style={{ maxHeight: abierto ? '600px' : '0px', overflow:'hidden', transition:'max-height 0.35s ease' }}>
        <div style={{ borderTop:'1px solid rgba(245,158,11,0.18)' }}>
          <div className="table-responsive">
            <table className="area17-table">
              <thead><tr><th>Producto</th><th>Código</th><th>Stock</th><th>Precio</th></tr></thead>
              <tbody>
                {productos.map(prod => (
                  <tr key={prod.id}>
                    <td style={{ fontSize:'0.82rem' }}>{prod.nombre}</td>
                    <td><span className="codigo-badge">{prod.codigo}</span></td>
                    <td>
                      <span style={{ fontWeight:700, color: prod.cantidad === 0 ? '#ef4444' : prod.cantidad <= 2 ? '#f97316' : '#f59e0b' }}>
                        {prod.cantidad === 0 ? 'AGOTADO' : `${prod.cantidad} uds`}
                      </span>
                    </td>
                    <td style={{ color:'var(--primary)', fontWeight:600 }}>{fmtFull(prod.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Constantes ranking ───────────────────────────────────────────────── */
const MEDALLAS = ['🥇','🥈','🥉'];
const COLORES  = ['rgba(255,215,0,.18)','rgba(192,192,192,.15)','rgba(205,127,50,.13)'];
const BORDES   = ['rgba(255,215,0,.4)','rgba(192,192,192,.3)','rgba(205,127,50,.3)'];

/* ── Medios de pago (gastos / transferencias) ───────────────────────────── */
const MEDIO_INFO = {
  EFECTIVO:    { icono:'💵', label:'Efectivo',    color:'#4ade80' },
  NEQUI:       { icono:'📱', label:'Nequi',       color:'#ec4899' },
  BANCOLOMBIA: { icono:'🏦', label:'Bancolombia', color:'#60a5fa' },
  DAVIPLATA:   { icono:'💳', label:'Daviplata',   color:'#fb923c' },
  OTRO:        { icono:'💱', label:'Otro',        color:'#94a3b8' },
};
function desgloseEntries(obj) {
  return Object.entries(obj || {}).filter(([, v]) => v > 0);
}

/* ── Panel de desglose por medio de pago ─────────────────────────────────── */
function DesgloseMedios({ entries }) {
  if (!entries.length) {
    return <p style={{ color:'var(--text-muted)', textAlign:'center', padding:'0.5rem 0' }}>Sin movimientos registrados hoy</p>;
  }
  return (
    <>
      {entries.map(([key, val]) => {
        const info = MEDIO_INFO[key] || MEDIO_INFO.OTRO;
        return (
          <div key={key} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'0.75rem 1rem', background:'rgba(255,255,255,0.025)',
            border:'1px solid var(--border-subtle)', borderRadius:'var(--radius)',
          }}>
            <span style={{ display:'flex', alignItems:'center', gap:'0.6rem', fontSize:'0.88rem', color:'var(--text-primary)', fontWeight:600 }}>
              <span style={{ fontSize:'1.15rem' }}>{info.icono}</span> {info.label}
            </span>
            <span style={{ fontWeight:800, color:info.color, fontFamily:"'Rajdhani',sans-serif", fontSize:'1.05rem' }}>{fmtFull(val)}</span>
          </div>
        );
      })}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function DashboardAdmin(p) {
  const [modalVend,     setModalVend]     = useState(false);
  const [modalProd,     setModalProd]     = useState(false);
  const [modalGastosDia,   setModalGastosDia]   = useState(false);
  const [modalTransferDia, setModalTransferDia] = useState(false);
  const [fecha,     setFecha]     = useState('');
  const [isMobile,  setIsMobile]  = useState(false);

  useEffect(() => {
    setFecha(new Date().toLocaleDateString('es-CO', {
      weekday:'long', day:'numeric', month:'long', year:'numeric',
    }));
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const fn = e => setIsMobile(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const nombre     = p.sesion.nombreCompleto.split(' ')[0];
  const fotoUrl    = p.sesion.fotoPerfil ? `/api/foto-perfil?archivo=${p.sesion.fotoPerfil}` : null;
  const utilColor    = p.utilidadMes >= 0 ? '#2dce6b' : '#ef4444';
  const utilDiaColor = p.utilidadDia >= 0 ? '#2dce6b' : '#ef4444';
  const totalGastosCat = Object.values(p.gastosCat || {}).reduce((s, v) => s + v, 0);

  // Datos de ranking
  const topVendedor  = (p.top3Vendedores  || [])[0] || null;
  const topProducto  = (p.top3Productos   || [])[0] || null;
  const totalSemana  = Object.values(p.ventasPorDia || {}).reduce((s, v) => s + v, 0);
  const fotoVendedor = topVendedor && p.fotosPorVendedor?.[topVendedor.vendedorId]
    ? `/api/foto-perfil?archivo=${p.fotosPorVendedor[topVendedor.vendedorId]}`
    : null;
  const pctProducto  = topProducto && p.ingresosMes > 0
    ? Math.min(100, Math.round((topProducto.ingresos / p.ingresosMes) * 100))
    : 0;

  return (
    <div className="content-area">

      {/* ══ HEADER ════════════════════════════════════════════════════════ */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom:'1.25rem', padding:'1rem 1.25rem',
        background:'var(--bg-card)', borderRadius:'var(--radius-lg)',
        border:'1px solid var(--border-subtle)',
        boxShadow:'var(--shadow-sm)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.85rem' }}>
          {fotoUrl
            ? <img src={fotoUrl} alt="" style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--primary)', flexShrink:0 }} />
            : <InicialAvatar nombre={p.sesion.nombreCompleto} size={44} />
          }
          <div>
            <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-primary)', lineHeight:1.3 }}>
              Hola, {nombre} 👋
            </div>
            <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:'2px', textTransform:'capitalize' }}>
              {fecha}
            </div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Administrador</div>
          <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:'2px' }}>Área 17</div>
        </div>
      </div>

      {/* ══ RANKING DEL NEGOCIO ══════════════════════════════════════════ */}
      <p style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:'0.6rem' }}>
        Destacados del mes
      </p>
      <div style={isMobile ? {
        display:'flex', gap:'1rem', overflowX:'auto', scrollSnapType:'x mandatory',
        WebkitOverflowScrolling:'touch', paddingBottom:'0.5rem', marginBottom:'1.25rem',
      } : {
        display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'1rem', marginBottom:'1.25rem',
      }}>

        {/* ── Vendedor del Mes ── */}
        <div style={{
          minWidth: isMobile ? '280px' : undefined,
          scrollSnapAlign: isMobile ? 'start' : undefined,
          flexShrink: isMobile ? 0 : undefined,
          background:'linear-gradient(135deg, rgba(255,215,0,0.07) 0%, rgba(255,180,0,0.03) 100%)',
          border:'1px solid rgba(255,215,0,0.25)',
          borderRadius:'20px', padding:'1.25rem 1.25rem 1rem',
          display:'flex', flexDirection:'column', gap:'0.85rem',
          transition:'box-shadow 0.2s, transform 0.2s',
          cursor:'pointer',
        }}
          onClick={() => setModalVend(true)}
          onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 32px rgba(255,215,0,0.12)'; e.currentTarget.style.transform='translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}
        >
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'0.65rem', fontWeight:800, color:'rgba(255,215,0,0.7)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
              🏆 Vendedor del mes
            </span>
            <span style={{ fontSize:'0.65rem', color:'rgba(255,215,0,0.55)', fontWeight:600 }}>Ver top 3 →</span>
          </div>

          {topVendedor ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:'0.85rem' }}>
                {fotoVendedor
                  ? <img src={fotoVendedor} alt="" style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(255,215,0,0.5)', flexShrink:0 }} />
                  : <InicialAvatar nombre={topVendedor.nombre} size={52} />
                }
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:'1rem', color:'var(--text-primary)', lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {topVendedor.nombre}
                  </div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'2px' }}>
                    {topVendedor.cantidad} venta{topVendedor.cantidad !== 1 ? 's' : ''} registradas
                  </div>
                </div>
              </div>
              <div style={{ borderTop:'1px solid rgba(255,215,0,0.15)', paddingTop:'0.75rem' }}>
                <div style={{ fontSize:'0.65rem', color:'rgba(255,215,0,0.6)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'2px' }}>Total vendido</div>
                <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#fbbf24', fontFamily:"'Rajdhani',sans-serif", lineHeight:1 }}>
                  {fmtFull(topVendedor.total)}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color:'var(--text-muted)', fontSize:'0.82rem', textAlign:'center', padding:'1rem 0' }}>Sin datos este mes</div>
          )}
        </div>

        {/* ── Producto Más Vendido ── */}
        <div style={{
          minWidth: isMobile ? '280px' : undefined,
          scrollSnapAlign: isMobile ? 'start' : undefined,
          flexShrink: isMobile ? 0 : undefined,
          background:'linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(99,102,241,0.03) 100%)',
          border:'1px solid rgba(99,102,241,0.25)',
          borderRadius:'20px', padding:'1.25rem 1.25rem 1rem',
          display:'flex', flexDirection:'column', gap:'0.85rem',
          transition:'box-shadow 0.2s, transform 0.2s',
          cursor:'pointer',
        }}
          onClick={() => setModalProd(true)}
          onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 32px rgba(99,102,241,0.12)'; e.currentTarget.style.transform='translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}
        >
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'0.65rem', fontWeight:800, color:'rgba(99,102,241,0.7)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
              ⭐ Producto más vendido
            </span>
            <span style={{ fontSize:'0.65rem', color:'rgba(99,102,241,0.55)', fontWeight:600 }}>Ver top 3 →</span>
          </div>

          {topProducto ? (
            <>
              <div>
                <div style={{ fontWeight:800, fontSize:'0.95rem', color:'var(--text-primary)', lineHeight:1.3 }}>
                  {topProducto.nombre}
                </div>
                <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.5rem', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'0.72rem', background:'rgba(99,102,241,0.15)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.3)', borderRadius:20, padding:'2px 10px', fontWeight:700 }}>
                    {topProducto.cantidad} uds vendidas
                  </span>
                  {pctProducto > 0 && (
                    <span style={{ fontSize:'0.72rem', background:'rgba(45,206,107,0.12)', color:'var(--primary)', border:'1px solid rgba(45,206,107,0.3)', borderRadius:20, padding:'2px 10px', fontWeight:700 }}>
                      {pctProducto}% de ingresos
                    </span>
                  )}
                </div>
              </div>
              <div style={{ borderTop:'1px solid rgba(99,102,241,0.15)', paddingTop:'0.75rem' }}>
                <div style={{ fontSize:'0.65rem', color:'rgba(99,102,241,0.6)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'2px' }}>Ingresos generados</div>
                <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#818cf8', fontFamily:"'Rajdhani',sans-serif", lineHeight:1 }}>
                  {fmt(topProducto.ingresos)}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color:'var(--text-muted)', fontSize:'0.82rem', textAlign:'center', padding:'1rem 0' }}>Sin datos este mes</div>
          )}
        </div>

        {/* ── Resumen Semana ── */}
        <div style={{
          minWidth: isMobile ? '280px' : undefined,
          scrollSnapAlign: isMobile ? 'start' : undefined,
          flexShrink: isMobile ? 0 : undefined,
          background:'linear-gradient(135deg, rgba(45,206,107,0.07) 0%, rgba(16,185,129,0.03) 100%)',
          border:'1px solid rgba(45,206,107,0.22)',
          borderRadius:'20px', padding:'1.25rem 1.25rem 1rem',
          display:'flex', flexDirection:'column', gap:'0.85rem',
          transition:'box-shadow 0.2s, transform 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 32px rgba(45,206,107,0.1)'; e.currentTarget.style.transform='translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}
        >
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'0.65rem', fontWeight:800, color:'rgba(45,206,107,0.7)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
              📈 Esta semana
            </span>
            <span style={{ fontSize:'1.5rem', lineHeight:1 }}>📊</span>
          </div>

          <div>
            <div style={{ fontSize:'0.65rem', color:'rgba(45,206,107,0.6)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'2px' }}>Total recaudado</div>
            <div style={{ fontSize:'1.75rem', fontWeight:900, color:'#2dce6b', fontFamily:"'Rajdhani',sans-serif", lineHeight:1 }}>
              {fmtFull(totalSemana)}
            </div>
            <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:'0.72rem', background:'rgba(45,206,107,0.12)', color:'var(--primary)', border:'1px solid rgba(45,206,107,0.3)', borderRadius:20, padding:'2px 10px', fontWeight:700 }}>
                🛒 {p.ventasSemana} venta{p.ventasSemana !== 1 ? 's' : ''}
              </span>
              {p.ventasSemana > 0 && (
                <span style={{ fontSize:'0.7rem', color:'rgba(45,206,107,0.7)', fontWeight:600 }}>
                  ✓ En curso
                </span>
              )}
            </div>
          </div>

          <div style={{ borderTop:'1px solid rgba(45,206,107,0.15)', paddingTop:'0.75rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem' }}>
              {[
                ['Ingresos mes', fmt(p.ingresosMes), '#2dce6b'],
                ['Semana / Mes', p.ingresosMes > 0 ? `${Math.round((totalSemana/p.ingresosMes)*100)}%` : '—', '#86efac'],
              ].map(([lbl, val, col]) => (
                <div key={lbl}>
                  <div style={{ color:'var(--text-muted)', fontSize:'0.62rem', fontWeight:600, textTransform:'uppercase' }}>{lbl}</div>
                  <div style={{ color: col, fontWeight:800, fontFamily:"'Rajdhani',sans-serif", fontSize:'0.95rem' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ KPI STRIP ═════════════════════════════════════════════════════ */}
      <div style={{
        display:'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr) 2fr',
        gap:'0.75rem',
        marginBottom:'0.75rem',
      }}>
        {[
          { label:'Usuarios',    valor: p.totalUsuarios,  icono:'👥', color:'#a78bfa' },
          { label:'Productos',   valor: p.totalProductos, icono:'📦', color:'#60a5fa' },
          { label:'Stock bajo',  valor: p.stockBajo,      icono:'⚠️', color:'#f59e0b' },
          { label:'Ventas hoy',  valor: p.ventasHoy,      icono:'🛒', color:'#2dce6b' },
        ].map(c => (
          <div key={c.label} style={{
            background:'var(--bg-card)', border:'1px solid var(--border-color)',
            borderRadius:'var(--radius)', padding:'0.875rem 0.875rem 0.75rem',
          }}>
            <div style={{ fontSize:'1.2rem', marginBottom:'0.35rem' }}>{c.icono}</div>
            <div style={{ fontSize:'1.7rem', fontWeight:900, color:c.color, fontFamily:"'Rajdhani',sans-serif", lineHeight:1 }}>
              {c.valor}
            </div>
            <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:'0.3rem' }}>
              {c.label}
            </div>
          </div>
        ))}

        {/* Caja del día — destacada */}
        <div style={{
          gridColumn: isMobile ? '1 / -1' : 'auto',
          background:'linear-gradient(135deg,#0a3d22 0%,#1a6b40 60%,#0a3d22 100%)',
          border:'1px solid rgba(45,206,107,0.45)',
          borderRadius:'var(--radius)',
          padding:'0.875rem 1.1rem',
          boxShadow:'0 0 28px rgba(45,206,107,0.1)',
          display:'flex',
          alignItems: isMobile ? 'center' : 'flex-start',
          justifyContent: isMobile ? 'space-between' : 'flex-start',
          flexDirection: isMobile ? 'row' : 'column',
          gap:'0.4rem',
        }}>
          <div>
            <div style={{ fontSize:'0.68rem', fontWeight:700, color:'rgba(45,206,107,0.75)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
              💵 Caja hoy
            </div>
            {(p.efectivoHoy > 0 || p.transferenciaHoy > 0 || p.addiHoy > 0) && (
              <div style={{ fontSize:'0.62rem', color:'rgba(200,240,216,0.5)', marginTop:'2px' }}>
                💵 {fmtFull(p.efectivoHoy)} · 🏦 {fmtFull(p.transferenciaHoy)} · 📠 {fmtFull(p.addiHoy)}
              </div>
            )}
          </div>
          <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight:900, color:'#c8f0d8', fontFamily:"'Rajdhani',sans-serif", lineHeight:1 }}>
            {fmtFull(p.cajaHoy)}
          </div>
        </div>
      </div>

      {/* ══ INDICADORES DEL DÍA ═══════════════════════════════════════════ */}
      <p style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:'0.6rem' }}>
        Indicadores del día
      </p>
      <div style={{
        display:'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap:'0.75rem', marginBottom:'1.25rem',
      }}>
        {/* Gastos del día — clickeable */}
        <div
          className="kpi-day-card clickable"
          onClick={() => setModalGastosDia(true)}
          style={{ background:'rgba(239,68,68,0.06)', borderColor:'rgba(239,68,68,0.22)' }}
        >
          <span className="kpi-day-icon" style={{ background:'rgba(239,68,68,0.14)', border:'1px solid rgba(239,68,68,0.3)' }}>💸</span>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Gastos del día</div>
            <div style={{ fontSize:'1.35rem', fontWeight:900, color:'#f87171', fontFamily:"'Rajdhani',sans-serif", lineHeight:1.2 }}>{fmt(p.gastosHoy)}</div>
          </div>
          <span className="kpi-day-arrow">Ver →</span>
        </div>

        {/* Transferencia del día — clickeable */}
        <div
          className="kpi-day-card clickable"
          onClick={() => setModalTransferDia(true)}
          style={{ background:'rgba(59,130,246,0.06)', borderColor:'rgba(59,130,246,0.22)' }}
        >
          <span className="kpi-day-icon" style={{ background:'rgba(59,130,246,0.14)', border:'1px solid rgba(59,130,246,0.3)' }}>🏦</span>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Transferencia del día</div>
            <div style={{ fontSize:'1.35rem', fontWeight:900, color:'#60a5fa', fontFamily:"'Rajdhani',sans-serif", lineHeight:1.2 }}>{fmt(p.transferenciaHoy)}</div>
          </div>
          <span className="kpi-day-arrow">Ver →</span>
        </div>

        {/* Utilidad del día */}
        <div
          className="kpi-day-card"
          style={{
            background: p.utilidadDia >= 0 ? 'rgba(45,206,107,0.06)' : 'rgba(239,68,68,0.06)',
            borderColor: p.utilidadDia >= 0 ? 'rgba(45,206,107,0.22)' : 'rgba(239,68,68,0.22)',
          }}
        >
          <span className="kpi-day-icon" style={{
            background: p.utilidadDia >= 0 ? 'rgba(45,206,107,0.14)' : 'rgba(239,68,68,0.14)',
            border: `1px solid ${p.utilidadDia >= 0 ? 'rgba(45,206,107,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>🏛️</span>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Utilidad del día</div>
            <div style={{ fontSize:'1.35rem', fontWeight:900, color:utilDiaColor, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.2 }}>{fmt(p.utilidadDia)}</div>
          </div>
        </div>
      </div>

      {/* ══ ACCIONES RÁPIDAS ══════════════════════════════════════════════ */}
      <div style={{ marginBottom:'1.5rem' }}>
        <p style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:'0.6rem' }}>
          Acciones rápidas
        </p>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          {[
            { href:'/main/ventas',          icono:'➕', label:'Nueva Venta',    c:'#2dce6b', bg:'rgba(45,206,107,0.12)',  bd:'rgba(45,206,107,0.3)'  },
            { href:'/main/inventario',       icono:'📦', label:'Inventario',     c:'#60a5fa', bg:'rgba(59,130,246,0.1)',  bd:'rgba(59,130,246,0.3)'  },
            { href:'/main/usuarios',         icono:'👥', label:'Usuarios',       c:'#a78bfa', bg:'rgba(139,92,246,0.1)', bd:'rgba(139,92,246,0.3)'  },
            { href:'/main/reportes',         icono:'📊', label:'Reportes',       c:'#f59e0b', bg:'rgba(245,158,11,0.1)', bd:'rgba(245,158,11,0.3)'  },
            { href:'/main/ventas/historial', icono:'📋', label:'Historial',      c:'var(--text-secondary)', bg:'var(--bg-card)', bd:'var(--border-color)' },
            { href:'/main/gastos',           icono:'💸', label:'Gastos',         c:'#f87171', bg:'rgba(239,68,68,0.08)', bd:'rgba(239,68,68,0.25)'  },
          ].map(b => (
            <a key={b.href} href={b.href} style={{
              display:'flex', alignItems:'center', gap:'0.4rem',
              padding:'0.5rem 1rem', borderRadius:'var(--radius-xl)',
              background:b.bg, border:`1px solid ${b.bd}`,
              color:b.c, fontSize:'0.8rem', fontWeight:600,
              textDecoration:'none', transition:'var(--transition)',
              whiteSpace:'nowrap',
            }}>
              {b.icono} {b.label}
            </a>
          ))}
        </div>
      </div>

      {/* ══ GRÁFICAS ══════════════════════════════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'1rem', marginBottom:'1.25rem' }}>
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">📊 Ventas por día</span>
            <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{p.ventasSemana} esta semana</span>
          </div>
          <div style={{ padding:'1rem 1rem 0.5rem' }}>
            <GraficaVentasDia datos={p.ventasPorDia} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">💸 Gastos por categoría</span>
            <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{fmt(totalGastosCat)}</span>
          </div>
          <div style={{ padding:'1rem' }}>
            <GraficaGastos datos={p.gastosCat} total={totalGastosCat} />
          </div>
        </div>
      </div>

      {/* ══ ÚLTIMAS VENTAS + GASTOS ═══════════════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'1rem', marginBottom:'1.25rem' }}>
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">🛒 Últimas ventas</span>
            <a href="/main/ventas/historial" style={{ fontSize:'0.72rem', color:'var(--primary)', textDecoration:'none' }}>Ver todas →</a>
          </div>
          <div className="table-responsive">
            <table className="area17-table">
              <thead><tr><th>Código</th><th>Vendedor</th><th>Total</th></tr></thead>
              <tbody>
                {(p.ultimasVentas || []).map(v => (
                  <tr key={v.id}>
                    <td><span className="codigo-badge">{v.codigo}</span></td>
                    <td style={{ fontSize:'0.82rem' }}>{v.vendedorNombre}</td>
                    <td style={{ color:'var(--primary)', fontWeight:600 }}>{fmtFull(v.total)}</td>
                  </tr>
                ))}
                {!p.ultimasVentas?.length && (
                  <tr><td colSpan={3} style={{ textAlign:'center', color:'var(--text-muted)', padding:'1.25rem' }}>Sin ventas registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">💸 Gastos recientes</span>
            <a href="/main/gastos" style={{ fontSize:'0.72rem', color:'var(--primary)', textDecoration:'none' }}>Ver todos →</a>
          </div>
          <div className="table-responsive">
            <table className="area17-table">
              <thead><tr><th>Nombre</th><th>Cat.</th><th>Valor</th></tr></thead>
              <tbody>
                {(p.gastosRecientes || []).map(g => (
                  <tr key={g.id}>
                    <td style={{ fontSize:'0.82rem' }}>{g.nombre}</td>
                    <td><span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{g.categoria.replace('_',' ')}</span></td>
                    <td style={{ color:'#f87171', fontWeight:600 }}>{fmtFull(g.valor)}</td>
                  </tr>
                ))}
                {!p.gastosRecientes?.length && (
                  <tr><td colSpan={3} style={{ textAlign:'center', color:'var(--text-muted)', padding:'1.25rem' }}>Sin gastos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══ INDICADORES DEL MES ═══════════════════════════════════════════ */}
      <p style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:'0.6rem' }}>
        Indicadores del mes
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'0.75rem', marginBottom:'1.25rem' }}>
        {[
          { label:'Ingresos del mes',  val:p.ingresosMes,  icono:'📈', color:'#2dce6b' },
          { label:'Gastos del mes',    val:p.gastosMes,    icono:'💸', color:'#f87171' },
          { label:'Utilidad del mes',  val:p.utilidadMes,  icono:'🏛️', color:utilColor },
          { label:'Efectivo mes',      val:p.efectivoMes,      icono:'💵', color:'#4ade80' },
          { label:'Transferencia mes', val:p.transferenciaMes, icono:'🏦', color:'#60a5fa' },
          { label:'Addi mes',          val:p.addiMes,          icono:'📠', color:'#c084fc' },
        ].map(c => (
          <div key={c.label} style={{
            background:'var(--bg-card)', border:'1px solid var(--border-color)',
            borderRadius:'var(--radius)', padding:'0.7rem 0.875rem',
            display:'flex', alignItems:'center', gap:'0.6rem',
          }}>
            <span style={{ fontSize:'1.15rem' }}>{c.icono}</span>
            <div>
              <div style={{ fontSize:'0.63rem', color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{c.label}</div>
              <div style={{ fontSize:'0.95rem', fontWeight:800, color:c.color, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.3 }}>{fmtFull(c.val)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ ALERTAS STOCK BAJO ════════════════════════════════════════════ */}
      {p.productosStockBajo?.length > 0 && (
        <StockBajoDash productos={p.productosStockBajo} />
      )}

      {/* ══ MODAL Top 3 Vendedores ════════════════════════════════════════ */}
      {modalVend && (
        <div className="modal-overlay" onClick={() => setModalVend(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🏆 Top 3 Vendedores del mes</h2>
              <button onClick={() => setModalVend(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', color:'var(--text-muted)' }}>✕</button>
            </div>
            <div className="modal-body">
              {(p.top3Vendedores || []).map((v, i) => (
                <div key={v.nombre} style={{
                  background:COLORES[i], border:`1px solid ${BORDES[i]}`,
                  borderRadius:'0.75rem', padding:'1rem 1.25rem',
                  display:'flex', alignItems:'center', gap:'1rem',
                  marginBottom: i < 2 ? '0.75rem' : 0,
                }}>
                  <span style={{ fontSize:'1.75rem' }}>{MEDALLAS[i]}</span>
                  {p.fotosPorVendedor?.[v.vendedorId]
                    ? <img src={`/api/foto-perfil?archivo=${p.fotosPorVendedor[v.vendedorId]}`} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover' }} alt="" />
                    : <InicialAvatar nombre={v.nombre} />
                  }
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:'var(--text-primary)' }}>{v.nombre}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{v.cantidad} ventas</div>
                  </div>
                  <div style={{ fontWeight:800, color:'var(--primary)', fontFamily:"'Rajdhani',sans-serif", fontSize:'1.1rem' }}>{fmt(v.total)}</div>
                </div>
              ))}
              {!p.top3Vendedores?.length && <p style={{ color:'var(--text-muted)', textAlign:'center' }}>Sin datos este mes</p>}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL Top 3 Productos ═════════════════════════════════════════ */}
      {modalProd && (
        <div className="modal-overlay" onClick={() => setModalProd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">⭐ Top 3 Productos del mes</h2>
              <button onClick={() => setModalProd(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', color:'var(--text-muted)' }}>✕</button>
            </div>
            <div className="modal-body">
              {(p.top3Productos || []).map((prod, i) => (
                <div key={prod.nombre} style={{
                  background:COLORES[i], border:`1px solid ${BORDES[i]}`,
                  borderRadius:'0.75rem', padding:'1rem 1.25rem',
                  display:'flex', alignItems:'center', gap:'1rem',
                  marginBottom: i < 2 ? '0.75rem' : 0,
                }}>
                  <span style={{ fontSize:'1.75rem' }}>{MEDALLAS[i]}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:'var(--text-primary)' }}>{prod.nombre}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{prod.cantidad} unidades vendidas</div>
                  </div>
                  <div style={{ fontWeight:800, color:'var(--primary)', fontFamily:"'Rajdhani',sans-serif", fontSize:'1.1rem' }}>{fmt(prod.ingresos)}</div>
                </div>
              ))}
              {!p.top3Productos?.length && <p style={{ color:'var(--text-muted)', textAlign:'center' }}>Sin datos este mes</p>}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL Gastos del día ══════════════════════════════════════════ */}
      {modalGastosDia && (
        <div className="modal-overlay" onClick={() => setModalGastosDia(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">💸 Gastos del día</h2>
              <button onClick={() => setModalGastosDia(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', color:'var(--text-muted)' }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign:'center', marginBottom:'0.25rem' }}>
                <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>Total gastado hoy</div>
                <div style={{ fontSize:'1.75rem', fontWeight:900, color:'#f87171', fontFamily:"'Rajdhani',sans-serif" }}>{fmtFull(p.gastosHoy)}</div>
              </div>
              <DesgloseMedios entries={desgloseEntries(p.gastosMedioPagoHoy)} />
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL Transferencia del día ═══════════════════════════════════ */}
      {modalTransferDia && (
        <div className="modal-overlay" onClick={() => setModalTransferDia(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🏦 Transferencia del día</h2>
              <button onClick={() => setModalTransferDia(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', color:'var(--text-muted)' }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign:'center', marginBottom:'0.25rem' }}>
                <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>Total transferido hoy</div>
                <div style={{ fontSize:'1.75rem', fontWeight:900, color:'#60a5fa', fontFamily:"'Rajdhani',sans-serif" }}>{fmtFull(p.transferenciaHoy)}</div>
              </div>
              <DesgloseMedios entries={desgloseEntries(p.transferenciaEntidadHoy)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
