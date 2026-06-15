import { NextResponse } from 'next/server';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { limpiarEntrada, truncar } from '@/lib/security';
import { validarMetodoPago } from '@/lib/validacionPago';
import { tallasPara } from '@/lib/inventarioConstants';
import { crearInversion } from '@/lib/fileManagerInversiones';

const TIPOS_VALIDOS    = ['ROPA', 'CALZADO', 'GENERAL'];
const SUBTIPOS_VALIDOS = ['NINO', 'ADULTO'];

export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (!esAdmin(sesion)) return NextResponse.json({ error: 'Sin permisos para esta acción.' }, { status: 403 });

  try {
    const body = await request.json();

    const nombre      = limpiarEntrada(truncar(body.nombre || '', 200));
    const tipo        = body.tipo;
    const subTipo     = body.subTipo || null;
    const valorCompra = parseFloat(body.valorCompra);
    const valorVenta  = parseFloat(body.valorVenta);

    if (!nombre) return NextResponse.json({ error: 'El nombre del producto es obligatorio.' }, { status: 400 });
    if (!TIPOS_VALIDOS.includes(tipo)) return NextResponse.json({ error: 'Tipo de producto no válido.' }, { status: 400 });
    if ((tipo === 'ROPA' || tipo === 'CALZADO') && !SUBTIPOS_VALIDOS.includes(subTipo)) {
      return NextResponse.json({ error: 'Debe seleccionar para quién es el producto (Niño o Adulto).' }, { status: 400 });
    }
    if (isNaN(valorCompra) || valorCompra <= 0 || valorCompra > 999_999_999) {
      return NextResponse.json({ error: 'El valor de compra unitario debe ser mayor a 0.' }, { status: 400 });
    }
    if (isNaN(valorVenta) || valorVenta <= 0 || valorVenta > 999_999_999) {
      return NextResponse.json({ error: 'El valor de venta unitario debe ser mayor a 0.' }, { status: 400 });
    }

    let tallas = {};
    let cantidad = 0;
    let totalUnidades = 0;

    if (tipo === 'ROPA' || tipo === 'CALZADO') {
      for (const t of tallasPara(tipo, subTipo)) {
        const v = parseInt(body.tallas?.[t]);
        if (body.tallas?.[t] !== undefined && (isNaN(v) || v < 0)) {
          return NextResponse.json({ error: `Cantidad inválida para la talla ${t}.` }, { status: 400 });
        }
        if (v > 0) { tallas[t] = v; totalUnidades += v; }
      }
      if (totalUnidades <= 0) {
        return NextResponse.json({ error: 'Debe ingresar la cantidad de al menos una talla.' }, { status: 400 });
      }
    } else {
      cantidad = parseInt(body.cantidad);
      if (isNaN(cantidad) || cantidad <= 0) {
        return NextResponse.json({ error: 'La cantidad debe ser mayor a 0.' }, { status: 400 });
      }
      totalUnidades = cantidad;
    }

    const totalInvertido = Math.round(totalUnidades * valorCompra * 100) / 100;
    const pago = validarMetodoPago(body, totalInvertido);
    if (pago.error) return NextResponse.json(pago, { status: 400 });

    const res = await crearInversion({ nombre, tipo, subTipo, valorCompra, valorVenta, tallas, cantidad, ...pago }, sesion);
    if (res.error) return NextResponse.json(res, { status: 400 });
    return NextResponse.json(res);
  } catch (err) {
    console.error('[API inversiones]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
