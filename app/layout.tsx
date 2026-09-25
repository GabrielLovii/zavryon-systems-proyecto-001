import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Control de Abastecimiento', template: '%s · Control de Abastecimiento' },
  description: 'Stock, pedidos, recepciones y pagos · ZAVRYON SYSTEMS',
  applicationName: 'Control de Abastecimiento',
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Abastecimiento', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: '#071923', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-AR"><body>{children}</body></html>;
}
