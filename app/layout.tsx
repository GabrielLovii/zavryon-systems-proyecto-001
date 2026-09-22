import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Control de Abastecimiento', description: 'Operación de pedidos y recepciones · ZAVRYON SYSTEMS', applicationName: 'Control de Abastecimiento', manifest: '/manifest.webmanifest', icons: { icon: '/logo-scpr.jpg', shortcut: '/logo-scpr.jpg', apple: '/logo-scpr.jpg' } };
export const viewport: Viewport = { themeColor: '#071923' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
