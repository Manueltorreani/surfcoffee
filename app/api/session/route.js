import { cookies } from 'next/headers';
import { anonClient, json } from '@/lib/server';

// Mantiene la sesión del cliente guardada en el dispositivo.
// El navegador guarda la sesión en localStorage, pero Safari en iPhone la borra si
// pasan 7 días sin entrar a la web. Por eso también guardamos el "refresh token"
// en una cookie del servidor (httpOnly, no la puede leer ningún script) que dura 400 días.
// Si el navegador perdió la sesión, la recuperamos desde esa cookie.

const NAME = 'sc_rt';
const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/session', maxAge: 60 * 60 * 24 * 400 };

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const jar = cookies();

  // guardar / actualizar el token (se llama cada vez que Supabase renueva la sesión)
  if (body.action === 'save') {
    const rt = String(body.refresh_token || '');
    if (!rt || rt.length > 512) return json({ error: 'bad' }, 400);
    jar.set(NAME, rt, opts);
    return json({ ok: true });
  }

  // recuperar la sesión cuando el navegador la perdió
  if (body.action === 'restore') {
    const rt = jar.get(NAME)?.value;
    if (!rt) return json({ session: null });
    const { data, error } = await anonClient().auth.refreshSession({ refresh_token: rt });
    if (error || !data?.session) { jar.delete({ name: NAME, path: opts.path }); return json({ session: null }); }
    jar.set(NAME, data.session.refresh_token, opts);
    return json({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
  }

  // cerrar sesión
  if (body.action === 'clear') {
    jar.delete({ name: NAME, path: opts.path });
    return json({ ok: true });
  }

  return json({ error: 'bad' }, 400);
}
