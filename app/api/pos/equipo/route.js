import { adminClient, json, posAuthorized } from '@/lib/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Software de ventas → lista del equipo (para el login de cada cajero).
// GET /api/pos/equipo   header x-api-key
export async function GET(req) {
  if (!posAuthorized(req)) return json({ error: 'API key inválida' }, 401);
  const { data } = await adminClient().from('staff').select('id, name, role, has_pin').eq('active', true).order('name');
  return json(data || []);
}
