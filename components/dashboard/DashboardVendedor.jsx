'use client';
import { useEffect, useState, useRef } from 'react';

/* ── Formato compacto ─────────────────────────────────────────────────── */
function fmt(val) {
  if (!val) return '$0';
  const v = Math.abs(val);
  const s = val < 0 ? '-' : '';
  if (v >= 1e6)  return `${s}$${(v/1e6).toFixed(1)} M`;
  if (v >= 1000) return `${s}$${(v/1000).toFixed(1)} mil`;
  return `${s}$${Math.round(v).toLocaleString('es-CO')}`;
}

/* ── Constantes medallas ──────────────────────────────────────────────── */
const MEDALLAS = ['🥇','🥈','🥉'];
const MED_BG   = ['rgba(255,215,0,.18)','rgba(192,192,192,.15)','rgba(205,127,50,.13)'];
const MED_BOR  = ['rgba(255,215,0,.4)','rgba(192,192,192,.3)','rgba(205,127,50,.3)'];

/* ── Avatar iniciales ─────────────────────────────────────────────────── */
function InicialAvatar({ nombre, size = 52 }) {
  const parts = (nombre || '').trim().split(' ').filter(Boolean);
  const ini = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0]?.[0] || 'U').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#1a6b40,#0a3d22)',
      border: '2.5px solid rgba(45,206,107,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.38, color: '#c8f0d8',
      boxShadow: '0 0 16px rgba(45,206,107,0.15)',
    }}>{ini}</div>
  );
}

