import { NextResponse }                         from 'next/server';
import { obtenerSesion, esAdmin }               from '@/lib/auth';
import { listarProductos }                      from '@/lib/fileManagerProductos';
import { listarVentas, listarTodosDetalles }    from '@/lib/fileManagerVentas';
import { listarGastos }                         from '@/lib/fileManagerGastos';
import { leerUsuarios }                         from '@/lib/fileManager';
import { getDatosReportes }                     from '@/lib/fileManagerReportes';

// ── Utilidades ────────────────────────────────────────────────────────────────
function hoy()        { return new Date().toISOString().slice(0, 10); }
function mesActual()  { return hoy().slice(0, 7); }
function fmt2(n)      { return Number(n || 0).toFixed(2); }
function rb(hex)      { return 'FF' + hex.replace('#', '').toUpperCase(); }   // RGBA con opacidad plena
function fmtTS()      { return new Date().toLocaleString('es-CO', { dateStyle:'long', timeStyle:'short' }); }
function fmtCOP(n)    { return '$' + Number(n||0).toLocaleString('es-CO', { minimumFractionDigits:2 }); }

// ── Paleta corporativa por tipo ───────────────────────────────────────────────
const T = {
  inventario: { A:'1B5E20', B:'2E7D32', C:'388E3C', bg:'F1F8E9', lbl:'REPORTE DE INVENTARIO' },
  ventas:     { A:'0D47A1', B:'1565C0', C:'1976D2', bg:'E3F2FD', lbl:'REPORTE DE VENTAS' },
  gastos:     { A:'B71C1C', B:'C62828', C:'D32F2F', bg:'FFEBEE', lbl:'REPORTE DE GASTOS' },
  usuarios:   { A:'4A148C', B:'6A1B9A', C:'7B1FA2', bg:'F3E5F5', lbl:'REPORTE DE USUARIOS' },
  completo:   { A:'E65100', B:'F57C00', C:'FB8C00', bg:'FFF3E0', lbl:'REPORTE DEL MES' },
  maestro:    { A:'1A237E', B:'283593', C:'3949AB', bg:'E8EAF6', lbl:'REPORTE MAESTRO COMPLETO' },
};

// ── ExcelJS loader ────────────────────────────────────────────────────────────
async function getXJS() {
  const m = await import('exceljs');
  return m.default ?? m;
}

// ── Helpers de estilo ─────────────────────────────────────────────────────────
function solid(hex)  { return { type:'pattern', pattern:'solid', fgColor:{ argb: rb(hex) } }; }
function border(style='thin', hex='CCCCCC') {
  const s = { style, color:{ argb:'FF'+hex } };
  return { top:s, left:s, bottom:s, right:s };
}
function borderH(style='thin', hex='CCCCCC') {          // Solo borde horizontal inferior
  return { bottom:{ style, color:{ argb:'FF'+hex } } };
}
function font(bold, size, colorHex='FFFFFF', name='Calibri') {
  return { name, bold, size, color:{ argb: rb(colorHex) } };
}
function align(h='center', v='middle', wrap=false) {
  return { horizontal:h, vertical:v, wrapText:wrap };
}

// ── Encabezado corporativo (3 filas) ─────────────────────────────────────────
function headerEmpresa(ws, t, cols, subtitulo, info) {
  // Fila 1 — banda principal
  ws.mergeCells(1, 1, 1, cols);
  const c1 = ws.getCell(1, 1);
  c1.value     = '  ◆  ÁREA 17   |   Sistema de Gestión Empresarial';
  c1.font      = font(true, 18, 'FFFFFF');
  c1.fill      = solid(t.A);
  c1.alignment = align('center');
  ws.getRow(1).height = 44;

  // Fila 2 — subtítulo
  ws.mergeCells(2, 1, 2, cols);
  const c2 = ws.getCell(2, 1);
  c2.value     = subtitulo;
  c2.font      = font(true, 12, 'FFFFFF');
  c2.fill      = solid(t.B);
  c2.alignment = align('center');
  ws.getRow(2).height = 28;

  // Fila 3 — info
  ws.mergeCells(3, 1, 3, cols);
  const c3 = ws.getCell(3, 1);
  c3.value     = info || `Generado: ${fmtTS()}   |   Período: ${mesActual()}`;
  c3.font      = { name:'Calibri', size:9, italic:true, color:{ argb: rb(t.A) } };
  c3.fill      = solid(t.bg);
  c3.alignment = align('center');
  ws.getRow(3).height = 20;
}

