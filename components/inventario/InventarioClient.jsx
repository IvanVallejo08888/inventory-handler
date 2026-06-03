'use client';
import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader    from '@/components/ui/PageHeader';
import Alert        from '@/components/ui/Alert';
import ProductModal from '@/components/inventario/ProductModal';
import StockAlerts  from '@/components/inventario/StockAlerts';
import { fmtCompact, fmtLargo } from '@/lib/formatCompact';

const fmt = fmtLargo;

const TALLAS_ROPA   = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const TALLAS_NINO   = Array.from({ length: 17 }, (_, i) => String(i));
const TALLAS_ADULTO = Array.from({ length: 19 }, (_, i) => String(i + 24));

const COLORES = [
  'Blanco', 'Negro', 'Gris', 'Plata',
  'Rojo', 'Vinotinto',
  'Azul', 'Azul Marino', 'Celeste', 'Turquesa',
  'Verde', 'Verde Militar', 'Verde Limón',
  'Amarillo', 'Naranja',
  'Morado', 'Lila', 'Fucsia', 'Rosado',
  'Beige', 'Café', 'Marrón', 'Camel', 'Crema',
  'Dorado', 'Cobre', 'Coral', 'Mostaza', 'Salmón', 'Terracota',
  'Chocolate', 'Hueso', 'Arena', 'Perla',
  'Multicolor',
];

const FORM_EDIT_VACIO    = { nombre:'', precio:'', cantidad:'', estado:'ACTIVO' };
const FORM_AGREGAR_VACIO = { nombre:'', tipo:'', subTipo:'', precio:'', estado:'ACTIVO', tallas:{}, colores:[] };