/* ── Número con animación contadora ──────────────────────────────────── */
function AnimNum({ target, duration = 750 }) {
  const [val, setVal]  = useState(0);
  const startTs        = useRef(null);
  useEffect(() => {
    if (!target) return;
    startTs.current = null;
    let raf;
    const tick = ts => {
      if (!startTs.current) startTs.current = ts;
      const p    = Math.min((ts - startTs.current) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{val}</>;
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function DashboardVendedor({
  sesion, ventasHoy, cajaHoy, ventasMes, ingresosMes,
  ventasRecientes, productoTop, top3Productos,
}) {
  const [hora,      setHora]      = useState('');
  const [fecha,     setFecha]     = useState('');
  const [modalTop3, setModalTop3] = useState(false);
  const [modalAnim, setModalAnim] = useState(false);
  const [loaded,    setLoaded]    = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setHora(now.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
      setFecha(now.toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    const t  = setTimeout(() => setLoaded(true), 60);
    return () => { clearInterval(id); clearTimeout(t); };
  }, []);

  // Modal open/close con animación
  function abrirModal() {
    setModalTop3(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setModalAnim(true)));
  }
  function cerrarModal() {
    setModalAnim(false);
    setTimeout(() => setModalTop3(false), 280);
  }

  const nombre   = sesion.nombreCompleto.split(' ')[0];
  const fotoUrl  = sesion.fotoPerfil ? `/api/foto-perfil?archivo=${sesion.fotoPerfil}` : null;

  // Producto top con datos ricos (del top3) o fallback al string productoTop
  const topProducto  = (top3Productos || [])[0] || null;
  const pctProducto  = topProducto && ingresosMes > 0
    ? Math.min(100, Math.round((topProducto.ingresos / ingresosMes) * 100))
    : 0;

  // Quick stats calculadas desde los props existentes
  const ticketPromedio = ventasHoy > 0 ? Math.round(cajaHoy / ventasHoy) : 0;
  const hayProductoTop = topProducto || (productoTop && productoTop !== 'N/A');

  // Definición de KPI cards
  const kpis = [
    {
      label:'Ventas hoy', valor: ventasHoy, isNum: true,
      icono:'🛒',
      grad:'linear-gradient(145deg,rgba(45,206,107,0.14) 0%,rgba(45,206,107,0.04) 100%)',
      bord:'rgba(45,206,107,0.3)',
      icoGrad:'linear-gradient(135deg,#1b7040,#0c4028)',
      valColor:'var(--primary)',
      hoverShadow:'0 10px 36px rgba(45,206,107,0.12)',
    },
    {
      label:'Caja hoy', valor: fmt(cajaHoy), isNum: false,
      icono:'💵',
      grad:'linear-gradient(145deg,rgba(45,206,107,0.10) 0%,rgba(45,206,107,0.03) 100%)',
      bord:'rgba(45,206,107,0.22)',
      icoGrad:'linear-gradient(135deg,#1b7040,#0c4028)',
      valColor:'var(--primary)',
      hoverShadow:'0 10px 36px rgba(45,206,107,0.10)',
    },
    {
      label:'Ventas del mes', valor: ventasMes, isNum: true,
      icono:'📅',
      grad:'linear-gradient(145deg,rgba(56,189,248,0.12) 0%,rgba(56,189,248,0.04) 100%)',
      bord:'rgba(56,189,248,0.28)',
      icoGrad:'linear-gradient(135deg,#0c4a6e,#082f4e)',
      valColor:'#38bdf8',
      hoverShadow:'0 10px 36px rgba(56,189,248,0.10)',
    },
    {
      label:'Ingresos mes', valor: fmt(ingresosMes), isNum: false,
      icono:'📈',
      grad:'linear-gradient(145deg,rgba(129,140,248,0.12) 0%,rgba(129,140,248,0.04) 100%)',
      bord:'rgba(129,140,248,0.28)',
      icoGrad:'linear-gradient(135deg,#312e81,#1e1b4b)',
      valColor:'#818cf8',
      hoverShadow:'0 10px 36px rgba(129,140,248,0.10)',
    },
  ];

  return (
    <div
      className="content-area"
      style={{
        opacity:    loaded ? 1 : 0,
        transform:  loaded ? 'none' : 'translateY(14px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
      }}
    >
      {/* ══ HEADER PREMIUM ═══════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(140deg,#071a0c 0%,#0d2e14 55%,#061309 100%)',
        border:     '1px solid rgba(45,206,107,0.22)',
        borderRadius: 24,
        padding:    '20px 22px',
        marginBottom: 18,
        position:   'relative',
        overflow:   'hidden',
        boxShadow:  '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(45,206,107,0.08)',
      }}>
        {/* Destellos decorativos */}
        <div style={{ position:'absolute', top:-90, right:-90, width:240, height:240,
          background:'radial-gradient(circle,rgba(57,255,20,0.09),transparent 68%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-70, left:-50, width:180, height:180,
          background:'radial-gradient(circle,rgba(45,206,107,0.06),transparent 70%)', pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, position:'relative' }}>
          {/* Izquierda: foto + texto */}
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {fotoUrl
              ? <img src={fotoUrl} alt="" style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', border:'2.5px solid rgba(45,206,107,0.55)', flexShrink:0, boxShadow:'0 0 16px rgba(45,206,107,0.15)' }} />
              : <InicialAvatar nombre={sesion.nombreCompleto} size={52} />
            }
            <div>
              <div style={{ fontSize:22, fontWeight:900, color:'var(--text-primary)', lineHeight:1.15 }}>
                Hola, {nombre} 👋
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3, textTransform:'capitalize' }}>
                {fecha}
              </div>
              <div style={{ fontSize:10, color:'var(--text-secondary)', marginTop:2, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>
                Panel de Ventas · Área 17
              </div>
            </div>
          </div>

          {/* Derecha: reloj */}
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontSize:19, fontWeight:800, color:'var(--primary)', fontFamily:"'Rajdhani',monospace", textShadow:'0 0 16px var(--primary-glow)', letterSpacing:2 }}>
              {hora}
            </div>
          </div>
        </div>
      </div>

      {/* ══ QUICK STATS CHIPS ════════════════════════════════════════════ */}
      {(ventasHoy > 0 || ventasMes > 0) && (
        <div style={{
          display:'flex', gap:'0.55rem',
          marginBottom:'1.2rem',
          overflowX:'auto', paddingBottom:2,
          scrollbarWidth:'none', msOverflowStyle:'none',
        }}>
          {ventasHoy > 0 && (
            <span style={{
              display:'inline-flex', alignItems:'center', gap:'0.35rem',
              padding:'0.32rem 0.8rem',
              background:'rgba(45,206,107,0.08)', border:'1px solid rgba(45,206,107,0.22)',
              borderRadius:20, flexShrink:0, fontSize:'0.73rem', fontWeight:600,
              color:'var(--text-secondary)', whiteSpace:'nowrap',
            }}>
              🔥 <strong style={{ color:'var(--primary)' }}>{ventasHoy}</strong> ventas hoy
            </span>
          )}
          {ticketPromedio > 0 && (
            <span style={{
              display:'inline-flex', alignItems:'center', gap:'0.35rem',
              padding:'0.32rem 0.8rem',
              background:'rgba(45,206,107,0.08)', border:'1px solid rgba(45,206,107,0.22)',
              borderRadius:20, flexShrink:0, fontSize:'0.73rem', fontWeight:600,
              color:'var(--text-secondary)', whiteSpace:'nowrap',
            }}>
              💰 Ticket prom. <strong style={{ color:'var(--primary)' }}>{fmt(ticketPromedio)}</strong>
            </span>
          )}
          {ventasMes > 0 && (
            <span style={{
              display:'inline-flex', alignItems:'center', gap:'0.35rem',
              padding:'0.32rem 0.8rem',
              background:'rgba(45,206,107,0.08)', border:'1px solid rgba(45,206,107,0.22)',
              borderRadius:20, flexShrink:0, fontSize:'0.73rem', fontWeight:600,
              color:'var(--text-secondary)', whiteSpace:'nowrap',
            }}>
              🏆 <strong style={{ color:'var(--primary)' }}>{ventasMes}</strong> en el mes
            </span>
          )}
          {ingresosMes > 0 && (
            <span style={{
              display:'inline-flex', alignItems:'center', gap:'0.35rem',
              padding:'0.32rem 0.8rem',
              background:'rgba(45,206,107,0.08)', border:'1px solid rgba(45,206,107,0.22)',
              borderRadius:20, flexShrink:0, fontSize:'0.73rem', fontWeight:600,
              color:'var(--text-secondary)', whiteSpace:'nowrap',
            }}>
              📦 <strong style={{ color:'var(--primary)' }}>{fmt(ingresosMes)}</strong> generados
            </span>
          )}
        </div>
      )}

      {/* ══ KPI CARDS ════════════════════════════════════════════════════ */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(2,1fr)',
        gap:'0.8rem', marginBottom:'1.4rem',
      }}>
        {kpis.map(c => (
          <div
            key={c.label}
            style={{
              background:      c.grad,
              backdropFilter:  'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border:          `1px solid ${c.bord}`,
              borderRadius:    22,
              padding:         '18px 16px',
              boxShadow:       '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
              display:         'flex', flexDirection:'column', gap:12,
              cursor:          'default',
              userSelect:      'none',
              transition:      'transform 0.14s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = c.hoverShadow + ', inset 0 1px 0 rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.transition = 'transform 0.1s ease'; }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {/* Ícono */}
            <div style={{
              width:42, height:42, borderRadius:13,
              background: c.icoGrad,
              border: `1px solid ${c.bord}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20, boxShadow:'0 2px 10px rgba(0,0,0,0.35)',
            }}>
              {c.icono}
            </div>

            {/* Valor y etiqueta */}
            <div>
              <div style={{
                fontSize:28, fontWeight:900, lineHeight:1,
                color: c.valColor,
                fontFamily:"'Rajdhani',sans-serif",
                letterSpacing:-0.5,
              }}>
                {c.isNum ? <AnimNum target={c.valor} /> : c.valor}
              </div>
              <div style={{
                fontSize:10, color:'var(--text-muted)', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'0.07em', marginTop:5,
              }}>
                {c.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ PRODUCTO MÁS VENDIDO (estilo admin) ═════════════════════════ */}
      {hayProductoTop && (
        <div
          onClick={abrirModal}
          style={{
            background:'linear-gradient(135deg,rgba(99,102,241,0.10) 0%,rgba(99,102,241,0.04) 100%)',
            border:'1px solid rgba(99,102,241,0.3)',
            borderRadius:20,
            padding:'1.25rem 1.25rem 1rem',
            display:'flex', flexDirection:'column', gap:'0.85rem',
            cursor:'pointer',
            marginBottom:'1.4rem',
            boxShadow:'0 4px 24px rgba(99,102,241,0.08)',
            transition:'box-shadow 0.22s ease, transform 0.18s ease',
            userSelect:'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow='0 10px 36px rgba(99,102,241,0.16)'; e.currentTarget.style.transform='translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow='0 4px 24px rgba(99,102,241,0.08)'; e.currentTarget.style.transform='none'; }}
          onMouseDown={e => { e.currentTarget.style.transform='scale(0.98)'; }}
          onMouseUp={e => { e.currentTarget.style.transform='translateY(-2px)'; }}
          onTouchStart={e => { e.currentTarget.style.transform='scale(0.98)'; }}
          onTouchEnd={e => { e.currentTarget.style.transform='scale(1)'; }}
        >
          {/* Encabezado */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'0.65rem', fontWeight:800, color:'rgba(99,102,241,0.8)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
              ⭐ Producto más vendido
            </span>
            <span style={{ fontSize:'0.65rem', color:'rgba(99,102,241,0.6)', fontWeight:600 }}>
              Ver Top 3 →
            </span>
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
              <div style={{ borderTop:'1px solid rgba(99,102,241,0.18)', paddingTop:'0.75rem' }}>
                <div style={{ fontSize:'0.65rem', color:'rgba(99,102,241,0.6)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>
                  Ingresos generados
                </div>
                <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#818cf8', fontFamily:"'Rajdhani',sans-serif", lineHeight:1 }}>
                  {fmt(topProducto.ingresos)}
                </div>
              </div>
            </>
          ) : (
            /* Fallback: productoTop es solo un string */
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.25rem 0' }}>
              <span style={{ fontSize:'1.4rem' }}>📦</span>
              <span style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'0.9rem' }}>
                {productoTop}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ══ ACCIONES RÁPIDAS ═════════════════════════════════════════════ */}
      <p style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'0.75rem' }}>
        Acciones rápidas
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'12px', marginBottom:'1.4rem' }}>
        {[
          { href:'/main/ventas',           icono:'🛒', label:'Nueva Venta',     desc:'Registrar productos' },
          { href:'/main/ventas/historial',  icono:'📋', label:'Mis Ventas',      desc:'Ver historial' },
          { href:'/main/gastos',            icono:'💸', label:'Registrar Gasto', desc:'Gastos empresariales' },
          { href:'/main/recomendaciones',   icono:'💬', label:'Recomendaciones', desc:'Enviar sugerencias' },
        ].map(a => (
          <a key={a.href} href={a.href} style={{
            background:'var(--bg-card)', border:'1px solid var(--border-color)',
            borderRadius:20, padding:'20px 14px',
            textAlign:'center', textDecoration:'none', color:'var(--text-primary)',
            display:'flex', flexDirection:'column', alignItems:'center', gap:8,
            boxShadow:'0 2px 12px rgba(0,0,0,0.28)',
            transition:'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-color)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.28)'; }}
          onMouseDown={e => { e.currentTarget.style.transform='scale(0.96)'; }}
          onMouseUp={e => { e.currentTarget.style.transform='none'; }}
          onTouchStart={e => { e.currentTarget.style.transform='scale(0.96)'; }}
          onTouchEnd={e => { e.currentTarget.style.transform='scale(1)'; }}
          >
            <span style={{ fontSize:32 }}>{a.icono}</span>
            <span style={{ fontWeight:700, fontSize:13 }}>{a.label}</span>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{a.desc}</span>
          </a>
        ))}
      </div>

      {/* ══ MIS VENTAS RECIENTES ════════════════════════════════════════ */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">📋 Mis ventas recientes</span>
          <a href="/main/ventas/historial" style={{ fontSize:'0.72rem', color:'var(--primary)' }}>Ver todas →</a>
        </div>
        <div className="table-responsive">
          <table className="area17-table">
            <thead>
              <tr><th>Código</th><th>Fecha</th><th>Total</th><th>Pago</th></tr>
            </thead>
            <tbody>
              {(ventasRecientes || []).map(v => (
                <tr key={v.id}>
                  <td><span className="codigo-badge">{v.codigo}</span></td>
                  <td style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{v.fecha} {v.hora}</td>
                  <td style={{ color:'var(--primary)', fontWeight:600 }}>{fmt(v.total)}</td>
                  <td style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>{v.tipoPago}</td>
                </tr>
              ))}
              {!ventasRecientes?.length && (
                <tr>
                  <td colSpan={4} style={{ textAlign:'center', color:'var(--text-muted)', padding:'1.5rem' }}>
                    Aún no tienes ventas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ MODAL TOP 3 PRODUCTOS ════════════════════════════════════════ */}
      {modalTop3 && (
        <div
          onClick={cerrarModal}
          style={{
            position:'fixed', inset:0,
            background: modalAnim ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
            backdropFilter: modalAnim ? 'blur(6px)' : 'none',
            WebkitBackdropFilter: modalAnim ? 'blur(6px)' : 'none',
            zIndex:'var(--z-modal)',
            display:'flex', alignItems:'flex-end', justifyContent:'center',
            transition:'background 0.28s ease, backdrop-filter 0.28s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:'linear-gradient(180deg,#121d12 0%,#0d180d 100%)',
              border:'1px solid rgba(45,206,107,0.2)',
              borderRadius:'24px 24px 0 0',
              width:'100%', maxWidth:540,
              padding:'12px 20px 36px',
              boxShadow:'0 -20px 64px rgba(0,0,0,0.75), inset 0 1px 0 rgba(45,206,107,0.08)',
              transform: modalAnim ? 'translateY(0)' : 'translateY(70px)',
              opacity:   modalAnim ? 1 : 0,
              transition:'transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease',
            }}
          >
            {/* Drag handle */}
            <div style={{ width:40, height:4, borderRadius:2, background:'rgba(45,206,107,0.2)', margin:'8px auto 18px' }} />

            {/* Header modal */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>⭐ Top 3 Productos del mes</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Más vendidos en el sistema</div>
              </div>
              <button
                onClick={cerrarModal}
                style={{
                  background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-color)',
                  borderRadius:'50%', width:32, height:32, cursor:'pointer',
                  color:'var(--text-muted)', fontSize:15,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
              >✕</button>
            </div>

            {/* Lista productos */}
            {(top3Productos || []).length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem' }}>
                {(top3Productos || []).map((prod, i) => (
                  <div key={prod.nombre} style={{
                    background: MED_BG[i],
                    border: `1px solid ${MED_BOR[i]}`,
                    borderRadius: 16,
                    padding: '0.9rem 1.1rem',
                    display: 'flex', alignItems: 'center', gap: '0.9rem',
                  }}>
                    <span style={{ fontSize:'1.9rem', flexShrink:0 }}>{MEDALLAS[i]}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'0.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {prod.nombre}
                      </div>
                      <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2 }}>
                        {prod.cantidad} unidades vendidas
                      </div>
                    </div>
                    <div style={{ fontWeight:800, color:'var(--primary)', fontFamily:"'Rajdhani',sans-serif", fontSize:'1.1rem', flexShrink:0 }}>
                      {fmt(prod.ingresos)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state */
              <div style={{ textAlign:'center', padding:'2rem 1rem' }}>
                <div style={{ fontSize:'3.5rem', marginBottom:'0.75rem', opacity:0.4 }}>📦</div>
                <div style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:'0.4rem', fontSize:'0.95rem' }}>
                  Sin actividad este mes
                </div>
                <div style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
                  No hay ventas registradas este mes
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
