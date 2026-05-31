'use client';
import { useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';

const fmt = n => Number(n||0).toLocaleString('es-CO', { minimumFractionDigits:0, maximumFractionDigits:0 });

/* ── KPI card ──────────────────────────────────────────────────────────── */
function KpiCard({ icon, valor, label, tag, tipo, clickable, children }) {
  const [open, setOpen] = useState(false);
  const colores = {
    ventas:   { before:'linear-gradient(90deg,#3b82f6,#60a5fa)', val:'#60a5fa' },
    ingresos: { before:'linear-gradient(90deg,#10b981,#34d399)', val:'#34d399' },
    gastos:   { before:'linear-gradient(90deg,#ef4444,#f87171)', val:'#f87171' },
    utilidad: { before:'linear-gradient(90deg,#8b5cf6,#a78bfa)', val:'#a78bfa' },
    util_neg: { before:'linear-gradient(90deg,#ef4444,#f87171)', val:'#f87171' },
  };
  const c = colores[tipo] || colores.ventas;
  return (
    <div onClick={clickable ? () => setOpen(v => !v) : undefined} style={{
      background:'var(--bg-card)', border:'1px solid var(--border-color)',
      borderRadius:'var(--radius-lg)', padding:'18px 16px',
      position:'relative', overflow:'hidden', transition:'transform .2s, box-shadow .2s',
      cursor: clickable ? 'pointer' : 'default',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background: c.before }} />
      {tag && (
        <span style={{ position:'absolute', top:14, right:14, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10,
          background:'rgba(57,255,20,.1)', color:'var(--primary)', border:'1px solid rgba(57,255,20,.25)' }}>{tag}</span>
      )}
      <div style={{ fontSize:22, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:22, fontWeight:900, fontFamily:"'Rajdhani',sans-serif", lineHeight:1, marginBottom:5, color: c.val }}>{valor}</div>
      <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.5px', fontWeight:700 }}>{label}</div>
      {clickable && <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:4 }}>👆 Ver desglose</div>}
      {clickable && open && children}
    </div>
  );
}

/* ── Gráfica con Chart.js ──────────────────────────────────────────────── */
function ChartCard({ title, tag, height = 220, children }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:20, transition:'border-color .2s' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:12, borderBottom:'1px solid var(--border-color)' }}>
        <div style={{ fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
          {title}
          {tag && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:'var(--primary-subtle)', color:'var(--primary)', border:'1px solid rgba(57,255,20,.25)' }}>{tag}</span>}
        </div>
      </div>
      <div style={{ position:'relative', height }}>{children}</div>
    </div>
  );
}

function useChart(canvasRef, config) {
  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return;
    let chart;
    import('chart.js/auto').then(({ default: Chart }) => {
      Chart.defaults.color        = '#7ab87a';
      Chart.defaults.borderColor  = '#1a3a1a';
      Chart.defaults.font.family  = "'DM Sans','Segoe UI',system-ui";
      chart = new Chart(canvasRef.current, config);
    });
    return () => chart?.destroy();
  }, []);
}

const TOOLTIP = {
  backgroundColor:'#0a120a', borderColor:'#1a3a1a', borderWidth:1,
};

