'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useApp } from '@/components/AppProvider';
import { money } from '@/lib/utils';
import { BrandPattern, Isotipo, Waves, Wordmark } from '@/components/Brand';
import { ProductCard, ProductSheet } from '@/components/Products';

const rise = (d = 0) => ({ initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: d, ease: [0.2, 0.8, 0.2, 1] } });

export default function Inicio() {
  const { settings: c, menu } = useApp();
  const [open, setOpen] = useState(null);
  const close = useCallback(() => setOpen(null), []);
  const about = (c?.about || '').split(/\n\s*\n/).filter(Boolean);
  const hours = (c?.hours || '').split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((r) => r[0]);
  const mapUrl = c?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address.replace(/\(.*\)/, '') + ', Mar del Plata')}` : null;
  const ppp = Math.max(1, c?.pesos_por_punto || 100);
  const ig = (c?.instagram || '').replace(/^@/, '').trim();
  // destacados: lo primero disponible de cada categoría, hasta 6
  const seen = new Set();
  const picks = [...menu].filter((i) => i.available).sort((a, b) => (a.sort ?? 100) - (b.sort ?? 100))
    .filter((i) => { const k = i.category || 'Otros'; if (seen.has(k)) return false; seen.add(k); return true; })
    .concat(menu.filter((i) => i.available)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);

  return (
    <>
      <section className="surf">
        <div className="spray" />
        <div className="wrap surf-in">
          <div className="surf-copy">
            <motion.div className="kicker" {...rise(0.05)}>Cafetería de especialidad en Mar del Plata</motion.div>
            <motion.h1 initial={{ opacity: 0, x: -40, skewX: -8 }} animate={{ opacity: 1, x: 0, skewX: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
              <Wordmark className="surf-wm" title="Surf Coffee" />
            </motion.h1>
            <motion.p className="lead" {...rise(0.25)}>{c?.tagline || 'Café de especialidad, buena música y olor a mar.'}</motion.p>
            <motion.div className="surf-cta" {...rise(0.38)}>
              <Link className="btn white" href="/menu">Ver la carta</Link>
              <Link className="btn outline-white" href="/delivery">Pedir delivery</Link>
            </motion.div>
          </div>
          <motion.div className="rider" initial={{ opacity: 0, y: 80, rotate: -12 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 90, damping: 12, delay: 0.35 }}>
            <motion.div style={{ width: '100%', height: '100%' }} animate={{ y: [0, -10, 0], rotate: [-2, 3, -2] }} transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}>
              <Isotipo alt="" />
            </motion.div>
          </motion.div>
        </div>
        <Waves />
      </section>

      <div className="wrap">
        <section className="sec intro">
          <div className="about">
            <div className="eyebrow">Quiénes somos</div>
            <h2>{c?.about_title || 'Quiénes somos'}</h2>
            {about.length ? about.map((p, i) => <p key={i}>{p}</p>) : <p className="muted">Pronto vas a poder leer nuestra historia acá.</p>}
          </div>
          <div className="spot">
            <div className="eyebrow">Dónde estamos</div>
            {c?.address ? (
              <div>
                <div className="addr">{c.address}</div>
                <div className="muted">Mar del Plata, Buenos Aires</div>
              </div>
            ) : <p className="muted">Dirección a confirmar.</p>}
            {hours.length ? (
              <div className="tide">
                {hours.map((r, i) => <div key={i}><span>{r[0]}</span><span>{r[1] || ''}</span></div>)}
              </div>
            ) : null}
            <div className="acts">
              {mapUrl ? <a className="btn sm" href={mapUrl} target="_blank" rel="noopener noreferrer">Cómo llegar</a> : null}
              {ig ? <a className="btn ghost sm" href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer">Instagram</a> : null}
            </div>
          </div>
        </section>

        {picks.length ? (
          <section className="sec">
            <div className="sec-head">
              <h2>De la barra</h2>
              <Link className="btn ghost sm" href="/menu">Ver toda la carta</Link>
            </div>
            <div className="strip">
              {picks.map((i) => <ProductCard key={i.id} item={i} onOpen={setOpen} ctx="h" />)}
            </div>
          </section>
        ) : null}

        <section className="sec">
          <div className="rule">
            <BrandPattern />
            <div className="big" aria-hidden="true">+1</div>
            <p><b>Sumá puntos en cada compra.</b> Por cada {money(ppp)} que gastás en el local te damos 1 punto. Juntalos y canjealos por café, pastelería y más. Solo decí tu nombre y apellido en caja.</p>
            <Link className="btn wax" href="/puntos">Ver mis puntos</Link>
          </div>
        </section>
      </div>
      <ProductSheet item={open} onClose={close} ctx="h" />
    </>
  );
}
