import './globals.css';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';

export const metadata = {
  title: 'Área 17 — Sistema de Gestión',
  description: 'Sistema de Gestión Empresarial Área 17',
  manifest: '/manifest.json',
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
        {/*
          FIX: Las fuentes ya se cargan en globals.css con @import.
          Se eliminan los <link> duplicados de aquí para evitar doble carga.
          Solo se dejan los preconnect para mejorar rendimiento.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2dce6b" />
        {/* FIX: Agregar meta description para SEO */}
        <meta name="description" content="Sistema de Gestión Empresarial Área 17 - Universidad Mariana" />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
