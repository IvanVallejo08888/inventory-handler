/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},

  // FIX SEGURIDAD: Headers de seguridad HTTP
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevenir clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevenir MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions policy
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // FIX: Eliminar X-Powered-By (ocultar stack tecnológico)
          { key: 'X-Powered-By', value: '' },
        ],
      },
      {
        // No cachear rutas de API
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ];
  },

  // FIX: Deshabilitar X-Powered-By header
  poweredByHeader: false,
};

module.exports = nextConfig;
