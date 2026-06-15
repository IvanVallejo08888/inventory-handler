'use client';

// Selector de cantidad con botones (-) / (+) — extraído de InventarioClient
// (usado para productos tipo "General" y reutilizado en el formulario de Inversión).
export default function CantidadSelector({ value, onChange, label = 'Cantidad Disponible *', resumenLabel = 'Cantidad a registrar' }) {
  const cant = Math.max(0, parseInt(value) || 0);

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{
        borderRadius:'var(--radius)',
        border:'1px solid var(--border-color)',
        overflow:'hidden',
      }}>
        <div style={{
          display:'flex', alignItems:'center', gap:'0.75rem',
          padding:'0.65rem 1rem',
          background: cant > 0
            ? 'linear-gradient(90deg,rgba(45,206,107,0.09) 0%,var(--bg-card) 100%)'
            : 'var(--bg-card)',
          borderLeft:`3px solid ${cant > 0 ? 'var(--primary)' : 'transparent'}`,
          transition:'background 0.2s, border-color 0.2s',
        }}>
          <button
            type="button"
            onClick={() => onChange(cant - 1)}
            disabled={cant === 0}
            style={{
              width:30, height:30, borderRadius:'50%', padding:0,
              border:'1px solid var(--border-color)',
              background: cant === 0 ? 'transparent' : 'var(--bg-input)',
              color: cant === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: cant === 0 ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'1rem', transition:'var(--transition)',
            }}
          >−</button>

          <input
            type="number" min="0"
            value={cant}
            onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            style={{
              flex:1, textAlign:'center', padding:'0.28rem 0.2rem',
              background:'var(--bg-input)',
              border:`1px solid ${cant > 0 ? 'var(--primary)' : 'var(--border-color)'}`,
              borderRadius:'var(--radius-xs)',
              color:'var(--text-primary)',
              fontSize:'0.88rem', fontWeight:600,
            }}
          />

          <button
            type="button"
            onClick={() => onChange(cant + 1)}
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
      </div>

      {cant > 0 && (
        <div style={{
          marginTop:'0.4rem', padding:'0.45rem 0.75rem',
          background:'var(--primary-subtle)',
          borderRadius:'var(--radius-sm)',
          border:'1px solid var(--primary-glow)',
          display:'flex', justifyContent:'space-between',
          fontSize:'0.78rem',
        }}>
          <span style={{ color:'var(--text-secondary)' }}>{resumenLabel}</span>
          <span style={{ color:'var(--primary)', fontWeight:700 }}>{cant} unidades</span>
        </div>
      )}
    </div>
  );
}
