import AppProvider from '@/components/AppProvider';
import Shell from '@/components/Shell';
import '@fontsource/bowlby-one/400.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
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
    { media: '(prefers-color-scheme: light)', color: '#EAF1EF' },
    { media: '(prefers-color-scheme: dark)', color: '#08171C' },
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
