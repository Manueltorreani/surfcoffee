'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '@/components/AppProvider';
import AuthCard from '@/components/AuthCard';
import Chat from '@/components/Chat';
import ZoneMap from '@/components/ZoneMap';
import { ProductMedia, Qty } from '@/components/Products';
import { checkAddr, deliveryState, errText, groupMenu, hoursText, money, zoneOf, zoneText } from '@/lib/utils';

const Check = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
const Cross = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;
const Pin = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;

export default function Delivery() {
  const { sb, session, authReady, customer, settings, menu, cart, setCart, toast } = useApp();
  const [street, setStreet] = useState('');
  const [numv, setNumv] = useState('');
  const [piso, setPiso] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  const sumRef = useRef(null);
  const addrRef = useRef(null);

  // re-evalúa el horario cada minuto
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 60000); return () => clearInterval(t); }, []);
  // completa la última dirección usada
  useEffect(() => {
    const a = customer?.address;
    if (a) { setStreet((s) => s || a.street || ''); setNumv((n) => n || (a.num ? String(a.num) : '')); setPiso((p) => p || a.piso || ''); }
  }, [customer]);
  // si llegaste con #pedido o #chat, baja hasta ahí cuando la página termina de cargar
  const ready = authReady && !!settings && !!customer;
  useEffect(() => {
    if (!ready || !window.location.hash) return;
    const t = setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    return () => clearTimeout(t);
  }, [ready]);

  if (!authReady || !settings) return <div className="wrap"><section className="sec"><div className="empty">Cargando…</div></section></div>;

  const ds = deliveryState(settings);
  const z = zoneOf(settings);
  const streets = [...z.h, ...z.v].map((x) => x.name).sort((a, b) => a.localeCompare(b));
  const chk = checkAddr(settings, street, numv);
  const verdict = !street
    ? { k: 'wait', t: 'Elegí tu calle y la altura para ver si llegamos.' }
    : chk === null ? { k: 'wait', t: 'Ahora poné la altura.' }
      : chk.ok ? { k: 'ok', t: '¡Llegamos! Está dentro de la zona.' }
        : chk.bad ? { k: 'no', t: 'Revisá la altura.' }
          : { k: 'no', t: 'Hasta esa dirección no llegamos. Podés pasar a buscar tu pedido por el local.' };

  const head = (
    <>
      <header className="page-head dl-head">
        <div style={{ display: 'grid', gap: 10 }}>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}>Delivery</motion.h1>
          <p className="lead muted">{hoursText(settings).replace(/^Delivery: /, '')}. Pedís acá y seguís todo por el chat con el café.</p>
        </div>
        <span className={`status ${ds.open ? 'open' : 'closed'}`}>
          {ds.open ? <><span className="live" />Tomando pedidos</> : <>Cerrado ahora</>}
        </span>
      </header>
      <section className="sec dl-zone">
        <div className="mapbox"><ZoneMap settings={settings} street={street} num={numv} verdict={chk} /></div>
        <div className="where" ref={addrRef}>
          <h2>¿A dónde te lo llevamos?</h2>
          <div className="row">
            <label className="f" style={{ flex: '2 1 170px' }}>Calle
              <select id="o-street" value={street} onChange={(e) => setStreet(e.target.value)}>
                <option value="">Elegí tu calle</option>
                {streets.map((n) => <option key={n} value={n}>{n}</option>)}
                <option value="__otra">Otra calle</option>
              </select>
            </label>
            <label className="f" style={{ flex: '1 1 90px' }}>Altura
              <input id="o-num" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={numv} placeholder="1378"
                onChange={(e) => setNumv(e.target.value.replace(/\D/g, '').slice(0, 5))} />
            </label>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={verdict.t} className={`verdict ${verdict.k}`} role={verdict.k === 'no' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              {verdict.k === 'ok' ? <Check /> : verdict.k === 'no' ? <Cross /> : <Pin />}
              <span>{verdict.t}</span>
            </motion.div>
          </AnimatePresence>
          <p className="muted" style={{ fontSize: 15 }}>{zoneText(settings)} Salimos desde {settings?.address || 'el local'}.</p>
          {!ds.open && ds.why ? <p className="muted" style={{ fontSize: 15 }}>{ds.why}</p> : null}
        </div>
      </section>
    </>
  );

  if (!session || !customer) {
    return (
      <div className="wrap">
        {head}
        <section className="sec">
          {session && !customer ? <div className="banner">Esta cuenta no tiene ficha de cliente (por ejemplo, una cuenta de administrador).</div> : <AuthCard why="Para chatear con nosotros y pedir" />}
        </section>
      </div>
    );
  }

  const items = Object.entries(cart).map(([id, qty]) => { const m = menu.find((x) => x.id === id && x.available); return m ? { ...m, qty } : null; }).filter(Boolean);
  const sub = items.reduce((a, i) => a + i.price * i.qty, 0);
  const envio = settings.delivery_fee || 0;
  const count = items.reduce((a, i) => a + i.qty, 0);
  const groups = groupMenu(menu.filter((i) => i.available));
  const canSend = ds.open && items.length && chk?.ok && !busy;
  const sendLabel = !ds.open ? 'El delivery está cerrado' : !items.length ? 'Agregá productos para pedir' : !chk?.ok ? 'Falta una dirección dentro de la zona' : busy ? 'Enviando…' : 'Enviar pedido · ' + money(sub + envio);

  async function sendOrder(e) {
    e.preventDefault();
    if (!chk?.ok) { addrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('o-street')?.focus({ preventScroll: true }); return; }
    if (!canSend) return;
    setBusy(true);
    const { error } = await sb.rpc('place_order', {
      p_items: items.map((i) => ({ id: i.id, qty: i.qty })), p_street: street, p_num: Number(numv), p_piso: piso, p_note: note,
    });
    setBusy(false);
    if (error) return toast(errText(error));
    setCart({}); setNote('');
    toast('Pedido enviado. Te respondemos por el chat');
    document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="wrap">
      {head}

      <section className="sec dl-chat" id="chat">
        <div className="sec-head">
          <h2>Escribinos</h2>
          <a className="btn ghost sm" href="#pedido">O armá tu pedido</a>
        </div>
        <Chat customerId={customer.id} role="cliente" title="Surf Coffee" subtitle="Te respondemos al toque por acá"
          empty="Contanos qué querés y a dónde te lo llevamos. Podés mandar fotos o el comprobante de pago." />
      </section>

      <section className="sec" id="pedido">
        <div className="sec-head">
          <h2>Armá tu pedido</h2>
        </div>
        {!ds.open ? <div className="banner">{ds.why} {hoursText(settings)}. Podés escribirnos por el chat igual.</div> : null}
        <div className="order-grid">
          <div className="picks">
            {groups.length ? groups.map(([cat, its]) => (
              <div key={cat}>
                <h3>{cat}</h3>
                <div className="plist">
                  {its.map((i) => (
                    <div className={`prow ${cart[i.id] ? 'in' : ''}`} key={i.id}>
                      <ProductMedia item={i} />
                      <div style={{ minWidth: 0 }}>
                        <div className="nm">{i.name}</div>
                        <div className="pr">{money(i.price)}</div>
                      </div>
                      <Qty item={i} disabled={!ds.open} />
                    </div>
                  ))}
                </div>
              </div>
            )) : <p className="muted">No hay productos disponibles.</p>}
          </div>

          <form className="summary" ref={sumRef} onSubmit={sendOrder}>
            <h3>Tu pedido</h3>
            {items.length ? (
              <motion.div className="lines" layout>
                <AnimatePresence initial={false}>
                  {items.map((i) => (
                    <motion.div key={i.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <span>{i.qty} × {i.name}</span><span>{money(i.price * i.qty)}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {envio ? <div className="muted"><span>Envío</span><span>{money(envio)}</span></div> : null}
                <div className="tot"><b>Total</b><b>{money(sub + envio)}</b></div>
              </motion.div>
            ) : <p className="muted">Todavía no agregaste nada. Tocá + en los productos.</p>}

            <div className="lines">
              <div><span className="muted">Entrega en</span>
                {chk?.ok ? <b>{street} {numv}</b> : <button type="button" className="linkbtn" onClick={() => addrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Elegir dirección</button>}
              </div>
            </div>
            <label className="f">Piso / depto (opcional)<input type="text" value={piso} onChange={(e) => setPiso(e.target.value)} /></label>
            <label className="f">Aclaraciones (opcional)<input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Timbre, forma de pago…" /></label>
            <motion.button className="btn wax" disabled={!ds.open || !items.length || busy} whileTap={{ scale: 0.97 }}>{sendLabel}</motion.button>
          </form>
        </div>
      </section>

      <AnimatePresence>
        {count ? (
          <motion.div key="cb" className="cartbar mob-only" initial={{ y: 80, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: 80, opacity: 0, x: '-50%' }}>
            <motion.span key={count} className="n" initial={{ scale: 0.5 }} animate={{ scale: 1 }}>{count}</motion.span>
            <span className="t">{money(sub + envio)}</span>
            <button className="go" onClick={() => sumRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Ver pedido</button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
