// Utilidades del sistema del equipo (solo servidor: rutas /api).
import crypto from 'node:crypto';
import { adminClient } from './server';

const TZ = 'America/Argentina/Buenos_Aires';
const SESSION_HOURS = 12;
const MAX_FAILS = 5;
const LOCK_MIN = 5;

// ---------- hora de Argentina ----------
export function arNow(d = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const g = (t) => (p.find((x) => x.type === t) || {}).value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, minutes: (Number(g('hour')) % 24) * 60 + Number(g('minute')) };
}
export const addDays = (date, n) => {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const timeToMin = (t) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export const hhmm = (t) => String(t || '').slice(0, 5);

// ---------- PIN ----------
export const pinOk = (pin) => /^\d{4}$/.test(String(pin || ''));
export function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return `${salt}:${h}`;
}
function samePin(pin, stored) {
  const [salt, h] = String(stored || '').split(':');
  if (!salt || !h) return false;
  const a = Buffer.from(h, 'hex');
  const b = crypto.scryptSync(String(pin), salt, 32);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Verifica nombre + PIN con bloqueo temporal tras varios intentos fallidos.
// Devuelve { staff } o { error, status }.
export async function checkPin(staffId, pin) {
  if (!staffId || !pinOk(pin)) return { error: 'Ingresá tu PIN de 4 números', status: 400 };
  const sb = adminClient();
  const { data: st } = await sb.from('staff').select('id, name, role, active').eq('id', staffId).maybeSingle();
  if (!st || !st.active) return { error: 'Usuario no encontrado', status: 404 };
  const { data: p } = await sb.from('staff_pins').select('*').eq('staff_id', staffId).maybeSingle();
  if (!p) return { error: 'Todavía no tenés PIN. Pedíselo a Manu o Mate.', status: 403 };
  if (p.locked_until && new Date(p.locked_until) > new Date()) {
    return { error: `Demasiados intentos. Probá de nuevo en ${LOCK_MIN} minutos.`, status: 429 };
  }
  if (!samePin(pin, p.pin_hash)) {
    const failed = (p.failed || 0) + 1;
    const lock = failed >= MAX_FAILS ? new Date(Date.now() + LOCK_MIN * 60000).toISOString() : null;
    await sb.from('staff_pins').update({ failed: lock ? 0 : failed, locked_until: lock }).eq('staff_id', staffId);
    return { error: lock ? `Demasiados intentos. Probá de nuevo en ${LOCK_MIN} minutos.` : 'PIN incorrecto', status: 401 };
  }
  if (p.failed || p.locked_until) await sb.from('staff_pins').update({ failed: 0, locked_until: null }).eq('staff_id', staffId);
  return { staff: st };
}

// ---------- tokens firmados ----------
function secret() {
  return crypto.createHmac('sha256', String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')).update('surfcoffee-equipo-v1').digest();
}
const b64 = (s) => Buffer.from(s).toString('base64url');
function sign(payload) {
  const body = b64(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}
function verify(token) {
  const [body, mac] = String(token || '').split('.');
  if (!body || !mac) return null;
  const good = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  if (good.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(mac))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
export const staffToken = (staffId, deviceId) => sign({ sid: staffId, did: deviceId, exp: Date.now() + SESSION_HOURS * 3600000 });

// ---------- dispositivos ----------
export const newDeviceToken = () => crypto.randomBytes(32).toString('hex');
export const tokenHash = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

export async function requireDevice(req) {
  const t = req.headers.get('x-device') || '';
  if (t.length < 32) return null;
  const sb = adminClient();
  const { data } = await sb.from('staff_devices').select('id, name, revoked').eq('token_hash', tokenHash(t)).maybeSingle();
  if (!data || data.revoked) return null;
  sb.from('staff_devices').update({ last_seen: new Date().toISOString() }).eq('id', data.id).then(() => {});
  return data;
}

// Dispositivo autorizado + sesión de la persona. Devuelve { device, staff } o null.
export async function requireStaff(req) {
  const device = await requireDevice(req);
  if (!device) return null;
  const p = verify(req.headers.get('x-staff'));
  if (!p || p.did !== device.id) return null;
  const { data: staff } = await adminClient().from('staff').select('id, name, role, active').eq('id', p.sid).maybeSingle();
  if (!staff || !staff.active) return null;
  return { device, staff };
}

// ---------- turnos y llegadas ----------
// Turno de hoy que corresponde a este momento.
// mode 'start' (llegada): el de inicio más cercano. mode 'end' (cierre): el último que ya empezó (o el primero).
export async function todayShift(staffId, mode = 'start') {
  const now = arNow();
  const { data } = await adminClient().from('staff_shifts').select('*').eq('staff_id', staffId).eq('day', now.date).order('start_time');
  if (!data || !data.length) return null;
  if (mode === 'end') {
    const started = data.filter((s) => timeToMin(s.start_time) <= now.minutes);
    return started.length ? started[started.length - 1] : data[0];
  }
  const key = (s) => Math.abs(timeToMin(s.start_time) - now.minutes);
  return data.reduce((best, s) => (key(s) < key(best) ? s : best));
}

export function arrivalMessage(name, status, minutes) {
  const first = String(name || '').split(' ')[0];
  const m = Math.abs(minutes || 0);
  if (status === 'antes') return { titulo: `¡${m} min antes, ${first}!`, mensaje: 'Así da gusto arrancar. Tenés tiempo para dejar todo listo antes del primer café.' };
  if (status === 'justo') return { titulo: `Justo a tiempo, ${first}`, mensaje: '¡A darle al turno!' };
  if (status === 'tarde') return { titulo: `Hoy llegaste ${m} min tarde`, mensaje: 'Queda registrado. En el próximo turno, a arrancar a horario: hace la diferencia para todo el equipo.' };
  return { titulo: `¡Buen día, ${first}!`, mensaje: 'Apertura registrada. No tenías turno cargado para hoy.' };
}

export function arrivalStatus(shift, nowMinutes, tolerance) {
  if (!shift) return { status: 'sin_turno', minutes: null };
  const diff = nowMinutes - timeToMin(shift.start_time);
  if (diff < 0) return { status: 'antes', minutes: diff };
  if (diff <= tolerance) return { status: 'justo', minutes: diff };
  return { status: 'tarde', minutes: diff };
}

// Registra la llegada (una por persona y turno). Devuelve el registro con el mensaje.
export class RuleError extends Error {}

export async function registerArrival(staff, source = 'pos', photoPath = null, where = null) {
  const sb = adminClient();
  const now = arNow();
  const shift = await todayShift(staff.id);
  if (shift) {
    const { count } = await sb.from('staff_closings').select('id', { count: 'exact', head: true }).eq('shift_id', shift.id);
    if (count) throw new RuleError(`El turno de ${hhmm(shift.start_time)} a ${hhmm(shift.end_time)} ya está cerrado. No se puede marcar la llegada después del cierre.`);
  }
  let q = sb.from('staff_attendance').select('*').eq('staff_id', staff.id).eq('day', now.date);
  q = shift ? q.eq('shift_id', shift.id) : q.is('shift_id', null);
  const { data: prev } = await q.maybeSingle();
  let row = prev;
  if (!row) {
    const { data: s } = await sb.from('settings').select('tolerancia_min').eq('id', 1).maybeSingle();
    const r = arrivalStatus(shift, now.minutes, s?.tolerancia_min ?? 10);
    const ins = await sb.from('staff_attendance').insert({
      staff_id: staff.id, shift_id: shift?.id || null, day: now.date, minutes_late: r.minutes, status: r.status, source,
      ...(photoPath ? { photo_path: photoPath } : {}),
      ...(where ? { ip: where.ip || null, geo: where.geo || null } : {}),
    }).select('*').single();
    if (ins.error) throw ins.error;
    row = ins.data;
  }
  return {
    ya_registrada: !!prev,
    estado: row.status,
    minutos: row.minutes_late,
    hora: new Date(row.clock_in).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }),
    turno: shift ? { desde: hhmm(shift.start_time), hasta: hhmm(shift.end_time) } : null,
    ...arrivalMessage(staff.name, row.status, row.minutes_late),
  };
}

// Mensaje motivador al cerrar el turno.
export async function closingMessage(staff) {
  const sb = adminClient();
  const now = arNow();
  const from = addDays(now.date, -6);
  const [c, a, n] = await Promise.all([
    sb.from('staff_closings').select('id', { count: 'exact', head: true }).eq('staff_id', staff.id).gte('day', from),
    sb.from('staff_attendance').select('day, status').eq('staff_id', staff.id).gte('day', from),
    sb.from('staff_shifts').select('day, start_time, end_time').eq('staff_id', staff.id).gte('day', now.date).order('day').order('start_time').limit(20),
  ]);
  const first = String(staff.name || '').split(' ')[0];
  const att = a.data || [];
  const onTime = att.filter((x) => x.status === 'antes' || x.status === 'justo').length;
  const lateToday = att.some((x) => x.day === now.date && x.status === 'tarde');
  const closings = c.count || 0;
  const next = (n.data || []).find((x) => x.day > now.date || timeToMin(x.start_time) > now.minutes);
  const titulo = lateToday ? `Buen cierre, ${first}` : `¡Gran turno, ${first}!`;
  const partes = [`Cierre completo con todas las fotos y el stock.`];
  if (closings > 1) partes.push(`Esta semana llevás ${closings} cierres completos${att.length ? ` y ${onTime} de ${att.length} llegadas a horario` : ''}.`);
  const desafio = lateToday ? 'Para el próximo turno: llegar a horario. Vos podés.' : onTime === att.length && att.length > 1 ? 'Venís impecable con los horarios: seguí así.' : 'Gracias por dejar todo listo para el próximo turno.';
  return { titulo, mensaje: partes.join(' '), desafio, proximo: next ? { dia: next.day, desde: hhmm(next.start_time), hasta: hhmm(next.end_time) } : null };
}

// Error de base → texto claro (sobre todo si falta correr el SQL del equipo).
export function dbErr(error, fallback) {
  const m = String(error?.message || '');
  if (error?.code === '42P01' || error?.code === 'PGRST205' || /does not exist|schema cache/i.test(m)) {
    return 'Falta crear las tablas del equipo: corré supabase/2026-10-equipo.sql en Supabase → SQL Editor.';
  }
  return `${fallback}${m ? ` (${m})` : ''}`;
}

// ---------- ¿está en el café? ----------
export function clientIp(req) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
}
function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000, r = (x) => (x * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
export function parseGeo(v) {
  const lat = Number(v?.lat), lng = Number(v?.lng), acc = Number(v?.acc);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng, acc: Number.isFinite(acc) ? Math.round(acc) : null };
}
// Vale si está en la red del café (IP) o dentro del radio del café (GPS).
// Si todavía no se configuró ninguna de las dos, deja pasar.
export async function checkPlace(req, geo) {
  const ip = clientIp(req);
  const { data: s } = await adminClient().from('settings').select('cafe_lat, cafe_lng, cafe_radio_m, cafe_ips').eq('id', 1).maybeSingle();
  const ips = Array.isArray(s?.cafe_ips) ? s.cafe_ips : [];
  const hasGeo = s && s.cafe_lat != null && s.cafe_lng != null;
  const info = { ip, geo: geo ? { ...geo } : null };
  if (!hasGeo && !ips.length) return { ok: true, ...info };
  if (ip && ips.includes(ip)) { info.geo = info.geo ? { ...info.geo, via: 'wifi' } : { via: 'wifi' }; return { ok: true, ...info }; }
  if (hasGeo && geo) {
    const d = Math.round(distM(geo.lat, geo.lng, s.cafe_lat, s.cafe_lng));
    info.geo.dist = d;
    const radius = (s.cafe_radio_m || 150) + Math.min(geo.acc || 0, 150);
    if (d <= radius) return { ok: true, ...info };
    return { ok: false, error: `Estás a ${d >= 1000 ? (d / 1000).toFixed(1) + ' km' : d + ' m'} del café. Solo se puede marcar desde el local.`, ...info };
  }
  if (hasGeo && !geo) return { ok: false, error: 'Activá la ubicación de la tablet (permiso de ubicación del navegador) para marcar desde el café.', ...info };
  return { ok: false, error: 'Conectate al wifi del café para marcar.', ...info };
}
