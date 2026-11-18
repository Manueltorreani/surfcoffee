import AppProvider from '@/components/AppProvider';
import Shell from '@/components/Shell';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/archivo/wdth-italic.css';
import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://surfcoffee-two.vercel.app'),
  title: 'Surf Coffee',
  description: 'Café de especialidad en Mar del Plata. Menú, puntos y delivery.',
  // vista previa al compartir el link por WhatsApp, Instagram, etc.
  openGraph: {
    type: 'website', locale: 'es_AR', siteName: 'Surf Coffee', title: 'Surf Coffee',
    description: 'Café de especialidad en Mar del Plata. Mirá la carta, sumá puntos y pedí delivery.',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Surf Coffee en Avellaneda y Olavarría' }],
  },
  twitter: { card: 'summary_large_image' },
  appleWebApp: { capable: true, title: 'Surf Coffee', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F3F8FA' },
    { media: '(prefers-color-scheme: dark)', color: '#00212D' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-AR">
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
