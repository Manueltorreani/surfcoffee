import { adminClient, json } from '@/lib/server';
import { addDays, arNow, hhmm, requireStaff } from '@/lib/staff';

export const dynamic = 'force-dynamic';

// Tablet → todo lo que necesita la pantalla de la persona que entró.
// GET /api/equipo/hoy   headers x-device, x-staff
export async function GET(req) {
  const me = await requireStaff(req);
  if (!me) return json({ error: 'SESSION' }, 401);
  const sb = adminClient();
  const now = arNow();
  const [shifts, att, checks, items, closed] = await Promise.all([
    sb.from('staff_shifts').select('id, day, start_time, end_time, note').eq('staff_id', me.staff.id).gte('day', now.date).lte('day', addDays(now.date, 13)).order('day').order('start_time'),
    sb.from('staff_attendance').select('clock_in, status, minutes_late').eq('staff_id', me.staff.id).eq('day', now.date).order('clock_in', { ascending: false }).limit(1),
    sb.from('closing_checks').select('id, name, hint').eq('active', true).order('sort').order('name'),
    sb.from('stock_items').select('id, name, unit').eq('active', true).order('sort').order('name'),
    sb.from('staff_closings').select('created_at').eq('staff_id', me.staff.id).eq('day', now.date).order('created_at', { ascending: false }).limit(1),
  ]);
  return json({
    staff: me.staff,
    hoy: now.date,
    turnos: (shifts.data || []).map((s) => ({ id: s.id, dia: s.day, desde: hhmm(s.start_time), hasta: hhmm(s.end_time), nota: s.note })),
    llegada: (att.data || [])[0] || null,
    fotos: checks.data || [],
    stock: items.data || [],
    cerro_hoy: (closed.data || [])[0]?.created_at || null,
  });
}
