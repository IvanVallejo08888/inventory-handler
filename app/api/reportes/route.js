import { NextResponse }      from 'next/server';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import { listarProductos }   from '@/lib/fileManagerProductos';
import { listarVentas, listarTodosDetalles } from '@/lib/fileManagerVentas';
import { listarGastos }      from '@/lib/fileManagerGastos';
import { leerUsuarios }      from '@/lib/fileManager';
import { getDatosReportes }  from '@/lib/fileManagerReportes';

async function getXLSX() {
  const xlsx = await import('xlsx');
  return xlsx.default ?? xlsx;
}

function hoy()        { return new Date().toISOString().slice(0,10); }
function mesActual()  { return hoy().slice(0,7); }
function fmt2(n)      { return Number(n||0).toFixed(2); }

function crearHoja(XLSX, headers, rows) {
  const data = [headers, ...rows];
  const ws   = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = headers.map((h, ci) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[ci]??'').length), 10),
  }));
  return ws;
}

function hojaInventario(XLSX) {
  const p  = listarProductos();
  const hs = ['ID','Código','Nombre','Precio','Cantidad','Fecha Registro','Estado','Valor Total'];
  const rs = p.map(x => [x.id,x.codigo,x.nombre,+fmt2(x.precio),x.cantidad,x.fechaRegistro,x.estado,+fmt2(x.precio*x.cantidad)]);
  rs.push(['','','','','','','TOTAL:',+fmt2(p.reduce((s,x)=>s+x.precio*x.cantidad,0))]);
  return crearHoja(XLSX,hs,rs);
}

function hojaVentas(XLSX) {
  const v  = listarVentas();
  const hs = ['ID','Código','Fecha','Hora','Vendedor ID','Vendedor','Subtotal','Desc. Productos','Desc. Total','Tipo Desc.','Total','Estado','Tipo Pago','Efectivo','Transferencia'];
  const rs = v.map(x=>[x.id,x.codigo,x.fecha,x.hora,x.vendedorId,x.vendedorNombre,+fmt2(x.subtotal),+fmt2(x.descuentoProductos),+fmt2(x.descuentoTotal),x.descuentoTipo,+fmt2(x.total),x.estado,x.tipoPago||'EFECTIVO',+fmt2(x.valorEfectivo),+fmt2(x.valorTransferencia)]);
  const tot = v.filter(x=>x.estado==='COMPLETADA').reduce((s,x)=>s+x.total,0);
  rs.push(['','','','','','','','','','',+fmt2(tot),'TOTAL','','','']);
  return crearHoja(XLSX,hs,rs);
}

function hojaGastos(XLSX) {
  const g  = listarGastos();
  const hs = ['ID','Código','Nombre','Valor','Fecha','Categoría','Descripción','Estado'];
  const rs = g.map(x=>[x.id,x.codigo,x.nombre,+fmt2(x.valor),x.fecha,x.categoria,x.descripcion||'',x.estado]);
  rs.push(['','','TOTAL:',+fmt2(g.reduce((s,x)=>s+x.valor,0)),'','','','']);
  return crearHoja(XLSX,hs,rs);
}

function hojaUsuarios(XLSX) {
  const u  = leerUsuarios();
  const hs = ['ID','Nombre Completo','Identificación','Celular','Tipo Sangre','Correo','Rol','Activo'];
  const rs = u.map(x=>[x.id,x.nombreCompleto,x.identificacion,x.celular,x.tipoSangre,x.correo,x.rol,x.activo?'Sí':'No']);
  return crearHoja(XLSX,hs,rs);
}

function hojaProductosMasVendidos(XLSX) {
  const d  = listarTodosDetalles();
  const mp = {}; const mi = {};
  for (const x of d) { mp[x.productoNombre]=(mp[x.productoNombre]||0)+x.cantidad; mi[x.productoNombre]=(mi[x.productoNombre]||0)+x.subtotal; }
  const sorted = Object.entries(mp).sort((a,b)=>b[1]-a[1]).slice(0,20);
  const hs = ['Posición','Producto','Unidades Vendidas','Ingresos Generados'];
  const rs = sorted.map(([n,c],i)=>[i+1,n,c,+fmt2(mi[n]||0)]);
  return crearHoja(XLSX,hs,rs);
}

function hojaMovimientos(XLSX) {
  const d  = listarTodosDetalles();
  const hs = ['ID','Venta ID','Código Producto','Producto','Cantidad','Precio Unit.','Descuento','Subtotal'];
  const rs = d.map(x=>[x.id,x.ventaId,x.productoCodigo,x.productoNombre,x.cantidad,+fmt2(x.precioUnitario),+fmt2(x.descuentoUnidad),+fmt2(x.subtotal)]);
  rs.push(['','','','','','','TOTAL:',+fmt2(d.reduce((s,x)=>s+x.subtotal,0))]);
  return crearHoja(XLSX,hs,rs);
}