// ── Fila de cabecera de columnas ──────────────────────────────────────────────
function headerColumnas(ws, headers, t, ri=4) {
  const row = ws.getRow(ri);
  row.height = 26;
  headers.forEach((h, i) => {
    const c    = row.getCell(i + 1);
    c.value    = h;
    c.font     = font(true, 10, 'FFFFFF');
    c.fill     = solid(t.A);
    c.alignment = align('center');
    c.border   = {
      top:    { style:'medium', color:{ argb:'FFFFFFFF' } },
      bottom: { style:'medium', color:{ argb:'FFFFFFFF' } },
      left:   { style:'thin',   color:{ argb:'FFB0BEC5' } },
      right:  { style:'thin',   color:{ argb:'FFB0BEC5' } },
    };
  });
}

// ── Detección de columna monetaria ────────────────────────────────────────────
function esMonetaria(hdr) {
  const h = (hdr||'').toLowerCase();
  return h.includes('precio')    || h.includes('total')    || h.includes('valor')  ||
         h.includes('subtotal')  || h.includes('desc')     || h.includes('ingreso') ||
         h.includes('gasto')     || h.includes('efectivo') || h.includes('transfer') ||
         h.includes('utilidad')  || h.includes('vendido')  || h.includes('balance');
}

// ── Filas de datos con estilos alternados ─────────────────────────────────────
function filaDatos(ws, headers, filas, t, startR=5) {
  filas.forEach((fila, ri) => {
    const esTotal = fila.some(v => v === 'TOTAL:' || v === 'TOTALES:');
    const esSeccion = !esTotal && typeof fila[0] === 'string' && fila[0] !== '' &&
                      fila.every((v, i) => i === 0 || v === '' || v === null);
    const esImpar = ri % 2 === 0;
    const row = ws.getRow(startR + ri);
    row.height = esTotal ? 24 : esSeccion ? 22 : 19;

    fila.forEach((val, ci) => {
      const c   = row.getCell(ci + 1);
      const hdr = headers[ci] || '';
      const num = typeof val === 'number';

      c.value = val;

      if (esTotal) {
        c.fill   = solid(t.bg);
        c.font   = font(true, 10, t.A);
        c.border = {
          top:    { style:'medium', color:{ argb: rb(t.B) } },
          bottom: { style:'medium', color:{ argb: rb(t.B) } },
          left:   { style:'hair',   color:{ argb:'FFD0D0D0' } },
          right:  { style:'hair',   color:{ argb:'FFD0D0D0' } },
        };
      } else if (esSeccion) {
        c.fill   = solid(t.bg);
        c.font   = font(true, 10, t.A);
        c.border = borderH('thin', 'D0D0D0');
      } else {
        c.fill   = solid(esImpar ? 'FFFFFF' : t.bg);
        c.font   = { name:'Calibri', size:10, color:{ argb:'FF212121' } };
        c.border = borderH('hair', 'E0E0E0');
      }

      if (num) {
        c.alignment = align('right');
        c.numFmt    = esMonetaria(hdr) ? '"$"#,##0.00' : '#,##0';
      } else {
        c.alignment = align('left');
      }
    });
  });
}

// ── Anchos de columna automáticos ─────────────────────────────────────────────
function anchos(ws, headers, filas) {
  ws.columns = headers.map((h, ci) => ({
    width: Math.min(
      Math.max(h.length + 3, ...filas.map(r => String(r[ci] ?? '').length + 1), 10),
      48
    ),
  }));
}

