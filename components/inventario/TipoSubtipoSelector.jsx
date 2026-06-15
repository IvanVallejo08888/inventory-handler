'use client';

// Selector de "Tipo de producto" (Ropa / Calzado / General) — extraído de
// InventarioClient para poder reutilizarlo en el formulario de Inversión.
export function TipoSelector({ tipo, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">Tipo de producto *</label>
      <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.4rem', flexWrap:'wrap' }}>
        {[['ROPA','👕 Ropa'], ['CALZADO','👟 Calzado'], ['GENERAL','📦 General']].map(([val, lbl]) => (
          <label key={val} style={{
            display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer',
            padding:'0.55rem 1.1rem', borderRadius:'var(--radius-sm)',
            border:`1.5px solid ${tipo === val ? 'var(--primary)' : 'var(--border-color)'}`,
            background: tipo === val ? 'var(--primary-subtle)' : 'var(--bg-card)',
            color:      tipo === val ? 'var(--primary)'        : 'var(--text-secondary)',
            fontWeight: tipo === val ? 700 : 400,
            transition:'var(--transition)', flex:'1 1 100px',
          }}>
            <input
              type="radio" name="tipo" value={val} checked={tipo === val}
              onChange={() => onChange(val)}
              style={{ accentColor:'var(--primary)', cursor:'pointer' }}
            />
            {lbl}
          </label>
        ))}
      </div>
    </div>
  );
}

// Selector de "¿Para quién es?" (Niño / Adulto) — usado para Ropa y Calzado.
export function SubTipoSelector({ subTipo, onChange, name = 'subTipo' }) {
  return (
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
              type="radio" name={name} value={val} checked={subTipo === val}
              onChange={() => onChange(val)}
              style={{ accentColor:'var(--primary)', cursor:'pointer' }}
            />
            {lbl}
          </label>
        ))}
      </div>
    </div>
  );
}
