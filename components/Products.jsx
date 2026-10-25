'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from './AppProvider';
import { money, normS } from '@/lib/utils';

// ---------- ilustración para productos sin foto ----------
// Cada categoría tiene su dibujo de línea; el fondo es arena (o espuma para lo frío).
const ICONS = {
  cafe: (
    <g>
      <path d="M72 64h56v26a26 26 0 01-26 26h-4a26 26 0 01-26-26z" />
      <path d="M128 72h6a11 11 0 010 22h-7" />
      <path d="M60 122h80" />
      <path d="M90 52c-5-6 5-10 0-17M106 52c-5-6 5-10 0-17" />
    </g>
  ),
  frio: (
    <g>
      <path d="M76 44h48l-6 76a6 6 0 01-6 5H88a6 6 0 01-6-5z" />
      <path d="M78 64h44" />
      <rect x="88" y="74" width="12" height="12" rx="3" transform="rotate(-12 94 80)" />
      <rect x="102" y="86" width="12" height="12" rx="3" transform="rotate(10 108 92)" />
      <path d="M110 44l10-22h10" />
    </g>
  ),
  dulce: (
    <g>
      <path d="M54 104c6-26 26-42 46-42s40 16 46 42c-14 6-30 2-34-6-4 8-20 8-24 0-4 8-20 12-34 6z" />
      <path d="M88 66c2 12 2 22-1 31M112 66c-2 12-2 22 1 31" />
      <path d="M62 120h76" />
    </g>
  ),
  salado: (
    <g>
      <path d="M60 86c0-16 18-26 40-26s40 10 40 26v4H60z" />
      <path d="M58 96h84" />
      <path d="M62 104c8 4 16-4 24 0s16-4 24 0 16-4 28 0" />
      <path d="M60 114h80a4 4 0 01-4 6H64a4 4 0 01-4-6z" />
    </g>
  ),
  // variantes por producto para que la carta no repita el mismo dibujo
  chica: (
    <g>
      <path d="M80 76h40v16a20 20 0 01-20 20 20 20 0 01-20-20z" />
      <path d="M120 82h4a8 8 0 010 16h-5" />
      <path d="M70 118h60" />
      <path d="M100 64c-4-5 4-8 0-14" />
    </g>
  ),
  taza: (
    <g>
      <path d="M62 70h76l-6 30a22 22 0 01-22 18H90a22 22 0 01-22-18z" />
      <ellipse cx="100" cy="70" rx="38" ry="7" />
      <path d="M100 76c-4-4-11-1-8 4l8 6 8-6c3-5-4-8-8-4z" />
      <path d="M137 78h5a10 10 0 010 20h-9" />
      <path d="M56 126h88" />
    </g>
  ),
  budin: (
    <g>
      <path d="M58 76c0-10 8-16 18-16h48c10 0 18 6 18 16v40H58z" />
      <path d="M58 82c10 6 20-6 30 0s20-6 30 0 16-4 24 0" />
      <path d="M82 116V96M104 116V96" />
      <path d="M52 124h96" />
    </g>
  ),
  otro: (
    <g>
      <ellipse cx="100" cy="82" rx="26" ry="36" transform="rotate(28 100 82)" />
      <path d="M86 56c14 14 14 38 28 52" />
    </g>
  ),
};
export function artKind(cat, name = '') {
  const c = normS(cat + ' ' + name);
  if (/fri|helad|jugo|limonad|soda|bebida|frappe|cold|iced|agua/.test(c)) return 'frio';
  if (/past|dulc|torta|budin|medialun|factura|cookie|galle|alfaj|brownie|muffin|tarta/.test(c)) return 'dulce';
  if (/salad|sandw|tost|brunch|almuer|tostado|wrap|bagel|huevo|panin|ensalad/.test(c)) return 'salado';
  if (/cafe|espres|latte|cortad|flat|capu|moca|mocha|infus|chai|matcha|teenhebras|tedehierbas/.test(c)) return 'cafe';
  return 'otro';
}
// variante para el dibujo según el nombre (dentro de la misma familia)
function artVariant(kind, name) {
  const n = normS(name);
  if (kind === 'cafe' && /espres|ristret|cortad|lagrim|americ/.test(n)) return 'chica';
  if (kind === 'cafe' && /latte|flat|capu|leche|moca|mocha|chai|matcha/.test(n)) return 'taza';
  if (kind === 'dulce' && /budin|torta|bud|brownie|pan|cake|loaf/.test(n)) return 'budin';
  return kind;
}
function hash(s) { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); }

