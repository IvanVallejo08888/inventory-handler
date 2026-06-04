import './globals.css';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';

export const metadata = {
  title: 'Área 17 — Sistema de Gestión',
  description: 'Sistema de Gestión Empresarial Área 17',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Área 17',
  },
};

export const viewport = {
  themeColor: '#2dce6b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2dce6b" />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
