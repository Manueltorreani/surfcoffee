'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppProvider';
import { DEVICE_KEY } from '@/lib/device';
import { cleanName, when } from '@/lib/utils';

async function sha256(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const onlyPin = (v) => String(v || '').replace(/\D/g, '').slice(0, 4);

export default function Equipo() {
  const { sb, session, settings, setSettings, toast } = useApp();
  const [staff, setStaff] = useState([]);
  const [devices, setDevices] = useState([]);
  const [checks, setChecks] = useState([]);
  const [myHash, setMyHash] = useState('');
  const [form, setForm] = useState({ name: '', role: 'empleado', pin: '' });
  const [pinFor, setPinFor] = useState(null);
  const [newPin, setNewPin] = useState('');
  const [devName, setDevName] = useState('Tablet del café');
  const [chk, setChk] = useState({ name: '', hint: '' });
  const [tol, setTol] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [missingDb, setMissingDb] = useState(false);

  const load = useCallback(async () => {
    const [s, d, c] = await Promise.all([
      sb.from('staff').select('id, name, role, has_pin, active').order('active', { ascending: false }).order('name'),
      sb.from('staff_devices').select('id, name, token_hash, revoked, last_seen, created_at').order('created_at', { ascending: false }),
      sb.from('closing_checks').select('*').order('sort').order('name'),
    ]);
    setMissingDb([s, d, c].some((r) => r.error && (r.error.code === '42P01' || r.error.code === 'PGRST205' || /does not exist|schema cache/i.test(r.error.message || ''))));
    setStaff(s.data || []); setDevices(d.data || []); setChecks(c.data || []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let t = '';
    try { t = localStorage.getItem(DEVICE_KEY) || ''; } catch {}
    if (t && crypto?.subtle) sha256(t).then(setMyHash);
  }, []);
  useEffect(() => { if (settings) setTol(String(settings.tolerancia_min ?? 10)); }, [settings]);

  const api = (url, body) => fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify(body),
  }).then((r) => r.json().catch(() => ({ error: 'Error' })));

  async function savePin(id, pin) {
    const r = await api('/api/admin/staff-pin', { staff_id: id, pin });
    if (r.error) { toast(r.error); return false; }
    return true;
  }

  async function addPerson(e) {
    e.preventDefault();
    const name = cleanName(form.name);
    if (!name) return toast('Escribí el nombre');
    if (form.pin && form.pin.length !== 4) return toast('El PIN tiene que tener 4 números');
    const { data, error } = await sb.from('staff').insert({ name, role: form.role }).select('id').single();
    if (error) return toast(`No se pudo agregar: ${error.message}`);
    if (form.pin) await savePin(data.id, form.pin);
    setForm({ name: '', role: 'empleado', pin: '' });
    toast(`${name} agregado al equipo`);
    load();
  }

  async function update(id, patch) {
    const { error } = await sb.from('staff').update(patch).eq('id', id);
    if (error) return toast('No se pudo guardar');
    load();
  }

  async function changePin(e) {
    e.preventDefault();
    if (newPin.length !== 4) return toast('El PIN tiene que tener 4 números');
    if (await savePin(pinFor, newPin)) { toast('PIN guardado'); setPinFor(null); setNewPin(''); load(); }
  }

  async function saveTol(e) {
    e.preventDefault();
    const v = Math.max(0, Math.min(60, Number(tol) || 0));
    const { data, error } = await sb.from('settings').update({ tolerancia_min: v }).eq('id', 1).select('*').single();
    if (error) return toast('No se pudo guardar');
    setSettings(data); toast('Tolerancia guardada');
  }

  async function authorize(e) {
    e.preventDefault();
    const r = await api('/api/admin/devices', { name: devName });
    if (r.error) return toast(r.error);
    try { localStorage.setItem(DEVICE_KEY, r.token); } catch { return toast('Este navegador no permite guardar la autorización'); }
    setMyHash(await sha256(r.token));
    toast('Dispositivo autorizado. Ya se puede usar /equipo acá.');
    load();
  }

  async function revoke(d) {
    await sb.from('staff_devices').update({ revoked: true }).eq('id', d.id);
    if (d.token_hash === myHash) { try { localStorage.removeItem(DEVICE_KEY); } catch {} setMyHash(''); }
    setConfirm(null); toast('Autorización quitada'); load();
  }

  async function addCheck(e) {
    e.preventDefault();
    if (!chk.name.trim()) return;
    const sort = (checks.reduce((m, c) => Math.max(m, c.sort || 0), 0) || 0) + 10;
    const { error } = await sb.from('closing_checks').insert({ name: chk.name.trim(), hint: chk.hint.trim(), sort });
    if (error) return toast('No se pudo agregar');
    setChk({ name: '', hint: '' }); load();
  }
  async function patchCheck(id, patch) { await sb.from('closing_checks').update(patch).eq('id', id); load(); }
  async function moveCheck(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= checks.length) return;
    const order = [...checks];
    [order[i], order[j]] = [order[j], order[i]];
    await Promise.all(order.map((c, k) => sb.from('closing_checks').update({ sort: (k + 1) * 10 }).eq('id', c.id)));
    load();
  }
  async function delCheck(c) { await sb.from('closing_checks').delete().eq('id', c.id); setConfirm(null); load(); }

  const thisAuthorized = myHash && devices.some((d) => d.token_hash === myHash && !d.revoked);

  return (
    <>
      <div className="ph"><div><div className="eyebrow">Personal</div><h2>Equipo</h2></div><span className="muted">Dueños incluidos: todos hacen el cierre igual</span></div>

      {missingDb ? <div className="banner" style={{ marginBottom: 16, borderColor: 'var(--bad)' }}><b>Falta crear las tablas del equipo.</b> En Supabase → SQL Editor, pegá todo el archivo <code>supabase/2026-10-equipo.sql</code> y tocá Run. Después recargá esta página.</div> : null}
      <form className="card stack" style={{ marginBottom: 16 }} onSubmit={addPerson}>
        <b>Agregar persona</b>
        <div className="row">
          <label className="f">Nombre<input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Lucía" /></label>
          <label className="f">Rol
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="empleado">Empleado</option>
              <option value="dueño">Dueño</option>
            </select>
          </label>
          <label className="f">PIN (4 números)<input type="text" inputMode="numeric" autoComplete="off" value={form.pin} onChange={(e) => setForm((f) => ({ ...f, pin: onlyPin(e.target.value) }))} placeholder="••••" /></label>
          <button className="btn" style={{ flex: '0 0 auto' }}>Agregar</button>
        </div>
      </form>

      {staff.length ? (
        <div className="lst" style={{ marginBottom: 24 }}>
          {staff.map((p) => (
            <div className="li" key={p.id}>
              <div>
                <b>{p.name}</b>{' '}
                <span className="pill">{p.role === 'dueño' ? 'Dueño' : 'Empleado'}</span>{' '}
                {!p.has_pin ? <span className="pill cancelado">Sin PIN</span> : null}{' '}
                {!p.active ? <span className="pill">Inactivo</span> : null}
                {pinFor === p.id ? (
                  <form className="row" style={{ marginTop: 8 }} onSubmit={changePin}>
                    <label className="f">PIN nuevo<input type="text" inputMode="numeric" autoComplete="off" autoFocus value={newPin} onChange={(e) => setNewPin(onlyPin(e.target.value))} /></label>
                    <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
                      <button type="button" className="btn ghost sm" onClick={() => { setPinFor(null); setNewPin(''); }}>Cancelar</button>
                      <button className="btn sm">Guardar PIN</button>
                    </div>
                  </form>
                ) : null}
              </div>
              <div className="acts">
                <button className="btn ghost sm" onClick={() => { setPinFor(p.id); setNewPin(''); }}>{p.has_pin ? 'Cambiar PIN' : 'Poner PIN'}</button>
                <button className="btn ghost sm" onClick={() => update(p.id, { role: p.role === 'dueño' ? 'empleado' : 'dueño' })}>{p.role === 'dueño' ? 'Pasar a empleado' : 'Pasar a dueño'}</button>
                <button className="btn ghost sm" onClick={() => update(p.id, { active: !p.active })}>{p.active ? 'Desactivar' : 'Activar'}</button>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty" style={{ marginBottom: 24 }}>Agregá a las personas del equipo, empezando por vos y Mate.</div>}

      <div className="two" style={{ marginBottom: 24 }}>
        <div className="card stack">
          <b>Dispositivos autorizados</b>
          <p className="muted" style={{ fontSize: 14 }}>La pantalla del equipo (<a href="/equipo">/equipo</a>) solo funciona en dispositivos autorizados. Entrá a este panel desde la tablet del café y autorizala acá.</p>
          {thisAuthorized ? <div className="banner">Este dispositivo ya está autorizado.</div> : (
            <form className="row" onSubmit={authorize}>
              <label className="f">Nombre<input type="text" value={devName} onChange={(e) => setDevName(e.target.value)} /></label>
              <button className="btn" style={{ flex: '0 0 auto' }}>Autorizar este dispositivo</button>
            </form>
          )}
          {devices.filter((d) => !d.revoked).length ? (
            <div className="lst">
              {devices.filter((d) => !d.revoked).map((d) => (
                <div className="li" key={d.id}>
                  <div><b>{d.name}</b>{d.token_hash === myHash ? <> <span className="pill confirmado">Este</span></> : null}<div className="muted" style={{ fontSize: 13 }}>Último uso: {d.last_seen ? when(d.last_seen) : 'nunca'}</div></div>
                  <div className="acts">{confirm === d.id ? <button className="btn danger sm" onClick={() => revoke(d)}>Confirmar</button> : <button className="btn ghost sm" onClick={() => setConfirm(d.id)}>Quitar</button>}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <form className="card stack" onSubmit={saveTol}>
          <b>Tolerancia de llegada</b>
          <p className="muted" style={{ fontSize: 14 }}>Hasta estos minutos después del horario, la llegada cuenta como “justo a tiempo”. Pasado eso, “tarde”.</p>
          <div className="row">
            <label className="f">Minutos<input type="text" inputMode="numeric" value={tol} onChange={(e) => setTol(e.target.value.replace(/\D/g, '').slice(0, 2))} /></label>
            <button className="btn" style={{ flex: '0 0 auto' }}>Guardar</button>
          </div>
        </form>
      </div>

      <div className="ph"><div><div className="eyebrow">Cierre de turno</div><h2 style={{ fontSize: 22 }}>Fotos obligatorias</h2></div></div>
      <form className="card stack" style={{ marginBottom: 12 }} onSubmit={addCheck}>
        <div className="row">
          <label className="f">Qué hay que fotografiar<input type="text" value={chk.name} onChange={(e) => setChk((c) => ({ ...c, name: e.target.value }))} placeholder="Heladera exhibidora" /></label>
          <label className="f">Cómo tiene que quedar (ayuda)<input type="text" value={chk.hint} onChange={(e) => setChk((c) => ({ ...c, hint: e.target.value }))} placeholder="Vidrios limpios y productos ordenados" /></label>
          <button className="btn" style={{ flex: '0 0 auto' }}>Agregar</button>
        </div>
      </form>
      {checks.length ? (
        <div className="lst">
          {checks.map((c, i) => (
            <div className="li" key={c.id}>
              <div className="row" style={{ alignItems: 'center' }}>
                <input type="text" aria-label="Nombre" defaultValue={c.name} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== c.name && patchCheck(c.id, { name: e.target.value.trim() })} />
                <input type="text" aria-label="Ayuda" defaultValue={c.hint} onBlur={(e) => e.target.value.trim() !== c.hint && patchCheck(c.id, { hint: e.target.value.trim() })} />
                {!c.active ? <span className="pill" style={{ flex: '0 0 auto' }}>Oculto</span> : null}
              </div>
              <div className="acts">
                <button className="btn ghost sm" aria-label="Subir" disabled={!i} onClick={() => moveCheck(i, -1)}>↑</button>
                <button className="btn ghost sm" aria-label="Bajar" disabled={i === checks.length - 1} onClick={() => moveCheck(i, 1)}>↓</button>
                <button className="btn ghost sm" onClick={() => patchCheck(c.id, { active: !c.active })}>{c.active ? 'Ocultar' : 'Mostrar'}</button>
                {confirm === c.id ? <button className="btn danger sm" onClick={() => delCheck(c)}>Confirmar</button> : <button className="btn ghost sm" onClick={() => setConfirm(c.id)}>Borrar</button>}
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty">Sin fotos obligatorias.</div>}
    </>
  );
}
