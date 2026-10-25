'use client';
import { useState } from 'react';
import { useApp } from '../AppProvider';
import { groupMenu, money } from '@/lib/utils';
import { ProductArt } from '../Products';

const blank = { name: '', category: '', price: '', sort: 100, description: '', available: true, image_url: null, _img0: null };

// Achica la foto en el navegador (máx. 1400 px, WebP) para que la carta cargue rápido.
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((r) => c.toBlob(r, 'image/webp', 0.84));
}

export default function MenuAdmin() {
  const { sb, menu, loadPublic, toast } = useApp();
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [photo, setPhoto] = useState(null); // { blob, url } foto nueva elegida
  const [busy, setBusy] = useState(false);
  const cats = [...new Set(menu.map((i) => i.category).filter(Boolean))];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const blob = await shrink(f);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch { toast('No se pudo leer esa imagen. Probá con un JPG o PNG.'); }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    let image_url = form.image_url || null;
    if (photo) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      const up = await sb.storage.from('menu').upload(path, photo.blob, { contentType: 'image/webp', upsert: false });
      if (up.error) { setBusy(false); return toast('No se pudo subir la foto. ¿Corriste supabase/2026-10-fotos-menu.sql?'); }
      image_url = sb.storage.from('menu').getPublicUrl(path).data.publicUrl;
    }
    const data = { name: form.name.trim(), category: form.category.trim() || 'Otros', price: Number(form.price) || 0, sort: Number(form.sort) || 100, description: form.description.trim(), available: !!form.available };
    // image_url solo se manda si cambió la foto (así el menú se sigue pudiendo editar aunque falte la migración)
    if (photo || (form.image_url || null) !== (form._img0 || null)) data.image_url = image_url;
    const { error } = editId ? await sb.from('menu_items').update(data).eq('id', editId) : await sb.from('menu_items').insert(data);
    setBusy(false);
    if (error) return toast(/image_url/.test(error.message || '') ? 'Falta correr supabase/2026-10-fotos-menu.sql para guardar fotos' : 'No se pudo guardar');
    setForm(blank); setEditId(null); setPhoto(null); loadPublic(); toast('Menú actualizado');
  }
  async function toggle(i) { await sb.from('menu_items').update({ available: !i.available }).eq('id', i.id); loadPublic(); }
  async function del(i) { await sb.from('menu_items').delete().eq('id', i.id); setConfirm(null); loadPublic(); toast('Producto borrado'); }
  function edit(i) { setEditId(i.id); setPhoto(null); setForm({ name: i.name, category: i.category, price: i.price, sort: i.sort, description: i.description || '', available: i.available, image_url: i.image_url || null, _img0: i.image_url || null }); window.scrollTo(0, 0); }
  const prevItem = { ...form, id: editId || 'nuevo', image_url: photo?.url || form.image_url };

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
        <div className="photo-in">
          <div className="prev">
            {prevItem.image_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={prevItem.image_url} alt="Foto del producto" />
              : <ProductArt item={prevItem} />}
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <b style={{ fontSize: 14 }}>Foto</b>
            <span className="muted" style={{ fontSize: 13 }}>Horizontal, con buena luz. Si no subís una, se usa el dibujo.</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
                {prevItem.image_url ? 'Cambiar foto' : 'Subir foto'}
                <input type="file" accept="image/*" onChange={pick} className="sr" />
              </label>
              {prevItem.image_url ? <button type="button" className="btn ghost sm" onClick={() => { setPhoto(null); setForm((f) => ({ ...f, image_url: null })); }}>Quitar foto</button> : null}
            </div>
          </div>
        </div>
        <div className="row" style={{ alignItems: 'center' }}>
          <label className="chk"><input type="checkbox" checked={form.available} onChange={set('available')} /> Disponible</label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'end' }}>
            {editId ? <button type="button" className="btn ghost" onClick={() => { setEditId(null); setForm(blank); setPhoto(null); }}>Cancelar</button> : null}
            <button className="btn" disabled={busy}>{busy ? 'Guardando…' : editId ? 'Guardar cambios' : 'Agregar al menú'}</button>
          </div>
        </div>
      </form>
      {menu.length ? groupMenu(menu).map(([cat, items]) => (
        <div key={cat}>
          <div className="eyebrow" style={{ margin: '16px 0 8px' }}>{cat}</div>
          <div className="lst">
            {items.map((i) => (
              <div className="li" key={i.id}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                  <span className="thumbm">
                    {i.image_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={i.image_url} alt="" loading="lazy" />
                      : <ProductArt item={i} />}
                  </span>
                  <div><b>{i.name}</b> <span className="mono muted">{money(i.price)}</span>{!i.available ? <> <span className="pill">Agotado</span></> : null}</div>
                </div>
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
