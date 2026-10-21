'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Camera from '@/components/equipo/Camera';
import { DEVICE_KEY } from '@/lib/device';
const IDLE_MS = 5 * 60 * 1000; // sin tocar nada 5 minutos → vuelve a la pantalla de ingreso

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const dayLabel = (iso, hoy) => {
  if (iso === hoy) return 'Hoy';
  const d = new Date(iso + 'T12:00:00Z');
  return `${DAYS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const hora = (ts) => new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' });
const LLEGADA = { antes: 'Llegaste antes de hora', justo: 'Llegaste a tiempo', tarde: 'Llegaste tarde', sin_turno: 'Apertura registrada' };

function readDevice() {
  try { return localStorage.getItem(DEVICE_KEY) || ''; } catch { return ''; }
}

export default function Equipo() {
  const [device, setDevice] = useState(null);      // token del dispositivo
  const [phase, setPhase] = useState('loading');   // loading | nodevice | pick | pin | home | fotos | stock | done
  const [deviceName, setDeviceName] = useState('');
  const [people, setPeople] = useState([]);
  const [who, setWho] = useState(null);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [token, setToken] = useState('');
  const [me, setMe] = useState(null);              // datos de /api/equipo/hoy
  const [shots, setShots] = useState({});          // check_id → { path, taken_at, url }
  const [cam, setCam] = useState(null);            // ítem con la cámara abierta
  const [uploading, setUploading] = useState('');
  const [counts, setCounts] = useState({});
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const idle = useRef();

  const call = useCallback(async (path, { method = 'GET', body, form, tok } = {}) => {
    const headers = { 'x-device': device || '' };
    if (tok ?? token) headers['x-staff'] = tok ?? token;
    if (body) headers['content-type'] = 'application/json';
    const r = await fetch(path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined), cache: 'no-store' });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  }, [device, token]);

  const reset = useCallback(() => {
    Object.values(shots).forEach((s) => s.url && URL.revokeObjectURL(s.url));
    setToken(''); setMe(null); setWho(null); setPin(''); setErr(''); setShots({}); setCounts({}); setNota(''); setResult(null); setCam(null);
    setPhase(device ? 'pick' : 'nodevice');
  }, [device, shots]);

  // dispositivo autorizado y lista de personas
  const loadPeople = useCallback(async (dev) => {
    const r = await fetch('/api/equipo/staff', { headers: { 'x-device': dev }, cache: 'no-store' });
    if (r.status === 401) { setPhase('nodevice'); return; }
    const d = await r.json().catch(() => ({}));
    setDeviceName(d.device || '');
    setPeople(d.staff || []);
    setPhase('pick');
  }, []);
  useEffect(() => {
    const dev = readDevice();
    setDevice(dev);
    if (!dev) setPhase('nodevice'); else loadPeople(dev);
  }, [loadPeople]);

  // cierre automático de sesión por inactividad (la tablet es compartida)
  useEffect(() => {
    if (!token) return;
    const bump = () => { clearTimeout(idle.current); idle.current = setTimeout(reset, IDLE_MS); };
    bump();
    ['pointerdown', 'keydown'].forEach((e) => window.addEventListener(e, bump));
    return () => { clearTimeout(idle.current); ['pointerdown', 'keydown'].forEach((e) => window.removeEventListener(e, bump)); };
  }, [token, reset]);

  const loadMe = useCallback(async (tok) => {
    const r = await call('/api/equipo/hoy', { tok });
    if (!r.ok) { reset(); return null; }
    setMe(r.data);
    return r.data;
  }, [call, reset]);

  async function login(code) {
    setBusy(true); setErr('');
    const r = await call('/api/equipo/login', { method: 'POST', body: { staff_id: who.id, pin: code }, tok: '' });
    setBusy(false);
    if (!r.ok) {
      setPin('');
      if (r.data.error === 'DEVICE') { setPhase('nodevice'); return; }
      setErr(r.data.error || 'No se pudo ingresar');
      return;
    }
    setToken(r.data.token);
    const d = await loadMe(r.data.token);
    if (d) setPhase('home');
  }

  function press(k) {
    if (busy) return;
    setErr('');
    if (k === 'del') { setPin((p) => p.slice(0, -1)); return; }
    const next = (pin + k).slice(0, 4);
    setPin(next);
    if (next.length === 4) login(next);
  }

  async function onShot(blob) {
    const item = cam;
    setCam(null);
    setUploading(item.id);
    const fd = new FormData();
    fd.append('file', blob, 'foto.jpg');
    fd.append('check_id', item.id);
    const r = await call('/api/equipo/foto', { method: 'POST', form: fd });
    setUploading('');
    if (!r.ok) { setErr(r.status === 401 ? 'Se cerró tu sesión. Volvé a ingresar.' : r.data.error || 'No se pudo subir la foto'); if (r.status === 401) reset(); return; }
    setShots((s) => {
      if (s[item.id]?.url) URL.revokeObjectURL(s[item.id].url);
      return { ...s, [item.id]: { ...r.data, url: URL.createObjectURL(blob) } };
    });
  }

  async function sendClosing() {
    setBusy(true); setErr('');
    const r = await call('/api/equipo/cierre', {
      method: 'POST',
      body: {
        fotos: Object.entries(shots).map(([check_id, s]) => ({ check_id, path: s.path, taken_at: s.taken_at })),
        stock: Object.entries(counts).map(([item_id, qty]) => ({ item_id, qty })),
        nota,
      },
    });
    setBusy(false);
    if (!r.ok) { setErr(r.status === 401 ? 'Se cerró tu sesión. Volvé a ingresar.' : r.data.error || 'No se pudo enviar el cierre'); if (r.status === 401) reset(); return; }
    setResult(r.data);
    setPhase('done');
  }

  const stamp = (item) => () => {
    const t = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    return `${me?.staff?.name || ''} · ${item.name} · ${t}`;
  };

  // ---------- pantallas ----------
  if (phase === 'loading') return <div className="eq"><div className="empty">Cargando…</div></div>;

  if (phase === 'nodevice') return (
    <div className="eq">
      <div className="card stack">
        <div className="eyebrow">Equipo</div>
        <h1 className="eq-h">Este dispositivo no está autorizado</h1>
        <p className="muted">El sistema del equipo solo funciona en la tablet del café. Para autorizarla, Manu o Mate tienen que entrar a <b>Panel → Equipo → Dispositivos</b> desde esta tablet y tocar <b>Autorizar este dispositivo</b>.</p>
        <a className="btn" href="/panel">Ir al panel</a>
      </div>
    </div>
  );

  if (phase === 'pick') return (
    <div className="eq">
      <div className="eq-head"><div><div className="eyebrow">Equipo{deviceName ? ` · ${deviceName}` : ''}</div><h1 className="eq-h">¿Quién sos?</h1></div></div>
      {people.length ? (
        <div className="who">
          {people.map((p) => (
            <button key={p.id} type="button" onClick={() => { setWho(p); setPin(''); setErr(''); setPhase('pin'); }}>
              <span className="av" aria-hidden="true">{(p.name.trim().includes(' ') ? p.name.split(/\s+/).map((w) => w[0]).join('') : p.name).slice(0, 2).toUpperCase()}</span>
              <b>{p.name}</b>
              {p.role === 'dueño' ? <span className="muted">Dueño</span> : null}
            </button>
          ))}
        </div>
      ) : <div className="empty">Todavía no hay personas cargadas. Agregalas en Panel → Equipo.</div>}
    </div>
  );

  if (phase === 'pin') return (
    <div className="eq">
      <div className="eq-head">
        <button type="button" className="btn ghost sm" onClick={() => setPhase('pick')}>Volver</button>
      </div>
      <div className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
        <h1 className="eq-h">Hola, {who.name.split(' ')[0]}</h1>
        <p className="muted">Ingresá tu PIN de 4 números</p>
        <div className="dots" aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}</div>
        <p className="eq-err" role="alert">{err}</p>
      </div>
      <div className="pad" aria-label="Teclado del PIN">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) => k === '' ? <span key={i} /> : (
          <button key={i} type="button" onClick={() => press(k)} disabled={busy} aria-label={k === 'del' ? 'Borrar' : k}>{k === 'del' ? 'Borrar' : k}</button>
        ))}
      </div>
    </div>
  );

  const hoy = me?.hoy;
  const turnoHoy = (me?.turnos || []).filter((t) => t.dia === hoy);
  const proximos = (me?.turnos || []).filter((t) => t.dia !== hoy).slice(0, 6);

  if (phase === 'home') return (
    <div className="eq">
      <div className="eq-head">
        <div><div className="eyebrow">Equipo</div><h1 className="eq-h">Hola, {me.staff.name.split(' ')[0]}</h1></div>
        <button type="button" className="btn ghost sm" onClick={reset}>Salir</button>
      </div>
      <div className="card stack">
        <span className="eyebrow">Hoy</span>
        {turnoHoy.length ? turnoHoy.map((t) => <div key={t.id} className="eq-shift"><b className="mono">{t.desde} – {t.hasta}</b>{t.nota ? <span className="muted">{t.nota}</span> : null}</div>) : <span className="muted">Hoy no tenés turno cargado.</span>}
        {me.llegada ? <span className={`pill ${me.llegada.status === 'tarde' ? 'cancelado' : 'entregado'}`}>{LLEGADA[me.llegada.status]} · {hora(me.llegada.clock_in)}</span> : null}
      </div>
      <button type="button" className="btn eq-big" onClick={() => { setErr(''); setPhase('fotos'); }}>Hacer cierre de turno</button>
      {me.cerro_hoy ? <p className="muted" style={{ textAlign: 'center' }}>Ya hiciste un cierre hoy a las {hora(me.cerro_hoy)}.</p> : null}
      <div className="stack">
        <span className="eyebrow">Mis próximos turnos</span>
        {proximos.length ? (
          <div className="lst">
            {proximos.map((t) => (
              <div className="li" key={t.id}><b>{dayLabel(t.dia, hoy)}</b><span className="mono">{t.desde} – {t.hasta}</span></div>
            ))}
          </div>
        ) : <div className="empty">No hay turnos cargados para los próximos días.</div>}
      </div>
    </div>
  );

  const checks = me?.fotos || [];
  const items = me?.stock || [];
  const done = checks.filter((c) => shots[c.id]).length;
  const counted = items.filter((it) => counts[it.id] !== undefined && counts[it.id] !== '').length;

  if (phase === 'fotos') return (
    <div className="eq">
      <div className="eq-head">
        <button type="button" className="btn ghost sm" onClick={() => setPhase('home')}>Volver</button>
        <span className="eq-step">Paso 1 de 2</span>
      </div>
      <div className="ph" style={{ marginBottom: 0 }}><div><div className="eyebrow">Cierre de turno</div><h2>Fotos</h2></div><b className={`mono ${done === checks.length ? 'ok' : ''}`}>{done} de {checks.length}</b></div>
      <p className="muted">Sacá una foto de cada cosa con la cámara. Se guarda con tu nombre, fecha y hora.</p>
      <div className="shots">
        {checks.map((c) => {
          const s = shots[c.id];
          return (
            <button key={c.id} type="button" className={`shot ${s ? 'has' : ''}`} onClick={() => setCam(c)} disabled={!!uploading} aria-label={s ? `${c.name}: foto lista, tocá para repetirla` : `Sacar foto: ${c.name}`}>
              {s ? <img src={s.url} alt="" /> : null}
              <span className="shot-t">
                <b>{c.name}</b>
                <span>{uploading === c.id ? 'Subiendo…' : s ? `Lista · ${hora(s.taken_at)}` : c.hint || 'Sacar foto'}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="eq-err" role="alert">{err}</p>
      <button type="button" className="btn eq-big" disabled={done < checks.length || !!uploading} onClick={() => { setErr(''); setPhase('stock'); }}>
        {done < checks.length ? `Faltan ${checks.length - done} ${checks.length - done === 1 ? 'foto' : 'fotos'}` : 'Siguiente: stock'}
      </button>
      {cam ? <Camera title={cam.name} stamp={stamp(cam)} onShot={onShot} onClose={() => setCam(null)} /> : null}
    </div>
  );

  if (phase === 'stock') return (
    <div className="eq">
      <div className="eq-head">
        <button type="button" className="btn ghost sm" onClick={() => setPhase('fotos')}>Volver</button>
        <span className="eq-step">Paso 2 de 2</span>
      </div>
      <div className="ph" style={{ marginBottom: 0 }}><div><div className="eyebrow">Cierre de turno</div><h2>Stock</h2></div><b className={`mono ${counted === items.length ? 'ok' : ''}`}>{counted} de {items.length}</b></div>
      <p className="muted">Contá lo que queda de cada cosa y cargalo.</p>
      <div className="lst">
        {items.map((it) => {
          const v = counts[it.id] ?? '';
          const n = Number(String(v).replace(',', '.')) || 0;
          const set = (x) => setCounts((c) => ({ ...c, [it.id]: x }));
          return (
            <div className="stk" key={it.id}>
              <label htmlFor={`q-${it.id}`}><b>{it.name}</b><span className="muted">{it.unit}</span></label>
              <div className="qty">
                <button type="button" aria-label={`Restar ${it.name}`} onClick={() => set(String(Math.max(0, n - 1)))}>−</button>
                <input id={`q-${it.id}`} type="text" inputMode="decimal" autoComplete="off" placeholder="—" value={v} onChange={(e) => set(e.target.value.replace(/[^\d.,]/g, ''))} />
                <button type="button" aria-label={`Sumar ${it.name}`} onClick={() => set(String(n + 1))}>+</button>
              </div>
            </div>
          );
        })}
      </div>
      <label className="f">Algo para avisar (opcional)
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: se rompió la jarra chica" maxLength={500} />
      </label>
      <p className="eq-err" role="alert">{err}</p>
      <button type="button" className="btn eq-big" disabled={busy || counted < items.length} onClick={sendClosing}>
        {busy ? 'Enviando…' : counted < items.length ? `Faltan contar ${items.length - counted}` : 'Cerrar turno'}
      </button>
    </div>
  );

  // done
  return (
    <div className="eq">
      <div className="eq-done">
        <span className="eq-ok" aria-hidden="true">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </span>
        <h1 className="eq-h">{result?.titulo}</h1>
        <p>{result?.mensaje}</p>
        {result?.desafio ? <div className="card" style={{ textAlign: 'left' }}><span className="eyebrow">Para el próximo turno</span><p>{result.desafio}</p></div> : null}
        {result?.proximo ? <p className="muted">Tu próximo turno: <b>{dayLabel(result.proximo.dia, hoy)} {result.proximo.desde} – {result.proximo.hasta}</b></p> : null}
        <button type="button" className="btn eq-big" onClick={reset}>Listo</button>
      </div>
    </div>
  );
}
