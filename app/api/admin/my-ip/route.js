import { json, requireAdmin } from '@/lib/server';
import { clientIp } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Devuelve la IP pública desde la que está conectado el admin (para guardar la del wifi del café).
// GET /api/admin/my-ip   Authorization: Bearer <token>
export async function GET(req) {
  const admin = await requireAdmin(req);
  if (!admin) return json({ error: 'No autorizado' }, 401);
  return json({ ip: clientIp(req) });
}
