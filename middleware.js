import { NextResponse } from 'next/server';

// Dominio separado para el equipo (tablet + panel), sin cruzarse con la web de clientes.
// En Vercel → Environment Variables (Production): STAFF_HOST=surfcoffee-equipo.vercel.app
// - En ese dominio solo existen /equipo y /panel (todo lo demás lleva a /equipo).
// - En el dominio de clientes, /equipo y /panel mandan al dominio del equipo.
// Sin STAFF_HOST (o en las versiones de prueba) todo funciona en un solo dominio, como antes.
const STAFF_HOST = (process.env.STAFF_HOST || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
const INTERNAL = /^\/(equipo|panel)(\/|$)/;

export function middleware(req) {
  if (!STAFF_HOST) return NextResponse.next();
  const host = (req.headers.get('host') || '').toLowerCase();
  const { pathname, search } = req.nextUrl;

  if (host === STAFF_HOST) {
    if (INTERNAL.test(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL('/equipo', req.url));
  }
  // solo en producción: las URLs de prueba de Vercel siguen mostrando todo
  if (INTERNAL.test(pathname) && process.env.VERCEL_ENV === 'production') {
    return NextResponse.redirect(`https://${STAFF_HOST}${pathname}${search}`);
  }
  return NextResponse.next();
}

export const config = {
  // páginas solamente: la API, los archivos de Next y los estáticos (íconos, manifest) no pasan por acá
  matcher: ['/((?!api|_next|.*\\..*|manifest.webmanifest|robots.txt).*)'],
};
