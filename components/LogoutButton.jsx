'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function handleLogout() {
    setCargando(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continuar aunque falle el fetch
    }
    router.push('/login?logout=ok');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={cargando}
      className="btn btn-secondary"
      style={{ maxWidth: '200px' }}
      aria-busy={cargando}
      aria-label="Cerrar sesión"
    >
      {cargando ? 'Cerrando...' : 'Cerrar Sesión'}
    </button>
  );
}
