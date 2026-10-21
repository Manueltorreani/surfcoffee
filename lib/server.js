import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Cliente con la service role key: SOLO para rutas /api (servidor). Saltea RLS.
export function adminClient() {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Cliente anónimo de servidor (para iniciar sesión o pedir mails de recuperación).
export function anonClient() {
  return createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const json = (data, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store' } });

export const normPhone = (s) => String(s || '').replace(/\D/g, '').replace(/^0+/, '');

// Busca el email de una cuenta a partir de email o celular.
export async function emailFor(identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) return null;
  if (raw.includes('@')) return raw.toLowerCase();
  const phone = normPhone(raw);
  if (phone.length < 8) return null;
  const { data } = await adminClient().from('customers').select('email').eq('phone', phone).not('auth_user_id', 'is', null).maybeSingle();
  return data?.email || null;
}

// Verifica que quien llama sea administrador (token del navegador en Authorization).
export async function requireAdmin(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const sb = adminClient();
  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user) return null;
  const { data: a } = await sb.from('admins').select('user_id').eq('user_id', u.user.id).maybeSingle();
  return a ? u.user : null;
}

// Para el software de ventas: header "x-api-key" igual a POS_API_KEY.
export function posAuthorized(req) {
  const key = process.env.POS_API_KEY;
  if (!key || key.length < 16) return false;
  const got = req.headers.get('x-api-key') || '';
  if (got.length !== key.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}
