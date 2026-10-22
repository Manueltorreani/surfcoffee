'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from './AppProvider';
import { missingConfig } from '@/lib/supabase';
import { Isotipo, Wordmark } from './Brand';

const TABS = [
  ['/', 'Inicio', 'Inicio', <path key="i" d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />],
  ['/menu', 'Menú', 'Menú', <path key="m" d="M5 3v8a3 3 0 006 0V3M8 3v18M17 3c-2 2-2 6 0 8v10" />],
  ['/puntos', 'Mis puntos', 'Puntos', <g key="p"><circle cx="12" cy="9" r="6" /><path d="M8.5 14L7 22l5-3 5 3-1.5-8" /></g>],
  ['/delivery', 'Pedir delivery', 'Delivery', <path key="d" d="M4 5h16v11H8l-4 4z" />],
];

export default function Shell({ children }) {
  const path = usePathname() || '/';
  const { unreadClient, cart, session, signOut } = useApp();
  const inStaff = path.startsWith('/equipo');
  const inPanel = path.startsWith('/panel') || inStaff;
  const cartN = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <>
      <header className="top">
        <div className="wrap">
          <Link className="brand" href="/" aria-label="Surf Coffee, inicio"><Isotipo className="brand-iso" /><Wordmark className="brand-wm" title="Surf Coffee" /></Link>
          {inPanel ? (
            <>
              <span className="eyebrow" style={{ flex: 1 }}>{inStaff ? 'Equipo' : 'Panel'}</span>
              {!inStaff ? <Link className="mode" href="/equipo">Tablet del equipo</Link> : null}
              {!inStaff ? <a className="mode" href={process.env.NEXT_PUBLIC_SITE_URL || '/'}>Ver la web</a> : null}
              {session && !inStaff ? <button className="mode" onClick={signOut}>Cerrar sesión</button> : null}
            </>
          ) : (
            <>
              <nav className="nav" aria-label="Secciones">
                {TABS.map(([href, label]) => (
                  <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>
                ))}
              </nav>
              {!session ? <Link className="mode" href="/cuenta">Ingresar</Link> : null}
            </>
          )}
        </div>
      </header>
      {missingConfig ? (
        <div className="wrap" style={{ paddingTop: 16 }}>
          <div className="banner">Falta configurar la conexión con Supabase. Cargá las variables de entorno en Vercel (ver README) y volvé a publicar.</div>
        </div>
      ) : null}
      <main className={inPanel ? '' : 'with-tabbar'}>{children}</main>
      {!inPanel ? (
        <nav className="tabbar" aria-label="Secciones">
          {TABS.map(([href, , short, icon]) => (
            <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>
              <span className="ti">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
                {href === '/delivery' && (unreadClient || cartN) ? <i className="tdot" /> : null}
              </span>
              {short}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