export default function ReportesClient({
  reporteHoy, reporteMes,
  ventasPorDia, productosMasVendidos, gastosPorCategoria,
  efectivoHoy, transferenciaHoy, efectivoMes, transferenciaMes,
}) {
  // ── Chart refs ────────────────────────────────────────────────────────
  const refVentasDia   = useRef(null);
  const refProductos   = useRef(null);
  const refGastos      = useRef(null);
  const refBalance     = useRef(null);

  // ── Filtro fecha ──────────────────────────────────────────────────────
  const [fDesde,    setFDesde]    = useState('');
  const [fHasta,    setFHasta]    = useState('');
  const [fResult,   setFResult]   = useState(null);
  const [fLoading,  setFLoading]  = useState(false);
  const [toastMsg,  setToastMsg]  = useState(null);
  const [toastTipo, setToastTipo] = useState('');

  // ── Chart 1: Ventas por día ───────────────────────────────────────────
  const diasLabels = Object.keys(ventasPorDia || {});
  const diasData   = Object.values(ventasPorDia || {});
  useChart(refVentasDia, {
    type:'bar',
    data:{ labels: diasLabels.length ? diasLabels : ['Sin datos'], datasets:[{
      label:'Ingresos ($)', data: diasData.length ? diasData : [0],
      backgroundColor:'rgba(57,255,20,0.15)', borderColor:'#39ff14',
      borderWidth:2, borderRadius:6, borderSkipped:false,
    }]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ ...TOOLTIP, callbacks:{ label:c=>' $'+Number(c.raw).toLocaleString('es-CO') }}},
      scales:{ x:{grid:{color:'rgba(57,255,20,0.05)'}}, y:{grid:{color:'rgba(57,255,20,0.05)'}, ticks:{callback:v=>'$'+Number(v).toLocaleString('es-CO')}}}},
  });

  // ── Chart 2: Top productos ────────────────────────────────────────────
  const prodLabels = Object.keys(productosMasVendidos || {});
  const prodData   = Object.values(productosMasVendidos || {});
  useChart(refProductos, {
    type:'bar',
    data:{ labels: prodLabels.length ? prodLabels : ['Sin datos'], datasets:[{
      label:'Unidades', data: prodData.length ? prodData : [0],
      backgroundColor:['rgba(57,255,20,0.7)','rgba(59,130,246,0.7)','rgba(245,158,11,0.7)','rgba(139,92,246,0.7)','rgba(239,68,68,0.7)'],
      borderWidth:1, borderRadius:4,
    }]},
    options:{ responsive:true, maintainAspectRatio:false, indexAxis:'y', plugins:{ legend:{display:false}, tooltip:{ ...TOOLTIP, callbacks:{ label:c=>' '+c.raw+' unidades' }}},
      scales:{ x:{grid:{color:'rgba(57,255,20,0.05)'}}, y:{grid:{display:false}, ticks:{font:{size:11}}}}},
  });

  // ── Chart 3: Gastos por categoría (dona) ──────────────────────────────
  const gasLabels = Object.keys(gastosPorCategoria || {});
  const gasData   = Object.values(gastosPorCategoria || {});
  const gasTotal  = gasData.reduce((s, v) => s + v, 0);
  useChart(refGastos, gasTotal > 0 ? {
    type:'doughnut',
    data:{ labels: gasLabels, datasets:[{
      data: gasData,
      backgroundColor:['rgba(59,130,246,0.75)','rgba(139,92,246,0.75)','rgba(245,158,11,0.75)','rgba(239,68,68,0.75)'],
      borderColor:'#0a120a', borderWidth:2, hoverOffset:8,
    }]},
    options:{ responsive:true, maintainAspectRatio:false, cutout:'65%',
      plugins:{ legend:{position:'bottom', labels:{font:{size:11}, padding:12, boxWidth:12}},
        tooltip:{ ...TOOLTIP, callbacks:{ label:c=>' $'+Number(c.raw).toLocaleString('es-CO') }}}},
  } : null);

  // ── Chart 4: Balance mes ─────────────────────────────────────────────
  const utilPos = reporteMes.utilidad >= 0;
  useChart(refBalance, {
    type:'bar',
    data:{ labels:['Ingresos','Gastos','Utilidad'], datasets:[{
      label:'Mes actual ($)',
      data:[reporteMes.totalIngresos, reporteMes.totalGastos, reporteMes.utilidad],
      backgroundColor:['rgba(16,185,129,0.75)','rgba(239,68,68,0.75)', utilPos?'rgba(139,92,246,0.75)':'rgba(245,158,11,0.75)'],
      borderColor:['#10b981','#ef4444', utilPos?'#8b5cf6':'#f59e0b'],
      borderWidth:1, borderRadius:6,
    }]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ ...TOOLTIP, callbacks:{ label:c=>' $'+Number(c.raw).toLocaleString('es-CO') }}},
      scales:{ x:{grid:{color:'rgba(57,255,20,0.05)'}}, y:{grid:{color:'rgba(57,255,20,0.05)'}, ticks:{callback:v=>'$'+Number(v).toLocaleString('es-CO')}}}},
  });

  // ── Filtro por fecha ──────────────────────────────────────────────────
  async function buscarPorFecha() {
    if (!fDesde && !fHasta) { alert('Selecciona al menos una fecha.'); return; }
    setFLoading(true); setFResult(null);
    try {
      const res  = await fetch('/api/ventas?accion=historial&periodo=TODO');
      const data = await res.json();
      let lista  = data.ventas || [];
      if (fDesde) lista = lista.filter(v => v.fecha >= fDesde);
      if (fHasta) lista = lista.filter(v => v.fecha <= fHasta);
      setFResult(lista);
    } catch { alert('Error al cargar datos.'); }
    finally   { setFLoading(false); }
  }

  // ── Exportar ──────────────────────────────────────────────────────────
  function mostrarToast(msg, tipo) {
    setToastMsg(msg); setToastTipo(tipo);
    setTimeout(() => setToastMsg(null), 4200);
  }

  async function exportar(tipo) {
    mostrarToast('Generando Excel…', '');
    try {
      const res = await fetch(`/api/reportes?accion=exportar&tipo=${tipo}`);
      if (!res.ok) { const e = await res.json(); mostrarToast(e.error || 'Error al generar', 'error'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `Area17_${tipo}_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      mostrarToast('✅ Excel descargado exitosamente', 'ok');
    } catch { mostrarToast('Error al descargar', 'error'); }
  }

  // ── Render ────────────────────────────────────────────────────────────
  const exports = [
    { tipo:'inventario', icon:'📦', label:'Inventario',       desc:'Productos y stock actual',          clase:'inv' },
    { tipo:'ventas',     icon:'💰', label:'Ventas',           desc:'Historial completo por mes',         clase:'vtas' },
    { tipo:'gastos',     icon:'💼', label:'Gastos',           desc:'Todos los gastos registrados',       clase:'gtos' },
    { tipo:'usuarios',   icon:'👥', label:'Usuarios',         desc:'Lista de usuarios del sistema',      clase:'usrs' },
    { tipo:'completo',   icon:'📊', label:'Reporte del Mes',  desc:'Ventas · Gastos · Inventario · Top', clase:'completo', gold:true },
    { tipo:'maestro',    icon:'😶‍🌫️', label:'Todo',           desc:'11 hojas: histórico completo del sistema', clase:'maestro', gold:true },
  ];

  const fTotal  = (fResult || []).filter(v => v.estado === 'COMPLETADA').reduce((s, v) => s + v.total, 0);
  const fCount  = (fResult || []).filter(v => v.estado === 'COMPLETADA').length;

  return (
    <div className="content-area">
      <PageHeader title="📊 Reportes y Estadísticas" subtitle="Métricas, gráficas, análisis y exportación del sistema" />

      {/* Aviso datos parciales */}
      <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.25)', borderLeft:'3px solid #f59e0b', color:'#fbbf24', padding:'10px 16px', borderRadius:'var(--radius)', fontSize:12, fontWeight:600, marginBottom:20 }}>
        ⚠️ Las estadísticas mensuales muestran datos parciales hasta el día de hoy.
      </div>

      {/* ── KPIs HOY ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:12, borderBottom:'1px solid var(--border-color)' }}>
          <h2 style={{ fontSize:15, fontWeight:700, margin:0 }}>📅 Resumen de Hoy</h2>
          <div style={{ flex:1, height:1, background:'var(--border-color)' }} />
          <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:12, background:'rgba(57,255,20,.08)', color:'var(--primary)', border:'1px solid rgba(57,255,20,.25)' }}>{reporteHoy.fechaInicio}</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14 }}>
          <KpiCard icon="🛒" valor={reporteHoy.totalVentas} label="Ventas completadas" tag="HOY" tipo="ventas" />
          <KpiCard icon="💰" valor={`$${fmt(reporteHoy.totalIngresos)}`} label="Ingresos brutos" tag="HOY" tipo="ingresos" clickable>
            <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid rgba(255,255,255,.1)' }}>
              {[['💵 Efectivo','#4ade80',efectivoHoy],['🏦 Transferencia','#60a5fa',transferenciaHoy]].map(([l,c,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:12 }}>
                  <span style={{ color:'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontWeight:700, color:c }}>${fmt(v)}</span>
                </div>
              ))}
            </div>
          </KpiCard>
          <KpiCard icon="💸" valor={`$${fmt(reporteHoy.totalGastos)}`} label="Gastos del día"   tag="HOY" tipo="gastos" />
          <KpiCard icon="📈" valor={`$${fmt(reporteHoy.utilidad)}`}    label="Utilidad neta"   tag="HOY" tipo={reporteHoy.utilidad < 0 ? 'util_neg' : 'utilidad'} />
        </div>
      </div>

      {/* ── KPIs MES ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:12, borderBottom:'1px solid var(--border-color)' }}>
          <h2 style={{ fontSize:15, fontWeight:700, margin:0 }}>🗓️ Resumen del Mes</h2>
          <div style={{ flex:1, height:1, background:'var(--border-color)' }} />
          <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:12, background:'rgba(59,130,246,.08)', color:'#60a5fa', border:'1px solid rgba(59,130,246,.25)' }}>{reporteMes.fechaInicio} al {reporteMes.fechaFin}</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:16 }}>
          <KpiCard icon="📦" valor={reporteMes.totalVentas}             label="Total ventas"    tag="MES" tipo="ventas" />
          <KpiCard icon="💵" valor={`$${fmt(reporteMes.totalIngresos)}`} label="Ingresos totales" tag="MES" tipo="ingresos" clickable>
            <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid rgba(255,255,255,.1)' }}>
              {[['💵 Efectivo','#4ade80',efectivoMes],['🏦 Transferencia','#60a5fa',transferenciaMes]].map(([l,c,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:12 }}>
                  <span style={{ color:'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontWeight:700, color:c }}>${fmt(v)}</span>
                </div>
              ))}
            </div>
          </KpiCard>
          <KpiCard icon="💼" valor={`$${fmt(reporteMes.totalGastos)}`}  label="Gastos totales"  tag="MES" tipo="gastos" />
          <KpiCard icon="✅" valor={`$${fmt(reporteMes.utilidad)}`}     label="Utilidad neta"   tag="MES" tipo={reporteMes.utilidad < 0 ? 'util_neg' : 'utilidad'} />
        </div>

        {/* Top performers */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {[
            { cls:'gold',  label:'⭐ Vendedor del mes',        val: reporteMes.vendedorTop,          sub: `${reporteMes.ventasVendedorTop} ventas` },
            { cls:'green', label:'🏆 Producto más vendido',    val: reporteMes.productoMasVendido,   sub: `${reporteMes.cantidadProductoTop} unidades` },
            { cls:'blue',  label:'📦 Total ventas del mes',    val: reporteMes.totalVentas,          sub: 'ventas completadas' },
          ].map(t => {
            const col = { gold:'#fbbf24', green:'var(--primary)', blue:'#60a5fa' }[t.cls];
            return (
              <div key={t.label} style={{ flex:1, minWidth:180, background:'var(--bg-card)', borderRadius:'var(--radius)', padding:'14px 16px', borderLeft:`3px solid ${col}`, border:`1px solid rgba(0,0,0,0)`, borderLeftWidth:3, borderLeftColor:col, borderTopWidth:1, borderTopColor:'var(--border-color)', borderRightWidth:1, borderRightColor:'var(--border-color)', borderBottomWidth:1, borderBottomColor:'var(--border-color)' }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.5px', textTransform:'uppercase', marginBottom:6, color:col }}>{t.label}</div>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>{t.val}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{t.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Gráficas ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:12, borderBottom:'1px solid var(--border-color)' }}>
          <h2 style={{ fontSize:15, fontWeight:700, margin:0 }}>📈 Análisis Visual</h2>
          <div style={{ flex:1, height:1, background:'var(--border-color)' }} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          {/* Ventas por día — ancho completo */}
          <div style={{ gridColumn:'1 / -1' }}>
            <ChartCard title="📊 Ventas por Día — Últimos 7 días" tag="BARRAS" height={240}>
              <canvas ref={refVentasDia} />
            </ChartCard>
          </div>
          <ChartCard title="🛍️ Top 5 Productos" tag="MES">
            {prodLabels.length === 0
              ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted)', opacity:.5 }}>Sin datos este mes</div>
              : <canvas ref={refProductos} />
            }
          </ChartCard>
          <ChartCard title="💼 Gastos por Categoría" tag="DONA">
            {gasTotal === 0
              ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted)', opacity:.5 }}>Sin gastos este mes</div>
              : <canvas ref={refGastos} />
            }
          </ChartCard>
          {/* Balance — ancho completo */}
          <div style={{ gridColumn:'1 / -1' }}>
            <ChartCard title="⚖️ Ingresos vs Gastos vs Utilidad" tag="MES ACTUAL" height={200}>
              <canvas ref={refBalance} />
            </ChartCard>
          </div>
        </div>
      </div>

      {/* ── Filtro por fecha ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:12, borderBottom:'1px solid var(--border-color)' }}>
          <h2 style={{ fontSize:15, fontWeight:700, margin:0 }}>🔍 Filtro por Fecha</h2>
          <div style={{ flex:1, height:1, background:'var(--border-color)' }} />
        </div>
        <div className="panel">
          <div className="panel-body">
            <p style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Buscar ventas en un período específico</p>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              {[['Desde:', fDesde, setFDesde],['Hasta:', fHasta, setFHasta]].map(([lbl, val, set]) => (
                <div key={lbl} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <label style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>{lbl}</label>
                  <input type="date" value={val} onChange={e => set(e.target.value)}
                    style={{ background:'var(--bg-input)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)', color:'var(--text-primary)', padding:'8px 12px', fontSize:13, outline:'none' }} />
                </div>
              ))}
              <button className="btn btn-primary" style={{ padding:'8px 16px', fontSize:13 }} onClick={buscarPorFecha}>🔍 Buscar</button>
              <button className="btn btn-secondary" style={{ padding:'8px 16px', fontSize:13 }} onClick={() => { setFDesde(''); setFHasta(''); setFResult(null); }}>✕ Limpiar</button>
            </div>

            {fLoading && <div style={{ textAlign:'center', padding:20, color:'var(--text-muted)' }}>⏳ Cargando datos…</div>}

            {fResult && !fLoading && (
              <div style={{ marginTop:16, borderTop:'1px solid var(--border-color)', paddingTop:14 }}>
                <div className="table-responsive">
                  <table className="area17-table">
                    <thead><tr><th>Código</th><th>Fecha</th><th>Vendedor</th><th style={{ textAlign:'right' }}>Total</th><th style={{ textAlign:'center' }}>Estado</th></tr></thead>
                    <tbody>
                      {fResult.filter(v => v.estado === 'COMPLETADA').map(v => (
                        <tr key={v.id}>
                          <td><span className="codigo-badge">{v.codigo}</span></td>
                          <td style={{ fontSize:'0.82rem', color:'var(--text-secondary)' }}>📅 {v.fecha}</td>
                          <td>👤 {v.vendedorNombre}</td>
                          <td style={{ textAlign:'right', fontWeight:700, color:'var(--primary)' }}>${fmt(v.total)}</td>
                          <td style={{ textAlign:'center' }}><span style={{ fontSize:11, color:'#34d399', fontWeight:700 }}>● COMPLETADA</span></td>
                        </tr>
                      ))}
                      {fCount === 0 && <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>📭 Sin ventas en este rango de fechas</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 10px', borderTop:'1px solid var(--border-color)', marginTop:10, fontWeight:700, fontSize:14 }}>
                  <span style={{ fontSize:13, color:'var(--text-muted)' }}>{fCount} ventas encontradas</span>
                  <span style={{ color:'var(--primary)', fontSize:18, fontFamily:"'Rajdhani',sans-serif" }}>${fmt(fTotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Exportar ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:12, borderBottom:'1px solid var(--border-color)' }}>
          <h2 style={{ fontSize:15, fontWeight:700, margin:0 }}>📥 Exportar Datos</h2>
          <div style={{ flex:1, height:1, background:'var(--border-color)' }} />
          <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:12, background:'rgba(57,255,20,.08)', color:'var(--primary)', border:'1px solid rgba(57,255,20,.25)' }}>Excel</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:14 }}>
          {exports.map(e => (
            <button key={e.tipo} onClick={() => exportar(e.tipo)} style={{
              background:'var(--bg-card)', border:'1px solid var(--border-color)',
              borderRadius:'var(--radius-lg)', padding:'22px 18px', textAlign:'center',
              color:'var(--text-primary)', cursor:'pointer', transition:'all .2s',
              display:'flex', flexDirection:'column', alignItems:'center', gap:10,
              position:'relative', overflow:'hidden',
            }}
            onMouseEnter={el => { el.currentTarget.style.borderColor='rgba(57,255,20,.3)'; el.currentTarget.style.transform='translateY(-4px)'; el.currentTarget.style.boxShadow='0 10px 30px rgba(0,0,0,.3)'; }}
            onMouseLeave={el => { el.currentTarget.style.borderColor='var(--border-color)'; el.currentTarget.style.transform='none'; el.currentTarget.style.boxShadow='none'; }}
            >
              <div style={{ fontSize:34 }}>{e.icon}</div>
              <div style={{ fontWeight:800, fontSize:14 }}>{e.label}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>{e.desc}</div>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10,
                background: e.gold ? 'rgba(251,191,36,.1)' : 'rgba(57,255,20,.08)',
                color:      e.gold ? '#fbbf24'             : 'var(--primary)',
                border:`1px solid ${e.gold ? 'rgba(251,191,36,.3)' : 'rgba(57,255,20,.25)'}`,
              }}>{e.gold ? (e.tipo==='maestro' ? 'HISTÓRICO · XLSX' : 'MES ACTUAL · XLSX') : 'XLSX'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toast notificación */}
      {toastMsg && (
        <div style={{
          position:'fixed', bottom:24, right:24, zIndex:9999,
          minWidth:280, padding:'14px 18px', borderRadius:12,
          background:'var(--bg-card)',
          border:`1px solid ${toastTipo==='ok' ? 'rgba(57,255,20,.45)' : toastTipo==='error' ? 'rgba(239,68,68,.5)' : 'var(--border-glow)'}`,
          boxShadow:'0 12px 40px rgba(0,0,0,.5)', color:'var(--text-primary)',
          display:'flex', alignItems:'center', gap:12, fontSize:14, fontWeight:600,
        }}>
          <span style={{ fontSize:20 }}>{toastTipo==='ok' ? '✅' : toastTipo==='error' ? '⚠️' : '⏳'}</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
