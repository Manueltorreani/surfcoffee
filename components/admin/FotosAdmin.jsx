'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppProvider';
import { shrinkPhoto, uploadPhoto } from '@/lib/photos';

const NEED_SQL = 'Falta correr supabase/2026-11-fotos-inicio.sql en Supabase → SQL Editor';

export default function FotosAdmin() {
  const { sb, settings, setSettings, loadPublic, toast } = useApp();
  const [rows, setRows] = useState([]);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await sb.from('gallery').select('*').order('sort').order('created_at');
    setMissing(!!error);
    setRows(error ? [] : data || []);
    setReady(true);
  }, [sb]);
  useEffect(() => { load(); }, [load]);
  const refresh = async () => { await load(); loadPublic(); };

  async function addPhotos(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    let ok = 0;
    const top = rows.reduce((m, r) => Math.max(m, r.sort || 0), 0);
    for (const [k, f] of files.entries()) {
      setBusy(`Subiendo ${k + 1} de ${files.length}…`);
      try {
        const url = await uploadPhoto(sb, await shrinkPhoto(f), 'inicio');
        const { error } = await sb.from('gallery').insert({ image_url: url, sort: top + (k + 1) * 10 });
        if (error) throw error;
        ok++;
      } catch (err) {
        console.error(err);
        toast(/gallery|relation|bucket|not found/i.test(String(err?.message)) ? NEED_SQL : 'No se pudo subir una de las fotos');
        break;
      }
    }
    setBusy('');
    if (ok) toast(ok === 1 ? 'Foto agregada al inicio' : `${ok} fotos agregadas al inicio`);
    refresh();
  }

  async function patch(id, data, msg) {
    const { error } = await sb.from('gallery').update(data).eq('id', id);
    if (error) return toast('No se pudo guardar');
    if (msg) toast(msg);
    refresh();
  }

  async function move(i, d) {
    const a = rows[i], b = rows[i + d];
    if (!a || !b) return;
    // reasigna el orden de toda la lista para que quede prolijo
    const next = [...rows];
    next[i] = b; next[i + d] = a;
    setRows(next);
    await Promise.all(next.map((r, k) => sb.from('gallery').update({ sort: (k + 1) * 10 }).eq('id', r.id)));
    refresh();
  }

  async function remove(r) {
    setConfirm(null);
    const { error } = await sb.from('gallery').delete().eq('id', r.id);
    if (error) return toast('No se pudo eliminar');
    const path = r.image_url.split('/object/public/menu/')[1];
    if (path) await sb.storage.from('menu').remove([decodeURIComponent(path)]);
    toast('Foto eliminada');
    refresh();
  }

  async function aboutPhoto(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy('Subiendo foto…');
    try {
      const url = await uploadPhoto(sb, await shrinkPhoto(f, 1400), 'nosotros');
      const { data, error } = await sb.from('settings').update({ about_image_url: url }).eq('id', 1).select().single();
      if (error) throw error;
      setSettings(data);
      toast('Foto de Quiénes somos actualizada');
    } catch (err) {
      console.error(err);
      toast(NEED_SQL);
    }
    setBusy('');
  }
  async function aboutReset() {
    const { data, error } = await sb.from('settings').update({ about_image_url: null }).eq('id', 1).select().single();
    if (error) return toast('No se pudo guardar');
    setSettings(data);
    toast('Volvimos a la foto original');
  }

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="ph">
        <div><div className="eyebrow">Inicio</div><h2>Fotos</h2></div>
        <label className={`btn ${busy || missing ? 'disabled' : ''}`} style={{ cursor: 'pointer' }} aria-disabled={!!busy || missing}>
          {busy || 'Agregar fotos'}
          <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={!!busy || missing} className="sr" />
        </label>
      </div>

      {missing ? <div className="banner">{NEED_SQL}. Después volvé a esta pestaña.</div> : null}

      <div className="card stack">
        <b>Carrusel “Pasa en Surf”</b>
        <p className="muted" style={{ fontSize: 14 }}>
          Fotos de ustedes, de eventos o de los productos estrella. Se muestran en el inicio en una tira que se mueve sola, en este orden.
          Podés elegir varias a la vez. Si no hay ninguna, la sección no aparece.
        </p>
        {!ready ? <div className="empty">Cargando…</div> : !rows.length ? (
          <div className="empty">Todavía no hay fotos. Tocá “Agregar fotos”.</div>
        ) : (
          <div className="glist">
            {rows.map((r, i) => (
              <div className={`gitem ${r.active ? '' : 'off'}`} key={r.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.image_url} alt="" loading="lazy" />
                <div className="stack" style={{ gap: 8 }}>
                  <input type="text" defaultValue={r.caption} placeholder="Texto corto (opcional): Feria de octubre, Flat white…" maxLength={60}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v !== (r.caption || '')) patch(r.id, { caption: v }, 'Texto guardado'); }} />
                  <div className="acts" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn ghost sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover antes">Antes</button>
                    <button className="btn ghost sm" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Mover después">Después</button>
                    <button className="btn ghost sm" onClick={() => patch(r.id, { active: !r.active }, r.active ? 'Foto oculta' : 'Foto visible')}>{r.active ? 'Ocultar' : 'Mostrar'}</button>
                    {confirm === r.id
                      ? <button className="btn danger sm" onClick={() => remove(r)}>Sí, eliminar</button>
                      : <button className="btn ghost sm" onClick={() => setConfirm(r.id)}>Eliminar</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card stack">
        <b>Foto de “Quiénes somos”</b>
        <div className="photo-in">
          <div className="prev" style={{ width: 96, aspectRatio: '3/4' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings?.about_image_url || '/fotos/nosotros.jpg'} alt="Foto actual" />
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <span className="muted" style={{ fontSize: 14 }}>Mejor vertical. Si no subís una, queda la de ustedes en la puerta del café.</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
                Cambiar foto
                <input type="file" accept="image/*" onChange={aboutPhoto} disabled={!!busy || missing} className="sr" />
              </label>
              {settings?.about_image_url ? <button className="btn ghost sm" onClick={aboutReset}>Usar la original</button> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
