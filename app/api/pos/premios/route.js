import { adminClient, json, posAuthorized } from '@/lib/server';

// GET /api/pos/premios   header x-api-key: <POS_API_KEY>
export async function GET(req) {
  if (!posAuthorized(req)) return json({ error: 'API key inválida' }, 401);
  const { data, error } = await adminClient().from('rewards').select('id, name, cost').eq('active', true).order('cost');
  if (error) return json({ error: error.message }, 400);
  return json({ premios: data });
}
