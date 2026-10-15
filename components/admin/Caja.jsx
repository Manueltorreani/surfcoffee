'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppProvider';
import { errText, fullOk, money, nameKey, num, properName } from '@/lib/utils';

export default function Caja() {
  const { sb, settings, rewards, toast } = useApp();
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => sb.from('customers').select('id, name, name_key, phone, points, visits').order('name').limit(5000).then(({ data }) => setCustomers(data || [])), [sb]);
  useEffect(() => { load(); }, [load]);

  const ppp = Math.max(1, settings?.pesos_por_punto || 100);
  const k = nameKey(name);
  const c = customers.find((x) => x.name_key === k);
  const sugg = name.trim().length >= 2 && !c ? customers.filter((x) => x.name_key.includes(k)).slice(0, 5) : [];
  const okName = fullOk(name);
  const pts = Math.floor((Number(amount) || 0) / ppp);
  const rws = rewards.filter((r) => r.active).sort((a, b) => a.cost - b.cost);

  async function register(e) {
    e.preventDefault();
    if (!okName || !(Number(amount) > 0)) return toast('Completá nombre y apellido, y el monto');
    setBusy(true);
    const { data, error } = await sb.rpc('register_purchase', { p_name: properName(name), p_amount: Number(amount), p_source: 'mostrador' });
    setBusy(false);
    if (error) return toast(errText(error));
    setAmount('');
    toast(`Compra registrada: +${data.points_added} puntos${data.new_customer ? ' (cliente nuevo)' : ''}`);
    load();
  }

  async function redeem(r) {
    const { error } = await sb.rpc('redeem_reward', { p_customer: c.id, p_reward: r.id });
    setConfirm(null);
    if (error) return toast(errText(error));
    toast(`Canjeado: ${r.name}`);
    load();
  }

  return (
    <>
      <div className="ph"><div><div className="eyebrow">Mostrador</div><h2>Caja y puntos</h2></div><span className="muted">1 punto cada {money(ppp)}</span></div>
      <div className="two">
        <form className="card stack" onSubmit={register}>
          <label className="f">Nombre y apellido del cliente
            <input type="text" list="dl-clientes" required placeholder="Juan Pérez" autoComplete="off" value={name} onChange={(e) => { setName(e.target.value); setConfirm(null); }} />
          </label>
          <datalist id="dl-clientes">{customers.map((x) => <option key={x.id} value={x.name} />)}</datalist>
          {sugg.length ? <div className="chips">{sugg.map((x) => <button type="button" key={x.id} className="chip" onClick={() => setName(x.name)}>{x.name}</button>)}</div> : null}
          {okName && !c ? <div className="banner">Cliente nuevo: se va a crear como <b>{properName(name)}</b>.</div> : null}
          <label className="f">Monto de la compra (ARS)
            <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" required placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
          </label>
          <div className="row" style={{ alignItems: 'center' }}>
            <span className="muted">Suma <b className="mono" style={{ color: 'var(--ink)' }}>{num(pts)}</b> puntos{okName && !c && settings?.welcome_points ? ` + ${num(settings.welcome_points)} de bienvenida` : ''}</span>
            <button className="btn" style={{ flex: '0 0 auto' }} disabled={busy}>Registrar compra</button>
          </div>
        </form>
        <div className="stack">
          {c ? (
            <>
              <div className="found">
                <div><b>{c.name}</b><div className="muted" style={{ fontSize: 13 }}>{c.phone ? c.phone + ' · ' : ''}{num(c.visits)} visitas</div></div>
                <b className="mono" style={{ fontSize: 26 }}>{num(c.points)} pts</b>
              </div>
              <div className="eyebrow">Canjear</div>
              {rws.length ? (
                <div className="lst">
                  {rws.map((r) => (
                    <div className="li" key={r.id}>
                      <div><b>{r.name}</b><div className="muted mono" style={{ fontSize: 13 }}>{num(r.cost)} pts</div></div>
                      <div className="acts">
                        {c.points >= r.cost ? (confirm === r.id
                          ? <button className="btn wax sm" onClick={() => redeem(r)}>Confirmar canje</button>
                          : <button className="btn ghost sm" onClick={() => setConfirm(r.id)}>Canjear</button>)
                          : <span className="muted" style={{ fontSize: 13 }}>Faltan {num(r.cost - c.points)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="empty">Cargá premios en la pestaña Premios.</div>}
            </>
          ) : <div className="empty">Escribí el nombre y apellido del cliente para ver sus puntos y canjes.</div>}
        </div>
      </div>
    </>
  );
}
