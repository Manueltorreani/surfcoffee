'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useApp } from '@/components/AppProvider';
import { ProductCard, ProductSheet } from '@/components/Products';
import { groupMenu, hoursText } from '@/lib/utils';

const slug = (s) => 'cat-' + String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');

export default function Menu() {
  const { menu, settings } = useApp();
  const groups = groupMenu(menu);
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(null);
  const close = useCallback(() => setOpen(null), []);
  const lock = useRef(0);
  const barRef = useRef(null);

  // marca la categoría que se está viendo mientras bajás
  const keys = groups.map((g) => g[0]).join('|');
  useEffect(() => {
    if (!keys) return;
    const els = keys.split('|').map((k) => document.getElementById(slug(k))).filter(Boolean);
    const io = new IntersectionObserver((ents) => {
      if (Date.now() < lock.current) return;
      const vis = ents.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.dataset.cat);
    }, { rootMargin: '-30% 0px -60% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [keys]);

  // mantiene visible el botón activo en la barra
  useEffect(() => {
    const b = barRef.current?.querySelector('[aria-current="true"]');
    b?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [active]);

  const go = (k) => {
    setActive(k);
    lock.current = Date.now() + 900;
    document.getElementById(slug(k))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const cur = active || groups[0]?.[0];

  return (
    <div className="wrap">
      <header className="page-head">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}>La carta</motion.h1>
        <p className="lead muted">Tocá un producto para verlo y sumarlo a tu pedido de delivery.</p>
      </header>

      {groups.length > 1 ? (
        <nav className="cats" aria-label="Categorías">
          <div className="cats-in" ref={barRef}>
            {groups.map(([c, items]) => (
              <button key={c} type="button" className="cat-b" aria-current={cur === c ? 'true' : undefined} onClick={() => go(c)}>
                {cur === c ? <motion.span layoutId="cat-ind" className="ind" /> : null}
                {c}<span className="c">{items.length}</span>
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      {groups.length ? groups.map(([c, items]) => (
        <section className="menu-sec" key={c} id={slug(c)} data-cat={c} aria-labelledby={slug(c) + '-t'}>
          <h2 id={slug(c) + '-t'}>{c}</h2>
          <div className="pgrid">
            {items.map((i, n) => (
              <motion.div key={i.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: Math.min(n, 6) * 0.05, ease: [0.2, 0.8, 0.2, 1] }}>
                <ProductCard item={i} onOpen={setOpen} />
              </motion.div>
            ))}
          </div>
        </section>
      )) : <div className="empty" style={{ marginTop: 24 }}>Estamos cargando la carta. Volvé en un rato.</div>}

      <section className="sec">
        <div className="rule">
          <p><b>¿Lo querés en tu casa?</b> Armá tu pedido desde Delivery y seguilo por el chat. {hoursText(settings)}.</p>
          <Link className="btn wax" href="/delivery">Pedir delivery</Link>
        </div>
      </section>
      <ProductSheet item={open} onClose={close} />
    </div>
  );
}
