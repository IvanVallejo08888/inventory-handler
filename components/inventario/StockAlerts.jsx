'use client';
import { useState } from 'react';
import { fmtLargo } from '@/lib/formatCompact';

const LOW_STOCK_LIMIT = 5;
const CRITICAL_LIMIT  = 2;
const BAR_MAX         = 10; // referencia visual para la barra de progreso

const NIVEL_CONFIG = {
  AGOTADO: { label:'AGOTADO',       color:'#ef4444', bg:'rgba(239,68,68,0.13)',  border:'rgba(239,68,68,0.35)'  },
  CRITICO: { label:'STOCK CRÍTICO', color:'#f97316', bg:'rgba(249,115,22,0.13)', border:'rgba(249,115,22,0.35)' },
  BAJO:    { label:'STOCK BAJO',    color:'#f59e0b', bg:'rgba(245,158,11,0.13)', border:'rgba(245,158,11,0.35)' },
};

function BarraStock({ stock }) {
  const pct   = stock === 0 ? 0 : Math.min(100, (stock / BAR_MAX) * 100);
  const color = stock === 0            ? '#ef4444'
              : stock <= CRITICAL_LIMIT ? '#f97316'
              : stock <= LOW_STOCK_LIMIT ? '#f59e0b'
              : '#2dce6b';
  return (
    <div style={{ width:72, height:5, background:'var(--border-color)', borderRadius:3, marginTop:4 }}>
      <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3, transition:'width 0.35s ease' }} />
    </div>
  );
}

export default function StockAlerts({ productos = [], onReponer }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!productos.length) return null;

  const agotados = productos.filter(p => p.nivel === 'AGOTADO').length;
  const criticos = productos.filter(p => p.nivel === 'CRITICO').length;
  const bajos    = productos.filter(p => p.nivel === 'BAJO').length;

  return (
    <div
      className="panel"
      style={{ marginBottom:'1.5rem', borderColor:'rgba(239,68,68,0.28)' }}
    >
      {/* Header — totalmente clickeable */}
      <div
        className="panel-header"
        onClick={() => setIsOpen(v => !v)}
        style={{
          background: 'linear-gradient(90deg,rgba(239,68,68,0.06) 0%,transparent 100%)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div>
          <span className="panel-title" style={{ color:'#ef4444' }}>
            ⚠ Alertas de Stock Bajo
            <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-muted)', marginLeft:'0.5rem' }}>
              ({productos.length})
            </span>
          </span>
          <div style={{ display:'flex', gap:'1rem', marginTop:'0.3rem', flexWrap:'wrap' }}>
            {agotados > 0 && (
              <span style={{ fontSize:'0.73rem', fontWeight:700, color:'#ef4444' }}>
                {agotados} agotado{agotados > 1 ? 's' : ''}
              </span>
            )}
            {criticos > 0 && (
              <span style={{ fontSize:'0.73rem', fontWeight:700, color:'#f97316' }}>
                {criticos} crítico{criticos > 1 ? 's' : ''}
              </span>
            )}
            {bajos > 0 && (
              <span style={{ fontSize:'0.73rem', fontWeight:700, color:'#f59e0b' }}>
                {bajos} bajo{bajos > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <span style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          transition: 'transform 0.25s ease',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
          lineHeight: 1,
        }}>
          ▼
        </span>
      </div>

      {/* Tabla — solo cuando está abierto */}
      <div style={{
        overflow: 'hidden',
        maxHeight: isOpen ? '2000px' : '0px',
        transition: 'max-height 0.35s ease',
      }}>
      <div className="table-responsive">
        <table className="area17-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Precio</th>
              <th>Stock actual</th>
              <th>Nivel</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(p => {
              const cfg = NIVEL_CONFIG[p.nivel] || NIVEL_CONFIG.BAJO;
              return (
                <tr key={p.id}>
                  <td>
                    <span className="codigo-badge">{p.codigo}</span>
                  </td>
                  <td style={{ fontWeight:500, color:'var(--text-primary)' }}>
                    {p.nombre}
                  </td>
                  <td style={{ color:'var(--primary)', fontWeight:600 }}>
                    {fmtLargo(p.precio)}
                  </td>
                  <td>
                    <span style={{ fontWeight:800, fontSize:'1.05rem', color:cfg.color }}>
                      {p.stock}
                    </span>
                    <BarraStock stock={p.stock} />
                  </td>
                  <td>
                    <span style={{
                      fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.04em',
                      padding:'3px 9px', borderRadius:4,
                      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`,
                    }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary"
                      style={{ padding:'4px 14px', fontSize:'0.78rem' }}
                      onClick={() => onReponer(p)}
                    >
                      🔄 Reponer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
