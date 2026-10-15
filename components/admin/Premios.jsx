'use client';
import { useState } from 'react';
import { useApp } from '../AppProvider';
import { money, num } from '@/lib/utils';

const blank = { name: '', cost: '', description: '', active: true };

export default function Premios() {
  const { sb, rewards, settings, loadPublic, toast } = useApp();
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const ppp = Math.max(1, settings?.pesos_por_punto || 100);

  async function save(e) {
    e.preventDefault();
    const data = { name: form.name.trim(), cost: Number(form.cost) || 1, description: form.description.trim(), active: !!form.active };
    const { error } = editId ? await sb.from('rewards').update(data).eq('id', editId) : await sb.from('rewards').insert(data);
    if (error) return toast('No se pudo guardar');
    setForm(blank); setEditId(null); loadPublic(); toast('Premio guardado');
  }
  async function del(r) { await sb.from('rewards').delete().eq('id', r.id); setConfirm(null); loadPublic(); toast('Premio borrado'); }

  return (
    <>
      <div className="ph"><div><div className="eyebrow">Canjes</div><h2>Premios</h2></div><span className="muted">1 punto = {money(ppp)} de compra</span></div>
      <form className="card stack" style={{ marginBottom: 16 }} onSubmit={save}>
        <b>{editId ? 'Editar premio' : 'Nuevo premio'}</b>
        <div className="row">
          <label className="f">Premio<input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Flat white" /></label>
          <label className="f">Cuesta (puntos)<input type="text" inputMode="numeric" required value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value.replace(/\D/g, '') }))} /></label>
        </div>
        <label className="f">Descripción<input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
        <div className="row" style={{ alignItems: 'center' }}>
          <label className="chk"><input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} /> Visible para clientes</label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'end' }}>
            {editId ? <button type="button" className="btn ghost" onClick={() => { setEditId(null); setForm(blank); }}>Cancelar</button> : null}
            <button className="btn">{editId ? 'Guardar' : 'Agregar premio'}</button>
          </div>
        </div>
      </form>
      {rewards.length ? (
        <div className="lst">
          {[...rewards].sort((a, b) => a.cost - b.cost).map((r) => (
            <div className="li" key={r.id}>
              <div><b>{r.name}</b> <span className="mono muted">{num(r.cost)} pts · equivale a {money(r.cost * ppp)} en compras</span>{!r.active ? <> <span className="pill">Oculto</span></> : null}</div>
              <div className="acts">
                <button className="btn ghost sm" onClick={() => { setEditId(r.id); setForm({ name: r.name, cost: r.cost, description: r.description || '', active: r.active }); window.scrollTo(0, 0); }}>Editar</button>
                {confirm === r.id ? <button className="btn danger sm" onClick={() => del(r)}>Confirmar borrado</button> : <button className="btn ghost sm" onClick={() => setConfirm(r.id)}>Borrar</button>}
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty">Sin premios todavía.</div>}
    </>
  );
}
