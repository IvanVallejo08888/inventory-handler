'use client';

// Grid de tallas con botones (-) / (+) por cantidad — extraído de InventarioClient
// para reutilizarlo en el formulario de Inversión (Gastos).
// `precios`/`setPrecio` son opcionales: si se pasan, se muestra un input de
// "precio de compra" por talla junto a la cantidad (usado en Inventario).
export default function TallasSelector({ tallas, tallasActuales, setTalla, precios, setPrecio }) {
  if (!tallasActuales.length) return null;
  const mostrarPrecioCompra = typeof setPrecio === 'function';

  const totalUds     = tallasActuales.reduce((s, t) => s + (tallas[t] || 0), 0);
  const tallasFilled = tallasActuales.filter(t => (tallas[t] || 0) > 0).length;

  return (
    <div className="form-group">
      <label className="form-label" style={{ display:'block', marginBottom:'0.4rem' }}>
        Cantidades por talla
      </label>
      <div style={{
        borderRadius:'var(--radius)',
        border:'1px solid var(--border-color)',
        overflowX:'hidden',
        maxHeight: tallasActuales.length > 10 ? 320 : 'none',
        overflowY: tallasActuales.length > 10 ? 'auto' : 'visible',
      }}>
        {tallasActuales.map((talla, i) => {
          const cantidad = tallas[talla] || 0;
          const activa   = cantidad > 0;
          return (
            <div key={talla} style={{
              display:'flex', flexWrap:'wrap', alignItems:'center', gap:'0.5rem', rowGap:'0.4rem',
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
              <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
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
                    fontSize:'1rem', transition:'var(--transition)', flexShrink:0,
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
                    fontSize:'1rem', transition:'var(--transition)', flexShrink:0,
                  }}
                >+</button>
              </div>

              {/* Etiqueta cantidad */}
              <span style={{
                minWidth:44, textAlign:'right', marginLeft:'auto',
                fontSize:'0.72rem', fontWeight:600,
                color: activa ? 'var(--primary)' : 'var(--text-muted)',
              }}>
                {activa ? `${cantidad} ud.` : '—'}
              </span>

              {/* Precio de compra por talla (opcional) */}
              {mostrarPrecioCompra && (
                <div style={{ display:'flex', alignItems:'center', gap:'0.3rem' }}>
                  <span style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={precios?.[talla] ?? ''}
                    onChange={e => setPrecio(talla, e.target.value)}
                    placeholder="Compra"
                    title={`Precio de compra unitario — talla ${talla}`}
                    style={{
                      width:78, textAlign:'center', padding:'0.28rem 0.2rem',
                      background:'var(--bg-input)',
                      border:'1px solid var(--border-color)',
                      borderRadius:'var(--radius-xs)',
                      color:'var(--text-primary)',
                      fontSize:'0.8rem',
                    }}
                  />
                </div>
              )}
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
  );
}
