import AppProvider from '@/components/AppProvider';
import Shell from '@/components/Shell';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/archivo/wdth-italic.css';
import './globals.css';

export const metadata = {
  title: 'Surf Coffee',
  description: 'Café de especialidad en Mar del Plata. Menú, puntos y delivery.',
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
