import { adminClient, json } from '@/lib/server';
import { requireDevice } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Tablet del café → lista de personas para elegir quién entra.
// GET /api/equipo/staff   header x-device: <token del dispositivo>
export async function GET(req) {
  const device = await requireDevice(req);
  if (!device) return json({ error: 'DEVICE' }, 401);
  const { data, error } = await adminClient().from('staff').select('id, name, role, has_pin').eq('active', true).order('name');
  if (error) return json({ error: `No se pudo cargar el equipo (${error.message})` }, 500);
  return json({ device: device.name, staff: data || [] }, 200);
}
