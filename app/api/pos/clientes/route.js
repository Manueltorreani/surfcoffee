import { adminClient, json, posAuthorized } from '@/lib/server';
import { nameKey } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Software de ventas → buscar clientes por nombre para mostrar sus puntos.
// GET /api/pos/clientes?q=juan%20pe   header x-api-key: <POS_API_KEY>
export async function GET(req) {
  if (!posAuthorized(req)) return json({ error: 'API key inválida' }, 401);
  const q = nameKey(new URL(req.url).searchParams.get('q') || '');
  if (q.length < 2) return json({ clientes: [] });
  const { data, error } = await adminClient().from('customers')
    .select('id, name, points, visits, last_visit').ilike('name_key', `%${q.replace(/[%_]/g, '')}%`).order('name').limit(20);
  if (error) return json({ error: error.message }, 400);
  return json({ clientes: data });
}
