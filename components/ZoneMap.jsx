'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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

const draw = (i) => ({ initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: 0.9, delay: 0.15 + i * 0.05, ease: [0.2, 0.8, 0.2, 1] } });

// Plano de las cuadras de la zona de entrega.
// Muestra el café, la calle elegida y, cuando hay altura, dónde cae la dirección y el recorrido desde el local.
export default function ZoneMap({ settings, street, num, verdict }) {
  const nar = useMobile();
  const z = zoneOf(settings);
  if (z.h.length < 2 || z.v.length < 2) return <div className="empty">La zona de entrega todavía no está cargada.</div>;
  const W = nar ? 400 : 640, H = nar ? 470 : 440, fs = nar ? 15 : 13, rot = nar ? -50 : -35;
  const x0 = nar ? 26 : 40, x1 = nar ? W - 150 : 460, y0 = nar ? 112 : 96, y1 = nar ? H - 34 : 396, ext = nar ? 18 : 26;
  const ys = z.h.map((_, i) => y0 + ((y1 - y0) * i) / (z.h.length - 1));
  const xs = z.v.map((_, i) => x0 + ((x1 - x0) * i) / (z.v.length - 1));
  const hi = normS(street);
  const isB = (i, n) => i === 0 || i === n - 1;
  const ch = z.h.findIndex((x) => normS(x.name).includes(normS(settings.cafe_h || 'Avellaneda')));
  const cv = z.v.findIndex((x) => normS(x.name).includes(normS(settings.cafe_v || 'Olavarría')));
  const label = `Zona de entrega: de ${z.v[0].name} a ${z.v[z.v.length - 1].name} y de ${z.h[0].name} a ${z.h[z.h.length - 1].name}`;
  const hasCafe = ch >= 0 && cv >= 0;
  const cx = hasCafe ? xs[cv] : 0, cy = hasCafe ? ys[ch] : 0;

  // dónde cae la dirección elegida
  let dest = null;
  const n = Number(num);
  const hj = z.h.findIndex((s) => s.name === street);
  const vi = z.v.findIndex((s) => s.name === street);
  if (hasCafe && hj >= 0 && n > 0) {
    const s = z.h[hj];
    const t = s.min != null && s.max != null && s.max > s.min ? (n - s.min) / (s.max - s.min) : 0.5;
    const tt = Math.max(-0.05, Math.min(1.05, t));
    const dx = x0 + tt * (x1 - x0), dy = ys[hj];
    dest = { x: dx, y: dy, d: `M${cx} ${cy} L${cx} ${dy} L${dx} ${dy}` };
  } else if (hasCafe && vi >= 0 && n > 0) {
    const s = z.v[vi];
    const t = s.min != null && s.max != null && s.max > s.min ? (n - s.min) / (s.max - s.min) : 0.5;
    const tt = Math.max(-0.05, Math.min(1.05, t));
    const dx = xs[vi], dy = y0 + tt * (y1 - y0);
    dest = { x: dx, y: dy, d: `M${cx} ${cy} L${dx} ${cy} L${dx} ${dy}` };
  }
  const ok = verdict?.ok;
  const out = verdict && !verdict.ok && !verdict.bad && street;
  const sameSpot = dest && Math.abs(dest.x - cx) + Math.abs(dest.y - cy) < 6;

  return (
    <svg className="zmap" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label + (ok ? '. Tu dirección está dentro de la zona.' : out ? '. Tu dirección queda fuera de la zona.' : '')}>
      <defs>
        <pattern id="zgrid" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="var(--line)" /></pattern>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="18" fill="var(--surface-2)" />
      <rect x="0" y="0" width={W} height={H} rx="18" fill="url(#zgrid)" />
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx="6" fill={out ? 'color-mix(in srgb, var(--bad) 9%, var(--surface-2))' : 'var(--foam)'} style={{ transition: 'fill .4s' }} />

      {z.h.map((s, i) => { const on = hi && normS(s.name) === hi; return (
        <motion.line key={'h' + i} x1={x0 - ext} y1={ys[i]} x2={x1 + ext} y2={ys[i]} strokeLinecap="round" {...draw(i)}
          stroke={on ? (out ? 'var(--bad)' : 'var(--wax)') : 'var(--surface)'} strokeWidth={on ? 14 : 11} style={{ transition: 'stroke .3s, stroke-width .3s' }} />
      ); })}
      {z.v.map((s, i) => { const on = hi && normS(s.name) === hi; return (
        <motion.line key={'v' + i} x1={xs[i]} y1={y0 - ext} x2={xs[i]} y2={y1 + ext} strokeLinecap="round" {...draw(i + z.h.length)}
          stroke={on ? (out ? 'var(--bad)' : 'var(--wax)') : 'var(--surface)'} strokeWidth={on ? 14 : 11} style={{ transition: 'stroke .3s, stroke-width .3s' }} />
      ); })}

      {/* borde de la zona: líneas que "caminan" */}
      <motion.rect key={out ? 'out' : 'in'} className="ants" x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx="6" fill="none"
        stroke={out ? 'var(--bad)' : 'var(--sea)'} strokeWidth="3" strokeDasharray="9 6"
        initial={out ? { x: x0 - 8 } : { opacity: 0 }} animate={out ? { x: [x0 - 8, x0 + 8, x0 - 5, x0 + 4, x0] } : { opacity: 1 }} transition={{ duration: 0.45 }} />

      {z.h.map((s, i) => (
        <motion.text key={'th' + i} x={x1 + ext + 8} y={ys[i] + 4} fontSize={fs} fontWeight={isB(i, z.h.length) || normS(s.name) === hi ? 700 : 500}
          fill={normS(s.name) === hi ? 'var(--sea)' : isB(i, z.h.length) ? 'var(--ink)' : 'var(--muted)'}
          initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.04 }}>{s.name}</motion.text>
      ))}
      {z.v.map((s, i) => (
        <motion.text key={'tv' + i} transform={`translate(${xs[i] + 4},${y0 - ext - 6}) rotate(${rot})`} fontSize={fs} fontWeight={isB(i, z.v.length) || normS(s.name) === hi ? 700 : 500}
          fill={normS(s.name) === hi ? 'var(--sea)' : isB(i, z.v.length) ? 'var(--ink)' : 'var(--muted)'}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + i * 0.04 }}>{s.name}</motion.text>
      ))}

      {/* recorrido desde el café */}
      <AnimatePresence>
        {dest && ok && !sameSpot ? (
          <motion.g key={dest.d} initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.path d={dest.d} fill="none" stroke="var(--sea)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }} />
            <circle className="courier" r="7" fill="var(--wax)" stroke="var(--surface)" strokeWidth="3" style={{ offsetPath: `path('${dest.d}')` }} />
          </motion.g>
        ) : null}
      </AnimatePresence>

      {hasCafe ? (
        <g>
          <circle className="pulse" cx={cx} cy={cy} r="14" fill="var(--wax)" />
          <circle cx={cx} cy={cy} r="20" fill="var(--surface)" stroke="var(--sea)" strokeWidth="2.5" />
          <image href="/brand/isotipo.svg" x={cx - 17} y={cy - 18} width="34" height="34" />
          <rect x={Math.max(4, cx - 128)} y={cy + 14} width="112" height="26" rx="13" fill="var(--ink)" />
          <text x={Math.max(4, cx - 128) + 56} y={cy + 31} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--bg)" style={{ fontStretch: '112.5%' }}>SURF COFFEE</text>
        </g>
      ) : null}

      {/* la dirección */}
      <AnimatePresence>
        {dest ? (
          <motion.g key={`${Math.round(dest.x)}-${Math.round(dest.y)}`} initial={{ y: -36, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 520, damping: 18, delay: ok ? 0.75 : 0.2 }}>
            <ellipse cx={dest.x} cy={dest.y + 2} rx="8" ry="3" fill="rgba(0,40,58,.25)" />
            <path transform={`translate(${dest.x},${dest.y})`} d="M0 0C-4-6-14-14-14-24a14 14 0 1128 0C14-14 4-6 0 0z" fill={ok ? 'var(--sea)' : 'var(--bad)'} stroke="var(--surface)" strokeWidth="2.5" />
            {ok
              ? <path transform={`translate(${dest.x - 6},${dest.y - 30})`} d="M1 6l3.5 3.5L11 3" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              : <path transform={`translate(${dest.x - 5},${dest.y - 29})`} d="M0 0l10 10M10 0L0 10" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />}
          </motion.g>
        ) : null}
      </AnimatePresence>
    </svg>
  );
}
