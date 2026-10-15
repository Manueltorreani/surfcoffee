import { adminClient, json, posAuthorized } from '@/lib/server';

// Software de ventas → registrar una compra en el local y sumar puntos.
// POST /api/pos/compras   header x-api-key: <POS_API_KEY>
// body: { "nombre": "Juan Pérez", "monto": 12500 }
export async function POST(req) {
  if (!posAuthorized(req)) return json({ error: 'API key inválida' }, 401);
  const { nombre, monto } = await req.json().catch(() => ({}));
  if (!nombre || !(Number(monto) > 0)) return json({ error: 'Faltan nombre o monto' }, 400);
  const { data, error } = await adminClient().rpc('register_purchase', { p_name: String(nombre), p_amount: Math.round(Number(monto)), p_source: 'pos' });
  if (error) return json({ error: error.message }, 400);
  return json(data);
}