// ── Hoja de datos estilizada (función principal) ──────────────────────────────
function sheet(wb, nombre, headers, filas, tipo, config={}) {
  const t  = T[tipo] || T.maestro;
  const ws = wb.addWorksheet(nombre, {
    pageSetup: { paperSize:9, orientation:'landscape', fitToPage:true, fitToWidth:1 },
    views: [{ state:'frozen', ySplit:4 }],
  });

  const info = config.info ||
    `Generado: ${fmtTS()}   |   Período: ${mesActual()}   |   Registros: ${filas.length}`;

  headerEmpresa(ws, t, headers.length, config.titulo || t.lbl, info);
  headerColumnas(ws, headers, t, 4);

  ws.autoFilter = { from:{ row:4, column:1 }, to:{ row:4, column:headers.length } };

  filaDatos(ws, headers, filas, t, 5);
  anchos(ws, headers, filas);
  return ws;
}

// ════════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE DATOS — LÓGICA IDÉNTICA AL ORIGINAL
// ════════════════════════════════════════════════════════════════════════════════

async function dInventario() {
  const p  = await listarProductos();
  const hs = ['ID','Código','Nombre','Precio','Cantidad','Fecha Registro','Estado','Valor Total'];
  const rs = p.map(x=>[x.id,x.codigo,x.nombre,+fmt2(x.precio),x.cantidad,x.fechaRegistro,x.estado,+fmt2(x.precio*x.cantidad)]);
  rs.push(['','','','','','','TOTAL:',+fmt2(p.reduce((s,x)=>s+x.precio*x.cantidad,0))]);
  return { hs, rs, total:p.length, valor:+fmt2(p.reduce((s,x)=>s+x.precio*x.cantidad,0)) };
}

async function dVentas() {
  const v  = await listarVentas();
  const hs = ['ID','Código','Fecha','Hora','Vendedor ID','Vendedor','Subtotal','Desc. Productos','Desc. Total','Tipo Desc.','Total','Estado','Tipo Pago','Efectivo','Transferencia'];
  const rs = v.map(x=>[x.id,x.codigo,x.fecha,x.hora,x.vendedorId,x.vendedorNombre,+fmt2(x.subtotal),+fmt2(x.descuentoProductos),+fmt2(x.descuentoTotal),x.descuentoTipo,+fmt2(x.total),x.estado,x.tipoPago||'EFECTIVO',+fmt2(x.valorEfectivo),+fmt2(x.valorTransferencia)]);
  const tot = v.filter(x=>x.estado==='COMPLETADA').reduce((s,x)=>s+x.total,0);
  rs.push(['','','','','','','','','','',+fmt2(tot),'TOTAL','','','']);
  const vc = v.filter(x=>x.estado==='COMPLETADA');
  return { hs, rs, total:v.length, completadas:vc.length, ingresos:+fmt2(tot) };
}

async function dGastos() {
  const g  = await listarGastos();
  const hs = ['ID','Código','Nombre','Valor','Fecha','Categoría','Descripción','Estado'];
  const rs = g.map(x=>[x.id,x.codigo,x.nombre,+fmt2(x.valor),x.fecha,x.categoria,x.descripcion||'',x.estado]);
  rs.push(['','','TOTAL:',+fmt2(g.reduce((s,x)=>s+x.valor,0)),'','','','']);
  return { hs, rs, total:g.length, monto:+fmt2(g.reduce((s,x)=>s+x.valor,0)) };
}

async function dUsuarios() {
  const u  = await leerUsuarios();
  const hs = ['ID','Nombre Completo','Identificación','Celular','Tipo Sangre','Correo','Rol','Activo'];
  const rs = u.map(x=>[x.id,x.nombreCompleto,x.identificacion,x.celular,x.tipoSangre,x.correo,x.rol,x.activo?'Sí':'No']);
  return { hs, rs, total:u.length, admins:u.filter(x=>x.rol==='ADMINISTRADOR').length, vends:u.filter(x=>x.rol==='VENDEDOR').length };
}

