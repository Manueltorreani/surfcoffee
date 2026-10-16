'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useApp } from '@/components/AppProvider';
import AuthCard from '@/components/AuthCard';

export default function Cuenta() {
  const { session, customer } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (session && customer) router.replace('/puntos');
  }, [session, customer, router]);
  return (
    <div className="wrap">
      <section className="sec" style={{ borderTop: 0 }}>
        <AuthCard why="Tu cuenta de Surf Coffee" />
      </section>
    </div>
  );
}
