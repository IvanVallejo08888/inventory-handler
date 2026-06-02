'use client';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';

function fmt(val) {
  if (!val) return '$0';
  const v = Math.abs(val);
  const s = val < 0 ? '-' : '';
  if (v >= 1e6)  return `${s}$${(v/1e6).toFixed(1)} M`;
  if (v >= 1000) return `${s}$${(v/1000).toFixed(1)} mil`;
  return `${s}$${Math.round(v).toLocaleString('es-CO')}`;
}

export default function DashboardVendedor({ sesion, ventasHoy, cajaHoy, ventasMes, ingresosMes, ventasRecientes, productoTop }) {
  const [hora, setHora]   = useState('');
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      setHora(now.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
      setFecha(now.toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const nombre = sesion.nombreCompleto.split(' ')[0];

  return (
    <div className="content-area">
      {/* Hero banner */}
      <div style={{
        background:'linear-gradient(135deg,#0a1a0a 0%,#0f2a0f 40%,#091509 100%)',
        border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)',
        padding:'28px 32px', marginBottom:'24px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        gap:'20px', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'200px', height:'200px',
          background:'radial-gradient(circle,rgba(57,255,20,0.12),transparent 70%)', pointerEvents:'none' }} />
        <div>
          <h2 style={{ fontSize:'24px', fontWeight:900, marginBottom:'6px', color:'var(--text-primary)' }}>
            ¡Hola, {nombre}! 👋
          </h2>
          <p style={{ color:'var(--text-secondary)', fontSize:'14px' }}>Panel de Vendedor — Área 17</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:'22px', fontWeight:800, color:'var(--primary)', fontFamily:"'Rajdhani',monospace", textShadow:'0 0 14px var(--primary-glow)' }}>
            {hora}
          </div>
          <div style={{ fontSize:'13px', color:'var(--text-muted)', marginTop:'4px' }}>{fecha}</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          { label:'Ventas hoy',     valor: ventasHoy,        clase:'green',  icono:'🛒' },
          { label:'Caja hoy',       valor: fmt(cajaHoy),     clase:'green',  icono:'💵' },
          { label:'Ventas del mes', valor: ventasMes,        clase:'blue',   icono:'📅' },
          { label:'Ingresos mes',   valor: fmt(ingresosMes), clase:'purple', icono:'📈' },
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

      {/* Producto top del mes */}
      {productoTop && productoTop !== 'N/A' && (
        <div className="panel" style={{ marginBottom:'1.5rem', background:'rgba(45,206,107,0.04)', borderColor:'rgba(45,206,107,0.25)' }}>
          <div className="panel-header">
            <span className="panel-title">⭐ Producto más vendido este mes</span>
          </div>
          <div style={{ padding:'0.75rem 1rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <span style={{ fontSize:'1.5rem' }}>📦</span>
            <span style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'0.95rem' }}>{productoTop}</span>
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      <p style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'0.75rem' }}>
        Acciones rápidas
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'14px', marginBottom:'1.5rem' }}>
        {[
          { href:'/main/ventas',           icono:'🛒', label:'Nueva Venta',     desc:'Registrar productos' },
          { href:'/main/ventas/historial',  icono:'📋', label:'Mis Ventas',      desc:'Ver historial' },
          { href:'/main/gastos',            icono:'💸', label:'Registrar Gasto', desc:'Gastos empresariales' },
          { href:'/main/recomendaciones',   icono:'💬', label:'Recomendaciones', desc:'Enviar sugerencias' },
        ].map(a => (
          <a key={a.href} href={a.href} style={{
            background:'var(--bg-card)', border:'1px solid var(--border-color)',
            borderRadius:'var(--radius-lg)', padding:'22px 18px',
            textAlign:'center', textDecoration:'none', color:'var(--text-primary)',
            transition:'var(--transition)', display:'flex', flexDirection:'column',
            alignItems:'center', gap:'10px',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.transform='translateY(-3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-color)'; e.currentTarget.style.transform='none'; }}
          >
            <span style={{ fontSize:'36px' }}>{a.icono}</span>
            <span style={{ fontWeight:700, fontSize:'14px' }}>{a.label}</span>
            <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>{a.desc}</span>
          </a>
        ))}
      </div>

      {/* Mis ventas recientes */}
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
    </div>
  );
}
