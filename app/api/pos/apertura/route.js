import { adminClient, json, posAuthorized } from '@/lib/server';
import { registerArrival, RuleError } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Software de ventas → al abrir caja registra la llegada y devuelve el mensaje
// para mostrar en pantalla (antes de hora / justo / tarde).
// POST /api/pos/apertura   header x-api-key   body { staff_id }
export async function POST(req) {
  if (!posAuthorized(req)) return json({ error: 'API key inválida' }, 401);
  const { staff_id } = await req.json().catch(() => ({}));
  if (!staff_id) return json({ error: 'Falta staff_id' }, 400);
  const { data: staff } = await adminClient().from('staff').select('id, name, active').eq('id', staff_id).maybeSingle();
  if (!staff || !staff.active) return json({ error: 'Usuario no encontrado' }, 404);
  try {
    return json(await registerArrival(staff, 'pos'));
  } catch (e) {
    if (e instanceof RuleError) return json({ error: e.message }, 409);
    return json({ error: 'No se pudo registrar la apertura' }, 500);
  }
}
