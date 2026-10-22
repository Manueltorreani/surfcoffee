'use client';
import { useEffect, useRef, useState } from 'react';

const MAX_W = 1024; // fotos livianas: alcanza para ver si está limpio

// Dibuja la imagen achicada y le estampa nombre, ítem, fecha y hora abajo.
function render(source, sw, sh, stamp) {
  const scale = Math.min(1, MAX_W / sw);
  const w = Math.round(sw * scale), h = Math.round(sh * scale);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(source, 0, 0, w, h);
  const fs = Math.max(14, Math.round(w / 40));
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(0, h - fs * 2, w, fs * 2);
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${fs}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(stamp, fs * 0.6, h - fs);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.7));
}

// Cámara en vivo a pantalla completa. Si el navegador no deja usar la cámara
// directa, cae al selector del sistema pidiendo la cámara trasera.
export default function Camera({ title, stamp, onShot, onClose }) {
  const video = useRef(null);
  const stream = useRef(null);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : null;
    if (!md?.getUserMedia) { setFallback(true); return; }
    md.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (!alive) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current = s;
        if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
      })
      .catch(() => alive && setFallback(true));
    return () => { alive = false; stream.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  async function shoot() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    setBusy(true);
    const blob = await render(v, v.videoWidth, v.videoHeight, stamp());
    setBusy(false);
    if (blob) onShot(blob);
  }

  async function fromFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const bmp = await createImageBitmap(f);
      const blob = await render(bmp, bmp.width, bmp.height, stamp());
      if (blob) onShot(blob);
    } finally { setBusy(false); }
  }

  return (
    <div className="cam" role="dialog" aria-modal="true" aria-label={`Foto: ${title}`}>
      <div className="cam-top">
        <b>{title}</b>
        <button type="button" className="btn ghost sm cam-x" onClick={onClose}>Cancelar</button>
      </div>
      {fallback ? (
        <div className="cam-fb">
          <p>Tocá el botón para abrir la cámara del dispositivo.</p>
          <label className="btn wax">
            Abrir cámara
            <input type="file" accept="image/*" capture="environment" onChange={fromFile} disabled={busy} />
          </label>
        </div>
      ) : (
        <>
          <video ref={video} playsInline muted autoPlay onLoadedData={() => setReady(true)} />
          <div className="cam-bar">
            <button type="button" className="shutter" aria-label="Sacar foto" onClick={shoot} disabled={!ready || busy} />
          </div>
        </>
      )}
    </div>
  );
}
