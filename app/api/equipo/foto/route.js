import crypto from 'node:crypto';
import { adminClient, json } from '@/lib/server';
import { arNow, requireStaff } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const MAX = 5 * 1024 * 1024;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Tablet → sube una foto del cierre. La hora la pone el servidor.
// POST /api/equipo/foto   headers x-device, x-staff   FormData { file, check_id }
export async function POST(req) {
  const me = await requireStaff(req);
  if (!me) return json({ error: 'SESSION' }, 401);
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const checkId = String(form?.get('check_id') || '');
  if (!file || typeof file.arrayBuffer !== 'function' || !checkId) return json({ error: 'Falta la foto' }, 400);
  const ext = TYPES[file.type];
  if (!ext) return json({ error: 'Formato no válido' }, 400);
  if (file.size > MAX) return json({ error: 'La foto es muy pesada' }, 400);
  const sb = adminClient();
  const isExtra = checkId.startsWith('x-');
  const { data: chk } = isExtra
    ? await sb.from('extra_tasks').select('id').eq('id', checkId.slice(2)).eq('active', true).maybeSingle()
    : await sb.from('closing_checks').select('id').eq('id', checkId).eq('active', true).maybeSingle();
  if (!chk) return json({ error: 'Ítem no válido' }, 400);
  const day = arNow().date;
  const path = `${day}/${me.staff.id}/${checkId}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const { error } = await sb.storage.from('equipo').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) return json({ error: 'No se pudo guardar la foto' }, 500);
  return json({ path, taken_at: new Date().toISOString() });
}
