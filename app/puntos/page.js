'use client';
import { useEffect, useState } from 'react';
import { animate, motion } from 'motion/react';
import { useApp } from '@/components/AppProvider';
import AuthCard from '@/components/AuthCard';
import { money, num, pwErr, when } from '@/lib/utils';

// número que sube hasta el saldo actual
function CountUp({ value }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(value); return; }
    const c = animate(0, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1], onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [value]);
  return <>{num(v)}</>;
}

function txLabel(t) {
  if (t.type === 'compra') return `Compra en el local ${money(t.amount)}`;
  if (t.type === 'canje') return `Canje: ${t.reward || ''}`;
  if (t.type === 'bienvenida') return 'Regalo de bienvenida';
  return 'Ajuste';
}

export default function Puntos() {
  const { sb, session, authReady, customer, rewards, settings, signOut, toast } = useApp();
  const [txns, setTxns] = useState([]);
  const [chpass, setChpass] = useState(false);
  const cid = customer?.id;

  useEffect(() => {
    if (!cid) return;
    const load = () => sb.from('point_txns').select('*').eq('customer_id', cid).order('created_at', { ascending: false }).limit(30).then(({ data }) => setTxns(data || []));
    load();
    const ch = sb.channel('tx-' + cid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'point_txns', filter: `customer_id=eq.${cid}` }, load).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [sb, cid]);

  if (!authReady) return <div className="wrap"><section className="sec" style={{ borderTop: 0 }}><div className="empty">Cargando…</div></section></div>;
  if (!session || !customer) {
    return (
      <div className="wrap"><section className="sec" style={{ borderTop: 0 }}>
        {session && !customer ? <div className="banner">Esta cuenta no tiene ficha de cliente (por ejemplo, una cuenta de administrador).</div> : <AuthCard why="Mis puntos" />}
      </section></div>
    );
  }

  const pts = customer.points || 0;
  const rws = rewards.filter((r) => r.active).sort((a, b) => a.cost - b.cost);
  const next = rws.find((r) => r.cost > pts);
  const pct = next ? Math.min(100, Math.round((pts / next.cost) * 100)) : 100;
  const ppp = Math.max(1, settings?.pesos_por_punto || 100);

  async function changePass(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const err = pwErr(f.get('pw1'), f.get('pw2'));
    if (err) return toast(err);
    const { error: e1 } = await sb.auth.signInWithPassword({ email: session.user.email, password: f.get('old') });
    if (e1) return toast('La contraseña actual no es correcta');
    const { error } = await sb.auth.updateUser({ password: f.get('pw1') });
    if (error) return toast('No se pudo cambiar la contraseña');
    setChpass(false);
    toast('Contraseña cambiada');
  }

  return (
    <div className="wrap">
      <section className="sec" style={{ borderTop: 0 }}>
        <div className="two">
          <div className="stack">
            <div className="pcard">
              <svg className="pcard-wave" viewBox="0 0 600 70" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" d="M0 30 q 75 -26 150 0 t 150 0 t 150 0 t 150 0 V70 H0Z" /></svg>
              <div className="lbl">Hola, {customer.name}</div>
              <div className="num" aria-label={`${num(pts)} puntos`}><CountUp value={pts} /></div>
              <div className="lbl">puntos disponibles</div>
              <div className="gauge" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><motion.i initial={{ width: 0 }} animate={{ width: pct + '%' }} transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} /></div>
              <div style={{ fontWeight: 600 }}>{next ? `Te faltan ${num(next.cost - pts)} para ${next.name}` : rws.length ? '¡Podés canjear cualquier premio!' : 'Seguí sumando.'}</div>
            </div>
            <p className="muted" style={{ fontSize: 14 }}>
              Sumás 1 punto cada {money(ppp)} en compras en el local (los pedidos por delivery no suman). Para canjear, decí tu nombre y apellido en caja.
            </p>
            <div className="row" style={{ flex: 'none' }}>
              <button className="btn ghost sm" style={{ flex: '0 0 auto' }} onClick={() => setChpass((v) => !v)}>Cambiar contraseña</button>
              <button className="btn ghost sm" style={{ flex: '0 0 auto' }} onClick={signOut}>Cerrar sesión</button>
            </div>
            {chpass ? (
              <form className="card stack" onSubmit={changePass}>
                <b>Cambiar contraseña</b>
                <label className="f">Contraseña actual<input type="password" name="old" required autoComplete="current-password" /></label>
                <div className="row">
                  <label className="f">Nueva<input type="password" name="pw1" required minLength={6} autoComplete="new-password" /></label>
                  <label className="f">Repetila<input type="password" name="pw2" required minLength={6} autoComplete="new-password" /></label>
                </div>
                <div className="row"><button className="btn">Guardar</button><button type="button" className="btn ghost" onClick={() => setChpass(false)}>Cancelar</button></div>
              </form>
            ) : null}
          </div>
          <div className="stack">
            <div className="eyebrow">Premios</div>
            {rws.length ? (
              <div>
                {rws.map((r) => (
                  <div className="rw" key={r.id}>
                    <span className="cost">{num(r.cost)} pts</span>
                    <div><b>{r.name}</b>{r.description ? <div className="muted" style={{ fontSize: 13 }}>{r.description}</div> : null}</div>
                    <span className={`st ${pts >= r.cost ? 'ok' : ''}`}>{pts >= r.cost ? 'Disponible' : `Faltan ${num(r.cost - pts)}`}</span>
                  </div>
                ))}
              </div>
            ) : <div className="empty">Pronto vas a ver los premios acá.</div>}
          </div>
        </div>
        <div className="stack">
          <div className="eyebrow">Movimientos</div>
          {txns.length ? (
            <div className="hist">
              {txns.map((t) => (
                <div key={t.id}>
                  <span>{txLabel(t)} <span className="muted">· {when(t.created_at)}</span></span>
                  <b className={`mono ${t.points >= 0 ? 'pos' : 'neg'}`}>{t.points >= 0 ? '+' : ''}{num(t.points)}</b>
                </div>
              ))}
            </div>
          ) : <p className="muted">Todavía no tenés movimientos.</p>}
        </div>
      </section>
    </div>
  );
}
