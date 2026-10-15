import { adminClient, json, requireAdmin } from '@/lib/server';

// El administrador le pone una contraseña nueva a un cliente.
export async function POST(req) {
  const admin = await requireAdmin(req);
  if (!admin) return json({ error: 'No autorizado' }, 401);
  const { customerId, password } = await req.json().catch(() => ({}));
  if (!customerId || String(password || '').length < 6) return json({ error: 'Datos inválidos' }, 400);
  const sb = adminClient();
  const { data: c } = await sb.from('customers').select('auth_user_id').eq('id', customerId).maybeSingle();
  if (!c?.auth_user_id) return json({ error: 'Ese cliente no tiene cuenta web' }, 404);
  const { error } = await sb.auth.admin.updateUserById(c.auth_user_id, { password: String(password) });
  if (error) return json({ error: 'No se pudo cambiar la contraseña' }, 500);
  return json({ ok: true });
}
