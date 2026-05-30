import { redirect } from 'next/navigation';
import { obtenerSesion, esAdmin } from '@/lib/auth';
import LogoutButton from '@/components/LogoutButton';

export const metadata = { title: 'Dashboard — Área 17' };

export default async function DashboardPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');

  const admin = esAdmin(sesion);

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-card">
        <h1>Bienvenido, {sesion.nombreCompleto.split(' ')[0]}</h1>
        <p>Has iniciado sesión correctamente en el sistema.</p>
        <span className="badge-rol">{sesion.rol}</span>

        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
          <InfoFila label="Nombre"         valor={sesion.nombreCompleto} />
          <InfoFila label="Identificación" valor={sesion.identificacion} />
          <InfoFila label="Correo"         valor={sesion.correo} />
          <InfoFila label="Rol"            valor={sesion.rol} />
        </div>

        {admin && (
          <div
            style={{
              background: 'rgba(45,206,107,0.06)',
              border: '1px solid rgba(45,206,107,0.2)',
              borderRadius: '0.6rem',
              padding: '0.9rem 1.1rem',
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              color: '#5de68a',
            }}
          >
            Tienes acceso de <strong>Administrador</strong>. Puedes gestionar usuarios,
            inventario, ventas y reportes.
          </div>
        )}

        <LogoutButton />
      </div>
    </div>
  );
}

function InfoFila({ label, valor }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.55rem 0',
        borderBottom: '1px solid rgba(45,206,107,0.1)',
        fontSize: '0.88rem',
      }}
    >
      <span style={{ color: '#78a87e', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.07em' }}>
        {label}
      </span>
      <span style={{ color: '#e2f4e8' }}>{valor}</span>
    </div>
  );
}