export function ProductArt({ item }) {
  const kind = artKind(item.category || '', item.name || '');
  const icon = artVariant(kind, item.name || '');
  const h = hash(item.id || item.name);
  const tilt = (h % 9) - 4;
  const phase = h % 120;
  const cold = kind === 'frio';
  return (
    <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ background: cold ? 'var(--foam)' : (h % 2 ? 'var(--sand)' : 'var(--sand-2)') }}>
      <path d={`M${-phase} 132 q 30 -10 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 V150 H${-phase}Z`} fill="var(--crest)" />
      <g transform={`rotate(${tilt} 100 80)`} fill="none" stroke="var(--art)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[icon]}
      </g>
    </svg>
  );
}

export function ProductMedia({ item, layoutId, children }) {
  return (
    <motion.div className="pc-media" layoutId={layoutId}>
      {item.image_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={item.image_url} alt="" loading="lazy" decoding="async" />
        : <ProductArt item={item} />}
      {children}
    </motion.div>
  );
}

// ---------- tarjeta ----------
export function ProductCard({ item, onOpen, ctx = 'm' }) {
  const { cart } = useApp();
  const q = cart[item.id] || 0;
  return (
    <motion.button type="button" className={`pc ${item.available ? '' : 'off'}`} onClick={() => onOpen(item)}
      whileTap={{ scale: 0.97 }} aria-label={`${item.name}, ${money(item.price)}${item.available ? '' : ', agotado'}`}>
      <ProductMedia item={item} layoutId={`${ctx}-media-${item.id}`}>
        {!item.available ? <span className="soldout">Agotado</span> : q ? <motion.span key={q} className="pc-q" initial={{ scale: 0.4 }} animate={{ scale: 1 }}>{q}</motion.span> : null}
        {item.available ? (
          <span className="pc-add" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
        ) : null}
      </ProductMedia>
      <span className="pc-body">
        <span className="pc-name">{item.name}</span>
        <span className="pc-price">{money(item.price)}</span>
        {item.description ? <span className="pc-desc">{item.description}</span> : null}
      </span>
    </motion.button>
  );
}

// ---------- contador ----------
export function Qty({ item, disabled }) {
  const { cart, setQty } = useApp();
  const q = cart[item.id] || 0;
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {q ? (
        <motion.span key="q" className="qty" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
          <button type="button" onClick={() => setQty(item.id, -1)} aria-label={`Quitar uno de ${item.name}`}>−</button>
          <motion.b key={q} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{q}</motion.b>
          <button type="button" onClick={() => setQty(item.id, 1)} aria-label={`Agregar uno de ${item.name}`} disabled={disabled}>+</button>
        </motion.span>
      ) : (
        <motion.button key="a" type="button" className="addbtn" disabled={disabled} onClick={() => setQty(item.id, 1)} aria-label={`Agregar ${item.name}`}
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} whileTap={{ scale: 0.85 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ---------- ficha ----------
export function ProductSheet({ item, onClose, ctx = 'm' }) {
  const { cart, setQty, toast } = useApp();
  const closeRef = useRef(null);
  const q = item ? cart[item.id] || 0 : 0;

  useEffect(() => {
    if (!item) return;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const ov = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 50);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ov; prev?.focus?.({ preventScroll: true }); };
  }, [item, onClose]);

  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width:640px)').matches;

  return (
    <AnimatePresence>
      {item ? (
        <div className="sheet-wrap" key="sheet">
          <motion.div className="sheet-bg" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t"
            initial={narrow ? { y: '100%' } : { opacity: 0, scale: 0.94, y: 12 }}
            animate={narrow ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={narrow ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 8 }}
            drag={narrow ? 'y' : false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose(); }}>
            <span className="grab" aria-hidden="true" />
            <button ref={closeRef} className="sheet-x" onClick={onClose} aria-label="Cerrar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <ProductMedia item={item} layoutId={`${ctx}-media-${item.id}`} />
            <motion.div className="sheet-body" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.08 } }}>
              <div className="sec-head" style={{ alignItems: 'baseline' }}>
                <h3 id="sheet-t">{item.name}</h3>
                <span className="pc-price">{money(item.price)}</span>
              </div>
              {item.description ? <p>{item.description}</p> : null}
              {!item.available ? (
                <div className="banner">Hoy no lo tenemos. Volvé a fijarte mañana.</div>
              ) : (
                <div className="sheet-acts">
                  {q ? (
                    <>
                      <Qty item={item} />
                      <Link className="btn" href="/delivery#pedido" onClick={onClose}>Ver mi pedido</Link>
                    </>
                  ) : (
                    <button className="btn" onClick={() => { setQty(item.id, 1); toast(`${item.name} agregado a tu pedido`); }}>Agregar al pedido</button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
