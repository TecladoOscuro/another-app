export const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export const WEEKDAYS_ES = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts, n) {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfMonth(year, month) {
  return new Date(year, month, 1, 0, 0, 0, 0).getTime();
}

export function endOfMonth(year, month) {
  return new Date(year, month + 1, 1, 0, 0, 0, 0).getTime();
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function monthLabel(year, month) {
  return `${MONTHS_ES[month]} ${year}`;
}

export function pad2(n) {
  return n.toString().padStart(2, '0');
}

export function formatTime(ts) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDate(ts) {
  const d = new Date(ts);
  return `${pad2(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(ts) {
  return `${formatDate(ts)} · ${formatTime(ts)}`;
}

export function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return '—';
  if (seconds < 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m} min`;
  return `${m}m ${s}s`;
}

export function formatDurationShort(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m`;
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function toDateInput(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function toTimeInput(ts) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fromDateTimeInputs(dateStr, timeStr) {
  if (!dateStr || !timeStr) return Date.now();
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0).getTime();
}

export function isoWeek(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function formatBigNumber(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export function relativeDay(ts) {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = d.getTime();
  const diff = Math.round((t - today.getTime()) / 86400000);
  if (diff === 0) return 'hoy';
  if (diff === -1) return 'ayer';
  if (diff === 1) return 'mañana';
  if (diff < 0 && diff > -7) return `hace ${-diff} días`;
  return formatDate(ts);
}
