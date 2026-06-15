'use client';

import { useMemo } from 'react';
import { TipoSelector, SubTipoSelector } from '@/components/inventario/TipoSubtipoSelector';
import CantidadSelector from '@/components/inventario/CantidadSelector';
import TallasSelector   from '@/components/inventario/TallasSelector';
import { tallasPara }   from '@/lib/inventarioConstants';
import { METODOS_PAGO, MEDIOS_PAGO, ToggleButtons, validarPago } from '@/components/gastos/PagoSelector';

const fmt = v => `$${Number(v || 0).toLocaleString('es-CO', { minimumFractionDigits:0, maximumFractionDigits:0 })}`;

export const INVERSION_VACIO = {
  nombre: '', tipo: '', subTipo: '', valorCompra: '', valorVenta: '',
  tallas: {}, cantidad: 0,
  metodoPago: 'EFECTIVO', medioPago: '', valorEfectivo: '',
};

// Unidades totales según el tipo de producto (tallas para Ropa/Calzado, cantidad única para General).
export function totalUnidadesInversion(form) {
  if (form.tipo === 'ROPA' || form.tipo === 'CALZADO') {
    return tallasPara(form.tipo, form.subTipo).reduce((s, t) => s + (parseInt(form.tallas[t]) || 0), 0);
  }
  if (form.tipo === 'GENERAL') return Math.max(0, parseInt(form.cantidad) || 0);
  return 0;
}

// Total invertido = unidades totales × valor de compra unitario.
export function totalInvertidoInversion(form) {
  return totalUnidadesInversion(form) * (parseFloat(form.valorCompra) || 0);
}

// Valida el formulario de inversión (requisito 12). Devuelve un mensaje de error o null.
export function validarInversion(form) {
  if (!(form.nombre || '').trim()) return 'El nombre del producto es obligatorio.';
  if (!form.tipo) return 'Debe seleccionar el tipo de producto.';
  if ((form.tipo === 'ROPA' || form.tipo === 'CALZADO') && !form.subTipo) {
    return 'Debe seleccionar para quién es el producto (Niño o Adulto).';
  }

  const valorCompra = parseFloat(form.valorCompra);
  const valorVenta  = parseFloat(form.valorVenta);
  if (isNaN(valorCompra) || valorCompra <= 0) return 'El valor de compra unitario debe ser mayor a 0.';
  if (isNaN(valorVenta)  || valorVenta  <= 0) return 'El valor de venta unitario debe ser mayor a 0.';

  if (form.tipo === 'ROPA' || form.tipo === 'CALZADO') {
    if (totalUnidadesInversion(form) <= 0) return 'Debe ingresar la cantidad de al menos una talla.';
  } else if (form.tipo === 'GENERAL') {
    if (totalUnidadesInversion(form) <= 0) return 'La cantidad debe ser mayor a 0.';
  }

  return validarPago({ ...form, valor: totalInvertidoInversion(form) });
}

// Formulario de "Inversión" (compra de mercancía) — reutiliza los componentes visuales
// de Inventario (tipo/subtipo/tallas/cantidad) y de pago de Gastos.
export default function InversionForm({ form, set, productosExistentes = [] }) {
  const tallasActuales = tallasPara(form.tipo, form.subTipo);
  const totalUds       = totalUnidadesInversion(form);
  const totalInvertido = totalInvertidoInversion(form);
  const efectivo       = parseFloat(form.valorEfectivo) || 0;
  const transferencia  = Math.max(0, totalInvertido - efectivo);

  const nombresBase = useMemo(() => {
    const vistos = new Set();
    for (const n of productosExistentes) {
      const base = (n || '').replace(/\s+TALLA\s+\S+$/i, '').trim();
      if (base) vistos.add(base);
    }
    return Array.from(vistos);
  }, [productosExistentes]);

  function setTalla(talla, val) {
    set('tallas', { ...form.tallas, [talla]: Math.max(0, parseInt(val) || 0) });
  }

  return (
    <>
      <div className="form-group">
        <label className="form-label">Nombre del producto *</label>
        <input className="form-control" list="inversion-productos-existentes" autoFocus
          value={form.nombre} onChange={e => set('nombre', e.target.value)}
          placeholder="Ej: CAMISA COLOMBIA" />
        <datalist id="inversion-productos-existentes">
          {nombresBase.map(n => <option key={n} value={n} />)}
        </datalist>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Valor de compra unitario *</label>
          <input className="form-control" type="number" min="0" step="0.01"
            value={form.valorCompra} onChange={e => set('valorCompra', e.target.value)} placeholder="0.00" />
        </div>
        <div className="form-group">
          <label className="form-label">Valor de venta unitario *</label>
          <input className="form-control" type="number" min="0" step="0.01"
            value={form.valorVenta} onChange={e => set('valorVenta', e.target.value)} placeholder="0.00" />
        </div>
      </div>

      <TipoSelector tipo={form.tipo} onChange={val => set('tipo', val)} />

      {(form.tipo === 'ROPA' || form.tipo === 'CALZADO') && (
        <SubTipoSelector subTipo={form.subTipo} onChange={val => set('subTipo', val)} />
      )}

      {form.tipo === 'GENERAL' && (
        <CantidadSelector value={form.cantidad} onChange={v => set('cantidad', v)} />
      )}

      <TallasSelector tallas={form.tallas} tallasActuales={tallasActuales} setTalla={setTalla} />

      {totalUds > 0 && (
        <div style={{
          marginBottom:'0.75rem', padding:'0.5rem 0.85rem',
          background:'rgba(45,206,107,0.06)',
          borderRadius:'var(--radius-sm)',
          border:'1px solid var(--primary-glow)',
          fontSize:'0.78rem',
          display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem',
        }}>
          <span style={{ color:'var(--text-secondary)' }}>
            {totalUds} unidad{totalUds > 1 ? 'es' : ''} a invertir
          </span>
          <span style={{ color:'var(--primary)', fontWeight:700 }}>
            Total: {fmt(totalInvertido)}
          </span>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Origen del pago *</label>
        <ToggleButtons options={METODOS_PAGO} value={form.metodoPago || 'EFECTIVO'}
          onChange={v => set('metodoPago', v)} />
      </div>

      {form.metodoPago === 'TRANSFERENCIA' && (
        <div className="form-group">
          <label className="form-label">Medio de transferencia *</label>
          <ToggleButtons options={MEDIOS_PAGO} value={form.medioPago}
            onChange={v => set('medioPago', v)} />
        </div>
      )}

      {form.metodoPago === 'MIXTO' && (
        <>
          <div className="form-group">
            <label className="form-label">Valor en efectivo *</label>
            <input className="form-control" type="number" min="0" max={totalInvertido} step="0.01"
              value={form.valorEfectivo} onChange={e => set('valorEfectivo', e.target.value)} placeholder="0.00" />
            <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
              🏦 Transferencia (calculado automáticamente): {fmt(transferencia)}
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Medio de transferencia *</label>
            <ToggleButtons options={MEDIOS_PAGO} value={form.medioPago}
              onChange={v => set('medioPago', v)} />
          </div>
        </>
      )}
    </>
  );
}
