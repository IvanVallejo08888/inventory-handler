'use client';
import { useState } from 'react';

export default function Alert({ tipo = 'success', mensaje, onClose }) {
  const [visible, setVisible] = useState(true);
  if (!mensaje || !visible) return null;

  function cerrar() {
    setVisible(false);
    onClose?.();
  }

  const cls = tipo === 'error' || tipo === 'danger' ? 'alert alert-danger' : 'alert alert-success';

  return (
    <div className={cls} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
      <span>{mensaje}</span>
      <button
        onClick={cerrar}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, color: 'inherit', flexShrink: 0, padding: 0 }}
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}
