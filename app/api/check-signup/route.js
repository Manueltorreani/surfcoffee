import { adminClient, json, normPhone } from '@/lib/server';
import { nameKey } from '@/lib/utils';

// Antes de crear la cuenta: avisa si el nombre, email o celular ya tienen cuenta web.
export async function POST(req) {
  const { name, email, phone } = await req.json().catch(() => ({}));
  const sb = adminClient();
  const k = nameKey(name);
  const p = normPhone(phone);
  const e = String(email || '').trim().toLowerCase();

  const { data: byName } = await sb.from('customers').select('id, auth_user_id').eq('name_key', k).maybeSingle();
  if (byName?.auth_user_id) return json({ error: 'Ya hay una cuenta con ese nombre. Iniciá sesión o recuperá tu contraseña.' });

  const { data: byEmail } = await sb.from('customers').select('id').eq('email', e).limit(1);
  if (byEmail?.length) return json({ error: 'Ese email ya está registrado.' });

  const { data: byPhone } = await sb.from('customers').select('id, name_key').eq('phone', p).limit(1);
  if (byPhone?.length && byPhone[0].name_key !== k) return json({ error: 'Ese celular ya está registrado.' });

  return json({ ok: true, existing: !!byName });
}
