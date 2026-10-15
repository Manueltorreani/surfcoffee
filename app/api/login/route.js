import { anonClient, emailFor, json } from '@/lib/server';

// Inicia sesión con email o celular + contraseña.
// El celular se traduce a email en el servidor, así no se expone el email de nadie.
export async function POST(req) {
  const { identifier, password } = await req.json().catch(() => ({}));
  if (!identifier || !password) return json({ error: 'Completá email o celular y contraseña' }, 400);
  const email = await emailFor(identifier);
  if (!email) return json({ error: 'Email, celular o contraseña incorrectos' }, 401);
  const { data, error } = await anonClient().auth.signInWithPassword({ email, password: String(password) });
  if (error) {
    if (/confirm/i.test(error.message)) return json({ error: 'Todavía no confirmaste tu email. Revisá tu correo y tocá el link.' }, 401);
    return json({ error: 'Email, celular o contraseña incorrectos' }, 401);
  }
  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
}
