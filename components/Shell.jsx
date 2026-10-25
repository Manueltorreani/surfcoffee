'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from './AppProvider';
import { missingConfig } from '@/lib/supabase';
import { money } from '@/lib/utils';
import { Isotipo, Wordmark } from './Brand';

const TABS = [
  ['/', 'Inicio', 'Inicio', <path key="i" d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />],
  ['/menu', 'La carta', 'Carta', <path key="m" d="M5 3v8a3 3 0 006 0V3M8 3v18M17 3c-2 2-2 6 0 8v10" />],
  ['/puntos', 'Mis puntos', 'Puntos', <g key="p"><circle cx="12" cy="9" r="6" /><path d="M8.5 14L7 22l5-3 5 3-1.5-8" /></g>],
  ['/delivery', 'Delivery', 'Delivery', <path key="d" d="M4 5h16v11H8l-4 4z" />],
];

// Resumen del pedido en armado (lo usan la barra y el botón del carrito)
export function useCartInfo() {
  const { cart, menu, settings } = useApp();
  let count = 0, sub = 0;
  for (const [id, q] of Object.entries(cart)) {
    const m = menu.find((x) => x.id === id);
    if (m && m.available) { count += q; sub += m.price * q; }
  }
  return { count, sub, total: count ? sub + (settings?.delivery_fee || 0) : 0 };
}

export default function Shell({ children }) {
  const path = usePathname() || '/';
  const { unreadClient, session, signOut } = useApp();
  const { count, sub } = useCartInfo();
  const inPanel = path.startsWith('/panel');
  const [scrolled, setScrolled] = useState(false);

  // la barra superior es transparente sobre el mar del inicio y se vuelve sólida al bajar
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > (path === '/' ? Math.min(window.innerHeight * 0.55, 420) : 8));
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [path]);
  const tone = path === '/' && !scrolled ? 'sea' : 'land';
  const showCartBar = !inPanel && count > 0 && (path === '/' || path === '/menu');

  return (
    <>
      <a href="#contenido" className="sr">Ir al contenido</a>
      <header className={`top ${scrolled ? 'scrolled' : ''}`} data-tone={tone}>
        <div className="wrap">
          <Link className="brand" href="/" aria-label="Surf Coffee, inicio"><Isotipo className="brand-iso" /><Wordmark className="brand-wm" title="Surf Coffee" /></Link>
          {inPanel ? (
            <>
              <span className="eyebrow" style={{ flex: 1 }}>Panel</span>
              <Link className="mode" href="/">Ver la web</Link>
              {session ? <button className="mode" onClick={signOut}>Cerrar sesión</button> : null}
            </>
          ) : (
            <>
              <nav className="nav" aria-label="Secciones">
                {TABS.map(([href, label]) => {
                  const on = path === href;
                  return (
                    <Link key={href} href={href} aria-current={on ? 'page' : undefined}>
                      {on ? <motion.span layoutId="nav-ind" className="ind" /> : null}
                      {label}
                      {href === '/delivery' && unreadClient ? <span className="dot" style={{ marginLeft: 6, verticalAlign: 2 }} aria-label="Mensaje nuevo" /> : null}
                    </Link>
                  );
                })}
              </nav>
              <div className="top-act">
                {count ? (
                  <Link className="mode cartlink" href="/delivery#pedido" aria-label={`Tu pedido: ${count} productos`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 7h12l-1 13H7z" /><path d="M9 7a3 3 0 016 0" /></svg>
                    <motion.span key={count} className="n" initial={{ scale: 0.4 }} animate={{ scale: 1 }}>{count}</motion.span>
                  </Link>
                ) : null}
                {!session ? <Link className="mode" href="/cuenta">Ingresar</Link> : null}
              </div>
            </>
          )}
        </div>
      </header>
      {missingConfig ? (
        <div className="wrap" style={{ paddingTop: 16 }}>
          <div className="banner">Falta configurar la conexión con Supabase. Cargá las variables de entorno en Vercel (ver README) y volvé a publicar.</div>
        </div>
      ) : null}
      <main id="contenido" className={inPanel ? '' : 'with-tabbar'}>{children}</main>

      <AnimatePresence>
        {showCartBar ? (
          <motion.div key="cartbar" initial={{ y: 80, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: 80, opacity: 0, x: '-50%' }} className="cartbar">
            <motion.span key={count} className="n" initial={{ scale: 0.5 }} animate={{ scale: 1 }}>{count}</motion.span>
            <span className="t">{money(sub)}</span>
            <Link className="go" href="/delivery#pedido">Ver mi pedido</Link>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!inPanel ? (
        <nav className="tabbar" aria-label="Secciones">
          {TABS.map(([href, , short, icon]) => {
            const on = path === href;
            const badge = href === '/delivery' ? (count || (unreadClient ? '' : null)) : null;
            return (
              <Link key={href} href={href} aria-current={on ? 'page' : undefined}>
                {on ? <motion.span layoutId="tab-ind" className="ind" /> : null}
                <span className="ti">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
                  {badge !== null && badge !== 0 ? <motion.i key={String(badge)} className="tdot" initial={{ scale: 0 }} animate={{ scale: 1 }}>{badge}</motion.i> : null}
                </span>
                {short}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
