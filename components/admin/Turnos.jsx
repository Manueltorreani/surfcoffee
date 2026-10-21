'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../AppProvider';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const TZ = 'America/Argentina/Buenos_Aires';
const DEFAULT_DEFS = [
  { key: 'manana', label: 'Mañana', from: '08:30', to: '13:00', days: [1, 2, 3, 4, 5, 6] },
  { key: 'tarde', label: 'Tarde', from: '15:30', to: '20:00', days: [0, 1, 2, 3, 4, 5, 6] },
];
const todayAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (iso) => new Date(iso + 'T12:00:00Z').getUTCDay();
const monday = (iso) => addDays(iso, -((dow(iso) + 6) % 7));
const label = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return `${DAYS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const hm = (t) => String(t || '').slice(0, 5);
const toMin = (t) => { const [h, m] = hm(t).split(':').map(Number); return h * 60 + m; };
const hours = (s) => { let d = toMin(s.end_time) - toMin(s.start_time); if (d < 0) d += 1440; return d / 60; };
const clock = (ts) => new Date(ts).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const ATT = { antes: 'antes', justo: 'a tiempo', tarde: 'tarde', sin_turno: 'sin turno' };

export default function Turnos() {
  const { sb, settings, setSettings, toast } = useApp();
  const today = todayAR();
  const [start, setStart] = useState(monday(today));
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [att, setAtt] = useState([]);
  const [busy, setBusy] = useState('');
  const [defsForm, setDefsForm] = useState(null);
  const [big, setBig] = useState(null);

  const defs = Array.isArray(settings?.turnos_def) && settings.turnos_def.length ? settings.turnos_def : DEFAULT_DEFS;
  useEffect(() => { setDefsForm(defs.map((d) => ({ ...d, days: [...d.days] }))); }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const end = days[6];

  const load = useCallback(async () => {
    const [s, sh, a] = await Promise.all([
      sb.from('staff').select('id, name, role').eq('active', true).order('name'),
      sb.from('staff_shifts').select('*').gte('day', start).lte('day', end).order('start_time'),
      sb.from('staff_attendance').select('*').gte('day', start).lte('day', end),
    ]);
    setStaff(s.data || []); setShifts(sh.data || []); setAtt(a.data || []);
  }, [sb, start, end]);
  useEffect(() => { load(); }, [load]);

  const findShift = (sid, day, key) => shifts.find((s) => s.staff_id === sid && s.day === day && s.kind === key);

  async function toggle(p, day, d) {
    const k = `${p.id}|${day}|${d.key}`;
    setBusy(k);
    const cur = findShift(p.id, day, d.key);
    const { error } = cur
      ? await sb.from('staff_shifts').delete().eq('id', cur.id)
      : await sb.from('staff_shifts').insert({ staff_id: p.id, day, start_time: d.from, end_time: d.to, kind: d.key });
    setBusy('');
    if (error) return toast(/kind/.test(error.message) ? 'Falta correr supabase/2026-10-turnos.sql en Supabase' : 'No se pudo guardar');
    load();
  }

  // asigna el turno toda la semana (los días que abre ese turno)
  async function fillWeek(p, d) {
    const rows = days.filter((day) => d.days.includes(dow(day)) && !findShift(p.id, day, d.key))
      .map((day) => ({ staff_id: p.id, day, start_time: d.from, end_time: d.to, kind: d.key }));
    if (!rows.length) return toast(`${p.name} ya tiene todos los turnos de ${d.label.toLowerCase()}`);
    const { error } = await sb.from('staff_shifts').insert(rows);
    if (error) return toast('No se pudo guardar');
    toast(`${p.name}: ${rows.length} turnos de ${d.label.toLowerCase()}`); load();
  }

  async function delShift(id) { await sb.from('staff_shifts').delete().eq('id', id); load(); }

  async function copyPrev() {
    setBusy('copy');
    const { data: prev } = await sb.from('staff_shifts').select('staff_id, day, start_time, end_time, note, kind').gte('day', addDays(start, -7)).lt('day', start);
    const key = (s) => `${s.staff_id}|${s.day}|${s.kind || hm(s.start_time)}`;
    const have = new Set(shifts.map(key));
    const rows = (prev || []).map((s) => ({ ...s, day: addDays(s.day, 7) })).filter((s) => !have.has(key(s)));
    setBusy('');
    if (!rows.length) return toast('No hay turnos nuevos para copiar');
    const { error } = await sb.from('staff_shifts').insert(rows);
    if (error) return toast('No se pudo copiar');
    toast(`Se copiaron ${rows.length} turnos`); load();
  }

  async function saveDefs(e) {
    e.preventDefault();
    const clean = defsForm.map((d) => ({ ...d, days: [...d.days].sort() }));
    if (clean.some((d) => !d.from || !d.to)) return toast('Completá los horarios');
    const { data, error } = await sb.from('settings').update({ turnos_def: clean }).eq('id', 1).select('*').single();
    if (error) return toast(/turnos_def/.test(error.message) ? 'Falta correr supabase/2026-10-turnos.sql en Supabase' : 'No se pudo guardar');
    // los turnos ya cargados desde hoy toman el horario nuevo
    await Promise.all(clean.map((d) => sb.from('staff_shifts').update({ start_time: d.from, end_time: d.to }).eq('kind', d.key).gte('day', today)));
    setSettings(data); toast('Horarios guardados. Los turnos desde hoy usan el horario nuevo.'); load();
  }

  async function openPhoto(a, name) {
    const { data, error } = await sb.storage.from('equipo').createSignedUrl(a.photo_path, 3600);
    if (error || !data?.signedUrl) return toast('No se pudo abrir la foto');
    setBig({ src: data.signedUrl, name: `Llegada de ${name} · ${clock(a.clock_in)}` });
  }

  const attFor = (s) => att.find((a) => a.shift_id === s.id);
  const weekHours = (sid) => shifts.filter((s) => s.staff_id === sid).reduce((t, s) => t + hours(s), 0);
  const setDef = (i, patch) => setDefsForm((f) => f.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <>
      <div className="ph">
        <div><div className="eyebrow">Horarios</div><h2>Turnos</h2></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn ghost sm" onClick={() => setStart(addDays(start, -7))}>← Anterior</button>
          <button className="btn ghost sm" onClick={() => setStart(monday(today))} disabled={start === monday(today)}>Esta semana</button>
          <button className="btn ghost sm" onClick={() => setStart(addDays(start, 7))}>Siguiente →</button>
          <button className="btn ghost sm" onClick={copyPrev} disabled={busy === 'copy'}>Copiar semana anterior</button>
        </div>
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>Semana del {label(start)} al {label(end)}. Tocá <b>Mañana</b> o <b>Tarde</b> para asignar o sacar el turno.</p>

      {staff.length ? (
        <div className="tbl" style={{ marginBottom: 24 }}>
          <div className="wk">
            <div className="hd">Persona</div>
            {days.map((d) => <div key={d} className={`hd ${d === today ? 'today' : ''}`}>{d === today ? 'Hoy · ' : ''}{label(d)}</div>)}
            {staff.map((p) => [
              <div key={p.id} className="nm">
                <span>{p.name}</span>
                <span className="muted mono" style={{ fontSize: 12, fontWeight: 400 }}>{Math.round(weekHours(p.id) * 10) / 10} h</span>
                <div className="tg">{defs.map((d) => <button key={d.key} type="button" onClick={() => fillWeek(p, d)} title={`Asignar todas las ${d.label.toLowerCase()}s de la semana`}>+ {d.label}s</button>)}</div>
              </div>,
              ...days.map((day) => {
                const open = defs.filter((d) => d.days.includes(dow(day)));
                const custom = shifts.filter((s) => s.staff_id === p.id && s.day === day && !defs.some((d) => d.key === s.kind));
                return (
                  <div key={p.id + day} className={open.length ? '' : 'closed'}>
                    {open.length ? (
                      <div className="tg">
                        {open.map((d) => {
                          const sh = findShift(p.id, day, d.key);
                          return <button key={d.key} type="button" aria-pressed={!!sh} disabled={busy === `${p.id}|${day}|${d.key}`} onClick={() => toggle(p, day, d)} aria-label={`${d.label} ${label(day)} ${p.name}`}>{d.label}</button>;
                        })}
                      </div>
                    ) : <span className="muted" style={{ fontSize: 12 }}>Cerrado</span>}
                    {custom.map((s) => (
                      <span key={s.id} className="sh">{hm(s.start_time)}–{hm(s.end_time)}<button type="button" aria-label="Borrar turno" onClick={() => delShift(s.id)}>×</button></span>
                    ))}
                    {shifts.filter((s) => s.staff_id === p.id && s.day === day).map((s) => {
                      const a = attFor(s);
                      const nm = defs.find((d) => d.key === s.kind)?.label || hm(s.start_time);
                      if (a) return (
                        <span key={'a' + s.id} className={`att ${a.status}`}>
                          {nm}: llegó {clock(a.clock_in)} · {ATT[a.status]}
                          {a.photo_path ? <> · <button type="button" className="linkbtn" style={{ fontSize: 11 }} onClick={() => openPhoto(a, p.name)}>foto</button></> : null}
                        </span>
                      );
                      if (day < today || (day === today && toMin(s.start_time) + 30 < toMin(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date())))) {
                        return <span key={'a' + s.id} className="att sin_turno">{nm}: sin llegada</span>;
                      }
                      return null;
                    })}
                  </div>
                );
              }),
            ])}
          </div>
        </div>
      ) : <div className="empty" style={{ marginBottom: 24 }}>Primero agregá a las personas en la pestaña Equipo.</div>}

      {defsForm ? (
        <form className="card stack" onSubmit={saveDefs}>
          <b>Horarios de los turnos</b>
          <span className="muted" style={{ fontSize: 14 }}>Si cambian (por ejemplo en verano), cambialos acá: los turnos ya cargados desde hoy toman el horario nuevo.</span>
          <div className="tdefs">
            {defsForm.map((d, i) => (
              <div key={d.key} className="stack" style={{ gap: 8 }}>
                <b>{d.label}</b>
                <div className="row">
                  <label className="f">Desde<input type="time" value={d.from} onChange={(e) => setDef(i, { from: e.target.value })} /></label>
                  <label className="f">Hasta<input type="time" value={d.to} onChange={(e) => setDef(i, { to: e.target.value })} /></label>
                </div>
                <div className="days" role="group" aria-label={`Días del turno ${d.label}`}>
                  {[1, 2, 3, 4, 5, 6, 0].map((x) => (
                    <label key={x}><input type="checkbox" checked={d.days.includes(x)} onChange={(e) => setDef(i, { days: e.target.checked ? [...d.days, x] : d.days.filter((y) => y !== x) })} />{DAYS[x]}</label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div><button className="btn">Guardar horarios</button></div>
        </form>
      ) : null}

      {big ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={big.name} onClick={() => setBig(null)}>
          <img src={big.src} alt={big.name} />
          <div className="row"><b style={{ color: '#fff', flex: '0 0 auto' }}>{big.name}</b><button className="btn wax" onClick={() => setBig(null)}>Cerrar</button></div>
        </div>
      ) : null}
    </>
  );
}
