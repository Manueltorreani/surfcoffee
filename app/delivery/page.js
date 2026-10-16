'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import AuthCard from '@/components/AuthCard';
import Chat from '@/components/Chat';
import ZoneMap from '@/components/ZoneMap';
import { checkAddr, deliveryState, errText, groupMenu, hoursText, money, zoneOf, zoneText } from '@/lib/utils';

export default function Delivery() {
  const { sb, session, authReady, customer, settings, menu, cart, setCart, toast } = useApp();
  const [street, setStreet] = useState('');
  const [numv, setNumv] = useState('');
  const [piso, setPiso] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  // re-evalúa el horario cada minuto
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 60000); return () => clearInterval(t); }, []);
  // completa la última dirección usada
  useEffect(() => {
    const a = customer?.address;
    if (a) { setStreet((s) => s || a.street || ''); setNumv((n) => n || (a.num ? String(a.num) : '')); setPiso((p) => p || a.piso || ''); }
  }, [customer]);

  const ds = deliveryState(settings);
  const head = (
    <>
      <div><div className="eyebrow">Delivery</div><h2>Pedí y chateá con nosotros</h2></div>
      <div className="two">
        <div className="card" style={{ padding: 12 }}>{settings ? <ZoneMap settings={settings} highlight={street} /> : null}</div>
        <div className="stack" style={{ alignContent: 'start' }}>
          <div className="found">
            <div><b>{hoursText(settings)}</b><div className="muted" style={{ fontSize: 13 }}>{ds.open ? 'Estamos tomando pedidos ahora' : ds.why}</div></div>
            <span className={`pill ${ds.open ? 'entregado' : 'cancelado'}`}>{ds.open ? 'Abierto' : 'Cerrado'}</span>
          </div>
          <p style={{ fontSize: 16 }}><b>Zona de entrega.</b> {zoneText(settings)} Salimos desde {settings?.address || 'el local'}.</p>
          <p className="muted" style={{ fontSize: 14 }}>Si tu dirección queda fuera del recuadro, podés pasar a buscar tu pedido por el local.</p>
        </div>
      </div>
    </>
  );

  if (!authReady || !settings) return <div className="wrap"><section className="sec" style={{ borderTop: 0 }}><div className="empty">Cargando…</div></section></div>;
  if (!session || !customer) {
    return <div className="wrap"><section className="sec" style={{ borderTop: 0 }}>{head}<AuthCard why="Para pedir, iniciá sesión" /></section></div>;
  }

  const items = Object.entries(cart).map(([id, qty]) => { const m = menu.find((x) => x.id === id); return m ? { id, name: m.name, price: m.price, qty } : null; }).filter(Boolean);
  const sub = items.reduce((a, i) => a + i.price * i.qty, 0);
  const envio = settings.delivery_fee || 0;
  const count = items.reduce((a, i) => a + i.qty, 0);
  const z = zoneOf(settings);
  const streets = [...z.h, ...z.v].map((x) => x.name).sort((a, b) => a.localeCompare(b));
  const chk = checkAddr(settings, street, numv);
  const groups = groupMenu(menu.filter((i) => i.available));
  const canSend = ds.open && items.length && chk?.ok && !busy;
  const setQty = (id, d) => setCart((c) => { const n = (c[id] || 0) + d; const x = { ...c }; if (n <= 0) delete x[id]; else x[id] = n; return x; });

  async function sendOrder(e) {
    e.preventDefault();
    if (!canSend) return;
    setBusy(true);
    const { error } = await sb.rpc('place_order', {
      p_items: items.map((i) => ({ id: i.id, qty: i.qty })), p_street: street, p_num: Number(numv), p_piso: piso, p_note: note,
    });
    setBusy(false);
    if (error) return toast(errText(error));
    setCart({}); setNote('');
    toast('Pedido enviado. Te respondemos por el chat');
    document.querySelector('.thread')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="wrap">
      <section className="sec" style={{ borderTop: 0 }}>
        {head}
        <div className="stack" style={{ gap: 20 }}>
            <div className="banner" style={{ fontSize: 15 }}><b>Pedinos por el chat</b> o agregá los productos abajo y envianos el pedido.</div>
          <Chat customerId={customer.id} role="cliente" title="Chat con Surf Coffee" subtitle="Te respondemos por acá"
            empty="Escribinos o mandá tu pedido. Podés adjuntar fotos o el comprobante de pago." />

          <div className="card stack" id="armado">
            <div className="ph" style={{ margin: 0 }}><div className="eyebrow">Armá tu pedido</div>{items.length ? <span className="mono"><b>{money(sub)}</b></span> : null}</div>
            {!ds.open ? <div className="banner">{ds.why} {hoursText(settings)}. Podés escribirnos por el chat igual.</div> : null}
            {groups.length ? groups.map(([cat, its]) => (
              <div key={cat}>
                <div className="eyebrow" style={{ color: 'var(--muted)', margin: '4px 0' }}>{cat}</div>
                <div className="stack" style={{ gap: 0 }}>
                  {its.map((i) => {
                    const q = cart[i.id] || 0;
                    return (
                      <div className="rw" style={{ gridTemplateColumns: '1fr auto auto' }} key={i.id}>
                        <div><b>{i.name}</b></div>
                        <span className="mono muted" style={{ fontSize: 13 }}>{money(i.price)}</span>
                        {q ? (
                          <span className="qty">
                            <button type="button" onClick={() => setQty(i.id, -1)} aria-label={`Quitar uno de ${i.name}`}>−</button>
                            <b className="mono">{q}</b>
                            <button type="button" onClick={() => setQty(i.id, 1)} aria-label={`Agregar uno de ${i.name}`}>+</button>
                          </span>
                        ) : <button type="button" className="btn ghost sm" disabled={!ds.open} onClick={() => setQty(i.id, 1)}>Agregar</button>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )) : <p className="muted">No hay productos disponibles.</p>}

            {items.length ? (
              <div className="hist">
                <div><span>Productos</span><span className="mono">{money(sub)}</span></div>
                {envio ? <div><span>Envío</span><span className="mono">{money(envio)}</span></div> : null}
                <div><b>Total</b><b className="mono">{money(sub + envio)}</b></div>
              </div>
            ) : null}

            <form className="stack" onSubmit={sendOrder}>
              <div className="row">
                <label className="f" style={{ flex: '2 1 180px' }}>Calle
                  <select id="o-street" value={street} onChange={(e) => setStreet(e.target.value)} required>
                    <option value="">Elegí tu calle</option>
                    {streets.map((n) => <option key={n} value={n}>{n}</option>)}
                    <option value="__otra">Otra calle</option>
                  </select>
                </label>
                <label className="f" style={{ flex: '1 1 100px' }}>Altura
                  <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" required value={numv} placeholder="1378"
                    onChange={(e) => setNumv(e.target.value.replace(/\D/g, ''))} />
                </label>
              </div>
              {chk ? (chk.ok
                ? <div className="found" style={{ background: 'transparent', border: '1px solid var(--ok)', color: 'var(--ok)', fontWeight: 600 }}>Llegamos a tu dirección.</div>
                : <div className="found" role="alert" style={{ background: 'transparent', border: '2px solid var(--bad)', color: 'var(--bad)', fontWeight: 700 }}>{chk.bad ? 'Revisá la altura.' : 'Hasta esa dirección no llegamos.'}</div>) : null}
              <div className="row">
                <label className="f">Piso / depto (opcional)<input type="text" value={piso} onChange={(e) => setPiso(e.target.value)} /></label>
                <label className="f">Aclaraciones (opcional)<input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Timbre, forma de pago…" /></label>
              </div>
              <button className="btn wax" disabled={!canSend}>{!items.length ? 'Agregá productos para pedir' : busy ? 'Enviando…' : 'Enviar pedido · ' + money(sub + envio)}</button>
            </form>
          </div>
        </div>
        {items.length ? (
          <div className="cartbar mob-only">
            <span>{count} producto{count > 1 ? 's' : ''} · {money(sub + envio)}</span>
            <button className="btn sm" onClick={() => document.getElementById('o-street')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Ver pedido</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
