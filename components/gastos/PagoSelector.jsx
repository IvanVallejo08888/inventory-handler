'use client';

// Constantes y helpers de "Origen del gasto" (Efectivo / Transferencia / Mixto) —
// compartidos entre el formulario de Gastos y el formulario de Inversión.

const fmt = v => `$${Number(v || 0).toLocaleString('es-CO', { minimumFractionDigits:0, maximumFractionDigits:0 })}`;

export const METODOS_PAGO = [['EFECTIVO','💵 Efectivo'],['TRANSFERENCIA','🏦 Transferencia'],['MIXTO','💳 Mixto']];
export const MEDIOS_PAGO  = [['BANCOLOMBIA','Bancolombia'],['DAVIPLATA','Daviplata'],['NEQUI','Nequi']];
export const MEDIO_LABEL  = { BANCOLOMBIA:'Bancolombia', DAVIPLATA:'Daviplata', NEQUI:'Nequi' };

export function formatOrigen(g) {
  if (g.metodoPago === 'TRANSFERENCIA') {
    return `Transferencia - ${MEDIO_LABEL[g.medioPago] || g.medioPago || ''}`;
  }
  if (g.metodoPago === 'MIXTO') {
    return `Mixto (Efectivo: ${fmt(g.valorEfectivo)} / ${MEDIO_LABEL[g.medioPago] || g.medioPago || ''}: ${fmt(g.valorTransferencia)})`;
  }
  return 'Efectivo';
}

// Valida el método de pago de un formulario { metodoPago, medioPago, valorEfectivo, valor }.
export function validarPago(form) {
  if (form.metodoPago === 'TRANSFERENCIA' && !form.medioPago) {
    return 'Debe seleccionar el medio de transferencia (Bancolombia, Daviplata o Nequi).';
  }
  if (form.metodoPago === 'MIXTO') {
    const total = parseFloat(form.valor) || 0;
    const ef    = parseFloat(form.valorEfectivo);
    if (form.valorEfectivo === '' || isNaN(ef)) {
      return 'Debe ingresar el valor en efectivo.';
    }
    if (ef < 0) {
      return 'El valor en efectivo no puede ser negativo.';
    }
    if (ef > total) {
      return 'El valor en efectivo no puede superar el total del gasto.';
    }
    if (!form.medioPago) {
      return 'Debe seleccionar el medio de transferencia para el saldo restante.';
    }
  }
  return null;
}

export function ToggleButtons({ options, value, onChange }) {
  return (
    <div style={{ display:'flex', gap:6 }}>
      {options.map(([val, lbl]) => (
        <div key={val} onClick={() => onChange(val)} style={{
          flex:1, padding:'7px 4px', textAlign:'center', fontSize:12, fontWeight:600,
          borderRadius:'var(--radius-sm)', cursor:'pointer',
          border:`1px solid ${value === val ? 'var(--primary)' : 'var(--border-color)'}`,
          background: value === val ? 'var(--primary)' : 'transparent',
          color:      value === val ? '#000' : 'var(--text-muted)',
        }}>{lbl}</div>
      ))}
    </div>
  );
}
