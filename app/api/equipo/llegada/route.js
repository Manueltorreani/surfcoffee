import crypto from 'node:crypto';
import { adminClient, json } from '@/lib/server';
import { arNow, checkPlace, parseGeo, registerArrival, requireStaff, RuleError } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Tablet → marca la llegada con una foto del local. La hora la pone el servidor
// y se compara con el turno (antes / justo / tarde). Una llegada por turno.
// POST /api/equipo/llegada   headers x-device, x-staff   FormData { file }
export async function POST(req) {
  const me = await requireStaff(req);
  if (!me) return json({ error: 'SESSION' }, 401);
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'Falta la foto' }, 400);
  const ext = TYPES[file.type];
  if (!ext) return json({ error: 'Formato no válido' }, 400);
  if (file.size > 5 * 1024 * 1024) return json({ error: 'La foto es muy pesada' }, 400);
  let geo = null;
  try { geo = parseGeo(JSON.parse(String(form.get('geo') || 'null'))); } catch {}
  const place = await checkPlace(req, geo);
  if (!place.ok) return json({ error: place.error }, 403);
  const sb = adminClient();
  const path = `${arNow().date}/${me.staff.id}/llegada-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const up = await sb.storage.from('equipo').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (up.error) return json({ error: 'No se pudo guardar la foto' }, 500);
  try {
    const r = await registerArrival(me.staff, 'tablet', path, place);
    if (r.ya_registrada) await sb.storage.from('equipo').remove([path]);
    return json(r);
  } catch (e) {
    await sb.storage.from('equipo').remove([path]);
    if (e instanceof RuleError) return json({ error: e.message }, 409);
    return json({ error: 'No se pudo registrar la llegada' }, 500);
  }
}
