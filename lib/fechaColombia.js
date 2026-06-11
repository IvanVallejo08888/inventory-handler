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
