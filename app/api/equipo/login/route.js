import { json } from '@/lib/server';
import { checkPin, requireDevice, staffToken } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Tablet del café → ingreso con nombre + PIN.
// POST /api/equipo/login   header x-device   body { staff_id, pin }
export async function POST(req) {
  const device = await requireDevice(req);
  if (!device) return json({ error: 'DEVICE' }, 401);
  const { staff_id, pin } = await req.json().catch(() => ({}));
  const r = await checkPin(staff_id, pin);
  if (r.error) return json({ error: r.error }, r.status);
  return json({ token: staffToken(r.staff.id, device.id), staff: { id: r.staff.id, name: r.staff.name, role: r.staff.role } });
}
