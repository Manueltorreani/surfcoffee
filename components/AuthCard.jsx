'use client';
import { useState } from 'react';
import { useApp } from './AppProvider';
import { emailOk, fullOk, normEmail, normPhone, num, properName, pwErr } from '@/lib/utils';

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return r.json().catch(() => ({}));
}

export default function AuthCard({ why = 'Tu cuenta' }) {
  const { sb, settings, toast, loadMe } = useApp();
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');

  async function onLogin(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const r = await post('/api/login', { identifier: f.get('id'), password: f.get('password') });
    if (r.error) { setBusy(false); toast(r.error); return; }
    await sb.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
    await loadMe();
    setBusy(false);
  }

  async function onRegister(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = properName(f.get('name')), email = normEmail(f.get('email')), phone = normPhone(f.get('phone'));
    if (!fullOk(name)) return toast('Escribí tu nombre y apellido completos');
    if (!emailOk(email)) return toast('Revisá el email');
    if (phone.length < 8) return toast('Revisá el celular: incluí la característica (223)');
    const pe = pwErr(f.get('pw1'), f.get('pw2'));
    if (pe) return toast(pe);
    setBusy(true);
    const chk = await post('/api/check-signup', { name, email, phone });
    if (chk.error) { setBusy(false); toast(chk.error); return; }
    const { data, error } = await sb.auth.signUp({
      email, password: f.get('pw1'),
      options: { data: { name, phone }, emailRedirectTo: `${window.location.origin}/puntos` },
    });
    setBusy(false);
    if (error) { toast(/database|already/i.test(error.message) ? 'Ya existe una cuenta con ese nombre, email o celular.' : 'No se pudo crear la cuenta. Probá de nuevo.'); return; }
    if (!data.session) { setSent(email); return; }
    await loadMe();
    toast(chk.existing ? '¡Listo! Sumamos los puntos de tus compras en el local' : '¡Cuenta creada!');
  }

  async function onForgot(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    await post('/api/forgot', { identifier: f.get('id') });
    setBusy(false);
    setSent('forgot');
  }

  const tabs = (
    <div className="chips" role="tablist">
      <button type="button" className="chip" aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setSent(''); }}>Iniciar sesión</button>
      <button type="button" className="chip" aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setSent(''); }}>Crear cuenta</button>
    </div>
  );

  if (sent) {
    return (
      <div className="card stack authcard" style={{ maxWidth: 460 }}>
        <div className="eyebrow">Revisá tu correo</div>
        <h2>{sent === 'forgot' ? 'Te mandamos un link' : 'Confirmá tu email'}</h2>
        <p className="muted">
          {sent === 'forgot'
            ? 'Si hay una cuenta con ese email o celular, te llegó un mail con un link para elegir una contraseña nueva. Revisá también la carpeta de spam.'
            : <>Te mandamos un mail a <b>{sent}</b>. Tocá el link del mail para activar tu cuenta y después iniciá sesión.</>}
        </p>
        <button className="btn ghost" onClick={() => { setSent(''); setMode('login'); }}>Volver a iniciar sesión</button>
      </div>
    );
  }

  if (mode === 'register') {
    return (
      <div className="card stack authcard" style={{ maxWidth: 460 }}>
        {tabs}
        <h2>Creá tu cuenta</h2>
        <p className="muted" style={{ fontSize: 14 }}>
          Usá el mismo nombre y apellido que decís en caja, así se juntan los puntos de tus compras en el local.
          {settings?.welcome_points > 0 ? <> Si es tu primera vez, te regalamos <b>{num(settings.welcome_points)} puntos</b>.</> : null}
        </p>
        <form className="stack" onSubmit={onRegister}>
          <label className="f">Nombre y apellido<input type="text" name="name" required autoComplete="name" placeholder="Juan Pérez" /></label>
          <div className="row">
            <label className="f">Email<input type="email" name="email" required autoComplete="email" placeholder="tu@email.com" /></label>
            <label className="f">Celular<input type="tel" name="phone" required inputMode="tel" autoComplete="tel" placeholder="223 555 1234" /></label>
          </div>
          <div className="row">
            <label className="f">Contraseña<input type="password" name="pw1" required minLength={6} autoComplete="new-password" /></label>
            <label className="f">Repetila<input type="password" name="pw2" required minLength={6} autoComplete="new-password" /></label>
          </div>
          <button className="btn" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
        </form>
      </div>
    );
  }

  if (mode === 'forgot') {
    return (
      <div className="card stack authcard" style={{ maxWidth: 460 }}>
        <div className="eyebrow">Recuperar acceso</div>
        <h2>¿Olvidaste tu contraseña?</h2>
        <p className="muted" style={{ fontSize: 14 }}>Escribí tu email o celular y te mandamos un link a tu correo para elegir una contraseña nueva.</p>
        <form className="stack" onSubmit={onForgot}>
          <label className="f">Email o celular<input type="text" name="id" required autoComplete="username" /></label>
          <div className="row">
            <button className="btn" disabled={busy}>Enviar link</button>
            <button type="button" className="btn ghost" onClick={() => setMode('login')}>Volver</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card stack authcard" style={{ maxWidth: 460 }}>
      {tabs}
      <div className="eyebrow">{why}</div>
      <h2>Iniciá sesión</h2>
      <form className="stack" onSubmit={onLogin}>
        <label className="f">Email o celular<input type="text" name="id" required autoComplete="username" placeholder="tu@email.com o 223 555 1234" /></label>
        <label className="f">Contraseña<input type="password" name="password" required autoComplete="current-password" /></label>
        <button className="btn" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <button type="button" className="linkbtn" onClick={() => setMode('forgot')}>¿Olvidaste tu contraseña?</button>
    </div>
  );
}
