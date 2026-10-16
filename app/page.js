'use client';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { money } from '@/lib/utils';
import { BrandPattern, Isotipo, Wordmark } from '@/components/Brand';

function Wave() {
  return (
    <svg className="wave" viewBox="0 0 1200 56" preserveAspectRatio="none" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="3" d="M-40 30 C 60 6, 140 6, 240 30 S 420 54, 520 30 S 700 6, 800 30 S 980 54, 1080 30 S 1260 6, 1360 30" />
    </svg>
  );
}

export default function Inicio() {
  const { settings: c } = useApp();
  if (!c) return <div className="wrap"><section className="hero"><div className="empty">Cargando…</div></section></div>;
  const about = (c.about || '').split(/\n\s*\n/).filter(Boolean);
  const hours = (c.hours || '').split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((r) => r[0]);
  const mapUrl = c.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address.replace(/\(.*\)/, '') + ', Mar del Plata')}` : null;
  const ppp = Math.max(1, c.pesos_por_punto || 100);

  return (
    <div className="wrap">
      <section className="hero">
        <div className="hero-grid">
          <Isotipo className="hero-iso" alt="" />
          <div className="hero-copy">
            <div className="coords">38°00′S · 57°33′O · MAR DEL PLATA</div>
            <h1><Wordmark className="hero-wm" title="Surf Coffee" /></h1>
            <div className="kicker">Cafetería de especialidad</div>
            <p className="tag">{c.tagline || 'Café de especialidad a pasos del mar.'}</p>
            <div className="cta">
              <Link className="btn" href="/menu">Ver el menú</Link>
              <Link className="btn wax" href="/delivery">Pedir delivery</Link>
            </div>
          </div>
        </div>
        <Wave />
      </section>

      <section className="sec two">
        <div className="about">
          <div className="eyebrow">Quiénes somos</div>
          <h2>{c.about_title || 'Quiénes somos'}</h2>
          {about.length ? about.map((p, i) => <p key={i}>{p}</p>) : <p className="muted">Pronto vas a poder leer nuestra historia acá.</p>}
        </div>
        <div className="stack">
          <div className="eyebrow">Dónde estamos</div>
          {c.address ? (
            <>
              <div className="addr">{c.address}</div>
              <div className="muted">Mar del Plata, Buenos Aires</div>
              <div><a className="btn ghost sm" href={mapUrl} target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a></div>
            </>
          ) : <p className="muted">Dirección a confirmar.</p>}
          {hours.length ? (
            <div className="tide" style={{ marginTop: 8 }}>
              {hours.map((r, i) => <div key={i}><span>{r[0]}</span><span>{r[1] || ''}</span></div>)}
            </div>
          ) : null}
          {c.instagram ? <div className="muted">Instagram: <b>{c.instagram}</b></div> : null}
        </div>
      </section>

      <section className="sec">
        <div className="rule">
          <BrandPattern />
          <div className="big">+1</div>
          <p><b>Sumá puntos en cada compra.</b> Por cada {money(ppp)} que gastás en el local te damos 1 punto. Juntalos y canjealos por café, pastelería y más. Solo decí tu nombre y apellido en caja.</p>
          <Link className="btn wax" href="/puntos">Ver mis puntos</Link>
        </div>
      </section>
    </div>
  );
}
