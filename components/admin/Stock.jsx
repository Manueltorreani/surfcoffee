'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppProvider';
import { num } from '@/lib/utils';
import { missingText, waLink } from './Cierres';

const blank = { name: '', unit: 'u', min_qty: '' };
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const label = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return `${DAYS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

export default function Stock() {
  const { sb, toast } = useApp();
  const [items, setItems] = useState([]);
  const [last, setLast] = useState(null);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    const [i, c] = await Promise.all([
      sb.from('stock_items').select('*').order('sort').order('name'),
      sb.from('staff_closings').select('day, staff_name, created_at, stock').order('created_at', { ascending: false }).limit(1),
    ]);
    setItems(i.data || []); setLast((c.data || [])[0] || null);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault();
    const data = { name: form.name.trim(), unit: form.unit.trim() || 'u', min_qty: Number(String(form.min_qty).replace(',', '.')) || 0 };
    if (!data.name) return;
    if (!editId) data.sort = (items.reduce((m, x) => Math.max(m, x.sort || 0), 0) || 0) + 10;
    const { error } = editId ? await sb.from('stock_items').update(data).eq('id', editId) : await sb.from('stock_items').insert(data);
    if (error) return toast('No se pudo guardar');
    setForm(blank); setEditId(null); toast('Insumo guardado'); load();
  }
  async function patch(id, p) { await sb.from('stock_items').update(p).eq('id', id); load(); }
  async function del(id) { await sb.from('stock_items').delete().eq('id', id); setConfirm(null); load(); }

  const counted = new Map((last?.stock || []).map((s) => [s.item_id, s]));
  const missing = items.filter((it) => it.active && counted.has(it.id) && counted.get(it.id).qty < Number(it.min_qty))
    .map((it) => ({ name: it.name, unit: it.unit, qty: counted.get(it.id).qty, min: Number(it.min_qty), falta: Math.round((Number(it.min_qty) - counted.get(it.id).qty) * 100) / 100 }));

  return (
    <>
      <div className="ph">
        <div><div className="eyebrow">Conteo al cierre</div><h2>Stock</h2></div>
        {last ? <span className="muted">Último conteo: {label(last.day)} · {last.staff_name}</span> : null}
      </div>

      {missing.length ? (
        <div className="found" style={{ marginBottom: 16 }}>
          <div><b>Para comprar ({missing.length})</b><div style={{ fontSize: 14 }}>{missing.map((m) => `${m.name} (faltan ${num(m.falta)} ${m.unit})`).join(' · ')}</div></div>
          <a className="btn" href={waLink(missingText(missing, `Surf Coffee · para comprar (conteo ${label(last.day)})`))} target="_blank" rel="noopener noreferrer">Mandar por WhatsApp</a>
        </div>
      ) : last ? <div className="banner" style={{ marginBottom: 16 }}>En el último conteo todo estaba sobre el mínimo.</div> : null}

      <form className="card stack" style={{ marginBottom: 16 }} onSubmit={save}>
        <b>{editId ? 'Editar insumo' : 'Nuevo insumo'}</b>
        <div className="row">
          <label className="f">Insumo<input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Leche entera" /></label>
          <label className="f">Unidad<input type="text" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="L, kg, u, paq." /></label>
          <label className="f">Mínimo<input type="text" inputMode="decimal" value={form.min_qty} onChange={(e) => setForm((f) => ({ ...f, min_qty: e.target.value.replace(/[^\d.,]/g, '') }))} placeholder="0" /></label>
          <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
            {editId ? <button type="button" className="btn ghost" onClick={() => { setEditId(null); setForm(blank); }}>Cancelar</button> : null}
            <button className="btn">{editId ? 'Guardar' : 'Agregar'}</button>
          </div>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>Si al cierre queda menos que el mínimo, aparece en la lista para comprar.</span>
      </form>

      {items.length ? (
        <div className="tbl">
          <table>
            <thead><tr><th>Insumo</th><th className="n">Mínimo</th><th className="n">Último conteo</th><th /></tr></thead>
            <tbody>
              {items.map((it) => {
                const c = counted.get(it.id);
                const low = c && c.qty < Number(it.min_qty);
                return (
                  <tr key={it.id}>
                    <td><b>{it.name}</b>{!it.active ? <> <span className="pill">Oculto</span></> : null}</td>
                    <td className="n">{num(it.min_qty)} {it.unit}</td>
                    <td className={`n ${low ? 'low' : ''}`}>{c ? `${num(c.qty)} ${it.unit}` : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="acts" style={{ display: 'flex', gap: 6, justifyContent: 'end' }}>
                        <button className="btn ghost sm" onClick={() => { setEditId(it.id); setForm({ name: it.name, unit: it.unit, min_qty: String(it.min_qty) }); window.scrollTo(0, 0); }}>Editar</button>
                        <button className="btn ghost sm" onClick={() => patch(it.id, { active: !it.active })}>{it.active ? 'Ocultar' : 'Mostrar'}</button>
                        {confirm === it.id ? <button className="btn danger sm" onClick={() => del(it.id)}>Confirmar</button> : <button className="btn ghost sm" onClick={() => setConfirm(it.id)}>Borrar</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <div className="empty">Agregá los insumos que el equipo tiene que contar al cierre.</div>}
    </>
  );
}
