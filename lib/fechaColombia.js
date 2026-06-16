// Utilidades de fecha/hora ancladas a la zona horaria de Colombia (America/Bogota, UTC-5).
// Evitan el uso de toISOString()/getHours() locales, que dependen del huso horario
// del servidor (normalmente UTC) y desfasan la fecha en horas de la noche.

const TIMEZONE = 'America/Bogota';

function partesFecha(date = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const obj = {};
  for (const { type, value } of partes) obj[type] = value;
  if (obj.hour === '24') obj.hour = '00'; // algunos motores devuelven "24" para medianoche
  return obj;
}

// Fecha actual en Colombia, formato YYYY-MM-DD.
export function fechaHoyColombia(date = new Date()) {
  const p = partesFecha(date);
  return `${p.year}-${p.month}-${p.day}`;
}

// Hora actual en Colombia, formato HH:MM:SS.
export function horaActualColombia(date = new Date()) {
  const p = partesFecha(date);
  return `${p.hour}:${p.minute}:${p.second}`;
}

// Fecha (YYYY-MM-DD) hace N días, calculada en hora de Colombia.
export function fechaHaceDiasColombia(dias, date = new Date()) {
  return fechaHoyColombia(new Date(date.getTime() - dias * 86400000));
}

// Primer día del mes actual en Colombia, formato YYYY-MM-01.
export function primerDiaMesColombia(date = new Date()) {
  return `${fechaHoyColombia(date).slice(0, 7)}-01`;
}

// Formatea una fecha/hora en hora de Colombia con las opciones de Intl.DateTimeFormat dadas.
export function formatoColombia(date = new Date(), opciones = {}) {
  return new Intl.DateTimeFormat('es-CO', { timeZone: TIMEZONE, ...opciones }).format(date);
}

// Retorna { lunes, domingo } (YYYY-MM-DD) de la semana actual en hora de Colombia.
// La semana comienza el lunes y termina el domingo, sin importar el día de inicio de uso del sistema.
export function semanaActualColombia(date = new Date()) {
  const hoy = fechaHoyColombia(date);
  // Mediodía Colombia expresado en UTC (Colombia = UTC-5, 17:00 UTC = 12:00 Bogotá).
  // Usar mediodía garantiza que getDay() coincida con el día calendario colombiano.
  const noon = new Date(`${hoy}T17:00:00Z`);
  const dia = noon.getDay(); // 0=Dom, 1=Lun, 2=Mar, ..., 6=Sáb
  const diasDesdeLunes = dia === 0 ? 6 : dia - 1;
  const lunesMs   = noon.getTime() - diasDesdeLunes * 86400000;
  const domingoMs = lunesMs + 6 * 86400000;
  return {
    lunes:   fechaHoyColombia(new Date(lunesMs)),
    domingo: fechaHoyColombia(new Date(domingoMs)),
  };
}
