const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const money = (n) => fmt.format(Number(n) || 0);
export const num = (n) => new Intl.NumberFormat('es-AR').format(Number(n) || 0);

export const cleanName = (s) => String(s || '').trim().replace(/\s+/g, ' ');
export const fullOk = (s) => cleanName(s).split(' ').filter((w) => w.length > 1).length >= 2;
export const nameKey = (s) =>
  cleanName(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const properName = (s) => cleanName(s).toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
export const normPhone = (s) => String(s || '').replace(/\D/g, '').replace(/^0+/, '');
export const normEmail = (e) => String(e || '').trim().toLowerCase();
export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail(e));
export const pwErr = (a, b) => (String(a || '').length < 6 ? 'La contraseña tiene que tener al menos 6 caracteres' : b !== undefined && a !== b ? 'Las contraseñas no coinciden' : '');

export const when = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts), n = new Date();
  const t = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === n.toDateString() ? t : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' + t;
};

export const STATUS = { nuevo: 'Nuevo', confirmado: 'Confirmado', en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado' };

// ---------- horario de delivery (hora de Argentina) ----------
export const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
function baNow() {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const g = (t) => (p.find((x) => x.type === t) || {}).value;
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')), min: (Number(g('hour')) % 24) * 60 + Number(g('minute')) };
}
const toMin = (s) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(s || '').trim()); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const dDays = (c) => (Array.isArray(c?.delivery_days) ? c.delivery_days : [0, 1, 2, 3, 4, 5, 6]);
export function deliveryState(c) {
  if (!c) return { open: false, why: '' };
  if (c.delivery_open === false) return { open: false, why: 'El delivery está pausado en este momento.' };
  const f = toMin(c.delivery_from), t = toMin(c.delivery_to), days = dDays(c), n = baNow();
  if (f == null || t == null) return { open: days.includes(n.day), why: '' };
  const open = f <= t ? days.includes(n.day) && n.min >= f && n.min < t : (days.includes(n.day) && n.min >= f) || (days.includes((n.day + 6) % 7) && n.min < t);
  return { open, why: open ? '' : 'Ahora estamos fuera del horario de delivery.' };
}
export function hoursText(c) {
  if (!c) return '';
  const days = dDays(c);
  const d = days.length === 7 ? 'Todos los días' : days.length ? [1, 2, 3, 4, 5, 6, 0].filter((x) => days.includes(x)).map((x) => DAYS[x]).join(', ') : 'Sin días cargados';
  return 'Delivery: ' + d + (c.delivery_from && c.delivery_to ? ` de ${c.delivery_from} a ${c.delivery_to} h` : '');
}

// ---------- zona de entrega ----------
export const zoneOf = (c) => ({ h: Array.isArray(c?.zone_h) ? c.zone_h : [], v: Array.isArray(c?.zone_v) ? c.zone_v : [] });
export const normS = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
export function checkAddr(c, street, numv) {
  if (!street) return null;
  if (street === '__otra') return { ok: false };
  const z = zoneOf(c);
  const s = [...z.h, ...z.v].find((x) => x.name === street);
  if (!s) return { ok: false };
  if (!String(numv || '').trim()) return null;
  const n = Number(numv);
  if (!(n > 0)) return { ok: false, bad: true };
  if ((s.min != null && n < s.min) || (s.max != null && n > s.max)) return { ok: false };
  return { ok: true };
}
export function zoneText(c) {
  const z = zoneOf(c);
  return z.h.length > 1 && z.v.length > 1 ? `Llegamos de ${z.v[0].name} a ${z.v[z.v.length - 1].name}, y de ${z.h[0].name} a ${z.h[z.h.length - 1].name}.` : '';
}
export const parseStreets = (txt) =>
  String(txt || '').split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((r) => r[0])
    .map((r) => ({ name: r[0], min: r[1] ? Number(r[1]) : null, max: r[2] ? Number(r[2]) : null }));
export const streetsTxt = (a) => (a || []).map((x) => [x.name, x.min ?? '', x.max ?? ''].join(' | ').replace(/( \| )+$/, '')).join('\n');

export function groupMenu(items) {
  const g = {};
  items.forEach((i) => { const k = i.category || 'Otros'; (g[k] = g[k] || []).push(i); });
  return Object.entries(g)
    .map(([k, v]) => [k, v.sort((a, b) => (a.sort ?? 100) - (b.sort ?? 100) || String(a.name).localeCompare(b.name))])
    .sort((a, b) => Math.min(...a[1].map((i) => i.sort ?? 100)) - Math.min(...b[1].map((i) => i.sort ?? 100)) || a[0].localeCompare(b[0]));
}

// Mensajes de error de la base → texto para el cliente
export function errText(e) {
  const m = String(e?.message || e || '');
  const map = {
    DELIVERY_CLOSED: 'El delivery está cerrado en este momento.',
    OUT_OF_ZONE: 'Hasta esa dirección no llegamos.',
    EMPTY_ORDER: 'Agregá al menos un producto disponible.',
    NOT_ENOUGH_POINTS: 'No le alcanzan los puntos.',
    NOT_LOGGED_IN: 'Iniciá sesión para continuar.',
    FORBIDDEN: 'No tenés permiso para hacer esto.',
  };
  for (const k in map) if (m.includes(k)) return map[k];
  return 'No se pudo completar. Probá de nuevo.';
}
