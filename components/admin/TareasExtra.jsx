'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppProvider';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const TURNO = { tarde: 'cierre de la tarde', manana: 'cierre de la mañana', todos: 'todos los cierres' };
const blank = { name: '', hint: '', mode: 'semanal', day: '', weekdays: [], shift_kind: 'tarde' };
const fecha = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return `${DAYS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// Tareas que no son de todos los días (cafiza, estanterías…): aparecen en el cierre
// los días elegidos y piden foto, como las demás.
export default function TareasExtra() {
  const { sb, toast } = useApp();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await sb.from('extra_tasks').select('*').order('created_at');
    setMissing(!!error && /extra_tasks|does not exist|schema cache/i.test(error.message || ''));
    setRows(data || []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return toast('Escribí la tarea');
    if (form.mode === 'fecha' && !form.day) return toast('Elegí la fecha');
    if (form.mode === 'semanal' && !form.weekdays.length) return toast('Elegí al menos un día');
    const data = { name, hint: form.hint.trim(), mode: form.mode, day: form.mode === 'fecha' ? form.day : null, weekdays: form.mode === 'semanal' ? [...form.weekdays].sort() : [], shift_kind: form.shift_kind };
    const { error } = editId ? await sb.from('extra_tasks').update(data).eq('id', editId) : await sb.from('extra_tasks').insert(data);
    if (error) return toast(missing ? 'Falta correr supabase/2026-10-tareas.sql en Supabase' : 'No se pudo guardar');
    setForm(blank); setEditId(null); toast('Tarea guardada'); load();
  }
  async function patch(id, p) { await sb.from('extra_tasks').update(p).eq('id', id); load(); }
  async function del(id) { await sb.from('extra_tasks').delete().eq('id', id); setConfirm(null); load(); }

  const when = (t) => (t.mode === 'fecha' ? `el ${fecha(t.day)}` : (t.weekdays || []).length === 7 ? 'todos los días' : `los ${[1, 2, 3, 4, 5, 6, 0].filter((x) => t.weekdays.includes(x)).map((x) => DAYS[x]).join(', ')}`);
  const past = (t) => t.mode === 'fecha' && t.day < today();

  return (
    <>
      <div className="ph" style={{ marginTop: 24 }}><div><div className="eyebrow">Cierre de turno</div><h2 style={{ fontSize: 22 }}>Tareas extra</h2></div><span className="muted">Las que no son de todos los días. Aparecen en el cierre y piden foto.</span></div>
      {missing ? <div className="banner" style={{ marginBottom: 12, borderColor: 'var(--bad)' }}>Falta crear la tabla: corré <code>supabase/2026-10-tareas.sql</code> en Supabase → SQL Editor.</div> : null}
      <form className="card stack" style={{ marginBottom: 12 }} onSubmit={save}>
        <b>{editId ? 'Editar tarea' : 'Nueva tarea extra'}</b>
        <div className="row">
          <label className="f">Tarea<input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Dejar bocas y filtros con cafiza" /></label>
          <label className="f">Cómo tiene que quedar (ayuda)<input type="text" value={form.hint} onChange={(e) => setForm((f) => ({ ...f, hint: e.target.value }))} placeholder="Foto de las bocas en remojo" /></label>
        </div>
        <div className="row" style={{ alignItems: 'end' }}>
          <label className="f">Cuándo
            <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
              <option value="semanal">Todas las semanas, ciertos días</option>
              <option value="fecha">Una sola vez, en una fecha</option>
            </select>
          </label>
          {form.mode === 'fecha' ? (
            <label className="f">Fecha<input type="date" value={form.day} min={today()} onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))} style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', background: 'var(--surface)' }} /></label>
          ) : (
            <div className="f" style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Días
              <div className="days" role="group" aria-label="Días de la semana">
                {[1, 2, 3, 4, 5, 6, 0].map((x) => (
                  <label key={x}><input type="checkbox" checked={form.weekdays.includes(x)} onChange={(e) => setForm((f) => ({ ...f, weekdays: e.target.checked ? [...f.weekdays, x] : f.weekdays.filter((y) => y !== x) }))} />{DAYS[x]}</label>
                ))}
              </div>
            </div>
          )}
          <label className="f">En qué cierre
            <select value={form.shift_kind} onChange={(e) => setForm((f) => ({ ...f, shift_kind: e.target.value }))}>
              <option value="tarde">Cierre de la tarde</option>
              <option value="manana">Cierre de la mañana</option>
              <option value="todos">Todos los cierres</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'end' }}>
          {editId ? <button type="button" className="btn ghost" onClick={() => { setEditId(null); setForm(blank); }}>Cancelar</button> : null}
          <button className="btn">{editId ? 'Guardar' : 'Agregar tarea'}</button>
        </div>
      </form>
      {rows.length ? (
        <div className="lst">
          {rows.map((t) => (
            <div className="li" key={t.id}>
              <div>
                <b>{t.name}</b>{' '}
                {!t.active ? <span className="pill">Pausada</span> : past(t) ? <span className="pill">Ya pasó</span> : null}
                <div className="muted" style={{ fontSize: 13 }}>{when(t)} · {TURNO[t.shift_kind] || t.shift_kind}{t.hint ? ` · ${t.hint}` : ''}</div>
              </div>
              <div className="acts">
                <button className="btn ghost sm" onClick={() => { setEditId(t.id); setForm({ name: t.name, hint: t.hint || '', mode: t.mode, day: t.day || '', weekdays: t.weekdays || [], shift_kind: t.shift_kind }); }}>Editar</button>
                <button className="btn ghost sm" onClick={() => patch(t.id, { active: !t.active })}>{t.active ? 'Pausar' : 'Activar'}</button>
                {confirm === t.id ? <button className="btn danger sm" onClick={() => del(t.id)}>Confirmar</button> : <button className="btn ghost sm" onClick={() => setConfirm(t.id)}>Borrar</button>}
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty">Sin tareas extra. Ej: “Dejar bocas y filtros con cafiza” los lunes y jueves en el cierre de la tarde.</div>}
    </>
  );
}