function hojaEstadisticas(XLSX) {
  const v  = listarVentas().filter(x=>x.estado==='COMPLETADA');
  const g  = listarGastos();
  const tv = v.reduce((s,x)=>s+x.total,0);
  const tg = g.reduce((s,x)=>s+x.valor,0);
  const h  = hoy(); const m = mesActual();
  const vh = v.filter(x=>x.fecha===h); const vm = v.filter(x=>x.fecha?.startsWith(m));
  const hs = ['Métrica','Valor'];
  const rs = [
    ['Total ventas (histórico)', v.length],
    ['Total ingresos (histórico)', +fmt2(tv)],
    ['Total gastos (histórico)',   +fmt2(tg)],
    ['Utilidad neta (histórico)',  +fmt2(tv-tg)],
    ['Ventas hoy', vh.length],
    ['Ingresos hoy', +fmt2(vh.reduce((s,x)=>s+x.total,0))],
    ['Ventas del mes', vm.length],
    ['Ingresos del mes', +fmt2(vm.reduce((s,x)=>s+x.total,0))],
    ['Ticket promedio', v.length ? +fmt2(tv/v.length) : 0],
    ['Productos en inventario', listarProductos().length],
    ['Usuarios del sistema', leerUsuarios().length],
  ];
  return crearHoja(XLSX,hs,rs);
}

function hojaVendedores(XLSX) {
  const v  = listarVentas().filter(x=>x.estado==='COMPLETADA');
  const u  = leerUsuarios().filter(x=>x.rol==='VENDEDOR');
  const mp = {};
  for (const x of v) { if(!mp[x.vendedorId]) mp[x.vendedorId]={n:x.vendedorNombre,v:0,t:0,e:0,tr:0}; mp[x.vendedorId].v++; mp[x.vendedorId].t+=x.total; mp[x.vendedorId].e+=x.valorEfectivo||0; mp[x.vendedorId].tr+=x.valorTransferencia||0; }
  const hs = ['ID','Nombre','Rol','Activo','N° Ventas','Total Vendido','Efectivo','Transferencia'];
  const rs = u.map(x=>{ const s=mp[x.id]||{v:0,t:0,e:0,tr:0}; return [x.id,x.nombreCompleto,x.rol,x.activo?'Sí':'No',s.v,+fmt2(s.t),+fmt2(s.e),+fmt2(s.tr)]; });
  return crearHoja(XLSX,hs,rs);
}

function hojaBalance(XLSX) {
  const v = listarVentas().filter(x=>x.estado==='COMPLETADA');
  const g = listarGastos();
  const mp = {};
  for (const x of v) { const m=x.fecha?.slice(0,7)||'S/F'; if(!mp[m]) mp[m]={i:0,g:0}; mp[m].i+=x.total; }
  for (const x of g) { const m=x.fecha?.slice(0,7)||'S/F'; if(!mp[m]) mp[m]={i:0,g:0}; mp[m].g+=x.valor; }
  const hs = ['Mes','Ingresos','Gastos','Utilidad'];
  const rs = Object.entries(mp).sort().map(([m,d])=>[m,+fmt2(d.i),+fmt2(d.g),+fmt2(d.i-d.g)]);
  const tI=rs.reduce((s,r)=>s+r[1],0); const tG=rs.reduce((s,r)=>s+r[2],0);
  rs.push(['TOTALES:',+fmt2(tI),+fmt2(tG),+fmt2(tI-tG)]);
  return crearHoja(XLSX,hs,rs);
}

function hojaAnio(XLSX) {
  const v = listarVentas().filter(x=>x.estado==='COMPLETADA');
  const g = listarGastos();
  const mp = {};
  for (const x of v) { const a=x.fecha?.slice(0,4)||'S/A'; if(!mp[a]) mp[a]={v:0,i:0,g:0}; mp[a].v++; mp[a].i+=x.total; }
  for (const x of g) { const a=x.fecha?.slice(0,4)||'S/A'; if(!mp[a]) mp[a]={v:0,i:0,g:0}; mp[a].g+=x.valor; }
  const hs = ['Año','N° Ventas','Ingresos','Gastos','Utilidad'];
  const rs = Object.entries(mp).sort().map(([a,d])=>[a,d.v,+fmt2(d.i),+fmt2(d.g),+fmt2(d.i-d.g)]);
  return crearHoja(XLSX,hs,rs);
}

function hojaReportesMes(XLSX) {
  const v = listarVentas().filter(x=>x.estado==='COMPLETADA');
  const g = listarGastos();
  const mp = {};
  for (const x of v) { const m=x.fecha?.slice(0,7)||'S/F'; if(!mp[m]) mp[m]={v:0,i:0,g:0,e:0,tr:0}; mp[m].v++; mp[m].i+=x.total; mp[m].e+=x.valorEfectivo||0; mp[m].tr+=x.valorTransferencia||0; }
  for (const x of g) { const m=x.fecha?.slice(0,7)||'S/F'; if(!mp[m]) mp[m]={v:0,i:0,g:0,e:0,tr:0}; mp[m].g+=x.valor; }
  const hs = ['Mes','N° Ventas','Ingresos','Gastos','Utilidad','Efectivo','Transferencia'];
  const rs = Object.entries(mp).sort().map(([m,d])=>[m,d.v,+fmt2(d.i),+fmt2(d.g),+fmt2(d.i-d.g),+fmt2(d.e),+fmt2(d.tr)]);
  return crearHoja(XLSX,hs,rs);
}

