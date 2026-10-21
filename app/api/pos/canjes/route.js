import { adminClient, json, posAuthorized } from '@/lib/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Software de ventas → canjear un premio.
// POST /api/pos/canjes   header x-api-key: <POS_API_KEY>
// body: { "cliente_id": "uuid", "premio_id": "uuid" }
export async function POST(req) {
  if (!posAuthorized(req)) return json({ error: 'API key inválida' }, 401);
  const { cliente_id, premio_id } = await req.json().catch(() => ({}));
  if (!cliente_id || !premio_id) return json({ error: 'Faltan cliente_id o premio_id' }, 400);
  const { data, error } = await adminClient().rpc('redeem_reward', { p_customer: cliente_id, p_reward: premio_id });
  if (error) return json({ error: /NOT_ENOUGH/.test(error.message) ? 'No le alcanzan los puntos' : error.message }, 400);
  return json(data);
}
