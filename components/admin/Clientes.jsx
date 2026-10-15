'use client';
import { Fragment, useEffect, useState } from 'react';
import { useApp } from '../AppProvider';
import { money, num, pwErr, when } from '@/lib/utils';

export default function Clientes() {
  const { sb, session, toast } = useApp();
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [pwFor, setPwFor] = useState(null);

  useEffect(() => {
    const load = () => sb.from('customers').select('*').order('points', { ascending: false }).limit(5000).then(({ data }) => setList(data || []));
    load();
    const ch = sb.channel('clientes').on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, load).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [sb]);

  const ql = q.toLowerCase();
  const shown = list.filter((c) => !ql || String(c.name).toLowerCase().includes(ql) || String(c.phone || '').includes(ql) || String(c.email || '').includes(ql));
  const total = list.reduce((a, c) => a + (c.points || 0), 0);
  const act30 = list.filter((c) => c.last_visit && Date.now() - new Date(c.last_visit) < 30 * 864e5).length;
  const spent = list.reduce((a, c) => a + Number(c.total_spent || 0), 0);

  async function setPassword(e, c) {
    e.preventDefault();
    const pw = new FormData(e.currentTarget).get('pw');
    const err = pwErr(pw);
    if (err) return toast(err);
    const r = await fetch('/api/admin/password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ customerId: c.id, password: pw }),
    });
    if (!r.ok) return toast('No se pudo cambiar la contraseña');
    setPwFor(null);
    toast(`Contraseña de ${c.name} cambiada. Pasásela al cliente.`);
  }

  return (
    <>
      <div className="ph"><div><div className="eyebrow">Fidelización</div><h2>Clientes</h2></div></div>
      <div className="tiles">
        <div className="tile"><span>Clientes</span><b>{num(list.length)}</b></div>
        <div className="tile"><span>Activos 30 días</span><b>{num(act30)}</b></div>
        <div className="tile"><span>Puntos sin canjear</span><b>{num(total)}</b></div>
        <div className="tile"><span>Facturado registrado</span><b>{money(spent)}</b></div>
      </div>
      <div style={{ marginBottom: 12 }}><input type="search" placeholder="Buscar por nombre, email o celular" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar cliente" /></div>
      {shown.length ? (
        <div className="tbl">
          <table>
            <thead><tr><th>Cliente</th><th>Email</th><th>Celular</th><th className="n">Puntos</th><th className="n">Visitas</th><th className="n">Total gastado</th><th>Última visita</th><th>Web</th></tr></thead>
            <tbody>
              {shown.map((c) => (
                <Fragment key={c.id}>
                  <tr>
                    <td><b>{c.name}</b></td><td>{c.email || '—'}</td><td className="mono">{c.phone || '—'}</td>
                    <td className="n"><b>{num(c.points)}</b></td><td className="n">{num(c.visits)}</td><td className="n">{money(c.total_spent)}</td>
                    <td>{c.last_visit ? when(c.last_visit) : '—'}</td>
                    <td>
                      {c.auth_user_id ? <>
                        <span className="pill entregado">Con cuenta</span>{' '}
                        <button className="btn ghost sm" onClick={() => setPwFor(pwFor === c.id ? null : c.id)}>Cambiar contraseña</button>
                      </> : <span className="pill">Sin cuenta web</span>}
                    </td>
                  </tr>
                  {pwFor === c.id ? (
                    <tr>
                      <td colSpan={8} style={{ whiteSpace: 'normal' }}>
                        <form className="row" style={{ alignItems: 'end' }} onSubmit={(e) => setPassword(e, c)}>
                          <label className="f">Nueva contraseña para {c.name}<input type="text" name="pw" required minLength={6} autoComplete="off" /></label>
                          <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
                            <button className="btn">Guardar</button>
                            <button type="button" className="btn ghost" onClick={() => setPwFor(null)}>Cancelar</button>
                          </div>
                        </form>
                        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Pasale la contraseña nueva al cliente. También puede recuperarla él mismo con “¿Olvidaste tu contraseña?”.</p>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="empty">{list.length ? 'Ningún cliente coincide con la búsqueda.' : 'Todavía no hay clientes. Se suman cuando registrás una compra en Caja o cuando alguien crea su cuenta en la web.'}</div>}
    </>
  );
}
