'use client';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

// Carrusel del inicio: una tira de fotos que se desliza sola (como la línea del mar).
// Se frena al pasar el mouse o al tocarla; tocar una foto la abre en grande.
export default function Gallery({ photos }) {
  const [open, setOpen] = useState(-1);
  const n = photos.length;
  const close = useCallback(() => setOpen(-1), []);
  const step = useCallback((d) => setOpen((i) => (i + d + n) % n), [n]);

  useEffect(() => {
    if (open < 0) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    document.addEventListener('keydown', onKey);
    const ov = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ov; };
  }, [open, close, step]);

  if (!n) return null;
  // repetimos las fotos hasta llenar la tira, y la duplicamos para que el giro no se note
  const base = [];
  while (base.length < Math.max(8, n)) base.push(...photos.map((p, i) => ({ ...p, i })));
  const loop = [...base, ...base];
  const secs = Math.max(30, base.length * 6);
  const cur = photos[open];

  return (
    <>
      <div className="reel" style={{ '--reel-t': `${secs}s` }}>
        <div className="reel-track">
          {loop.map((p, k) => (
            <button key={k} type="button" className={`reel-item t${k % 4}`} onClick={() => setOpen(p.i)}
              aria-label={p.caption ? `Ver foto: ${p.caption}` : 'Ver foto'} aria-hidden={k >= base.length ? 'true' : undefined} tabIndex={k >= base.length || k >= n ? -1 : 0}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image_url} alt="" loading="lazy" decoding="async" draggable="false" />
              {p.caption ? <span className="reel-cap">{p.caption}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {cur ? (
          <motion.div key="lb" className="lightbox" role="dialog" aria-modal="true" aria-label={cur.caption || 'Foto'}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.figure key={cur.id} className="lb-fig" onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.4}
                onDragEnd={(_, i) => { if (i.offset.x < -80) step(1); else if (i.offset.x > 80) step(-1); }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cur.image_url} alt={cur.caption || ''} draggable="false" />
                {cur.caption ? <figcaption>{cur.caption}</figcaption> : null}
              </motion.figure>
            </AnimatePresence>
            <div className="row" onClick={(e) => e.stopPropagation()}>
              {n > 1 ? <button className="btn white sm" onClick={() => step(-1)} aria-label="Foto anterior">Anterior</button> : null}
              <button className="btn outline-white sm" onClick={close}>Cerrar</button>
              {n > 1 ? <button className="btn white sm" onClick={() => step(1)} aria-label="Foto siguiente">Siguiente</button> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
