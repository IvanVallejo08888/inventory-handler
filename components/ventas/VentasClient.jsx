'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

const fmt = n => Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const VISIBLE_STEP = 6;

export default function VentasClient({ productos, sesion }) {
  const router = useRouter();

  const [carrito,     setCarrito]     = useState({});
  const [buscar,      setBuscar]      = useState('');
  const [chipFiltro,  setChipFiltro]  = useState('');
  const [descAbierto, setDescAbierto] = useState(false);
  const [pagoAbierto, setPagoAbierto] = useState(false);
  const [descTipo,    setDescTipo]    = useState('PORCENTAJE');
  const [descValor,   setDescValor]   = useState('');
  const [descChip,    setDescChip]    = useState(null);
  const [costoAbierto, setCostoAbierto] = useState(false);
  const [costoTipo,    setCostoTipo]    = useState('PORCENTAJE');
  const [costoValor,   setCostoValor]   = useState('');
  const [costoChip,    setCostoChip]    = useState(null);
  const [pagoTipo,    setPagoTipo]    = useState('EFECTIVO');
  const [mixtoMode,   setMixtoMode]   = useState('pct');
  const [mixtoEf,     setMixtoEf]     = useState('');
  const [mixtoTr,     setMixtoTr]     = useState('');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [cargando,    setCargando]    = useState(false);
  const [msg,         setMsg]         = useState(null);
  // Mobile / pagination
  const [visibleCount,    setVisibleCount]    = useState(VISIBLE_STEP);
  const [carritoAbierto,  setCarritoAbierto]  = useState(false);
  const [isMobile,        setIsMobile]        = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    setIsMobile(mq.matches);
    const fn = e => setIsMobile(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => { setVisibleCount(VISIBLE_STEP); }, [chipFiltro, buscar]);

  const [toastMsg, setToastMsg] = useState(null);
  function toast(msg, tipo = 'err') {
    setToastMsg({ msg, tipo });
    setTimeout(() => setToastMsg(null), 4000);
  }

  // Cálculos
  const keys     = Object.keys(carrito);
  const subtotal = keys.reduce((s, c) => s + carrito[c].precio * carrito[c].cantidad, 0);
  const totalUds = keys.reduce((s, c) => s + carrito[c].cantidad, 0);

  function calcDescuento() {
    const v = parseFloat(descValor) || 0;
    if (v <= 0) return 0;
    return descTipo === 'PORCENTAJE' ? subtotal * (v / 100) : v;
  }
  const montoDesc  = Math.min(calcDescuento(), subtotal);

  function calcCostoAdicional() {
    const v = parseFloat(costoValor) || 0;
    if (v <= 0) return 0;
    return costoTipo === 'PORCENTAJE' ? subtotal * (v / 100) : v;
  }
  const montoCosto = calcCostoAdicional();
  const totalFinal = Math.max(0, subtotal - montoDesc + montoCosto);

  function calcPago() {
    if (pagoTipo === 'EFECTIVO')      return { vEf: totalFinal, vTr: 0 };
    if (pagoTipo === 'TRANSFERENCIA') return { vEf: 0, vTr: totalFinal };
    if (pagoTipo === 'ADDI')          return { vEf: 0, vTr: 0 };
    if (mixtoMode === 'pct') {
      const pct = parseFloat(mixtoEf) || 0;
      return { vEf: totalFinal * (pct / 100), vTr: totalFinal * ((100 - pct) / 100) };
    }
    const vEf = parseFloat(mixtoEf) || 0;
    return { vEf, vTr: Math.max(0, totalFinal - vEf) };
  }

  // Carrito
  function toggleProducto(p) {
    if (p.cantidad === 0) { toast('Sin stock disponible', 'err'); return; }
    setCarrito(c => {
      const ex = c[p.codigo];
      if (ex) {
        if (ex.cantidad >= p.cantidad) { toast(`Máx. stock: ${p.cantidad}`, 'err'); return c; }
        toast(`${p.nombre}: ${ex.cantidad + 1} ud.`, 'inf');
        return { ...c, [p.codigo]: { ...ex, cantidad: ex.cantidad + 1 } };
      }
      toast(`${p.nombre} agregado ✓`, 'ok');
      return { ...c, [p.codigo]: { nombre: p.nombre, precio: p.precio, cantidad: 1, stock: p.cantidad } };
    });
  }

  function cambiarQty(cod, delta) {
    setCarrito(c => {
      const it = c[cod];
      if (!it) return c;
      const nueva = it.cantidad + delta;
      if (nueva < 1) { const n = { ...c }; delete n[cod]; return n; }
      if (nueva > it.stock) { toast(`Máx. stock: ${it.stock}`, 'err'); return c; }
      return { ...c, [cod]: { ...it, cantidad: nueva } };
    });
  }

  function quitarItem(cod)  { setCarrito(c => { const n = { ...c }; delete n[cod]; return n; }); }
  function limpiarCarrito() { setCarrito({}); }

  // Filtros
  const palabras = buscar.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const productosFiltrados = productos.filter(p => {
    if (palabras.length) {
      const txt = (p.nombre + ' ' + p.codigo).toLowerCase();
      if (!palabras.every(w => txt.includes(w))) return false;
    }
    if (chipFiltro === 'disponible') return p.cantidad > 5;
    if (chipFiltro === 'bajo')       return p.cantidad > 0 && p.cantidad <= 5;
    if (chipFiltro === 'agotado')    return p.cantidad === 0;
    return true;
  });

  const productosAMostrar = chipFiltro === ''
    ? productosFiltrados.slice(0, visibleCount)
    : productosFiltrados;
  const hayMas       = chipFiltro === '' && visibleCount < productosFiltrados.length;
  const todosVistos  = chipFiltro === '' && !hayMas && visibleCount > VISIBLE_STEP && productosFiltrados.length > 0;

  // Descuento helpers
  const chipsPct  = [5, 10, 15, 20, 25];
  const chipsFijo = [5000, 10000, 20000, 50000];
  const chipsActuales = descTipo === 'PORCENTAJE' ? chipsPct : chipsFijo;

  function onDescTipo(tipo) { setDescTipo(tipo); setDescValor(''); setDescChip(null); }
  function onDescChip(val)  { setDescChip(val); setDescValor(String(val)); }

  // Costo adicional helpers
  const chipsCostoPct = [5, 10, 15, 20, 25];
  function onCostoTipo(tipo) { setCostoTipo(tipo); setCostoValor(''); setCostoChip(null); }
  function onCostoChip(val)  { setCostoChip(val); setCostoValor(String(val)); }

  // Mixto helpers
  function onMixtoEf(val) {
    setMixtoEf(val);
    if (mixtoMode === 'pct') setMixtoTr(String(Math.max(0, 100 - (parseFloat(val)||0))));
    else setMixtoTr(String(Math.max(0, totalFinal - (parseFloat(val)||0)).toFixed(2)));
  }
  function onMixtoTr(val) {
    setMixtoTr(val);
    if (mixtoMode === 'pct') setMixtoEf(String(Math.max(0, 100 - (parseFloat(val)||0))));
    else setMixtoEf(String(Math.max(0, totalFinal - (parseFloat(val)||0)).toFixed(2)));
  }

  // Enviar venta
  async function enviarVenta() {
    if (!keys.length) return;
    if (montoDesc >= subtotal && subtotal > 0) { toast('El descuento no puede superar el total', 'err'); return; }
    const { vEf, vTr } = calcPago();
    const detalles = keys.map(cod => ({
      productoCodigo: cod, productoNombre: carrito[cod].nombre,
      cantidad: carrito[cod].cantidad, precioUnitario: carrito[cod].precio, descuentoUnidad: 0,
    }));
    setCargando(true);
    try {
      const res  = await fetch('/api/ventas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'crear', detalles,
          descuentoGlobal: parseFloat(descValor) || 0,
          descuentoGlobalTipo: descTipo,
          costoAdicionalValor: parseFloat(costoValor) || 0,
          costoAdicionalTipo: costoTipo,
          tipoPago: pagoTipo,
          valorEfectivo: vEf, valorTransferencia: vTr,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { toast(data.error || 'Error al registrar', 'err'); }
      else {
        setModalOpen(false); setCarritoAbierto(false);
        setCarrito({}); setDescValor(''); setDescChip(null);
        setCostoValor(''); setCostoChip(null);
        setMsg(`✅ Venta ${data.codigo} registrada exitosamente.`);
        router.refresh();
      }
    } catch { toast('Error de conexión', 'err'); }
    finally   { setCargando(false); }
  }

  const iconosPago = { EFECTIVO: '💵 Efectivo', TRANSFERENCIA: '🏦 Transferencia', MIXTO: '💳 Mixto', ADDI: '📠 Addi' };
  const { vEf: pvEf, vTr: pvTr } = calcPago();

  // Contenido del carrito (reutilizado en sidebar y drawer)
  function renderCarrito(enDrawer = false) {
    return (
      <>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, paddingBottom:14, borderBottom:'1px solid var(--border-color)' }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8 }}>
            🛒 Carrito
            <span style={{ background:'var(--primary)', color:'#000', fontSize:11, fontWeight:900, minWidth:22, height:22, borderRadius:11, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 5px' }}>
              {keys.length}
            </span>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {keys.length > 0 && (
              <button onClick={limpiarCarrito} className="btn btn-secondary" style={{ padding:'4px 10px', fontSize:12 }}>🗑️ Vaciar</button>
            )}
            {enDrawer && (
              <button onClick={() => setCarritoAbierto(false)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:22, lineHeight:1, padding:'0 4px' }}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Items */}
        <div style={{ minHeight:60, maxHeight: enDrawer ? 'none' : 240, overflowY: enDrawer ? 'visible' : 'auto', marginBottom:12 }}>
          {keys.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px 16px', color:'var(--text-muted)', fontSize:13 }}>
              <div style={{ fontSize:40, opacity:.3, marginBottom:8 }}>🛒</div>
              <p>El carrito está vacío.<br/>Toca un producto para agregarlo.</p>
            </div>
          ) : keys.map(cod => {
            const it  = carrito[cod];
            const sub = it.precio * it.cantidad;
            return (
              <div key={cod} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 10px', border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)', marginBottom:7, background:'var(--bg-input)' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.nombre}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>${fmt(it.precio)} c/u</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <button onClick={() => cambiarQty(cod,-1)} style={{ width:26, height:26, borderRadius:6, border:'1px solid var(--border-color)', background:'var(--bg-card)', color:'var(--text-primary)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                  <span style={{ width:32, textAlign:'center', fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>{it.cantidad}</span>
                  <button onClick={() => cambiarQty(cod, 1)} style={{ width:26, height:26, borderRadius:6, border:'1px solid var(--border-color)', background:'var(--bg-card)', color:'var(--text-primary)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                </div>
                <div style={{ fontWeight:800, color:'var(--primary)', fontSize:13, minWidth:58, textAlign:'right', fontFamily:"'Rajdhani',sans-serif" }}>${fmt(sub)}</div>
                <button onClick={() => quitarItem(cod)} style={{ background:'none', border:'none', color:'rgba(255,68,68,.6)', cursor:'pointer', fontSize:18, padding:'0 2px' }}>✕</button>
              </div>
            );
          })}
        </div>

        {/* Descuento */}
        <div style={{ border:`1px solid ${descValor && parseFloat(descValor) > 0 ? 'rgba(251,191,36,0.5)' : 'var(--border-color)'}`, borderRadius:'var(--radius)', marginBottom:14, overflow:'hidden', transition:'border-color .2s' }}>
          <div onClick={() => setDescAbierto(v => !v)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', cursor:'pointer', background:'var(--bg-input)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>
              🏷️ ¿Aplicar descuento?
              {descValor && parseFloat(descValor) > 0 && (
                <span style={{ fontSize:10, background:'rgba(251,191,36,.15)', color:'#fbbf24', border:'1px solid rgba(251,191,36,.3)', borderRadius:4, padding:'1px 7px', fontWeight:800 }}>ACTIVO</span>
              )}
            </div>
            <span style={{ transform: descAbierto ? 'rotate(180deg)' : 'none', transition:'transform .2s', fontSize:11, color:'var(--text-muted)' }}>▼</span>
          </div>
          {descAbierto && (
            <div style={{ padding:14, background:'rgba(251,191,36,.03)', borderTop:'1px solid var(--border-color)' }}>
              <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                {[['PORCENTAJE','% Porcentaje'],['FIJO','$ Valor fijo']].map(([tipo, lbl]) => (
                  <div key={tipo} onClick={() => onDescTipo(tipo)} style={{
                    flex:1, padding:'7px 0', textAlign:'center', border:'1px solid', borderRadius:'var(--radius-sm)',
                    fontSize:12, fontWeight:700, cursor:'pointer',
                    background: descTipo === tipo ? 'rgba(251,191,36,.15)' : 'var(--bg-input)',
                    borderColor: descTipo === tipo ? 'rgba(251,191,36,.5)' : 'var(--border-color)',
                    color: descTipo === tipo ? '#fbbf24' : 'var(--text-muted)',
                  }}>{lbl}</div>
                ))}
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                {chipsActuales.map(v => (
                  <span key={v} onClick={() => onDescChip(v)} style={{
                    padding:'4px 12px', border:'1px solid', borderRadius:16, fontSize:11, fontWeight:700, cursor:'pointer',
                    background: descChip === v ? 'rgba(251,191,36,.15)' : 'var(--bg-input)',
                    borderColor: descChip === v ? 'rgba(251,191,36,.5)' : 'var(--border-color)',
                    color: descChip === v ? '#fbbf24' : 'var(--text-secondary)',
                  }}>
                    {descTipo === 'PORCENTAJE' ? `${v}%` : `$${fmt(v)}`}
                  </span>
                ))}
              </div>
              <div style={{ position:'relative', marginBottom:10 }}>
                <input type="number" min="0" step="0.01" value={descValor}
                  onChange={e => { setDescChip(null); setDescValor(e.target.value); }}
                  placeholder="Valor personalizado…"
                  style={{ width:'100%', boxSizing:'border-box', padding:'9px 40px 9px 14px', background:'var(--bg-input)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)', color:'var(--text-primary)', fontSize:14, fontWeight:700, outline:'none' }}
                />
                <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:13, fontWeight:800, color:'#fbbf24', pointerEvents:'none' }}>
                  {descTipo === 'PORCENTAJE' ? '%' : '$'}
                </span>
              </div>
              {descValor && parseFloat(descValor) > 0 && subtotal > 0 && (
                <p style={{ fontSize:12, color:'#fbbf24', fontWeight:700, textAlign:'center' }}>
                  Ahorro: -${fmt(montoDesc)} {descTipo === 'PORCENTAJE' && `(${descValor}% sobre $${fmt(subtotal)})`}
                </p>
              )}
              <button onClick={() => { setDescValor(''); setDescChip(null); }} className="btn btn-secondary" style={{ width:'100%', fontSize:12, padding:6, marginTop:10 }}>
                ✕ Quitar descuento
              </button>
            </div>
          )}
        </div>

        {/* Costo adicional */}
        <div style={{ border:`1px solid ${costoValor && parseFloat(costoValor) > 0 ? 'rgba(251,146,60,0.5)' : 'var(--border-color)'}`, borderRadius:'var(--radius)', marginBottom:14, overflow:'hidden', transition:'border-color .2s' }}>
          <div onClick={() => setCostoAbierto(v => !v)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', cursor:'pointer', background:'var(--bg-input)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>
              💸 Costo adicional
              {costoValor && parseFloat(costoValor) > 0 && (
                <span style={{ fontSize:10, background:'rgba(251,146,60,.15)', color:'#fb923c', border:'1px solid rgba(251,146,60,.3)', borderRadius:4, padding:'1px 7px', fontWeight:800 }}>ACTIVO</span>
              )}
            </div>
            <span style={{ transform: costoAbierto ? 'rotate(180deg)' : 'none', transition:'transform .2s', fontSize:11, color:'var(--text-muted)' }}>▼</span>
          </div>
          {costoAbierto && (
            <div style={{ padding:14, background:'rgba(251,146,60,.03)', borderTop:'1px solid var(--border-color)' }}>
              <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                {[['PORCENTAJE','% Porcentaje'],['FIJO','$ Valor fijo']].map(([tipo, lbl]) => (
                  <div key={tipo} onClick={() => onCostoTipo(tipo)} style={{
                    flex:1, padding:'7px 0', textAlign:'center', border:'1px solid', borderRadius:'var(--radius-sm)',
                    fontSize:12, fontWeight:700, cursor:'pointer',
                    background: costoTipo === tipo ? 'rgba(251,146,60,.15)' : 'var(--bg-input)',
                    borderColor: costoTipo === tipo ? 'rgba(251,146,60,.5)' : 'var(--border-color)',
                    color: costoTipo === tipo ? '#fb923c' : 'var(--text-muted)',
                  }}>{lbl}</div>
                ))}
              </div>
              {costoTipo === 'PORCENTAJE' && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                  {chipsCostoPct.map(v => (
                    <span key={v} onClick={() => onCostoChip(v)} style={{
                      padding:'4px 12px', border:'1px solid', borderRadius:16, fontSize:11, fontWeight:700, cursor:'pointer',
                      background: costoChip === v ? 'rgba(251,146,60,.15)' : 'var(--bg-input)',
                      borderColor: costoChip === v ? 'rgba(251,146,60,.5)' : 'var(--border-color)',
                      color: costoChip === v ? '#fb923c' : 'var(--text-secondary)',
                    }}>
                      {v}%
                    </span>
                  ))}
                </div>
              )}
              <div style={{ position:'relative', marginBottom:10 }}>
                <input type="number" min="0" step="0.01" value={costoValor}
                  onChange={e => { setCostoChip(null); setCostoValor(e.target.value); }}
                  placeholder="Valor personalizado…"
                  style={{ width:'100%', boxSizing:'border-box', padding:'9px 40px 9px 14px', background:'var(--bg-input)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)', color:'var(--text-primary)', fontSize:14, fontWeight:700, outline:'none' }}
                />
                <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:13, fontWeight:800, color:'#fb923c', pointerEvents:'none' }}>
                  {costoTipo === 'PORCENTAJE' ? '%' : '$'}
                </span>
              </div>
              {costoValor && parseFloat(costoValor) > 0 && subtotal > 0 && (
                <p style={{ fontSize:12, color:'#fb923c', fontWeight:700, textAlign:'center' }}>
                  Costo adicional: +${fmt(montoCosto)} {costoTipo === 'PORCENTAJE' && `(${costoValor}% sobre $${fmt(subtotal)})`}
                </p>
              )}
              <button onClick={() => { setCostoValor(''); setCostoChip(null); }} className="btn btn-secondary" style={{ width:'100%', fontSize:12, padding:6, marginTop:10 }}>
                ✕ Quitar costo adicional
              </button>
            </div>
          )}
        </div>

        {/* Método de pago */}
        <div style={{ border:`1px solid ${pagoTipo !== 'EFECTIVO' ? 'rgba(59,130,246,0.55)' : 'var(--border-color)'}`, borderRadius:'var(--radius)', overflow:'hidden', transition:'border-color .25s', marginBottom:14 }}>
          <div onClick={() => setPagoAbierto(v => !v)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', cursor:'pointer', background:'var(--bg-card)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600 }}>
              💳 Método de pago
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:'rgba(59,130,246,.22)', color:'#60a5fa' }}>
                {iconosPago[pagoTipo]}
              </span>
            </div>
            <span style={{ transform: pagoAbierto ? 'rotate(180deg)' : 'none', transition:'transform .2s', fontSize:11, color:'var(--text-muted)' }}>▼</span>
          </div>
          {pagoAbierto && (
            <div style={{ padding:14, background:'rgba(0,0,0,.15)' }}>
              <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                {[['EFECTIVO','💵 Efectivo'],['TRANSFERENCIA','🏦 Transf.'],['MIXTO','💳 Mixto'],['ADDI','📠 Addi']].map(([tipo, lbl]) => (
                  <div key={tipo} onClick={() => setPagoTipo(tipo)} style={{
                    flex:1, padding:'7px 4px', textAlign:'center', fontSize:12, fontWeight:600,
                    borderRadius:'var(--radius-sm)', cursor:'pointer',
                    border:`1px solid ${pagoTipo === tipo ? 'var(--primary)' : 'var(--border-color)'}`,
                    background: pagoTipo === tipo ? 'var(--primary)' : 'transparent',
                    color:      pagoTipo === tipo ? '#000' : 'var(--text-muted)',
                  }}>{lbl}</div>
                ))}
              </div>
              {pagoTipo === 'MIXTO' ? (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, fontSize:11, color:'var(--text-muted)' }}>
                    <span>Dividir por:</span>
                    {[['pct','% Porcentaje'],['valor','$ Valor']].map(([m, lbl]) => (
                      <button key={m} onClick={() => { setMixtoMode(m); setMixtoEf(''); setMixtoTr(''); }} style={{
                        padding:'4px 10px', borderRadius:20, cursor:'pointer', fontSize:11, border:'1px solid',
                        background: mixtoMode === m ? 'rgba(59,130,246,.25)' : 'transparent',
                        borderColor: mixtoMode === m ? '#3b82f6' : 'var(--border-color)',
                        color: mixtoMode === m ? '#60a5fa' : 'var(--text-muted)',
                      }}>{lbl}</button>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {[
                      { label:'💵 Efectivo',      val: mixtoEf, fn: onMixtoEf },
                      { label:'🏦 Transferencia',  val: mixtoTr, fn: onMixtoTr },
                    ].map(({ label, val, fn }) => (
                      <div key={label} style={{ flex:1 }}>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:600 }}>{label}</div>
                        <div style={{ position:'relative' }}>
                          <input type="number" min="0" step="0.01" value={val}
                            onChange={e => fn(e.target.value)}
                            style={{ width:'100%', padding:'8px 28px 8px 10px', fontSize:13, background:'var(--bg-input)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)', color:'var(--text-primary)', boxSizing:'border-box' }} />
                          <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'var(--text-muted)', pointerEvents:'none' }}>{mixtoMode === 'pct' ? '%' : '$'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalFinal > 0 && (mixtoEf || mixtoTr) && (
                    <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                      💵 Ef: ${fmt(pvEf)} | 🏦 Tr: ${fmt(pvTr)}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
                  Toda la venta será registrada como <strong style={{ color:'var(--text-primary)' }}>{iconosPago[pagoTipo]}</strong>.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Totales */}
        <div style={{ borderTop:'1px solid var(--border-color)', paddingTop:12, marginBottom:14 }}>
          {[['Subtotal:', `$${fmt(subtotal)}`], ['Artículos:', `${totalUds} artículo${totalUds !== 1 ? 's' : ''}`]].map(([lbl, val]) => (
            <div key={lbl} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--text-secondary)', marginBottom:5 }}>
              <span>{lbl}</span><span>{val}</span>
            </div>
          ))}
          {montoDesc > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#fbbf24', marginBottom:5 }}>
              <span>{descTipo === 'PORCENTAJE' ? `Descuento (${descValor}%):` : 'Descuento fijo:'}</span>
              <span style={{ color:'#f87171', fontWeight:800 }}>-${fmt(montoDesc)}</span>
            </div>
          )}
          {montoCosto > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#fb923c', marginBottom:5 }}>
              <span>{costoTipo === 'PORCENTAJE' ? `Costo adicional (${costoValor}%):` : 'Costo adicional fijo:'}</span>
              <span style={{ color:'#fb923c', fontWeight:800 }}>+${fmt(montoCosto)}</span>
            </div>
          )}
          <hr style={{ border:'none', borderTop:'1px dashed rgba(255,255,255,0.1)', margin:'8px 0' }} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>TOTAL:</span>
            <span style={{ fontSize:22, fontWeight:900, color:'var(--primary)', fontFamily:"'Rajdhani',sans-serif" }}>${fmt(totalFinal)}</span>
          </div>
        </div>

        {/* Confirmar */}
        <button
          onClick={() => {
            if (!keys.length) { toast('Agrega productos al carrito primero', 'err'); return; }
            setModalOpen(true);
          }}
          className="btn btn-primary" style={{ width:'100%' }}
        >
          ✅ Confirmar Venta
        </button>
      </>
    );
  }

  return (
    <div className="content-area">
      <PageHeader title="💰 Registrar Venta" subtitle={`Vendedor: ${sesion.nombreCompleto}`}>
        <a href="/main/ventas/historial" className="btn btn-secondary" style={{ padding:'0.5rem 1rem', fontSize:'0.85rem' }}>
          📋 Historial
        </a>
      </PageHeader>

      {msg && <div className="alert alert-success" style={{ marginBottom:'1rem' }}>{msg}</div>}

      {toastMsg && (
        <div style={{
          position:'fixed', bottom:24, right:24, zIndex:9999,
          padding:'12px 20px', borderRadius:10, fontWeight:600, fontSize:14,
          background: toastMsg.tipo === 'ok' ? '#166534' : toastMsg.tipo === 'inf' ? '#1e3a5f' : '#7f1d1d',
          color:'#fff', boxShadow:'0 4px 20px rgba(0,0,0,.4)',
          border:`1px solid ${toastMsg.tipo === 'ok' ? '#22c55e' : toastMsg.tipo === 'inf' ? '#3b82f6' : '#ef4444'}`,
        }}>
          {toastMsg.msg}
        </div>
      )}

      {/* Layout principal */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 420px', gap:20, alignItems:'start' }}>

        {/* Panel productos */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding: isMobile ? 14 : 22 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:0 }}>📦 Seleccionar Productos</h2>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{productosFiltrados.length} disponibles</span>
          </div>

          {/* Búsqueda */}
          <div style={{ position:'relative', marginBottom:14 }}>
            <input value={buscar} onChange={e => setBuscar(e.target.value)}
              placeholder="Buscar por nombre o código…"
              style={{ width:'100%', padding:'10px 16px 10px 42px', background:'var(--bg-input)', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', color:'var(--text-primary)', fontSize:14, boxSizing:'border-box', outline:'none' }}
            />
            <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>🔍</span>
          </div>

          {/* Chips filtro */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            {[['','Todos'],['disponible','✅ Con stock'],['bajo','⚠️ Bajo'],['agotado','❌ Agotados']].map(([val, lbl]) => (
              <span key={val} onClick={() => setChipFiltro(val)} style={{
                padding:'5px 14px', border:'1px solid', borderRadius:20, fontSize:12, cursor:'pointer', transition:'all .2s',
                background: chipFiltro === val ? 'var(--primary)' : 'var(--bg-input)',
                color:      chipFiltro === val ? '#000' : 'var(--text-secondary)',
                borderColor: chipFiltro === val ? 'var(--primary)' : 'var(--border-color)',
                fontWeight: chipFiltro === val ? 700 : 400,
              }}>{lbl}</span>
            ))}
          </div>

          {/* Grid de productos */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',
            gap:10,
            maxHeight: isMobile ? 'none' : 520,
            overflowY: isMobile ? 'visible' : 'auto',
          }}>
            {productosAMostrar.map(p => {
              const enCarrito = !!carrito[p.codigo];
              const sinStock  = p.cantidad === 0;
              return (
                <div key={p.codigo} onClick={() => toggleProducto(p)} style={{
                  border:`2px solid ${enCarrito ? 'var(--primary)' : 'var(--border-color)'}`,
                  borderRadius:'var(--radius)', padding:'12px 10px', cursor: sinStock ? 'not-allowed' : 'pointer',
                  background: enCarrito ? 'rgba(45,206,107,0.08)' : 'var(--bg-input)',
                  opacity: sinStock ? 0.45 : 1, userSelect:'none', position:'relative', transition:'all .2s',
                }}>
                  {enCarrito && (
                    <span style={{ position:'absolute', top:8, right:10, fontSize:14, fontWeight:900, color:'var(--primary)' }}>✓</span>
                  )}
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase' }}>{p.codigo}</div>
                  <div style={{ fontWeight:700, fontSize:13, margin:'5px 0 4px', color:'var(--text-primary)', lineHeight:1.3 }}>{p.nombre}</div>
                  <div style={{ color:'var(--primary)', fontWeight:800, fontSize:15, fontFamily:"'Rajdhani',sans-serif" }}>${fmt(p.precio)}</div>
                  <div style={{ fontSize:11, marginTop:4, color: p.cantidad <= 5 && p.cantidad > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    📦 Stock: {p.cantidad}
                  </div>
                </div>
              );
            })}
            {productosFiltrados.length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:13 }}>
                Sin productos para mostrar
              </div>
            )}
          </div>

          {/* Ver más */}
          {hayMas && (
            <div style={{ textAlign:'center', marginTop:16 }}>
              <button
                onClick={() => setVisibleCount(v => v + VISIBLE_STEP)}
                className="btn btn-secondary"
                style={{ fontSize:13, padding:'8px 24px' }}
              >
                Ver más productos ({productosFiltrados.length - visibleCount} restantes)
              </button>
            </div>
          )}
          {todosVistos && (
            <p style={{ textAlign:'center', color:'var(--primary)', fontSize:12, fontWeight:600, marginTop:14 }}>
              ✓ Todos los productos cargados
            </p>
          )}
        </div>

        {/* Panel carrito — solo desktop */}
        {!isMobile && (
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:20, position:'sticky', top:20 }}>
            {renderCarrito(false)}
          </div>
        )}
      </div>

      {/* Botón flotante carrito — solo mobile con items */}
      {isMobile && keys.length > 0 && (
        <button
          onClick={() => setCarritoAbierto(true)}
          style={{
            position:'fixed', bottom:80, right:16, zIndex:500,
            background:'var(--primary)', color:'#000',
            border:'none', borderRadius:50,
            padding:'13px 20px', fontWeight:800, fontSize:15, cursor:'pointer',
            boxShadow:'0 4px 24px rgba(45,206,107,0.45)',
            display:'flex', alignItems:'center', gap:8,
          }}
        >
          🛒 Carrito
          <span style={{ background:'#000', color:'var(--primary)', borderRadius:50, minWidth:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, padding:'0 6px' }}>
            {keys.length}
          </span>
        </button>
      )}

      {/* Bottom sheet carrito — mobile */}
      {isMobile && carritoAbierto && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', zIndex:1500 }}
          onClick={() => setCarritoAbierto(false)}
        >
          <div
            style={{
              position:'absolute', bottom:0, left:0, right:0,
              background:'var(--bg-card)',
              borderRadius:'20px 20px 0 0',
              maxHeight:'88vh', overflowY:'auto',
              boxShadow:'0 -8px 40px rgba(0,0,0,.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ textAlign:'center', padding:'12px 0 4px' }}>
              <div style={{ width:40, height:4, background:'var(--border-color)', borderRadius:2, margin:'0 auto' }} />
            </div>
            <div style={{ padding:'8px 16px 100px' }}>
              {renderCarrito(true)}
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación */}
      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:28, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,.8)' }}>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:16, color:'var(--text-primary)' }}>✅ Confirmar Venta</div>
            <p style={{ color:'var(--text-secondary)', fontSize:13, marginBottom:12 }}>Revisa el resumen antes de registrar:</p>

            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr>{['Producto','Cant.','P.Unit.','Subtotal'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', borderBottom:'1px solid var(--border-color)', color:'var(--text-muted)', fontSize:11, textTransform:'uppercase', textAlign: h === 'Producto' ? 'left' : 'right' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {keys.map(cod => {
                    const it = carrito[cod];
                    return (
                      <tr key={cod}>
                        <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(45,206,107,.04)', color:'var(--text-primary)' }}>{it.nombre}</td>
                        <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(45,206,107,.04)', textAlign:'right' }}>{it.cantidad}</td>
                        <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(45,206,107,.04)', textAlign:'right' }}>${fmt(it.precio)}</td>
                        <td style={{ padding:'9px 10px', borderBottom:'1px solid rgba(45,206,107,.04)', textAlign:'right', fontWeight:700, color:'var(--primary)' }}>${fmt(it.precio * it.cantidad)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop:12, padding:'12px 14px', background:'rgba(45,206,107,0.04)', borderRadius:'var(--radius-sm)', border:'1px solid rgba(45,206,107,0.1)' }}>
              {[['Subtotal', `$${fmt(subtotal)}`]].concat(
                montoDesc > 0 ? [[descTipo === 'PORCENTAJE' ? `Descuento (${descValor}%)` : 'Descuento fijo', `-$${fmt(montoDesc)}`]] : []
              ).concat(
                montoCosto > 0 ? [[costoTipo === 'PORCENTAJE' ? `Costo adicional (${costoValor}%)` : 'Costo adicional fijo', `+$${fmt(montoCosto)}`]] : []
              ).map(([l, v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--text-secondary)', marginBottom:5 }}>
                  <span>{l}</span><span style={{ color: l.startsWith('Desc') ? '#f87171' : l.startsWith('Costo') ? '#fb923c' : undefined }}>{v}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:20, fontWeight:900, color:'var(--primary)', fontFamily:"'Rajdhani',sans-serif", marginTop:8, paddingTop:8, borderTop:'1px solid var(--border-color)' }}>
                <span>TOTAL A PAGAR</span><span>${fmt(totalFinal)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-muted)', marginTop:8, paddingTop:8, borderTop:'1px solid var(--border-color)' }}>
                <span>{iconosPago[pagoTipo]}</span>
                <span style={{ color:'#4ade80' }}>✓</span>
              </div>
              {pagoTipo === 'MIXTO' && (
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
                  💵 Efectivo: ${fmt(pvEf)} &nbsp;|&nbsp; 🏦 Transf: ${fmt(pvTr)}
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={cargando} onClick={enviarVenta}>
                {cargando ? '⏳ Registrando…' : '🚀 Registrar Ahora'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
