import { adminClient, json, requireAdmin } from '@/lib/server';
import { dbErr, hashPin, pinOk } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// El administrador asigna o cambia el PIN de una persona del equipo.
// POST /api/admin/staff-pin   Authorization: Bearer <token>   body { staff_id, pin }
export async function POST(req) {
  const admin = await requireAdmin(req);
  if (!admin) return json({ error: 'No autorizado' }, 401);
  const { staff_id, pin } = await req.json().catch(() => ({}));
  if (!staff_id || !pinOk(pin)) return json({ error: 'El PIN tiene que tener 4 números' }, 400);
  const sb = adminClient();
  const { data: st } = await sb.from('staff').select('id').eq('id', staff_id).maybeSingle();
  if (!st) return json({ error: 'No existe esa persona' }, 404);
  const { error } = await sb.from('staff_pins').upsert({ staff_id, pin_hash: hashPin(pin), failed: 0, locked_until: null });
  if (error) return json({ error: dbErr(error, 'No se pudo guardar el PIN') }, 500);
  await sb.from('staff').update({ has_pin: true }).eq('id', staff_id);
  return json({ ok: true });
}
