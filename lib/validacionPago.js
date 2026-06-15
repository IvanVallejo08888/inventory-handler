// Validación del método de pago/gasto — compartida entre /api/gastos y /api/inversiones.

export const METODOS_PAGO_VALIDOS = ['EFECTIVO', 'TRANSFERENCIA', 'MIXTO'];
export const MEDIOS_PAGO_VALIDOS  = ['BANCOLOMBIA', 'DAVIPLATA', 'NEQUI'];

// Valida el método de pago/gasto y calcula los valores de efectivo/transferencia para MIXTO.
export function validarMetodoPago(body, valor) {
  const metodoPago = body.metodoPago || 'EFECTIVO';
  if (!METODOS_PAGO_VALIDOS.includes(metodoPago)) {
    return { error: 'Método de gasto no válido.' };
  }

  if (metodoPago === 'EFECTIVO') {
    return { ok: true, metodoPago, medioPago: null, valorEfectivo: null, valorTransferencia: null };
  }

  const medioPago = body.medioPago;
  if (!MEDIOS_PAGO_VALIDOS.includes(medioPago)) {
    return { error: 'Debe seleccionar un medio de transferencia (Bancolombia, Daviplata o Nequi).' };
  }

  if (metodoPago === 'TRANSFERENCIA') {
    return { ok: true, metodoPago, medioPago, valorEfectivo: null, valorTransferencia: null };
  }

  // MIXTO
  const valorEfectivo = parseFloat(body.valorEfectivo);
  if (isNaN(valorEfectivo) || valorEfectivo < 0) {
    return { error: 'El valor en efectivo no puede ser negativo.' };
  }
  if (valorEfectivo > valor) {
    return { error: 'El valor en efectivo no puede superar el total del gasto.' };
  }
  const valorTransferencia = Math.round((valor - valorEfectivo) * 100) / 100;
  return { ok: true, metodoPago, medioPago, valorEfectivo, valorTransferencia };
}
