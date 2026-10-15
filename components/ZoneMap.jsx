'use client';
import { useEffect, useState } from 'react';
import { normS, zoneOf } from '@/lib/utils';

function useMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(max-width:760px)');
    const on = () => setM(q.matches);
    on();
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return m;
}

// Dibujo de las cuadras de la zona de entrega, con la calle elegida resaltada.
export default function ZoneMap({ settings, highlight }) {
  const nar = useMobile();
  const z = zoneOf(settings);
  if (z.h.length < 2 || z.v.length < 2) return <div className="empty">La zona de entrega todavía no está cargada.</div>;
  const W = nar ? 400 : 640, H = nar ? 480 : 440, fs = nar ? 15 : 13, rot = nar ? -50 : -35;
  const x0 = nar ? 24 : 40, x1 = nar ? W - 152 : 460, y0 = nar ? 118 : 96, y1 = nar ? H - 34 : 396, ext = nar ? 18 : 26;
  const ys = z.h.map((_, i) => y0 + ((y1 - y0) * i) / (z.h.length - 1));
  const xs = z.v.map((_, i) => x0 + ((x1 - x0) * i) / (z.v.length - 1));
  const hi = normS(highlight);
  const isB = (i, n) => i === 0 || i === n - 1;
  const ch = z.h.findIndex((x) => normS(x.name).includes(normS(settings.cafe_h || 'Avellaneda')));
  const cv = z.v.findIndex((x) => normS(x.name).includes(normS(settings.cafe_v || 'Olavarría')));
  const label = `Zona de entrega: de ${z.v[0].name} a ${z.v[z.v.length - 1].name} y de ${z.h[0].name} a ${z.h[z.h.length - 1].name}`;

  return (
    <svg className="zmap" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <rect x="0" y="0" width={W} height={H} rx="14" fill="var(--surface-2)" />
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="var(--foam)" stroke="var(--sea)" strokeWidth="3" strokeDasharray="9 6" />
      {z.h.map((s, i) => { const on = hi && normS(s.name) === hi; return <line key={'h' + i} x1={x0 - ext} y1={ys[i]} x2={x1 + ext} y2={ys[i]} stroke={on ? 'var(--wax)' : 'var(--surface)'} strokeWidth={on ? 14 : 11} strokeLinecap="round" />; })}
      {z.v.map((s, i) => { const on = hi && normS(s.name) === hi; return <line key={'v' + i} x1={xs[i]} y1={y0 - ext} x2={xs[i]} y2={y1 + ext} stroke={on ? 'var(--wax)' : 'var(--surface)'} strokeWidth={on ? 14 : 11} strokeLinecap="round" />; })}
      {z.h.map((s, i) => (
        <text key={'th' + i} x={x1 + ext + 8} y={ys[i] + 4} fontSize={fs} fontWeight={isB(i, z.h.length) ? 700 : 500} fill={isB(i, z.h.length) ? 'var(--ink)' : 'var(--muted)'}>{s.name}</text>
      ))}
      {z.v.map((s, i) => (
        <text key={'tv' + i} transform={`translate(${xs[i] + 4},${y0 - ext - 6}) rotate(${rot})`} fontSize={fs} fontWeight={isB(i, z.v.length) ? 700 : 500} fill={isB(i, z.v.length) ? 'var(--ink)' : 'var(--muted)'}>{s.name}</text>
      ))}
      {ch >= 0 && cv >= 0 ? (() => {
        const cx = xs[cv], cy = ys[ch], lx = Math.max(4, cx - 128);
        return (
          <g>
            <circle cx={cx} cy={cy} r="13" fill="var(--wax)" stroke="var(--ink)" strokeWidth="3" />
            <circle cx={cx} cy={cy} r="4" fill="var(--ink)" />
            <rect x={lx} y={cy + 10} width="112" height="26" rx="13" fill="var(--ink)" />
            <text x={lx + 56} y={cy + 27} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--bg)">SURF COFFEE</text>
          </g>
        );
      })() : null}
    </svg>
  );
}
