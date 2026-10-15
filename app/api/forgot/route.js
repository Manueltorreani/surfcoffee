import { anonClient, emailFor, json } from '@/lib/server';

// Manda el mail de "elegir contraseña nueva". Siempre responde ok para no revelar qué cuentas existen.
export async function POST(req) {
  const { identifier } = await req.json().catch(() => ({}));
  const email = await emailFor(identifier);
  if (email) {
    const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    await anonClient().auth.resetPasswordForEmail(email, { redirectTo: `${site}/reset` });
  }
  return json({ ok: true });
}
