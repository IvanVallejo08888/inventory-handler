'use client';
import PageHeader from '@/components/ui/PageHeader';
import { useState } from 'react';

function fmt(val) {
  if (val == null) return '$0';
  const v = Math.abs(val);
  const s = val < 0 ? '-' : '';
  if (v >= 1e9)  return `${s}$${(v/1e9).toFixed(1)} mm`;
  if (v >= 1e6)  return `${s}$${(v/1e6).toFixed(1)} M`;
  if (v >= 1000) return `${s}$${(v/1000).toFixed(1)} mil`;
  return `${s}$${Math.round(v).toLocaleString('es-CO')}`;
}

function InicialAvatar({ nombre, size = 36 }) {
  const partes = (nombre || '').trim().split(' ').filter(Boolean);
  const ini = partes.length >= 2
    ? (partes[0][0] + partes[1][0]).toUpperCase()
    : (partes[0]?.[0] || 'U').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#1a6b40,#0a3d22)',
      border: '1.5px solid rgba(45,206,107,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36, color: '#c8f0d8',
    }}>{ini}</div>
  );
}

const MEDALLAS = ['🥇','🥈','🥉'];
const COLORES  = ['rgba(255,215,0,.18)','rgba(192,192,192,.15)','rgba(205,127,50,.13)'];
const BORDES   = ['rgba(255,215,0,.4)','rgba(192,192,192,.3)','rgba(205,127,50,.3)'];

