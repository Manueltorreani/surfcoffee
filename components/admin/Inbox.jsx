'use client';
import { useEffect, useState } from 'react';
import { useApp } from '../AppProvider';
import Chat from '../Chat';
import { STATUS, num, when } from '@/lib/utils';

export default function Inbox() {
  const { sb } = useApp();
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const load = () => sb.from('conversations').select('*, customers(name, phone, points)').order('updated_at', { ascending: false }).limit(200)
      .then(({ data }) => setConvs(data || []));
    load();
    const ch = sb.channel('inbox').on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, load).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [sb]);

  const conv = convs.find((c) => c.customer_id === active);
  const open = convs.filter((c) => ['nuevo', 'confirmado', 'en_camino'].includes(c.order_status)).length;

  return (
    <>
      <div className="ph"><div><div className="eyebrow">Inbox</div><h2>Pedidos y mensajes</h2></div><span className="muted">{open} pedidos abiertos</span></div>
      <div className={`inbox ${conv ? 'open' : ''}`}>
        <div className="clist">
          {convs.length ? convs.map((c) => (
            <button key={c.customer_id} className="ci" aria-current={c.customer_id === active} onClick={() => setActive(c.customer_id)}>
              <span className="nm">{c.unread_admin ? <span className="dot" /> : null}{c.customers?.name || 'Cliente'}</span>
              <time>{when(c.updated_at)}</time>
              <span className="lt">
                {c.order_status && !['entregado', 'cancelado'].includes(c.order_status) ? <><span className={`pill ${c.order_status}`}>{STATUS[c.order_status]}</span> </> : null}
                {c.last_text || ''}
              </span>
            </button>
          )) : <div className="empty" style={{ border: 0 }}>Cuando un cliente escriba o haga un pedido desde la web, aparece acá.</div>}
        </div>
        {conv ? (
          <Chat key={conv.customer_id} customerId={conv.customer_id} role="cafe" onBack={() => setActive(null)}
            title={conv.customers?.name || 'Cliente'}
            subtitle={`${conv.customers?.phone || ''}${conv.customers?.phone ? ' · ' : ''}${num(conv.customers?.points)} pts`}
            empty="Sin mensajes todavía." />
        ) : <div className="thread"><div className="msgs"><div className="sys" style={{ margin: 'auto' }}>Elegí una conversación.</div></div></div>}
      </div>
    </>
  );
}
