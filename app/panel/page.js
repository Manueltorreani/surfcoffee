'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import AuthCard from '@/components/AuthCard';
import Inbox from '@/components/admin/Inbox';
import Caja from '@/components/admin/Caja';
import Clientes from '@/components/admin/Clientes';
import MenuAdmin from '@/components/admin/MenuAdmin';
import Premios from '@/components/admin/Premios';
import Ajustes from '@/components/admin/Ajustes';
import Equipo from '@/components/admin/Equipo';
import Turnos from '@/components/admin/Turnos';
import Cierres from '@/components/admin/Cierres';
import Stock from '@/components/admin/Stock';

const TABS = [['inbox', 'Pedidos'], ['caja', 'Caja y puntos'], ['clientes', 'Clientes'], ['menu', 'Menú'], ['premios', 'Premios'], ['cierres', 'Cierres'], ['stock', 'Stock'], ['turnos', 'Turnos'], ['equipo', 'Equipo'], ['ajustes', 'Ajustes']];

export default function Panel() {
  const { sb, session, authReady, isAdmin } = useApp();
  const [tab, setTab] = useState('inbox');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    try { const t = sessionStorage.getItem('panel_tab'); if (t) setTab(t); } catch {}
  }, []);
  useEffect(() => { try { sessionStorage.setItem('panel_tab', tab); } catch {} }, [tab]);

  // contador de conversaciones sin leer
  useEffect(() => {
    if (!isAdmin) return;
    const load = () => sb.from('conversations').select('customer_id', { count: 'exact', head: true }).eq('unread_admin', true).then(({ count }) => setUnread(count || 0));
    load();
    const ch = sb.channel('unread-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, load).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [sb, isAdmin]);

  if (!authReady) return <div className="wrap"><div className="empty" style={{ marginTop: 24 }}>Cargando…</div></div>;
  if (!session) return <div className="wrap"><section className="sec" style={{ borderTop: 0 }}><AuthCard why="Acceso del equipo" staff /></section></div>;
  if (!isAdmin) return <div className="wrap"><section className="sec" style={{ borderTop: 0 }}><div className="banner">Esta sección es solo para el equipo de Surf Coffee.</div></section></div>;

  const View = { inbox: Inbox, caja: Caja, clientes: Clientes, menu: MenuAdmin, premios: Premios, cierres: Cierres, stock: Stock, turnos: Turnos, equipo: Equipo, ajustes: Ajustes }[tab] || Inbox;
  return (
    <div className="wrap">
      <div className="admin">
        <nav className="side" aria-label="Panel">
          {TABS.map(([k, l]) => (
            <button key={k} aria-current={tab === k} onClick={() => setTab(k)}>
              {l}{k === 'inbox' && unread ? <span className="badge">{unread}</span> : null}
            </button>
          ))}
        </nav>
        <div style={{ minWidth: 0 }}><View /></div>
      </div>
    </div>
  );
}
