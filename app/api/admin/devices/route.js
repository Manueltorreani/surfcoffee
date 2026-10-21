import { adminClient, json, requireAdmin } from '@/lib/server';
import { newDeviceToken, tokenHash } from '@/lib/staff';

// El administrador autoriza el dispositivo desde el que está entrando (la tablet del café).
// El token se guarda solo en ese dispositivo; en la base queda su hash.
// POST /api/admin/devices   Authorization: Bearer <token>   body { name }
export async function POST(req) {
  const admin = await requireAdmin(req);
  if (!admin) return json({ error: 'No autorizado' }, 401);
  const { name } = await req.json().catch(() => ({}));
  const nm = String(name || '').trim().slice(0, 60) || 'Tablet del café';
  const token = newDeviceToken();
  const { data, error } = await adminClient().from('staff_devices').insert({ name: nm, token_hash: tokenHash(token) }).select('id, name').single();
  if (error) return json({ error: 'No se pudo autorizar' }, 500);
  return json({ token, device: data });
}