async function dProductosMasVendidos() {
  const d  = await listarTodosDetalles();
  const mp = {}; const mi = {};
  for (const x of d) { mp[x.productoNombre]=(mp[x.productoNombre]||0)+x.cantidad; mi[x.productoNombre]=(mi[x.productoNombre]||0)+x.subtotal; }
  const sorted = Object.entries(mp).sort((a,b)=>b[1]-a[1]).slice(0,20);
  const hs = ['Posición','Producto','Unidades Vendidas','Ingresos Generados'];
  const rs = sorted.map(([n,c],i)=>[i+1,n,c,+fmt2(mi[n]||0)]);
  return { hs, rs };
}

async function dMovimientos() {
  const d  = await listarTodosDetalles();
  const hs = ['ID','Venta ID','Código Producto','Producto','Cantidad','Precio Unit.','Descuento','Subtotal'];
  const rs = d.map(x=>[x.id,x.ventaId,x.productoCodigo,x.productoNombre,x.cantidad,+fmt2(x.precioUnitario),+fmt2(x.descuentoUnidad),+fmt2(x.subtotal)]);
  rs.push(['','','','','','','TOTAL:',+fmt2(d.reduce((s,x)=>s+x.subtotal,0))]);
  return { hs, rs };
}

async function dEstadisticas() {
  const [v,g,p,u] = await Promise.all([listarVentas(),listarGastos(),listarProductos(),leerUsuarios()]);
  const vc=v.filter(x=>x.estado==='COMPLETADA');
  const tv=vc.reduce((s,x)=>s+x.total,0); const tg=g.reduce((s,x)=>s+x.valor,0);
  const h=hoy(); const m=mesActual();
  const vh=vc.filter(x=>x.fecha===h); const vm=vc.filter(x=>x.fecha?.startsWith(m));
  const hs=['Métrica','Valor'];
  const rs=[
    ['Total ventas (histórico)',vc.length],['Total ingresos (histórico)',+fmt2(tv)],
    ['Total gastos (histórico)',+fmt2(tg)],['Utilidad neta (histórico)',+fmt2(tv-tg)],
    ['Ventas hoy',vh.length],['Ingresos hoy',+fmt2(vh.reduce((s,x)=>s+x.total,0))],
    ['Ventas del mes',vm.length],['Ingresos del mes',+fmt2(vm.reduce((s,x)=>s+x.total,0))],
    ['Ticket promedio',vc.length?+fmt2(tv/vc.length):0],
    ['Productos en inventario',p.length],['Usuarios del sistema',u.length],
  ];
  return { hs, rs };
}

async function dVendedores() {
  const [v,u]=await Promise.all([listarVentas(),leerUsuarios()]);
  const vc=v.filter(x=>x.estado==='COMPLETADA');
  const uv=u.filter(x=>x.rol==='VENDEDOR');
  const mp={};
  for (const x of vc) { if(!mp[x.vendedorId]) mp[x.vendedorId]={v:0,t:0,e:0,tr:0}; mp[x.vendedorId].v++; mp[x.vendedorId].t+=x.total; mp[x.vendedorId].e+=x.valorEfectivo||0; mp[x.vendedorId].tr+=x.valorTransferencia||0; }
  const hs=['ID','Nombre','Rol','Activo','N° Ventas','Total Vendido','Efectivo','Transferencia'];
  const rs=uv.map(x=>{ const s=mp[x.id]||{v:0,t:0,e:0,tr:0}; return [x.id,x.nombreCompleto,x.rol,x.activo?'Sí':'No',s.v,+fmt2(s.t),+fmt2(s.e),+fmt2(s.tr)]; });
  return { hs, rs };
}