function hojaResumen(XLSX) {
  const v  = listarVentas().filter(x=>x.estado==='COMPLETADA');
  const g  = listarGastos();
  const tv = v.reduce((s,x)=>s+x.total,0); const tg=g.reduce((s,x)=>s+x.valor,0);
  const m  = mesActual(); const vm=v.filter(x=>x.fecha?.startsWith(m));
  const hs = ['Concepto','Valor'];
  const rs = [
    [`Reporte generado: ${new Date().toLocaleString('es-CO')}`,''],
    ['',''],['HISTÓRICO GENERAL',''],
    ['Total ventas completadas',v.length],
    ['Total ingresos',+fmt2(tv)],['Total gastos',+fmt2(tg)],['Utilidad neta',+fmt2(tv-tg)],
    ['',''],['MES ACTUAL',''],
    ['Ventas del mes',vm.length],
    ['Ingresos del mes',+fmt2(vm.reduce((s,x)=>s+x.total,0))],
  ];
  return crearHoja(XLSX,hs,rs);
}

async function construirLibro(tipo) {
  const XLSX = await getXLSX();
  const wb   = XLSX.utils.book_new();
  const add  = (ws,name) => XLSX.utils.book_append_sheet(wb,ws,name);

  if (tipo==='inventario') { add(hojaInventario(XLSX),'Inventario'); }
  else if (tipo==='ventas')   { add(hojaVentas(XLSX),'Ventas'); }
  else if (tipo==='gastos')   { add(hojaGastos(XLSX),'Gastos'); }
  else if (tipo==='usuarios') { add(hojaUsuarios(XLSX),'Usuarios'); }
  else if (tipo==='completo') {
    const vMes = listarVentas().filter(v=>v.estado==='COMPLETADA'&&v.fecha?.startsWith(mesActual()));
    const hs = ['Código','Fecha','Hora','Vendedor','Total','Tipo Pago'];
    const rs = vMes.map(v=>[v.codigo,v.fecha,v.hora,v.vendedorNombre,+fmt2(v.total),v.tipoPago]);
    add(crearHoja(XLSX,hs,rs),'Ventas del Mes');
    add(hojaGastos(XLSX),'Gastos');
    add(hojaInventario(XLSX),'Inventario');
    add(hojaProductosMasVendidos(XLSX),'Top Productos');
  } else if (tipo==='maestro') {
    add(hojaResumen(XLSX),              'Resumen General');
    add(hojaVentas(XLSX),               'Ventas');
    add(hojaGastos(XLSX),               'Gastos');
    add(hojaInventario(XLSX),           'Inventario');
    add(hojaProductosMasVendidos(XLSX), 'Productos más Vendidos');
    add(hojaMovimientos(XLSX),          'Movimientos');
    add(hojaEstadisticas(XLSX),         'Estadísticas');
    add(hojaVendedores(XLSX),           'Vendedores');
    add(hojaBalance(XLSX),              'Balance Financiero');
    add(hojaAnio(XLSX),                 'Por Año');
    add(hojaReportesMes(XLSX),          'Por Mes');
    add(hojaUsuarios(XLSX),             'Usuarios');
  }

  return XLSX.write(wb, { bookType:'xlsx', type:'buffer' });
}

export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion))
    return NextResponse.json({ error:'Acceso denegado.' }, { status:403 });

  const { searchParams } = new URL(request.url);
  const accion = searchParams.get('accion');

  if (!accion || accion==='datos')
    return NextResponse.json(getDatosReportes());

  if (accion==='exportar') {
    const tipo   = searchParams.get('tipo') || 'inventario';
    const labels = { inventario:'Inventario', ventas:'Ventas', gastos:'Gastos', usuarios:'Usuarios', completo:'Reporte_Completo', maestro:'Reporte_Maestro' };
    try {
      const buf  = await construirLibro(tipo);
      const d    = new Date();
      const suf  = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const name = `Area17_${labels[tipo]||tipo}_${suf}.xlsx`;
      return new NextResponse(buf, {
        headers: {
          'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${name}"`,
          'Cache-Control':       'no-cache',
        },
      });
    } catch (err) {
      console.error('[API reportes]', err);
      return NextResponse.json({ error:'Error al generar Excel. Ejecuta: npm install xlsx' }, { status:500 });
    }
  }

  return NextResponse.json({ error:'Acción no reconocida.' }, { status:400 });
}
