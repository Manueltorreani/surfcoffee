'use client';
import { useState } from 'react';
import { useApp } from '../AppProvider';
import { groupMenu, money } from '@/lib/utils';

const blank = { name: '', category: '', price: '', sort: 100, description: '', available: true };

export default function MenuAdmin() {
  const { sb, menu, loadPublic, toast } = useApp();
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const cats = [...new Set(menu.map((i) => i.category).filter(Boolean))];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault();
    const data = { name: form.name.trim(), category: form.category.trim() || 'Otros', price: Number(form.price) || 0, sort: Number(form.sort) || 100, description: form.description.trim(), available: !!form.available };
    const { error } = editId ? await sb.from('menu_items').update(data).eq('id', editId) : await sb.from('menu_items').insert(data);
    if (error) return toast('No se pudo guardar');
    setForm(blank); setEditId(null); loadPublic(); toast('Menú actualizado');
  }
  async function toggle(i) { await sb.from('menu_items').update({ available: !i.available }).eq('id', i.id); loadPublic(); }
  async function del(i) { await sb.from('menu_items').delete().eq('id', i.id); setConfirm(null); loadPublic(); toast('Producto borrado'); }
  function edit(i) { setEditId(i.id); setForm({ name: i.name, category: i.category, price: i.price, sort: i.sort, description: i.description || '', available: i.available }); window.scrollTo(0, 0); }

  return (
    <>
      <div className="ph"><div><div className="eyebrow">Carta</div><h2>Menú</h2></div><span className="muted">{menu.length} productos</span></div>
      <form className="card stack" style={{ marginBottom: 16 }} onSubmit={save}>
        <b>{editId ? 'Editar producto' : 'Nuevo producto'}</b>
        <div className="row">
          <label className="f">Nombre<input type="text" required value={form.name} onChange={set('name')} /></label>
          <label className="f">Categoría<input type="text" list="dl-cats" required value={form.category} onChange={set('category')} placeholder="Café, Pastelería…" /></label>
        </div>
        <datalist id="dl-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        <div className="row">
          <label className="f">Precio (ARS)<input type="text" inputMode="numeric" required value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/\D/g, '') }))} /></label>
          <label className="f">Orden en la carta<input type="text" inputMode="numeric" value={form.sort} onChange={(e) => setForm((f) => ({ ...f, sort: e.target.value.replace(/\D/g, '') }))} /></label>
        </div>
        <label className="f">Descripción<input type="text" value={form.description} onChange={set('description')} /></label>
        <div className="row" style={{ alignItems: 'center' }}>
          <label className="chk"><input type="checkbox" checked={form.available} onChange={set('available')} /> Disponible</label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'end' }}>
            {editId ? <button type="button" className="btn ghost" onClick={() => { setEditId(null); setForm(blank); }}>Cancelar</button> : null}
            <button className="btn">{editId ? 'Guardar cambios' : 'Agregar al menú'}</button>
          </div>
        </div>
      </form>
      {menu.length ? groupMenu(menu).map(([cat, items]) => (
        <div key={cat}>
          <div className="eyebrow" style={{ margin: '16px 0 8px' }}>{cat}</div>
          <div className="lst">
            {items.map((i) => (
              <div className="li" key={i.id}>
                <div><b>{i.name}</b> <span className="mono muted">{money(i.price)}</span>{!i.available ? <> <span className="pill">Agotado</span></> : null}</div>
                <div className="acts">
                  <button className="btn ghost sm" onClick={() => toggle(i)}>{i.available ? 'Marcar agotado' : 'Marcar disponible'}</button>
                  <button className="btn ghost sm" onClick={() => edit(i)}>Editar</button>
                  {confirm === i.id ? <button className="btn danger sm" onClick={() => del(i)}>Confirmar borrado</button> : <button className="btn ghost sm" onClick={() => setConfirm(i.id)}>Borrar</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )) : <div className="empty">El menú está vacío. Cargá tu primer producto arriba.</div>}
    </>
  );
}