async function dBalance() {
  const [v,g]=await Promise.all([listarVentas(),listarGastos()]);
  const vc=v.filter(x=>x.estado==='COMPLETADA');
  const mp={};
  for (const x of vc) { const m=x.fecha?.slice(0,7)||'S/F'; if(!mp[m]) mp[m]={i:0,g:0}; mp[m].i+=x.total; }
  for (const x of g)  { const m=x.fecha?.slice(0,7)||'S/F'; if(!mp[m]) mp[m]={i:0,g:0}; mp[m].g+=x.valor; }
  const hs=['Mes','Ingresos','Gastos','Utilidad'];
  const rs=Object.entries(mp).sort().map(([m,d])=>[m,+fmt2(d.i),+fmt2(d.g),+fmt2(d.i-d.g)]);
  const tI=rs.reduce((s,r)=>s+r[1],0); const tG=rs.reduce((s,r)=>s+r[2],0);
  rs.push(['TOTALES:',+fmt2(tI),+fmt2(tG),+fmt2(tI-tG)]);
  return { hs, rs };
}

async function dAnio() {
  const [v,g]=await Promise.all([listarVentas(),listarGastos()]);
  const vc=v.filter(x=>x.estado==='COMPLETADA');
  const mp={};
  for (const x of vc) { const a=x.fecha?.slice(0,4)||'S/A'; if(!mp[a]) mp[a]={v:0,i:0,g:0}; mp[a].v++; mp[a].i+=x.total; }
  for (const x of g)  { const a=x.fecha?.slice(0,4)||'S/A'; if(!mp[a]) mp[a]={v:0,i:0,g:0}; mp[a].g+=x.valor; }
  const hs=['Año','N° Ventas','Ingresos','Gastos','Utilidad'];
  const rs=Object.entries(mp).sort().map(([a,d])=>[a,d.v,+fmt2(d.i),+fmt2(d.g),+fmt2(d.i-d.g)]);
  return { hs, rs };
}

async function dReportesMes() {
  const [v,g]=await Promise.all([listarVentas(),listarGastos()]);
  const vc=v.filter(x=>x.estado==='COMPLETADA');
  const mp={};
  for (const x of vc) { const m=x.fecha?.slice(0,7)||'S/F'; if(!mp[m]) mp[m]={v:0,i:0,g:0,e:0,tr:0}; mp[m].v++; mp[m].i+=x.total; mp[m].e+=x.valorEfectivo||0; mp[m].tr+=x.valorTransferencia||0; }
  for (const x of g)  { const m=x.fecha?.slice(0,7)||'S/F'; if(!mp[m]) mp[m]={v:0,i:0,g:0,e:0,tr:0}; mp[m].g+=x.valor; }
  const hs=['Mes','N° Ventas','Ingresos','Gastos','Utilidad','Efectivo','Transferencia'];
  const rs=Object.entries(mp).sort().map(([m,d])=>[m,d.v,+fmt2(d.i),+fmt2(d.g),+fmt2(d.i-d.g),+fmt2(d.e),+fmt2(d.tr)]);
  return { hs, rs };
}

async function dResumen() {
  const [v,g]=await Promise.all([listarVentas(),listarGastos()]);
  const vc=v.filter(x=>x.estado==='COMPLETADA');
  const tv=vc.reduce((s,x)=>s+x.total,0); const tg=g.reduce((s,x)=>s+x.valor,0);
  const m=mesActual(); const vm=vc.filter(x=>x.fecha?.startsWith(m));
  const hs=['Concepto','Valor'];
  const rs=[
    [`Reporte generado: ${new Date().toLocaleString('es-CO')}`,''],
    ['',''],['HISTÓRICO GENERAL',''],
    ['Total ventas completadas',vc.length],
    ['Total ingresos',+fmt2(tv)],['Total gastos',+fmt2(tg)],['Utilidad neta',+fmt2(tv-tg)],
    ['',''],['MES ACTUAL',''],
    ['Ventas del mes',vm.length],
    ['Ingresos del mes',+fmt2(vm.reduce((s,x)=>s+x.total,0))],
  ];
  return { hs, rs, tv, tg, vc:vc.length, vm:vm.length };
}

