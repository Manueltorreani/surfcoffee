import { adminClient, json } from '@/lib/server';
import { addDays, arNow, closingMessage, requireStaff, todayShift } from '@/lib/staff';

// Tablet → guarda el cierre de turno: una foto por ítem + conteo de stock.
// POST /api/equipo/cierre   headers x-device, x-staff
// body { fotos: [{ check_id, path, taken_at }], stock: [{ item_id, qty }], nota }
export async function POST(req) {
  const me = await requireStaff(req);
  if (!me) return json({ error: 'SESSION' }, 401);
  const body = await req.json().catch(() => ({}));
  const sb = adminClient();
  const day = arNow().date;
  const [checks, items] = await Promise.all([
    sb.from('closing_checks').select('id, name').eq('active', true).order('sort'),
    sb.from('stock_items').select('id, name, unit, min_qty').eq('active', true).order('sort'),
  ]);

  // fotos: una por cada ítem activo, subidas por esta persona hoy (o anoche, si el cierre pasa la medianoche)
  const okPath = (p, checkId) => [day, addDays(day, -1)].some((d) => p.startsWith(`${d}/${me.staff.id}/${checkId}-`));
  const given = new Map((Array.isArray(body.fotos) ? body.fotos : []).map((f) => [String(f.check_id), f]));
  const photos = [];
  for (const c of checks.data || []) {
    const f = given.get(c.id);
    if (!f || typeof f.path !== 'string' || !okPath(f.path, c.id)) {
      return json({ error: `Falta la foto: ${c.name}` }, 400);
    }
    photos.push({ check_id: c.id, name: c.name, path: f.path, taken_at: f.taken_at || null });
  }

  // stock: todos los insumos con un número
  const counts = new Map((Array.isArray(body.stock) ? body.stock : []).map((s) => [String(s.item_id), s.qty]));
  const stock = [];
  for (const it of items.data || []) {
    const raw = counts.get(it.id);
    const qty = Number(String(raw ?? '').replace(',', '.'));
    if (raw === undefined || raw === null || raw === '' || !Number.isFinite(qty) || qty < 0) {
      return json({ error: `Falta contar: ${it.name}` }, 400);
    }
    stock.push({ item_id: it.id, name: it.name, unit: it.unit, qty, min: Number(it.min_qty) || 0 });
  }
  const missing = stock.filter((s) => s.qty < s.min).map((s) => ({ ...s, falta: Math.round((s.min - s.qty) * 100) / 100 }));

  const shift = await todayShift(me.staff.id);
  const { error } = await sb.from('staff_closings').insert({
    staff_id: me.staff.id, staff_name: me.staff.name, device_id: me.device.id, shift_id: shift?.id || null,
    day, photos, stock, missing, note: String(body.nota || '').slice(0, 500),
  });
  if (error) return json({ error: 'No se pudo guardar el cierre' }, 500);
  const msg = await closingMessage(me.staff);
  return json({ ok: true, faltantes: missing.length, ...msg });
}
