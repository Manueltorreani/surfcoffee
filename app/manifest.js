export default function manifest() {
  return {
    name: 'Surf Coffee',
    short_name: 'Surf Coffee',
    description: 'Menú, puntos y delivery de Surf Coffee',
    start_url: '/',
    display: 'standalone',
    background_color: '#EAF1EF',
    theme_color: '#17676B',
    lang: 'es-AR',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