export default function DashboardAdmin(p) {
  const [modalVend, setModalVend] = useState(false);
  const [modalProd, setModalProd] = useState(false);

  const utilColor = p.utilidadMes >= 0 ? 'var(--primary)' : '#ef4444';

  const statCards = [
    { label:'Usuarios',        valor: p.totalUsuarios,  icono:'👥', clase:'purple' },
    { label:'Productos activos',valor: p.totalProductos, icono:'📦', clase:'blue' },
    { label:'Stock bajo',      valor: p.stockBajo,      icono:'⚠️', clase:'orange' },
    { label:'Ventas hoy',      valor: p.ventasHoy,      icono:'🛒', clase:'green' },
    { label:'Caja hoy',        valor: fmt(p.cajaHoy),   icono:'💵', clase:'green' },
    { label:'Ingresos mes',    valor: fmt(p.ingresosMes),icono:'📈', clase:'green' },
    { label:'Gastos mes',      valor: fmt(p.gastosMes), icono:'💸', clase:'red' },
    { label:'Utilidad mes',    valor: fmt(p.utilidadMes),icono:'🏦', clase:'green', style:{ color: utilColor } },
  ];

  return (
    <div className="content-area">
      <PageHeader title={`Bienvenido, ${p.sesion.nombreCompleto.split(' ')[0]}`} subtitle="Panel de Administración — Área 17" />

      {/* KPIs */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {statCards.map(c => (
          <div className="stat-card" key={c.label}>
            <div className={`stat-icon ${c.clase}`}>{c.icono}</div>
            <div className="stat-info">
              <div className="stat-value" style={c.style || {}}>{c.valor}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Métodos de pago hoy */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon green">💵</div>
          <div className="stat-info">
            <div className="stat-value">{fmt(p.efectivoHoy)}</div>
            <div className="stat-label">Efectivo hoy</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🔄</div>
          <div className="stat-info">
            <div className="stat-value">{fmt(p.transferenciaHoy)}</div>
            <div className="stat-label">Transferencia hoy</div>
          </div>
        </div>
      </div>

      {/* Top 3 destacados */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>

        {/* Vendedor del mes */}
        <div className="panel" style={{ cursor:'pointer' }} onClick={() => setModalVend(true)}>
          <div className="panel-header">
            <span className="panel-title">🏆 Vendedor del mes</span>
            <span style={{ fontSize:'0.72rem', color:'var(--primary)' }}>Ver ranking →</span>
          </div>
          <div className="panel-body" style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>🥇</div>
            <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--text-primary)' }}>{p.vendedorMes}</div>
          </div>
        </div>

        {/* Producto top */}
        <div className="panel" onClick={() => setModalProd(true)} style={{ cursor:'pointer' }}>
          <div className="panel-header">
            <span className="panel-title">⭐ Producto más vendido</span>
            <span style={{ fontSize:'0.72rem', color:'var(--primary)' }}>Ver ranking →</span>
          </div>
          <div className="panel-body" style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>📦</div>
            <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--text-primary)' }}>{p.productoTop}</div>
          </div>
        </div>

        {/* Ventas semana */}
        <div className="panel">
          <div className="panel-header"><span className="panel-title">📅 Ventas esta semana</span></div>
          <div className="panel-body" style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>📊</div>
            <div style={{ fontWeight:700, fontSize:'1.5rem', color:'var(--primary)', fontFamily:"'Rajdhani',sans-serif" }}>{p.ventasSemana}</div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>ventas completadas</div>
          </div>
        </div>
      </div>

      {/* Dos columnas: últimas ventas + gastos recientes */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.5rem' }}>

        {/* Últimas ventas */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">🛒 Últimas ventas</span>
            <a href="/ventas/historial" style={{ fontSize:'0.72rem', color:'var(--primary)' }}>Ver todas →</a>
          </div>
          <div className="table-responsive">
            <table className="area17-table">
              <thead><tr><th>Código</th><th>Vendedor</th><th>Total</th></tr></thead>
              <tbody>
                {(p.ultimasVentas || []).map(v => (
                  <tr key={v.id}>
                    <td><span className="codigo-badge">{v.codigo}</span></td>
                    <td style={{ fontSize:'0.82rem' }}>{v.vendedorNombre}</td>
                    <td style={{ color:'var(--primary)', fontWeight:600 }}>{fmt(v.total)}</td>
                  </tr>
                ))}
                {!p.ultimasVentas?.length && (
                  <tr><td colSpan={3} style={{ textAlign:'center', color:'var(--text-muted)', padding:'1rem' }}>Sin ventas hoy</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gastos recientes */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">💸 Gastos recientes</span>
            <a href="/gastos" style={{ fontSize:'0.72rem', color:'var(--primary)' }}>Ver todos →</a>
          </div>
          <div className="table-responsive">
            <table className="area17-table">
              <thead><tr><th>Nombre</th><th>Categoría</th><th>Valor</th></tr></thead>
              <tbody>
                {(p.gastosRecientes || []).map(g => (
                  <tr key={g.id}>
                    <td style={{ fontSize:'0.82rem' }}>{g.nombre}</td>
                    <td><span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{g.categoria}</span></td>
                    <td style={{ color:'#ef4444', fontWeight:600 }}>{fmt(g.valor)}</td>
                  </tr>
                ))}
                {!p.gastosRecientes?.length && (
                  <tr><td colSpan={3} style={{ textAlign:'center', color:'var(--text-muted)', padding:'1rem' }}>Sin gastos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top 3 Vendedores (modal) */}
      {modalVend && (
        <div className="modal-overlay active" onClick={() => setModalVend(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🏆 Top 3 Vendedores del mes</h2>
              <button onClick={() => setModalVend(false)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:'1.2rem',color:'var(--text-muted)' }}>×</button>
            </div>
            <div className="modal-body">
              {(p.top3Vendedores || []).map((v, i) => (
                <div key={v.nombre} style={{
                  background: COLORES[i], border:`1px solid ${BORDES[i]}`,
                  borderRadius:'0.75rem', padding:'1rem 1.25rem',
                  display:'flex', alignItems:'center', gap:'1rem',
                }}>
                  <span style={{ fontSize:'1.75rem' }}>{MEDALLAS[i]}</span>
                  {p.fotosPorVendedor?.[v.vendedorId]
                    ? <img src={`/api/foto-perfil?archivo=${p.fotosPorVendedor[v.vendedorId]}`} style={{ width:40,height:40,borderRadius:'50%',objectFit:'cover' }} alt="" />
                    : <InicialAvatar nombre={v.nombre} />
                  }
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:'var(--text-primary)' }}>{v.nombre}</div>
                    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{v.cantidad} ventas</div>
                  </div>
                  <div style={{ fontWeight:800, color:'var(--primary)', fontFamily:"'Rajdhani',sans-serif", fontSize:'1.1rem' }}>{fmt(v.total)}</div>
                </div>
              ))}
              {!p.top3Vendedores?.length && <p style={{ color:'var(--text-muted)', textAlign:'center' }}>Sin datos este mes</p>}
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Productos (modal) */}
      {modalProd && (
        <div className="modal-overlay active" onClick={() => setModalProd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">⭐ Top 3 Productos del mes</h2>
              <button onClick={() => setModalProd(false)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:'1.2rem',color:'var(--text-muted)' }}>×</button>
            </div>
            <div className="modal-body">
              {(p.top3Productos || []).map((prod, i) => (
                <div key={prod.nombre} style={{
                  background: COLORES[i], border:`1px solid ${BORDES[i]}`,
                  borderRadius:'0.75rem', padding:'1rem 1.25rem',
                  display:'flex', alignItems:'center', gap:'1rem',
                }}>
                  <span style={{ fontSize:'1.75rem' }}>{MEDALLAS[i]}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:'var(--text-primary)' }}>{prod.nombre}</div>
                    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{prod.cantidad} unidades vendidas</div>
                  </div>
                  <div style={{ fontWeight:800, color:'var(--primary)', fontFamily:"'Rajdhani',sans-serif", fontSize:'1.1rem' }}>{fmt(prod.ingresos)}</div>
                </div>
              ))}
              {!p.top3Productos?.length && <p style={{ color:'var(--text-muted)', textAlign:'center' }}>Sin datos este mes</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
