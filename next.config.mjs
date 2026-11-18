/** @type {import('next').NextConfig} */
// Cabeceras de seguridad para toda la web:
// - nadie puede meter la web adentro de otra página (evita engaños tipo "clickjacking")
// - el navegador no adivina tipos de archivo
// - no se comparte la dirección completa con otros sitios
// - se bloquean permisos que la web no usa (ubicación, micrófono)
const security = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), payment=(), usb=(), camera=(self)' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: security },
      // el panel y las respuestas de la API no se guardan en caché
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '/panel', headers: [{ key: 'Cache-Control', value: 'no-store' }, { key: 'X-Robots-Tag', value: 'noindex' }] },
    ];
  },
};
export default nextConfig;
