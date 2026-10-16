'use client';
import { useState } from 'react';
import { useApp } from './AppProvider';
import { normPhone } from '@/lib/utils';

// Para quien entró con Google: le falta el celular (lo usamos para coordinar el delivery).
export default function CompletePhone() {
  const { sb, customer, setCustomer, toast } = useApp();
  const [busy, setBusy] = useState(false);
  if (!customer || customer.phone) return null;

  async function save(e) {
    e.preventDefault();
    const phone = normPhone(new FormData(e.currentTarget).get('phone'));
    if (phone.length < 8) return toast('Revisá el celular: incluí la característica (223)');
    setBusy(true);
    const { error } = await sb.rpc('update_my_profile', { p_phone: phone });
    setBusy(false);
    if (error) return toast(/PHONE_TAKEN/.test(error.message) ? 'Ese celular ya está registrado en otra cuenta.' : 'No se pudo guardar el celular.');
    setCustomer({ ...customer, phone });
    toast('¡Listo! Guardamos tu celular');
  }

  return (
    <form className="card stack" onSubmit={save} style={{ maxWidth: 460 }}>
      <div className="eyebrow">Un paso más</div>
      <b>Hola {customer.name}, dejanos tu celular</b>
      <p className="muted" style={{ fontSize: 14 }}>Lo usamos para coordinar los pedidos de delivery.</p>
      <div className="row">
        <label className="f">Celular<input type="tel" name="phone" required inputMode="tel" autoComplete="tel" placeholder="223 555 1234" /></label>
        <button className="btn" style={{ flex: '0 0 auto' }} disabled={busy}>Guardar</button>
      </div>
    </form>
  );
}
