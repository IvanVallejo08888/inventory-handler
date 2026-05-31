'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

function getIniciales(nombre) {
  if (!nombre) return 'U';
  const partes = nombre.trim().split(' ').filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return partes[0]?.[0]?.toUpperCase() || 'U';
}

/* ── SVG icons ── */
const IconHome = () => (
  <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconBox = () => (
  <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
);
const IconCart = () => (
  <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
);
const IconDoc = () => (
  <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const IconCard = () => (
  <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
);
const IconReport = () => (
  <svg viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
);
const IconMsg = () => (
  <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const IconLogout = () => (
  <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);
const IconBarChart = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
);

export default function Navbar({ sesion }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen]         = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const isAdmin   = sesion?.rol === 'ADMINISTRADOR';
  const iniciales = getIniciales(sesion?.nombreCompleto);

  // FIX: Usar timestamp como query param para bust cache de foto de perfil
  const fotoUrl = sesion?.fotoPerfil
    ? `/api/foto-perfil?archivo=${encodeURIComponent(sesion.fotoPerfil)}`
    : null;

  // FIX: Detección de rutas activas correcta para /main/* paths
  function isActive(href) {
    if (href === '/main/dashboard') return pathname === '/main/dashboard' || pathname === '/dashboard';
    return pathname.startsWith(href);
  }
  function isActiveVentas()    { return pathname === '/main/ventas'; }
  function isActiveHistorial() { return pathname.startsWith('/main/ventas/historial'); }

  async function handleLogout() {
    setCerrando(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continuar aunque falle el fetch
    }
    router.push('/login?logout=ok');
    router.refresh();
  }

  function NavLink({ href, icon, label, active }) {
    return (
      <a
        href={href}
        className={`nav-link nav-item${active ? ' active' : ''}`}
        onClick={() => setOpen(false)}
        // FIX: Accesibilidad mejorada
        aria-current={active ? 'page' : undefined}
      >
        <span className="nav-icon">{icon}</span>
        {label}
      </a>
    );
  }

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="sidebar-overlay active"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Botón hamburguesa */}
      <button
        className={`hamburger-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        aria-controls="main-sidebar"
      >
        <span/><span/><span/>
      </button>

      {/* Sidebar */}
      <aside
        id="main-sidebar"
        className={`sidebar${open ? ' open' : ''}`}
        aria-label="Navegación principal"
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-glow)', border: '1.5px solid var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color: 'var(--primary-light)', flexShrink: 0 }}>
            A17
          </div>
          <div>
            <span className="brand-text">Área 17</span>
            <span className="brand-sub">Sistema de Gestión</span>
          </div>
        </div>

        {/* Usuario activo */}
        <div className="sidebar-user">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={`Foto de ${sesion?.nombreCompleto}`}
              style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', border: '1.5px solid var(--primary-dark)', flexShrink: 0 }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="user-avatar" aria-label={`Iniciales: ${iniciales}`}>{iniciales}</div>
          )}
          <div className="user-info">
            <div className="user-name">{sesion?.nombreCompleto}</div>
            <div className="user-role">{sesion?.rol}</div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="sidebar-nav" aria-label="Menú principal">
          <p className="nav-section-title">Principal</p>
          <NavLink href="/main/dashboard" icon={<IconHome/>} label="Inicio" active={isActive('/main/dashboard')} />

          {isAdmin && (<>
            <p className="nav-section-title">Administración</p>
            <NavLink href="/main/usuarios"   icon={<IconUsers/>} label="Usuarios"   active={isActive('/main/usuarios')} />
            <NavLink href="/main/inventario" icon={<IconBox/>}   label="Inventario" active={isActive('/main/inventario')} />
          </>)}

          <p className="nav-section-title">Ventas</p>
          <NavLink href="/main/ventas"           icon={<IconCart/>} label="Registrar Venta"                      active={isActiveVentas()} />
          <NavLink href="/main/ventas/historial" icon={<IconDoc/>}  label={isAdmin ? 'Historial Ventas' : 'Mis Ventas'} active={isActiveHistorial()} />

          <p className="nav-section-title">{isAdmin ? 'Finanzas' : 'Empresa'}</p>
          <NavLink href="/main/gastos" icon={<IconCard/>} label="Gastos Empresariales" active={isActive('/main/gastos')} />

          {isAdmin && (<>
            <p className="nav-section-title">Análisis</p>
            <NavLink href="/main/reportes"        icon={<IconReport/>} label="Reportes y Estadísticas" active={isActive('/main/reportes')} />
          </>)}

          <NavLink href="/main/recomendaciones" icon={<IconMsg/>} label="Recomendaciones" active={isActive('/main/recomendaciones')} />

          <p className="nav-section-title">Cuenta</p>
          <NavLink href="/main/perfil" icon={<IconUser/>} label="Editar Perfil" active={isActive('/main/perfil')} />
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            disabled={cerrando}
            className="nav-link"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            aria-label="Cerrar sesión"
          >
            <span className="nav-icon"><IconLogout/></span>
            {cerrando ? 'Cerrando...' : 'Cerrar Sesión'}
          </button>
        </div>
      </aside>

      {/* Bottom nav — solo móvil */}
      <nav className="bottom-nav" aria-label="Navegación rápida móvil">
        <div className="bottom-nav-inner">
          <a href="/main/dashboard" className={`bn-item${isActive('/main/dashboard') ? ' bn-active' : ''}`} aria-label="Inicio">
            <span className="bn-icon"><IconHome/></span>
            <span className="bn-lbl">Inicio</span>
          </a>
          <a href="/main/ventas" className={`bn-item${isActiveVentas() ? ' bn-active' : ''}`} aria-label="Registrar venta">
            <span className="bn-icon"><IconCart/></span>
            <span className="bn-lbl">Venta</span>
          </a>
          <a href="/main/ventas/historial" className={`bn-item${isActiveHistorial() ? ' bn-active' : ''}`} aria-label="Historial de ventas">
            <span className="bn-icon"><IconDoc/></span>
            <span className="bn-lbl">Historial</span>
          </a>
          {isAdmin && (
            <a href="/main/reportes" className={`bn-item${isActive('/main/reportes') ? ' bn-active' : ''}`} aria-label="Reportes">
              <span className="bn-icon"><IconBarChart/></span>
              <span className="bn-lbl">Reportes</span>
            </a>
          )}
          <a href="/main/perfil" className={`bn-item${isActive('/main/perfil') ? ' bn-active' : ''}`} aria-label="Perfil">
            <span className="bn-icon"><IconUser/></span>
            <span className="bn-lbl">Perfil</span>
          </a>
        </div>
      </nav>
    </>
  );
}
