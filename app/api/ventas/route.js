import { NextResponse } from 'next/server';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import {
  crearVenta, cancelarVenta,
  listarVentas, listarDetallesPorVenta, ventasFiltradas,
  resumenVendedoresDia, totalGeneralVendedoresDia, vendedoresSinVentas,
  totalEfectivoHoy, totalTransferenciaHoy,
} from '@/lib/fileManagerVentas';
import { listarProductos } from '@/lib/fileManagerProductos';
import { leerUsuarios }    from '@/lib/fileManager';

/* ── GET ──────────────────────────────────────────────────────────────── */
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accion  = searchParams.get('accion');
  const admin   = esAdmin(sesion);

  if (accion === 'productos') {
    const lista = (await listarProductos()).filter(p => p.estado === 'ACTIVO');
    return NextResponse.json(lista);
  }

  if (accion === 'detalleJson') {
    const id = parseInt(searchParams.get('id'));
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

    const ventas = await listarVentas();
    const venta  = ventas.find(v => v.id === id);
    if (!venta) return NextResponse.json({ error: 'Venta no encontrada.' }, { status: 404 });

    if (!admin && venta.vendedorId !== sesion.id) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const detalles = await listarDetallesPorVenta(id);
    return NextResponse.json({
      subtotal:            venta.subtotal,
      descuentoProductos:  venta.descuentoProductos,
      descuentoTotal:      venta.descuentoTotal,
      descuentoTipo:       venta.descuentoTipo,
      total:               venta.total,
      tipoPago:            venta.tipoPago,
      valorEfectivo:       venta.valorEfectivo,
      valorTransferencia:  venta.valorTransferencia,
      items:               detalles,
    });
  }

  if (accion === 'historial') {
    const periodo = searchParams.get('periodo') || 'HOY';
    let lista = await ventasFiltradas(periodo);
    if (!admin) lista = lista.filter(v => v.vendedorId === sesion.id);

    const totalVentas        = lista.reduce((s, v) => s + v.total, 0);
    const totalEfectivo      = lista.reduce((s, v) => s + (v.valorEfectivo || 0), 0);
    const totalTransferencia = lista.reduce((s, v) => s + (v.valorTransferencia || 0), 0);

    let resumenVendedores = [], totalGeneralDia = 0, vendedoresSin = [], fechaResumen = '';
    if (admin) {
      const fecha = searchParams.get('fecha') || '';
      fechaResumen      = fecha || new Date().toISOString().slice(0, 10);
      resumenVendedores = await resumenVendedoresDia(fecha);
      totalGeneralDia   = await totalGeneralVendedoresDia(fecha);
      const nombresVendedores = (await leerUsuarios())
        .filter(u => u.rol === 'VENDEDOR' && u.activo)
        .map(u => u.nombreCompleto);
      vendedoresSin = await vendedoresSinVentas(fecha, nombresVendedores);
    }

    return NextResponse.json({
      ventas: lista, periodo, totalVentas, totalEfectivo, totalTransferencia,
      esAdmin: admin, resumenVendedores, totalGeneralDia, vendedoresSinVentas: vendedoresSin, fechaResumen,
    });
  }

  return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
}

/* ── POST ─────────────────────────────────────────────────────────────── */
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  try {
    const body   = await request.json();
    const accion = body.accion;

    if (accion === 'crear') {
      const { detalles, descuentoGlobal, descuentoGlobalTipo, tipoPago, valorEfectivo, valorTransferencia } = body;

      if (!detalles?.length) return NextResponse.json({ error: 'Agrega al menos un producto.' }, { status: 400 });

      for (const d of detalles) {
        if (!d.productoCodigo || !d.productoNombre || d.cantidad < 1 || d.precioUnitario < 0) {
          return NextResponse.json({ error: 'Datos de producto inválidos.' }, { status: 400 });
        }
        if (d.cantidad > 999) return NextResponse.json({ error: 'Cantidad máxima por producto: 999.' }, { status: 400 });
      }

      const subtotalBruto = detalles.reduce((s, d) => s + d.precioUnitario * d.cantidad, 0);
      let descTotal = 0;
      if (descuentoGlobal > 0) {
        descTotal = descuentoGlobalTipo === 'PORCENTAJE'
          ? subtotalBruto * (descuentoGlobal / 100)
          : descuentoGlobal;
        if (descuentoGlobal > 100 && descuentoGlobalTipo === 'PORCENTAJE')
          return NextResponse.json({ error: 'El porcentaje de descuento no puede superar el 100%.' }, { status: 400 });
        if (descTotal >= subtotalBruto) return NextResponse.json({ error: 'El descuento no puede superar el total.' }, { status: 400 });
      }

      const total = Math.max(0, subtotalBruto - descTotal);

      let vEfectivo = total, vTransferencia = 0;
      if (tipoPago === 'TRANSFERENCIA') {
        vEfectivo = 0; vTransferencia = total;
      } else if (tipoPago === 'MIXTO') {
        vEfectivo      = parseFloat(valorEfectivo)      || 0;
        vTransferencia = parseFloat(valorTransferencia) || 0;
        const sumaMixto = vEfectivo + vTransferencia;
        if (Math.abs(sumaMixto - total) > 1) vTransferencia = Math.max(0, total - vEfectivo);
      }

      const ventaData = {
        vendedorId:         sesion.id,
        vendedorNombre:     sesion.nombreCompleto,
        descuentoTotal:     descTotal,
        descuentoTipo:      descuentoGlobal > 0 ? (descuentoGlobalTipo || 'FIJO') : 'NINGUNO',
        total,
        tipoPago:           tipoPago || 'EFECTIVO',
        valorEfectivo:      vEfectivo,
        valorTransferencia: vTransferencia,
      };

      const res = await crearVenta(ventaData, detalles);
      if (!res.ok) return NextResponse.json({ error: res.error || 'Error al registrar la venta.' }, { status: 400 });
      return NextResponse.json(res);
    }

    if (accion === 'cancelar') {
      if (!esAdmin(sesion)) {
        return NextResponse.json({ error: 'Solo el administrador puede cancelar ventas.' }, { status: 403 });
      }
      const id = parseInt(body.id);
      if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

      const res = await cancelarVenta(id);
      if (res.error) return NextResponse.json(res, { status: 400 });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (err) {
    console.error('[API ventas]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
