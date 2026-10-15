'use client';
import { useApp } from '../AppProvider';
import { DAYS, parseStreets, streetsTxt, zoneOf } from '@/lib/utils';

export default function Ajustes() {
  const { sb, settings: c, setSettings, toast } = useApp();
  if (!c) return <div className="empty">Cargando…</div>;
  const days = Array.isArray(c.delivery_days) ? c.delivery_days : [0, 1, 2, 3, 4, 5, 6];

  async function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      tagline: f.get('tagline'), about_title: f.get('about_title'), about: f.get('about'), address: f.get('address'),
      instagram: f.get('instagram'), hours: f.get('hours'),
      pesos_por_punto: Number(f.get('pesos_por_punto')) || 100, welcome_points: Number(f.get('welcome_points')) || 0,
      delivery_fee: Number(f.get('delivery_fee')) || 0, delivery_open: f.get('delivery_open') === 'on',
      delivery_from: f.get('delivery_from') || null, delivery_to: f.get('delivery_to') || null,
      delivery_days: [0, 1, 2, 3, 4, 5, 6].filter((d) => f.get('d' + d) === 'on'),
      zone_h: parseStreets(f.get('zone_h')), zone_v: parseStreets(f.get('zone_v')), updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await sb.from('settings').update(data).eq('id', 1).select().single();
    if (error) return toast('No se pudieron guardar los ajustes');
    setSettings(row);
    toast('Ajustes guardados');
  }

  return (
    <>
      <div className="ph"><div><div className="eyebrow">Configuración</div><h2>Ajustes</h2></div></div>
      <form className="card stack" onSubmit={save}>
        <label className="f">Frase de portada<input type="text" name="tagline" defaultValue={c.tagline || ''} /></label>
        <label className="f">Título de Quiénes somos<input type="text" name="about_title" defaultValue={c.about_title || ''} /></label>
        <label className="f">Quiénes somos (dejá una línea en blanco entre párrafos)<textarea name="about" rows={6} defaultValue={c.about || ''} /></label>
        <div className="row">
          <label className="f">Dirección<input type="text" name="address" defaultValue={c.address || ''} /></label>
          <label className="f">Instagram<input type="text" name="instagram" defaultValue={c.instagram || ''} placeholder="@usuario" /></label>
        </div>
        <label className="f">Horarios del local (una línea por día: Días | Horario)<textarea name="hours" rows={4} defaultValue={c.hours || ''} /></label>
        <div className="row">
          <label className="f">Pesos por punto<input type="text" inputMode="numeric" name="pesos_por_punto" defaultValue={c.pesos_por_punto ?? 100} /></label>
          <label className="f">Puntos de bienvenida<input type="text" inputMode="numeric" name="welcome_points" defaultValue={c.welcome_points ?? 0} /></label>
          <label className="f">Costo de envío (ARS)<input type="text" inputMode="numeric" name="delivery_fee" defaultValue={c.delivery_fee ?? 0} /></label>
        </div>

        <div className="eyebrow" style={{ marginTop: 8 }}>Horario de delivery</div>
        <div className="row">
          <label className="f">Desde<input type="time" name="delivery_from" defaultValue={c.delivery_from || ''} /></label>
          <label className="f">Hasta<input type="time" name="delivery_to" defaultValue={c.delivery_to || ''} /></label>
        </div>
        <div className="chips">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => <label key={d} className="chk chip"><input type="checkbox" name={'d' + d} defaultChecked={days.includes(d)} /> {DAYS[d]}</label>)}
        </div>
        <label className="chk"><input type="checkbox" name="delivery_open" defaultChecked={c.delivery_open !== false} /> Delivery activo (destildalo para pausarlo aunque esté en horario)</label>

        <div className="eyebrow" style={{ marginTop: 8 }}>Zona de entrega</div>
        <p className="muted" style={{ fontSize: 13 }}>Una calle por línea, en orden de un borde al otro: <span className="mono">Nombre | altura desde | altura hasta</span>. La primera y la última son los límites. Si dejás las alturas vacías, se acepta cualquier número en esa calle.</p>
        <div className="row">
          <label className="f">Calles paralelas a Avellaneda (de arriba a abajo)<textarea name="zone_h" rows={7} defaultValue={streetsTxt(zoneOf(c).h)} /></label>
          <label className="f">Calles paralelas a Olavarría (de izquierda a derecha)<textarea name="zone_v" rows={7} defaultValue={streetsTxt(zoneOf(c).v)} /></label>
        </div>
        <div><button className="btn">Guardar ajustes</button></div>
      </form>
    </>
  );
}