export default function InventarioClient({
  lista, totalProductos, productosActivos,
  totalUnidades, valorInventario, buscar, filtroEstado,
  stockBajo = [],
}) {
  const router              = useRouter();
  const [, startTransition] = useTransition();

  const [msg,     setMsg]     = useState(null);
  const [msgTipo, setMsgTipo] = useState('success');
  const [cargando, setCargando] = useState(false);

  // Modal estados
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar,  setModalEditar]  = useState(false);
  const [confirmId,    setConfirmId]    = useState(null);

  // Formularios
  const [form,        setFormState]    = useState(FORM_EDIT_VACIO);
  const [formAgregar, setFormAgregar]  = useState(FORM_AGREGAR_VACIO);

  function set(k, v) { setFormState(f => ({ ...f, [k]: v })); }

  function setAgregar(k, v) {
    setFormAgregar(f => {
      const next = { ...f, [k]: v };
      if (k === 'tipo')    { next.subTipo = ''; next.tallas = {}; }
      if (k === 'subTipo') { next.tallas = {}; }
      return next;
    });
  }

  function setTalla(talla, raw) {
    const val = Math.max(0, parseInt(raw) || 0);
    setFormAgregar(f => ({ ...f, tallas: { ...f.tallas, [talla]: val } }));
  }

  function abrirEditar(p) {
    setFormState({ nombre: p.nombre, precio: p.precio, cantidad: p.cantidad, estado: p.estado, id: p.id });
    setModalEditar(true);
  }

  function cerrarAgregar() {
    setModalAgregar(false);
    setFormAgregar(FORM_AGREGAR_VACIO);
  }

  function cerrarEditar() {
    setModalEditar(false);
    setFormState(FORM_EDIT_VACIO);
  }

  // Editar / Eliminar
  async function enviar(accion) {
    setCargando(true);
    try {
      const body = accion === 'eliminar'
        ? { accion, id: confirmId }
        : { accion, ...form };
      const res  = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMsgTipo('error'); setMsg(data.error || 'Error al procesar.');
      } else {
        setMsgTipo('success');
        setMsg(accion === 'editar' ? 'Producto actualizado exitosamente.' : 'Producto eliminado exitosamente.');
        cerrarEditar();
        setConfirmId(null);
        startTransition(() => router.refresh());
      }
    } catch { setMsgTipo('error'); setMsg('Error de conexión.'); }
    finally  { setCargando(false); }
  }

  // Agregar con tallas y colores — genera una variante por cada combinación color×talla
  async function enviarTallas() {
    const { nombre, tipo, subTipo, precio, estado, tallas, colores } = formAgregar;

    if (!nombre.trim())                    { setMsgTipo('error'); setMsg('El nombre del producto es obligatorio.'); return; }
    if (!tipo)                             { setMsgTipo('error'); setMsg('Selecciona el tipo de producto.'); return; }
    if (tipo === 'CALZADO' && !subTipo)    { setMsgTipo('error'); setMsg('Indica si el calzado es para niño o adulto.'); return; }
    if (!precio || parseFloat(precio) < 0) { setMsgTipo('error'); setMsg('Ingresa un precio válido.'); return; }

    const tallasConCantidad = Object.entries(tallas).filter(([, c]) => c > 0);
    if (!tallasConCantidad.length) {
      setMsgTipo('error'); setMsg('Agrega al menos una talla con cantidad mayor a 0.'); return;
    }

    // Construir todas las variantes (color × talla) sin duplicados
    const nombreBase = nombre.trim().toUpperCase();
    const seen = new Set();
    const variantes = [];

    if (colores.length > 0) {
      for (const color of colores) {
        for (const [talla, cantidad] of tallasConCantidad) {
          const nombreFinal = `${nombreBase} COLOR ${color.toUpperCase()} TALLA ${talla}`;
          if (!seen.has(nombreFinal)) {
            seen.add(nombreFinal);
            variantes.push({ nombre: nombreFinal, cantidad });
          }
        }
      }
    } else {
      for (const [talla, cantidad] of tallasConCantidad) {
        const nombreFinal = `${nombreBase} TALLA ${talla}`;
        if (!seen.has(nombreFinal)) {
          seen.add(nombreFinal);
          variantes.push({ nombre: nombreFinal, cantidad });
        }
      }
    }

    setCargando(true);
    try {
      let exitosos = 0;
      const errores = [];
      for (const variante of variantes) {
        const res  = await fetch('/api/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion:'agregar', nombre: variante.nombre, precio:parseFloat(precio), cantidad: variante.cantidad, estado }),
        });
        const data = await res.json();
        if (!res.ok || data.error) errores.push(`${variante.nombre}: ${data.error}`);
        else exitosos++;
      }
      if (exitosos > 0) {
        setMsgTipo('success');
        setMsg(`✓ ${exitosos} producto${exitosos > 1 ? 's' : ''} agregado${exitosos > 1 ? 's' : ''} exitosamente.`);
        cerrarAgregar();
        startTransition(() => router.refresh());
      } else {
        setMsgTipo('error');
        setMsg(errores[0] || 'Error al guardar los productos.');
      }
    } catch { setMsgTipo('error'); setMsg('Error de conexión.'); }
    finally  { setCargando(false); }
  }

  return (
    <div className="content-area">
      <PageHeader title="Inventario" subtitle="Gestión de productos y stock">
        <button
          className="btn btn-primary"
          style={{ padding:'0.5rem 1.2rem', fontSize:'0.85rem' }}
          onClick={() => { setFormAgregar(FORM_AGREGAR_VACIO); setModalAgregar(true); }}
        >
          + Agregar producto
        </button>
      </PageHeader>

      {msg && <Alert tipo={msgTipo} mensaje={msg} onClose={() => setMsg(null)} />}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
        {[
          { label:'Total productos',  valor: totalProductos,       icono:'📦' },
          { label:'Activos',          valor: productosActivos,     icono:'✅' },
          { label:'Total unidades',   valor: totalUnidades,        icono:'🔢' },
          { label:'Valor inventario', valor: fmtCompact(valorInventario), icono:'💰' },
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

      {/* Alertas de stock bajo */}
      <StockAlerts productos={stockBajo} onReponer={abrirEditar} />

      {/* Búsqueda */}
      <form method="GET" className="search-bar">
        <input
          name="buscar"
          defaultValue={buscar}
          placeholder="Buscar por nombre o código..."
          style={{ flex:1, minWidth:180 }}
        />
        <select name="estado" defaultValue={filtroEstado}>
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
        <button type="submit" className="btn btn-primary" style={{ padding:'0.5rem 1rem', fontSize:'0.85rem' }}>
          Buscar
        </button>
        {(buscar || filtroEstado !== 'TODOS') && (
          <a href="/main/inventario" className="btn btn-secondary" style={{ padding:'0.5rem 1rem', fontSize:'0.85rem' }}>
            Limpiar
          </a>
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
                    <button className="action-btn" title="Editar"   onClick={() => abrirEditar(p)}>✏️</button>
                    <button className="action-btn" title="Eliminar" onClick={() => setConfirmId(p.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={7} style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>
                    No se encontraron productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Agregar ──────────────────────────────────────── */}
      <ProductModal
        isOpen={modalAgregar}
        onClose={cerrarAgregar}
        title="Agregar producto"
        footer={
          <>
            <button className="btn btn-secondary" onClick={cerrarAgregar}>Cancelar</button>
            <button className="btn btn-primary" disabled={cargando} onClick={enviarTallas}>
              {cargando ? 'Guardando...' : 'Agregar'}
            </button>
          </>
        }
      >
        <FormAgregarProducto form={formAgregar} setAgregar={setAgregar} setTalla={setTalla} />
      </ProductModal>

      {/* ── Modal Editar ───────────────────────────────────────── */}
      <ProductModal
        isOpen={modalEditar}
        onClose={cerrarEditar}
        title="Editar producto"
        footer={
          <>
            <button className="btn btn-secondary" onClick={cerrarEditar}>Cancelar</button>
            <button className="btn btn-primary" disabled={cargando} onClick={() => enviar('editar')}>
              {cargando ? 'Guardando...' : 'Actualizar'}
            </button>
          </>
        }
      >
        <FormProducto form={form} set={set} />
      </ProductModal>

      {/* ── Confirmar Eliminar ─────────────────────────────────── */}
      {confirmId !== null && (
        <ProductModal
          isOpen
          onClose={() => setConfirmId(null)}
          title="Eliminar producto"
          maxWidth={400}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConfirmId(null)}>Cancelar</button>
              <button
                className="btn"
                style={{ background:'var(--danger)', color:'#fff' }}
                disabled={cargando}
                onClick={() => enviar('eliminar')}
              >
                {cargando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </>
          }
        >
          <div style={{ textAlign:'center', padding:'0.5rem 0' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>🗑️</div>
            <p style={{ color:'var(--text-primary)', fontWeight:600, marginBottom:'0.4rem' }}>
              ¿Eliminar este producto?
            </p>
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>
              Esta acción no se puede deshacer.
            </p>
          </div>
        </ProductModal>
      )}
    </div>
  );
}

/* ── Formulario de agregar con tallas ──────────────────────────────────── */
function FormAgregarProducto({ form, setAgregar, setTalla }) {
  const { nombre, tipo, subTipo, precio, estado, tallas, colores } = form;

  let tallasActuales = [];
  if (tipo === 'ROPA')                             tallasActuales = TALLAS_ROPA;
  else if (tipo === 'CALZADO' && subTipo === 'NINO')   tallasActuales = TALLAS_NINO;
  else if (tipo === 'CALZADO' && subTipo === 'ADULTO') tallasActuales = TALLAS_ADULTO;

  const totalUds     = Object.values(tallas).reduce((s, c) => s + c, 0);
  const tallasFilled = Object.values(tallas).filter(c => c > 0).length;

  // Cuántas variantes se generarán
  const nColores = colores.length > 0 ? colores.length : 1;
  const totalVariantes = tallasFilled * nColores;

  return (
    <>
      {/* Nombre */}
      <div className="form-group">
        <label className="form-label">Nombre del producto *</label>
        <input
          className="form-control"
          value={nombre}
          onChange={e => setAgregar('nombre', e.target.value)}
          placeholder="Ej: Uniforme Pasto, Tenis Nike..."
          autoFocus
        />
      </div>

      {/* Selector de colores */}
      <ColorSelector
        coloresSeleccionados={colores}
        onChange={nuevosColores => setAgregar('colores', nuevosColores)}
      />

      {/* Tipo */}
      <div className="form-group">
        <label className="form-label">Tipo de producto *</label>
        <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.4rem', flexWrap:'wrap' }}>
          {[['ROPA','👕 Ropa'], ['CALZADO','👟 Calzado']].map(([val, lbl]) => (
            <label key={val} style={{
              display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer',
              padding:'0.55rem 1.1rem', borderRadius:'var(--radius-sm)',
              border:`1.5px solid ${tipo === val ? 'var(--primary)' : 'var(--border-color)'}`,
              background: tipo === val ? 'var(--primary-subtle)' : 'var(--bg-card)',
              color:      tipo === val ? 'var(--primary)'        : 'var(--text-secondary)',
              fontWeight: tipo === val ? 700 : 400,
              transition:'var(--transition)', flex:'1 1 110px',
            }}>
              <input
                type="radio" name="tipo" value={val} checked={tipo === val}
                onChange={() => setAgregar('tipo', val)}
                style={{ accentColor:'var(--primary)', cursor:'pointer' }}
              />
              {lbl}
            </label>
          ))}
        </div>
      </div>

      {/* Sub-tipo calzado */}
      {tipo === 'CALZADO' && (
        <div className="form-group">
          <label className="form-label">¿Para quién es? *</label>
          <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.4rem', flexWrap:'wrap' }}>
            {[['NINO','👦 Niño'], ['ADULTO','👨 Adulto']].map(([val, lbl]) => (
              <label key={val} style={{
                display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer',
                padding:'0.55rem 1.1rem', borderRadius:'var(--radius-sm)',
                border:`1.5px solid ${subTipo === val ? 'var(--primary)' : 'var(--border-color)'}`,
                background: subTipo === val ? 'var(--primary-subtle)' : 'var(--bg-card)',
                color:      subTipo === val ? 'var(--primary)'        : 'var(--text-secondary)',
                fontWeight: subTipo === val ? 700 : 400,
                transition:'var(--transition)', flex:'1 1 110px',
              }}>
                <input
                  type="radio" name="subTipo" value={val} checked={subTipo === val}
                  onChange={() => setAgregar('subTipo', val)}
                  style={{ accentColor:'var(--primary)', cursor:'pointer' }}
                />
                {lbl}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Grid de tallas */}
      {tallasActuales.length > 0 && (
        <div className="form-group">
          <label className="form-label" style={{ display:'block', marginBottom:'0.4rem' }}>
            Cantidades por talla
          </label>
          <div style={{
            borderRadius:'var(--radius)',
            border:'1px solid var(--border-color)',
            overflow:'hidden',
            maxHeight: tallasActuales.length > 10 ? 320 : 'none',
            overflowY: tallasActuales.length > 10 ? 'auto' : 'visible',
          }}>
            {tallasActuales.map((talla, i) => {
              const cantidad = tallas[talla] || 0;
              const activa   = cantidad > 0;
              return (
                <div key={talla} style={{
                  display:'flex', alignItems:'center', gap:'0.75rem',
                  padding:'0.55rem 1rem',
                  background: activa
                    ? 'linear-gradient(90deg,rgba(45,206,107,0.09) 0%,var(--bg-card) 100%)'
                    : i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-mid)',
                  borderBottom: i < tallasActuales.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  borderLeft: `3px solid ${activa ? 'var(--primary)' : 'transparent'}`,
                  transition:'background 0.2s, border-color 0.2s',
                }}>
                  {/* Talla */}
                  <span style={{
                    minWidth:36, fontWeight:700, textAlign:'center',
                    color: activa ? 'var(--primary)' : 'var(--text-secondary)',
                    fontSize:'0.9rem', fontFamily:"'Rajdhani',sans-serif", letterSpacing:1,
                  }}>
                    {talla}
                  </span>

                  {/* Controles */}
                  <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setTalla(talla, cantidad - 1)}
                      disabled={cantidad === 0}
                      style={{
                        width:30, height:30, borderRadius:'50%', padding:0,
                        border:'1px solid var(--border-color)',
                        background: cantidad === 0 ? 'transparent' : 'var(--bg-input)',
                        color: cantidad === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                        cursor: cantidad === 0 ? 'not-allowed' : 'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'1rem', transition:'var(--transition)',
                      }}
                    >−</button>

                    <input
                      type="number" min="0"
                      value={cantidad}
                      onChange={e => setTalla(talla, e.target.value)}
                      style={{
                        width:52, textAlign:'center', padding:'0.28rem 0.2rem',
                        background:'var(--bg-input)',
                        border:`1px solid ${activa ? 'var(--primary)' : 'var(--border-color)'}`,
                        borderRadius:'var(--radius-xs)',
                        color:'var(--text-primary)',
                        fontSize:'0.88rem', fontWeight:600,
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => setTalla(talla, cantidad + 1)}
                      style={{
                        width:30, height:30, borderRadius:'50%', padding:0,
                        border:'1.5px solid var(--primary)',
                        background:'var(--primary-subtle)',
                        color:'var(--primary)',
                        cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'1rem', transition:'var(--transition)',
                      }}
                    >+</button>
                  </div>

                  {/* Etiqueta cantidad */}
                  <span style={{
                    minWidth:44, textAlign:'right',
                    fontSize:'0.72rem', fontWeight:600,
                    color: activa ? 'var(--primary)' : 'var(--text-muted)',
                  }}>
                    {activa ? `${cantidad} ud.` : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Resumen tallas */}
          {tallasFilled > 0 && (
            <div style={{
              marginTop:'0.4rem', padding:'0.45rem 0.75rem',
              background:'var(--primary-subtle)',
              borderRadius:'var(--radius-sm)',
              border:'1px solid var(--primary-glow)',
              display:'flex', justifyContent:'space-between',
              fontSize:'0.78rem',
            }}>
              <span style={{ color:'var(--text-secondary)' }}>
                {tallasFilled} talla{tallasFilled > 1 ? 's' : ''} seleccionada{tallasFilled > 1 ? 's' : ''}
              </span>
              <span style={{ color:'var(--primary)', fontWeight:700 }}>
                {totalUds} unidades totales
              </span>
            </div>
          )}
        </div>
      )}

      {/* Resumen de variantes a crear */}
      {tallasFilled > 0 && colores.length > 0 && (
        <div style={{
          marginBottom:'0.75rem', padding:'0.5rem 0.85rem',
          background:'rgba(45,206,107,0.06)',
          borderRadius:'var(--radius-sm)',
          border:'1px solid var(--primary-glow)',
          fontSize:'0.78rem',
          display:'flex', alignItems:'center', gap:'0.5rem',
        }}>
          <span style={{ color:'var(--primary)', fontWeight:700, fontSize:'1rem' }}>ℹ</span>
          <span style={{ color:'var(--text-secondary)' }}>
            Se crearán{' '}
            <strong style={{ color:'var(--primary)' }}>{totalVariantes} variantes</strong>
            {' '}({colores.length} color{colores.length > 1 ? 'es' : ''} × {tallasFilled} talla{tallasFilled > 1 ? 's' : ''})
          </span>
        </div>
      )}

      {/* Precio y Estado */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Precio *</label>
          <input
            className="form-control" type="number" min="0" step="0.01"
            value={precio} onChange={e => setAgregar('precio', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Estado</label>
          <select className="form-control" value={estado} onChange={e => setAgregar('estado', e.target.value)}>
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>
      </div>
    </>
  );
}

/* ── Selector de colores con búsqueda integrada ────────────────────────── */
function ColorSelector({ coloresSeleccionados, onChange }) {
  const [busqueda, setBusqueda] = useState('');
  const [abierto,  setAbierto]  = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setAbierto(false);
        setBusqueda('');
      }
    }
    if (abierto) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [abierto]);

  const coloresFiltrados = COLORES.filter(c =>
    c.toLowerCase().includes(busqueda.toLowerCase())
  );

  function toggleColor(color) {
    if (coloresSeleccionados.includes(color)) {
      onChange(coloresSeleccionados.filter(c => c !== color));
    } else {
      onChange([...coloresSeleccionados, color]);
      setBusqueda('');
    }
  }

  return (
    <div className="form-group" ref={ref}>
      <label className="form-label">
        Color{' '}
        <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(opcional)</span>
      </label>

      {/* Chips de colores seleccionados */}
      {coloresSeleccionados.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem', marginBottom:'0.5rem' }}>
          {coloresSeleccionados.map(color => (
            <span key={color} style={{
              display:'inline-flex', alignItems:'center', gap:'0.3rem',
              padding:'0.22rem 0.5rem 0.22rem 0.7rem',
              borderRadius:20,
              background:'var(--primary-subtle)',
              border:'1px solid var(--primary-glow)',
              color:'var(--primary)',
              fontSize:'0.78rem', fontWeight:600,
            }}>
              {color}
              <button
                type="button"
                onClick={() => onChange(coloresSeleccionados.filter(c => c !== color))}
                style={{
                  background:'none', border:'none', padding:'0 2px',
                  color:'var(--primary)', cursor:'pointer',
                  fontSize:'1rem', lineHeight:1,
                  display:'flex', alignItems:'center',
                }}
              >×</button>
            </span>
          ))}
        </div>
      )}

      {/* Input de búsqueda + dropdown */}
      <div style={{ position:'relative' }}>
        <input
          className="form-control"
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          placeholder={coloresSeleccionados.length ? 'Agregar otro color...' : 'Buscar o seleccionar colores...'}
          autoComplete="off"
          style={{ paddingLeft: abierto ? '2.2rem' : undefined }}
        />
        {abierto && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setAbierto(false); setBusqueda(''); }}
            style={{
              position:'absolute', left:'0.55rem', top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', padding:'0 2px',
              color:'var(--text-muted)', cursor:'pointer',
              fontSize:'1.1rem', lineHeight:1,
              display:'flex', alignItems:'center',
              opacity:0.45,
            }}
            title="Cerrar"
          >×</button>
        )}

        {abierto && (
          <div style={{
            position:'absolute', top:'calc(100% + 4px)', left:0, right:0,
            background:'var(--bg-card)',
            border:'1px solid var(--border-color)',
            borderRadius:'var(--radius)',
            boxShadow:'0 8px 24px rgba(0,0,0,0.4)',
            maxHeight:220,
            overflowY:'auto',
            zIndex:100,
          }}>
            {coloresFiltrados.length === 0 ? (
              <div style={{
                padding:'0.75rem 1rem',
                color:'var(--text-muted)',
                fontSize:'0.85rem',
                textAlign:'center',
              }}>
                Sin resultados para &ldquo;{busqueda}&rdquo;
              </div>
            ) : coloresFiltrados.map((color, i) => {
              const sel = coloresSeleccionados.includes(color);
              return (
                <div
                  key={color}
                  onMouseDown={e => { e.preventDefault(); toggleColor(color); }}
                  style={{
                    display:'flex', alignItems:'center', gap:'0.65rem',
                    padding:'0.52rem 1rem',
                    cursor:'pointer',
                    background: sel
                      ? 'var(--primary-subtle)'
                      : i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-mid)',
                    borderLeft:`3px solid ${sel ? 'var(--primary)' : 'transparent'}`,
                    color: sel ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: sel ? 600 : 400,
                    fontSize:'0.88rem',
                    transition:'background 0.12s',
                  }}
                >
                  {/* Checkbox visual */}
                  <span style={{
                    width:15, height:15, borderRadius:3, flexShrink:0,
                    border:`1.5px solid ${sel ? 'var(--primary)' : 'var(--border-color)'}`,
                    background: sel ? 'var(--primary)' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.6rem', color:'#000', fontWeight:900,
                  }}>
                    {sel ? '✓' : ''}
                  </span>
                  {color}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumen y limpiar */}
      {coloresSeleccionados.length > 0 && (
        <div style={{ marginTop:'0.35rem', fontSize:'0.74rem', color:'var(--text-muted)' }}>
          {coloresSeleccionados.length} color{coloresSeleccionados.length > 1 ? 'es' : ''} seleccionado{coloresSeleccionados.length > 1 ? 's' : ''}
          {' · '}
          <button
            type="button"
            onClick={() => onChange([])}
            style={{
              background:'none', border:'none',
              color:'var(--danger)', cursor:'pointer',
              padding:0, fontSize:'0.74rem',
            }}
          >
            Quitar todos
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Formulario de edición — sin cambios ───────────────────────────────── */
function FormProducto({ form, set }) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">Nombre *</label>
        <input
          className="form-control" autoFocus
          value={form.nombre}
          onChange={e => set('nombre', e.target.value)}
          placeholder="Nombre del producto"
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Precio *</label>
          <input
            className="form-control" type="number" min="0" step="0.01"
            value={form.precio} onChange={e => set('precio', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Cantidad *</label>
          <input
            className="form-control" type="number" min="0"
            value={form.cantidad} onChange={e => set('cantidad', e.target.value)}
            placeholder="0"
          />
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
