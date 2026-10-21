import { json, posAuthorized } from '@/lib/server';
import { checkPin } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Software de ventas → verifica nombre + PIN (el mismo PIN que la tablet).
// POST /api/pos/staff-login   header x-api-key   body { staff_id, pin }
export async function POST(req) {
  if (!posAuthorized(req)) return json({ error: 'API key inválida' }, 401);
  const { staff_id, pin } = await req.json().catch(() => ({}));
  const r = await checkPin(staff_id, pin);
  if (r.error) return json({ error: r.error }, r.status);
  return json({ ok: true, staff: { id: r.staff.id, name: r.staff.name, role: r.staff.role } });
}