// ── Portada corporativa ───────────────────────────────────────────────────────
async function portada(wb, tipo, sesion) {
  const t  = T[tipo] || T.maestro;
  const ws = wb.addWorksheet('◆ Portada');
  ws.columns = [
    { width:2 }, { width:26 }, { width:26 }, { width:22 }, { width:22 }, { width:2 },
  ];

  // Datos rápidos para KPIs
  const [v,g,p] = await Promise.all([listarVentas(),listarGastos(),listarProductos()]);
  const vc  = v.filter(x=>x.estado==='COMPLETADA');
  const tv  = vc.reduce((s,x)=>s+x.total,0);
  const tg  = g.reduce((s,x)=>s+x.valor,0);
  const vm  = vc.filter(x=>x.fecha?.startsWith(mesActual()));

  function mc(r1,c1,r2,c2) { try { ws.mergeCells(r1,c1,r2,c2); } catch(_) {} }
  function setCell(r,c,val,f,fi,al,bo) {
    const cell = ws.getCell(r,c);
    cell.value = val;
    if (f)  cell.font      = f;
    if (fi) cell.fill      = fi;
    if (al) cell.alignment = al;
    if (bo) cell.border    = bo;
  }

  // ── Bloque superior ─────────────────────────────────────────────────────────
  ws.getRow(1).height = 10;
  ws.getRow(2).height = 60;
  mc(2,2,2,5);
  setCell(2,2,'◆  ÁREA 17',font(true,32,t.bg),solid(t.A),align('center'),border('medium',t.A));

  ws.getRow(3).height = 28;
  mc(3,2,3,5);
  setCell(3,2,'Sistema de Gestión Empresarial',font(true,13,'FFFFFF'),solid(t.B),align('center'));

  ws.getRow(4).height = 26;
  mc(4,2,4,5);
  setCell(4,2,t.lbl,font(true,12,t.A),solid(t.bg),align('center'));

  ws.getRow(5).height = 14;

  // ── Info del reporte ─────────────────────────────────────────────────────────
  ws.getRow(6).height = 22;
  mc(6,2,6,5);
  setCell(6,2,'  INFORMACIÓN DEL REPORTE',font(true,10,'FFFFFF'),solid(t.A),align('left'));

  const lblFont  = font(true,  10, t.A);
  const valFont  = font(false, 10, '212121');
  const lblFill  = solid(t.bg);
  const valFill  = solid('FAFAFA');
  const brd      = border('thin','E0E0E0');

  const infoRows = [
    ['Fecha de generación:', fmtTS()],
    ['Usuario:', sesion?.nombreCompleto || 'Administrador'],
    ['Rol:', sesion?.rol || 'ADMINISTRADOR'],
    ['Período:', mesActual()],
  ];
  let ir = 7;
  for (const [lbl, val] of infoRows) {
    ws.getRow(ir).height = 22;
    setCell(ir, 2, lbl, lblFont, lblFill, align('left'), brd);
    mc(ir,3,ir,5);
    setCell(ir, 3, val, valFont, valFill, align('left'), brd);
    ir++;
  }

  ws.getRow(ir).height = 14;
  ir++;

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  mc(ir,2,ir,5);
  setCell(ir,2,'  RESUMEN EJECUTIVO',font(true,10,'FFFFFF'),solid(t.A),align('left'));
  ws.getRow(ir).height = 22;
  ir++;

  const kpis = [
    { val: fmtCOP(tv),  lbl: 'Ingresos Totales', col: '1B5E20' },
    { val: fmtCOP(tg),  lbl: 'Gastos Totales',   col: 'B71C1C' },
    { val: fmtCOP(tv-tg), lbl:'Utilidad Neta',   col: tv>=tg ? '1B5E20':'B71C1C' },
    { val: vm.length,   lbl: 'Ventas este Mes',   col: '0D47A1' },
    { val: p.length,    lbl: 'Productos',         col: '4A148C' },
    { val: vc.length,   lbl: 'Total Ventas',      col: t.A },
  ];

  for (let i=0; i<kpis.length; i+=2) {
    ws.getRow(ir).height   = 18;
    ws.getRow(ir+1).height = 22;

    const kL = kpis[i];
    mc(ir,2,ir,3);
    setCell(ir, 2, String(kL.val), font(true,16,kL.col), solid('FFFFFF'), align('center'),border('thin','E0E0E0'));
    mc(ir+1,2,ir+1,3);
    setCell(ir+1,2, kL.lbl, font(false,9,'888888'), solid('F9F9F9'), align('center'),border('thin','E0E0E0'));

    const kR = kpis[i+1];
    if (kR) {
      mc(ir,4,ir,5);
      setCell(ir, 4, String(kR.val), font(true,16,kR.col), solid('FFFFFF'), align('center'),border('thin','E0E0E0'));
      mc(ir+1,4,ir+1,5);
      setCell(ir+1,4, kR.lbl, font(false,9,'888888'), solid('F9F9F9'), align('center'),border('thin','E0E0E0'));
    }
    ir += 2;
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  ws.getRow(ir+1).height = 14;
  ws.getRow(ir+2).height = 18;
  mc(ir+2,2,ir+2,5);
  const fc = ws.getCell(ir+2,2);
  fc.value     = `Sistema ÁREA 17  ·  Reporte generado automáticamente  ·  ${new Date().getFullYear()}`;
  fc.font      = { name:'Calibri', size:8, italic:true, color:{ argb:'FF9E9E9E' } };
  fc.alignment = align('center');

  return ws;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSTRUCTOR PRINCIPAL — MISMOS DATOS, NUEVO DISEÑO
// ════════════════════════════════════════════════════════════════════════════════
async function construirLibro(tipo, sesion) {
  const XJS = await getXJS();
  const wb  = new XJS.Workbook();
  wb.creator  = 'Sistema ÁREA 17';
  wb.created  = new Date();
  wb.modified = new Date();

  if (tipo === 'inventario') {
    const d = await dInventario();
    sheet(wb,'Inventario', d.hs, d.rs,'inventario',{
      titulo: 'REPORTE DE INVENTARIO',
      info: `Generado: ${fmtTS()}   |   Productos: ${d.total}   |   Valor total: ${fmtCOP(d.valor)}`,
    });

  } else if (tipo === 'ventas') {
    const d = await dVentas();
    sheet(wb,'Ventas', d.hs, d.rs,'ventas',{
      titulo: 'REPORTE DE VENTAS',
      info: `Generado: ${fmtTS()}   |   Total: ${d.total}   |   Completadas: ${d.completadas}   |   Ingresos: ${fmtCOP(d.ingresos)}`,
    });

  } else if (tipo === 'gastos') {
    const d = await dGastos();
    sheet(wb,'Gastos', d.hs, d.rs,'gastos',{
      titulo: 'REPORTE DE GASTOS',
      info: `Generado: ${fmtTS()}   |   Gastos: ${d.total}   |   Total: ${fmtCOP(d.monto)}`,
    });

  } else if (tipo === 'usuarios') {
    const d = await dUsuarios();
    sheet(wb,'Usuarios', d.hs, d.rs,'usuarios',{
      titulo: 'REPORTE DE USUARIOS',
      info: `Generado: ${fmtTS()}   |   Total: ${d.total}   |   Admins: ${d.admins}   |   Vendedores: ${d.vends}`,
    });

  } else if (tipo === 'completo') {
    // Portada
    await portada(wb,'completo', sesion);

    // Ventas del mes — FILTRO IDÉNTICO AL ORIGINAL
    const v    = await listarVentas();
    const vMes = v.filter(x=>x.estado==='COMPLETADA'&&x.fecha?.startsWith(mesActual()));
    const hsV  = ['Código','Fecha','Hora','Vendedor','Total','Tipo Pago'];
    const rsV  = vMes.map(x=>[x.codigo,x.fecha,x.hora,x.vendedorNombre,+fmt2(x.total),x.tipoPago]);
    const totV = vMes.reduce((s,x)=>s+x.total,0);
    sheet(wb,'Ventas del Mes', hsV, rsV,'ventas',{
      titulo: `VENTAS — ${mesActual()}`,
      info: `Generado: ${fmtTS()}   |   Ventas del mes: ${vMes.length}   |   Total: ${fmtCOP(totV)}`,
    });

    const dG = await dGastos();
    sheet(wb,'Gastos', dG.hs, dG.rs,'gastos',{ titulo:'GASTOS EMPRESARIALES' });

    const dI = await dInventario();
    sheet(wb,'Inventario', dI.hs, dI.rs,'inventario',{ titulo:'INVENTARIO ACTUAL' });

    const dP = await dProductosMasVendidos();
    sheet(wb,'Top Productos', dP.hs, dP.rs,'completo',{ titulo:'TOP 20 PRODUCTOS MÁS VENDIDOS' });

  } else if (tipo === 'maestro') {
    // Portada
    await portada(wb,'maestro', sesion);

    // 11 hojas — MISMO ORDEN Y DATOS QUE EL ORIGINAL
    const dRes = await dResumen();
    sheet(wb,'Resumen General', dRes.hs, dRes.rs,'maestro',{ titulo:'RESUMEN GENERAL DEL SISTEMA' });

    const dV = await dVentas();
    sheet(wb,'Ventas', dV.hs, dV.rs,'ventas',{ titulo:'HISTORIAL COMPLETO DE VENTAS' });

    const dG = await dGastos();
    sheet(wb,'Gastos', dG.hs, dG.rs,'gastos',{ titulo:'GASTOS EMPRESARIALES' });

    const dI = await dInventario();
    sheet(wb,'Inventario', dI.hs, dI.rs,'inventario',{ titulo:'INVENTARIO ACTUAL' });

    const dPMV = await dProductosMasVendidos();
    sheet(wb,'Productos más Vendidos', dPMV.hs, dPMV.rs,'ventas',{ titulo:'TOP 20 PRODUCTOS MÁS VENDIDOS' });

    const dMov = await dMovimientos();
    sheet(wb,'Movimientos', dMov.hs, dMov.rs,'maestro',{ titulo:'MOVIMIENTOS DE VENTAS (DETALLE)' });

    const dEst = await dEstadisticas();
    sheet(wb,'Estadísticas', dEst.hs, dEst.rs,'maestro',{ titulo:'ESTADÍSTICAS DEL SISTEMA' });

    const dVend = await dVendedores();
    sheet(wb,'Vendedores', dVend.hs, dVend.rs,'ventas',{ titulo:'RENDIMIENTO DE VENDEDORES' });

    const dBal = await dBalance();
    sheet(wb,'Balance Financiero', dBal.hs, dBal.rs,'gastos',{ titulo:'BALANCE FINANCIERO POR MES' });

    const dA = await dAnio();
    sheet(wb,'Por Año', dA.hs, dA.rs,'maestro',{ titulo:'RESUMEN ANUAL' });

    const dRM = await dReportesMes();
    sheet(wb,'Por Mes', dRM.hs, dRM.rs,'maestro',{ titulo:'REPORTE DETALLADO POR MES' });

    const dU = await dUsuarios();
    sheet(wb,'Usuarios', dU.hs, dU.rs,'usuarios',{ titulo:'USUARIOS DEL SISTEMA' });
  }

  return wb.xlsx.writeBuffer();
}

// ════════════════════════════════════════════════════════════════════════════════
// GET HANDLER — IDÉNTICO AL ORIGINAL (mismo endpoint, mismos params, mismo output)
// ════════════════════════════════════════════════════════════════════════════════
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion))
    return NextResponse.json({ error:'Acceso denegado.' }, { status:403 });

  const { searchParams } = new URL(request.url);
  const accion = searchParams.get('accion');

  if (!accion || accion==='datos')
    return NextResponse.json(await getDatosReportes());

  if (accion==='exportar') {
    const tipo   = searchParams.get('tipo') || 'inventario';
    const labels = { inventario:'Inventario', ventas:'Ventas', gastos:'Gastos', usuarios:'Usuarios', completo:'Reporte_Completo', maestro:'Reporte_Maestro' };
    try {
      const buf  = await construirLibro(tipo, sesion);
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
      return NextResponse.json({ error:'Error al generar Excel.' }, { status:500 });
    }
  }

  return NextResponse.json({ error:'Acción no reconocida.' }, { status:400 });
}
