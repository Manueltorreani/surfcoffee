import { adminClient, json, requireAdmin } from '@/lib/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// El administrador elimina un cliente: su cuenta web, puntos, movimientos, chat y archivos.
export async function POST(req) {
  const admin = await requireAdmin(req);
  if (!admin) return json({ error: 'No autorizado' }, 401);
  const { customerId } = await req.json().catch(() => ({}));
  if (!customerId) return json({ error: 'Falta el cliente' }, 400);
  const sb = adminClient();

  const { data: c } = await sb.from('customers').select('id, auth_user_id').eq('id', customerId).maybeSingle();
  if (!c) return json({ error: 'No existe ese cliente' }, 404);
  if (c.auth_user_id) {
    const { data: isAdm } = await sb.from('admins').select('user_id').eq('user_id', c.auth_user_id).maybeSingle();
    if (isAdm) return json({ error: 'Es una cuenta del equipo; no se puede eliminar desde acá' }, 400);
  }

  // archivos del chat (carpeta del cliente)
  const { data: files } = await sb.storage.from('chat').list(customerId, { limit: 1000 });
  if (files?.length) await sb.storage.from('chat').remove(files.map((f) => `${customerId}/${f.name}`));

  // ficha (borra en cascada movimientos, conversación y mensajes)
  const { error } = await sb.from('customers').delete().eq('id', customerId);
  if (error) return json({ error: 'No se pudo eliminar el cliente' }, 500);

  // cuenta web
  if (c.auth_user_id) await sb.auth.admin.deleteUser(c.auth_user_id);
  return json({ ok: true });
}
