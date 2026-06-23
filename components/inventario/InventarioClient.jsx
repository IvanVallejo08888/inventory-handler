'use client';
import { useState, useTransition, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader    from '@/components/ui/PageHeader';
import Alert        from '@/components/ui/Alert';
import ProductModal from '@/components/inventario/ProductModal';
import StockAlerts  from '@/components/inventario/StockAlerts';
import { TipoSelector, SubTipoSelector } from '@/components/inventario/TipoSubtipoSelector';
import CantidadSelector from '@/components/inventario/CantidadSelector';
import TallasSelector   from '@/components/inventario/TallasSelector';
import { fmtCompact, fmtLargo } from '@/lib/formatCompact';
import { tokenizar, scoreCoincidencia } from '@/lib/fuzzySearch';
import { tallasPara } from '@/lib/inventarioConstants';

const fmt = fmtLargo;

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

const FORM_EDIT_VACIO    = {
  nombre:'', precio:'', cantidad:'', estado:'ACTIVO',
  tieneVariantes:false, tipo:'', subTipo:'', tallas:{}, preciosCompra:{},
};
const FORM_AGREGAR_VACIO = {
  nombre:'', tipo:'', subTipo:'', precio:'', precioCompra:'', estado:'ACTIVO',
  tallas:{}, preciosCompra:{}, colores:[], cantidad: 0,
};

const PAGE_SIZE = 20;

export default function InventarioClient({
  totalProductos, productosActivos,
  totalUnidades, valorInventario, buscar, filtroEstado,
  stockBajo = [], todosProductos = [],
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

  // Carga progresiva de la lista
  const [visibles, setVisibles] = useState(PAGE_SIZE);

  // Búsqueda y filtro en tiempo real
  const [busqueda, setBusqueda]   = useState(buscar || '');
  const [busquedaDeb, setBusquedaDeb] = useState(buscar || '');
  const [estadoFiltro, setEstadoFiltro] = useState(filtroEstado || 'TODOS');

  // Debounce ligero para no recalcular el ranking en cada pulsación
  useEffect(() => {
    const id = setTimeout(() => setBusquedaDeb(busqueda), 150);
    return () => clearTimeout(id);
  }, [busqueda]);

  useEffect(() => { setVisibles(PAGE_SIZE); }, [busquedaDeb, estadoFiltro]);

  // Pre-indexa nombre + código de cada producto en palabras normalizadas
  const productosIndexados = useMemo(() => (
    todosProductos.map(p => ({ ...p, _palabras: [...tokenizar(p.nombre), ...tokenizar(p.codigo)] }))
  ), [todosProductos]);

  // Filtro por estado + búsqueda difusa, con ranking por relevancia
  const resultados = useMemo(() => {
    let base = productosIndexados;
    if (estadoFiltro !== 'TODOS') {
      base = base.filter(p => p.estado === estadoFiltro);
    }

    const tokens = tokenizar(busquedaDeb);
    if (!tokens.length) return base;

    const conScore = [];
    for (const p of base) {
      const score = scoreCoincidencia(p._palabras, tokens);
      if (score !== null) conScore.push({ p, score });
    }
    conScore.sort((a, b) => a.score - b.score || a.p.nombre.length - b.p.nombre.length || a.p.id - b.p.id);
    return conScore.map(({ p }) => p);
  }, [productosIndexados, estadoFiltro, busquedaDeb]);

  const listaVisible = resultados.slice(0, visibles);
  const hayMas       = visibles < resultados.length;
  const sinResultadosPorBusqueda = resultados.length === 0 && tokenizar(busqueda).length > 0;

  function set(k, v) { setFormState(f => ({ ...f, [k]: v })); }

  function setAgregar(k, v) {
    setFormAgregar(f => {
      const next = { ...f, [k]: v };
      if (k === 'tipo')    { next.subTipo = ''; next.tallas = {}; next.preciosCompra = {}; next.cantidad = 0; }
      if (k === 'subTipo') { next.tallas = {}; next.preciosCompra = {}; }
      return next;
    });
  }

  function setTalla(talla, raw) {
    const val = Math.max(0, parseInt(raw) || 0);
    setFormAgregar(f => ({ ...f, tallas: { ...f.tallas, [talla]: val } }));
  }

  function setPrecioCompraTalla(talla, raw) {
    const val = Math.max(0, parseFloat(raw) || 0);
    setFormAgregar(f => ({ ...f, preciosCompra: { ...f.preciosCompra, [talla]: val } }));
  }

  function setTallaEditar(talla, raw) {
    const val = Math.max(0, parseInt(raw) || 0);
    setFormState(f => ({ ...f, tallas: { ...f.tallas, [talla]: val } }));
  }

  function setPrecioCompraTallaEditar(talla, raw) {
    const val = Math.max(0, parseFloat(raw) || 0);
    setFormState(f => ({ ...f, preciosCompra: { ...f.preciosCompra, [talla]: val } }));
  }

  async function abrirEditar(p) {
    setFormState({
      nombre: p.nombre, precio: p.precio, cantidad: p.cantidad, estado: p.estado, id: p.id,
      tieneVariantes: false, tipo: p.tipo || '', subTipo: p.subTipo || '', tallas: {}, preciosCompra: {},
    });
    setModalEditar(true);

    try {
      const res  = await fetch(`/api/productos?id=${p.id}`);
      const data = await res.json();
      if (res.ok && data.variantes?.length) {
        const tallas = {}, preciosCompra = {};
        for (const v of data.variantes) { tallas[v.talla] = v.cantidad; preciosCompra[v.talla] = v.precioCompra; }
        setFormState(f => ({ ...f, tieneVariantes: true, tallas, preciosCompra }));
      }
    } catch { /* si falla la carga de variantes, se edita como producto simple */ }
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
      let body;
      if (accion === 'eliminar') {
        body = { accion, id: confirmId };
      } else if (form.tieneVariantes) {
        const tallasActuales = Array.from(new Set([
          ...tallasPara(form.tipo, form.subTipo),
          ...Object.keys(form.tallas),
        ]));
        const variantes = tallasActuales.map(talla => ({
          talla, cantidad: form.tallas[talla] || 0, precioCompra: form.preciosCompra[talla] || 0,
        }));
        body = { accion, id: form.id, nombre: form.nombre, precio: form.precio, estado: form.estado, variantes };
      } else {
        body = { accion, ...form };
      }
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

  // Agregar producto — para ROPA/CALZADO genera UN solo producto con sus variantes por
  // talla (en vez de un producto por talla). Si hay colores, se crea un producto por color
  // (con sus propias variantes de talla dentro). Producto General sin tallas sigue creando
  // un único producto simple (o uno por color, si aplica).
  async function enviarTallas() {
    const { nombre, tipo, subTipo, precio, precioCompra, estado, tallas, preciosCompra, colores, cantidad } = formAgregar;

    if (!nombre.trim())                    { setMsgTipo('error'); setMsg('El nombre del producto es obligatorio.'); return; }
    if (!tipo)                             { setMsgTipo('error'); setMsg('Selecciona el tipo de producto.'); return; }
    if (tipo === 'CALZADO' && !subTipo)    { setMsgTipo('error'); setMsg('Indica si el calzado es para niño o adulto.'); return; }
    if (tipo === 'ROPA'    && !subTipo)    { setMsgTipo('error'); setMsg('Indica si la ropa es para niño o adulto.'); return; }
    if (!precio || parseFloat(precio) < 0) { setMsgTipo('error'); setMsg('Ingresa un precio válido.'); return; }

    const nombreBase = nombre.trim().toUpperCase();
    const defaultCompra = parseFloat(precioCompra) || 0;
    const pedidos = []; // [{ nombre, variantes? , cantidad? }]

    if (tipo === 'GENERAL') {
      const cant = Math.max(0, parseInt(cantidad) || 0);
      if (cant <= 0) { setMsgTipo('error'); setMsg('La cantidad disponible debe ser mayor a 0.'); return; }
      if (colores.length > 0) {
        for (const color of colores) pedidos.push({ nombre: `${nombreBase} COLOR ${color.toUpperCase()}`, cantidad: cant });
      } else {
        pedidos.push({ nombre: nombreBase, cantidad: cant });
      }
    } else {
      const tallasConCantidad = Object.entries(tallas).filter(([, c]) => c > 0);
      if (!tallasConCantidad.length) {
        setMsgTipo('error'); setMsg('Agrega al menos una talla con cantidad mayor a 0.'); return;
      }
      const variantes = tallasConCantidad.map(([talla, cant]) => ({
        talla, cantidad: cant, precioCompra: preciosCompra[talla] || defaultCompra,
      }));
      if (colores.length > 0) {
        for (const color of colores) pedidos.push({ nombre: `${nombreBase} COLOR ${color.toUpperCase()}`, variantes });
      } else {
        pedidos.push({ nombre: nombreBase, variantes });
      }
    }

    setCargando(true);
    try {
      let exitosos = 0;
      const errores = [];
      for (const pedido of pedidos) {
        const res  = await fetch('/api/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accion:'agregar', nombre: pedido.nombre, precio: parseFloat(precio), estado, tipo, subTipo,
            ...(pedido.variantes ? { variantes: pedido.variantes } : { cantidad: pedido.cantidad }),
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) errores.push(`${pedido.nombre}: ${data.error}`);
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
      <div className="search-bar">
        <input
          name="buscar"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o código..."
          style={{ flex:1, minWidth:180 }}
        />
        <select name="estado" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
        {(busqueda || estadoFiltro !== 'TODOS') && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding:'0.5rem 1rem', fontSize:'0.85rem' }}
            onClick={() => { setBusqueda(''); setEstadoFiltro('TODOS'); }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Lista de productos</span>
          <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{resultados.length} registros</span>
        </div>
        <div className="table-responsive">
          <table className="area17-table">
            <thead>
              <tr>
                <th>Código</th><th>Nombre</th><th>Precio</th><th>Precio compra (unit.)</th>
                <th>Cantidad</th><th>Fecha registro</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listaVisible.map(p => (
                <tr key={p.id}>
                  <td><span className="codigo-badge">{p.codigo}</span></td>
                  <td>{p.nombre}</td>
                  <td style={{ color:'var(--primary)' }}>{fmt(p.precio)}</td>
                  <td style={{ color:'var(--text-secondary)' }}>{fmt(p.precioCompra || 0)}</td>
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
              {!resultados.length && (
                <tr>
                  <td colSpan={8} style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>
                    {sinResultadosPorBusqueda ? 'No se encontraron productos coincidentes' : 'No se encontraron productos'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {hayMas && (
          <div style={{ display:'flex', justifyContent:'center', padding:'1rem' }}>
            <button
              className="btn btn-secondary"
              style={{ padding:'0.5rem 1.2rem', fontSize:'0.85rem' }}
              onClick={() => setVisibles(v => v + PAGE_SIZE)}
            >
              Mostrar 20 más
            </button>
          </div>
        )}
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
        <FormAgregarProducto form={formAgregar} setAgregar={setAgregar} setTalla={setTalla} setPrecioCompraTalla={setPrecioCompraTalla} />
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
        <FormProducto form={form} set={set} setTallaEditar={setTallaEditar} setPrecioCompraTallaEditar={setPrecioCompraTallaEditar} />
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
function FormAgregarProducto({ form, setAgregar, setTalla, setPrecioCompraTalla }) {
  const { nombre, tipo, subTipo, precio, precioCompra, estado, tallas, preciosCompra, colores, cantidad } = form;

  const tallasActuales = tallasPara(tipo, subTipo);

  const totalUds     = Object.values(tallas).reduce((s, c) => s + c, 0);
  const tallasFilled = Object.values(tallas).filter(c => c > 0).length;

  // Cuántas variantes se generarán
  const nColores = colores.length > 0 ? colores.length : 1;
  const totalVariantes = tallasFilled * nColores;
  const cantGeneral = Math.max(0, parseInt(cantidad) || 0);

  return (
    <>
      {/* Nombre */}
      <div className="form-group">
        <label className="form-label">Nombre del producto *</label>
        <input
          className="form-control"
          value={nombre}
          onChange={e => setAgregar('nombre', e.target.value)}
          placeholder="Ej: Uniforme Pasto, Tenis Nike, Gorra Adidas..."
          autoFocus
        />
      </div>

      {/* Selector de colores */}
      <ColorSelector
        coloresSeleccionados={colores}
        onChange={nuevosColores => setAgregar('colores', nuevosColores)}
      />

      {/* Tipo */}
      <TipoSelector tipo={tipo} onChange={val => setAgregar('tipo', val)} />

      {/* Sub-tipo (ropa / calzado) */}
      {(tipo === 'ROPA' || tipo === 'CALZADO') && (
        <SubTipoSelector subTipo={subTipo} onChange={val => setAgregar('subTipo', val)} />
      )}

      {/* Cantidad única para Producto General */}
      {tipo === 'GENERAL' && (
        <CantidadSelector value={cantGeneral} onChange={v => setAgregar('cantidad', v)} />
      )}

      {/* Valor de compra por unidad — precarga el precio de compra de cada talla */}
      {(tipo === 'ROPA' || tipo === 'CALZADO') && (
        <div className="form-group">
          <label className="form-label">Valor de compra por unidad</label>
          <input
            className="form-control" type="number" min="0" step="0.01"
            value={precioCompra} onChange={e => setAgregar('precioCompra', e.target.value)}
            placeholder="0.00 (se puede ajustar por talla abajo)"
          />
        </div>
      )}

      {/* Grid de tallas */}
      <TallasSelector
        tallas={tallas} tallasActuales={tallasActuales} setTalla={setTalla}
        precios={preciosCompra} setPrecio={setPrecioCompraTalla}
      />

      {/* Resumen de variantes a crear (ropa/calzado con colores) */}
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

      {/* Resumen de variantes a crear (general con colores) */}
      {tipo === 'GENERAL' && cantGeneral > 0 && colores.length > 0 && (
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
            <strong style={{ color:'var(--primary)' }}>{colores.length} variante{colores.length > 1 ? 's' : ''}</strong>
            {' '}({colores.length} color{colores.length > 1 ? 'es' : ''} × {cantGeneral} unidad{cantGeneral > 1 ? 'es' : ''} cada una)
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

/* ── Formulario de edición — productos con variantes muestran tallas con su cantidad
   y precio de compra; productos simples muestran el campo de cantidad directo ────── */
function FormProducto({ form, set, setTallaEditar, setPrecioCompraTallaEditar }) {
  const tallasActuales = form.tieneVariantes
    ? Array.from(new Set([...tallasPara(form.tipo, form.subTipo), ...Object.keys(form.tallas)]))
    : [];
  const totalUds = Object.values(form.tallas).reduce((s, c) => s + (c || 0), 0);

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
        {!form.tieneVariantes && (
          <div className="form-group">
            <label className="form-label">Cantidad *</label>
            <input
              className="form-control" type="number" min="0"
              value={form.cantidad} onChange={e => set('cantidad', e.target.value)}
              placeholder="0"
            />
          </div>
        )}
      </div>

      {form.tieneVariantes && (
        <>
          <TallasSelector
            tallas={form.tallas} tallasActuales={tallasActuales} setTalla={setTallaEditar}
            precios={form.preciosCompra} setPrecio={setPrecioCompraTallaEditar}
          />
          <div style={{
            marginBottom:'0.75rem', padding:'0.5rem 0.85rem',
            background:'rgba(45,206,107,0.06)', borderRadius:'var(--radius-sm)',
            border:'1px solid var(--primary-glow)', fontSize:'0.78rem',
            display:'flex', justifyContent:'space-between',
          }}>
            <span style={{ color:'var(--text-secondary)' }}>Cantidad total (suma de tallas)</span>
            <span style={{ color:'var(--primary)', fontWeight:700 }}>{totalUds} unidades</span>
          </div>
        </>
      )}

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
