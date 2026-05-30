'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function handleLogout() {
    setCargando(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login?logout=ok');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={cargando}
      className="btn btn-secondary"
      style={{ maxWidth: '200px' }}
    >
      {cargando ? 'Cerrando...' : 'Cerrar Sesión'}
    </button>
  );
}
