'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../AppProvider';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const TZ = 'America/Argentina/Buenos_Aires';
const todayAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const monday = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return addDays(iso, -((d.getUTCDay() + 6) % 7)); };
const label = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return `${DAYS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const hm = (t) => String(t || '').slice(0, 5);
const toMin = (t) => { const [h, m] = hm(t).split(':').map(Number); return h * 60 + m; };
const hours = (s) => { let d = toMin(s.end_time) - toMin(s.start_time); if (d < 0) d += 1440; return d / 60; };
const clock = (ts) => new Date(ts).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const ATT = { antes: 'antes', justo: 'a tiempo', tarde: 'tarde', sin_turno: 'sin turno' };

export default function Turnos() {
  const { sb, toast } = useApp();
  const today = todayAR();
  const [start, setStart] = useState(monday(today));
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [att, setAtt] = useState([]);
  const [form, setForm] = useState({ staff_id: '', day: today, from: '08:00', to: '14:00', note: '' });
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

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
  useEffect(() => { setForm((f) => ({ ...f, staff_id: f.staff_id || staff[0]?.id || '' })); }, [staff]);
  useEffect(() => { setForm((f) => (days.includes(f.day) ? f : { ...f, day: days.includes(today) ? today : days[0] })); }, [days, today]);

  async function add(e) {
    e.preventDefault();
    if (!form.staff_id) return toast('Elegí a la persona');
    if (!form.from || !form.to) return toast('Completá el horario');
    const { error } = await sb.from('staff_shifts').insert({ staff_id: form.staff_id, day: form.day, start_time: form.from, end_time: form.to, note: form.note.trim() });
    if (error) return toast('No se pudo guardar el turno');
    setForm((f) => ({ ...f, note: '' }));
    toast('Turno agregado'); load();
  }

  async function del(id) {
    await sb.from('staff_shifts').delete().eq('id', id);
    setConfirm(null); load();
  }

  async function copyPrev() {
    setBusy(true);
    const from = addDays(start, -7);
    const { data: prev } = await sb.from('staff_shifts').select('staff_id, day, start_time, end_time, note').gte('day', from).lt('day', start);
    const key = (s) => `${s.staff_id}|${s.day}|${hm(s.start_time)}`;
    const have = new Set(shifts.map(key));
    const rows = (prev || []).map((s) => ({ ...s, day: addDays(s.day, 7) })).filter((s) => !have.has(key(s)));
    setBusy(false);
    if (!rows.length) return toast('No hay turnos nuevos para copiar');
    const { error } = await sb.from('staff_shifts').insert(rows);
    if (error) return toast('No se pudo copiar');
    toast(`Se copiaron ${rows.length} turnos`); load();
  }

  const byCell = (sid, day) => shifts.filter((s) => s.staff_id === sid && s.day === day);
  const attFor = (s) => att.find((a) => a.shift_id === s.id);
  const loose = att.filter((a) => !a.shift_id);
  const weekHours = (sid) => shifts.filter((s) => s.staff_id === sid).reduce((t, s) => t + hours(s), 0);

  return (
    <>
      <div className="ph">
        <div><div className="eyebrow">Horarios</div><h2>Turnos</h2></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn ghost sm" onClick={() => setStart(addDays(start, -7))}>← Semana anterior</button>
          <button className="btn ghost sm" onClick={() => setStart(monday(today))} disabled={start === monday(today)}>Esta semana</button>
          <button className="btn ghost sm" onClick={() => setStart(addDays(start, 7))}>Semana siguiente →</button>
        </div>
      </div>

      <form className="card stack" style={{ marginBottom: 16 }} onSubmit={add}>
        <b>Agregar turno · semana del {label(start)} al {label(end)}</b>
        <div className="row">
          <label className="f">Persona
            <select value={form.staff_id} onChange={(e) => setForm((f) => ({ ...f, staff_id: e.target.value }))}>
              {staff.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="f">Día
            <select value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}>
              {days.map((d) => <option key={d} value={d}>{label(d)}</option>)}
            </select>
          </label>
          <label className="f">Entra<input type="time" value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} /></label>
          <label className="f">Sale<input type="time" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} /></label>
          <label className="f">Nota<input type="text" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Opcional" /></label>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn ghost" style={{ flex: '0 0 auto' }} onClick={copyPrev} disabled={busy}>Copiar la semana anterior</button>
          <button className="btn" style={{ flex: '0 0 auto' }} disabled={!staff.length}>Agregar turno</button>
        </div>
      </form>

      {staff.length ? (
        <div className="tbl">
          <div className="wk">
            <div className="hd">Persona</div>
            {days.map((d) => <div key={d} className={`hd ${d === today ? 'today' : ''}`}>{d === today ? 'Hoy · ' : ''}{label(d)}</div>)}
            {staff.map((p) => [
              <div key={p.id} className="nm">{p.name}<span className="muted mono" style={{ fontSize: 12, fontWeight: 400 }}>{Math.round(weekHours(p.id) * 10) / 10} h</span></div>,
              ...days.map((d) => (
                <div key={p.id + d}>
                  {byCell(p.id, d).map((s) => {
                    const a = attFor(s);
                    return (
                      <div key={s.id} style={{ display: 'grid', gap: 2 }}>
                        <span className="sh">
                          {hm(s.start_time)}–{hm(s.end_time)}
                          {confirm === s.id
                            ? <button type="button" aria-label="Confirmar borrado" onClick={() => del(s.id)} style={{ color: 'var(--bad)', fontSize: 12, fontWeight: 700 }}>Borrar</button>
                            : <button type="button" aria-label={`Borrar turno de ${p.name}`} onClick={() => setConfirm(s.id)}>×</button>}
                        </span>
                        {s.note ? <span className="muted" style={{ fontSize: 12 }}>{s.note}</span> : null}
                        {a ? <span className={`att ${a.status}`}>Llegó {clock(a.clock_in)} · {ATT[a.status]}</span> : d < today ? <span className="att sin_turno">Sin registro de llegada</span> : null}
                      </div>
                    );
                  })}
                  {loose.filter((a) => a.staff_id === p.id && a.day === d).map((a) => <span key={a.id} className="att sin_turno">Abrió {clock(a.clock_in)} sin turno</span>)}
                </div>
              )),
            ])}
          </div>
        </div>
      ) : <div className="empty">Primero agregá a las personas en la pestaña Equipo.</div>}
      <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>La llegada se registra sola cuando cada persona abre caja en el software de ventas.</p>
    </>
  );
}
