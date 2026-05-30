import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { obtenerSesion } from '@/lib/auth';
import LoginForm from '@/components/LoginForm';

export const metadata = { title: 'Iniciar Sesión — Área 17' };

export default async function LoginPage() {
  const sesion = await obtenerSesion();
  if (sesion) redirect('/dashboard');

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
