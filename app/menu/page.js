'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { groupMenu, hoursText, money } from '@/lib/utils';

export default function Menu() {
  const { menu, settings } = useApp();
  const [cat, setCat] = useState('todo');
  const groups = groupMenu(menu);
  const shown = cat === 'todo' ? groups : groups.filter((g) => g[0] === cat);

  return (
    <div className="wrap">
      <section className="sec" style={{ borderTop: 0 }}>
        <div className="eyebrow">Nuestro menú</div>
        <h2>Para tomar y comer</h2>
        {groups.length > 1 ? (
          <div className="chips">
            <button className="chip" aria-pressed={cat === 'todo'} onClick={() => setCat('todo')}>Todo</button>
            {groups.map(([c]) => <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
          </div>
        ) : null}
        {groups.length ? (
          <div className="two">
            {shown.map(([c, items]) => (
              <div className="cat" key={c}>
                <h3>{c}</h3>
                {items.map((i) => (
                  <div className={`item ${i.available ? '' : 'off'}`} key={i.id}>
                    <div className="n">{i.name}</div>
                    <div className="p">{money(i.price)}</div>
                    {i.description ? <div className="d">{i.description}</div> : null}
                    {!i.available ? <span className="pill a">Agotado</span> : null}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : <div className="empty">Estamos cargando el menú. Volvé en un rato.</div>}
        <div className="rule" style={{ marginTop: 8 }}>
          <p><b>¿Lo querés en tu casa?</b> Armá tu pedido desde la sección Delivery. {hoursText(settings)}.</p>
          <Link className="btn wax" href="/delivery">Pedir delivery</Link>
        </div>
      </section>
    </div>
  );
}
