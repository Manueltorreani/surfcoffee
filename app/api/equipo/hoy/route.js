import { adminClient, json } from '@/lib/server';
import { addDays, arNow, closingPlan, hhmm, requireStaff } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const labelOf = (defs, kind) => (Array.isArray(defs) ? defs.find((d) => d.key === kind)?.label : null) || '';

// Tablet → todo lo que necesita la pantalla de la persona que entró.
// GET /api/equipo/hoy   headers x-device, x-staff
export async function GET(req) {
  const me = await requireStaff(req);
  if (!me) return json({ error: 'SESSION' }, 401);
  const sb = adminClient();
  const now = arNow();
  const [shifts, att, plan, closed, set] = await Promise.all([
    sb.from('staff_shifts').select('id, day, start_time, end_time, note, kind').eq('staff_id', me.staff.id).gte('day', now.date).lte('day', addDays(now.date, 13)).order('day').order('start_time'),
    sb.from('staff_attendance').select('shift_id, clock_in, status, minutes_late').eq('staff_id', me.staff.id).eq('day', now.date).order('clock_in'),
    closingPlan(me.staff.id),
    sb.from('staff_closings').select('shift_id, created_at').eq('staff_id', me.staff.id).eq('day', now.date).order('created_at'),
    sb.from('settings').select('turnos_def').eq('id', 1).maybeSingle(),
  ]);
  return json({
    staff: me.staff,
    hoy: now.date,
    ahora: now.minutes,
    turnos: (shifts.data || []).map((s) => ({ id: s.id, dia: s.day, desde: hhmm(s.start_time), hasta: hhmm(s.end_time), nota: s.note, tipo: labelOf(set.data?.turnos_def, s.kind) })),
    llegadas: att.data || [],
    cierres: closed.data || [],
    // lo que pide el cierre del turno actual
    fotos: [...plan.checks, ...plan.extras],
    stock: plan.stockRequired ? plan.items.map((i) => ({ id: i.id, name: i.name, unit: i.unit })) : [],
    stock_requerido: plan.stockRequired,
  });
}
