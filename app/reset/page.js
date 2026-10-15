'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { pwErr } from '@/lib/utils';

// Página a la que lleva el link del mail de recuperación.
export default function Reset() {
  const { sb, session, authReady, toast, loadMe } = useApp();
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const err = pwErr(f.get('pw1'), f.get('pw2'));
    if (err) return toast(err);
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: f.get('pw1') });
    setBusy(false);
    if (error) return toast('No se pudo cambiar. Pedí un link nuevo.');
    await loadMe();
    toast('Contraseña cambiada');
    router.push('/puntos');
  }

  return (
    <div className="wrap">
      <section className="sec" style={{ borderTop: 0 }}>
        <div className="card stack authcard" style={{ maxWidth: 460 }}>
          <div className="eyebrow">Recuperar acceso</div>
          <h2>Elegí tu contraseña nueva</h2>
          {!authReady ? <p className="muted">Verificando el link…</p> : !session ? (
            <p className="muted">El link venció o ya se usó. Volvé a pedir uno desde “¿Olvidaste tu contraseña?”.</p>
          ) : (
            <form className="stack" onSubmit={onSubmit}>
              <label className="f">Contraseña nueva<input type="password" name="pw1" required minLength={6} autoComplete="new-password" /></label>
              <label className="f">Repetila<input type="password" name="pw2" required minLength={6} autoComplete="new-password" /></label>
              <button className="btn" disabled={busy}>Guardar y entrar</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
