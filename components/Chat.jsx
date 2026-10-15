'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from './AppProvider';
import { STATUS, money, num, when } from '@/lib/utils';

const MAX_PDF = 10 * 1024 * 1024;

async function shrink(file, max, q) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob(ok, 'image/jpeg', q));
  } finally { URL.revokeObjectURL(url); }
}

const Clip = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5l-8.6 8.6a5.5 5.5 0 01-7.8-7.8l8.6-8.6a3.7 3.7 0 015.2 5.2l-8.6 8.6a1.8 1.8 0 01-2.6-2.6l7.9-7.9" />
  </svg>
);

function OrderCard({ m, admin, onStatus }) {
  const st = m.status || 'nuevo';
  const o = m.order_data || {};
  const flow = { nuevo: ['confirmado', 'cancelado'], confirmado: ['en_camino', 'cancelado'], en_camino: ['entregado'], entregado: [], cancelado: [] };
  const lbl = { confirmado: 'Confirmar', en_camino: 'Salió', entregado: 'Entregado', cancelado: 'Cancelar' };
  return (
    <div className={`order ${admin ? '' : 'mine'}`}>
      <div className="ol"><b>Pedido</b><span className={`pill ${st}`}>{STATUS[st]}</span></div>
      {(o.items || []).map((i, k) => <div className="ol" key={k}><span>{num(i.qty)} × {i.name}</span><span className="mono">{money(i.price * i.qty)}</span></div>)}
      {o.envio ? <div className="ol muted"><span>Envío</span><span className="mono">{money(o.envio)}</span></div> : null}
      <div className="ol tot"><span>Total</span><span className="mono">{money(o.total)}</span></div>
      <div className="muted" style={{ fontSize: 13 }}>Entrega en: {o.address || '—'}{o.note ? ` · ${o.note}` : ''}</div>
      {admin && flow[st]?.length ? (
        <div className="row" style={{ gap: 6 }}>
          {flow[st].map((n) => <button key={n} className={`btn sm ${n === 'cancelado' ? 'danger' : ''}`} onClick={() => onStatus(m.id, n)}>{lbl[n]}</button>)}
        </div>
      ) : null}
      <small className="muted" style={{ fontSize: 11 }}>{when(m.created_at)}</small>
    </div>
  );
}

// Conversación de un cliente. role = 'cliente' (web) o 'cafe' (panel).
export default function Chat({ customerId, role, title, subtitle, onBack, empty }) {
  const { sb, toast } = useApp();
  const [msgs, setMsgs] = useState([]);
  const [urls, setUrls] = useState({});
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [text, setText] = useState('');
  const box = useRef();
  const admin = role === 'cafe';

  const markRead = useCallback(() => { sb.rpc('mark_read', { p_customer: admin ? customerId : null }); }, [sb, admin, customerId]);

  useEffect(() => {
    if (!customerId) return;
    let alive = true;
    sb.from('messages').select('*').eq('customer_id', customerId).order('created_at').limit(500)
      .then(({ data }) => { if (alive) setMsgs(data || []); });
    markRead();
    const ch = sb.channel('chat-' + role + '-' + customerId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `customer_id=eq.${customerId}` },
        (p) => { setMsgs((a) => (a.some((x) => x.id === p.new.id) ? a : [...a, p.new])); markRead(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `customer_id=eq.${customerId}` },
        (p) => setMsgs((a) => a.map((x) => (x.id === p.new.id ? p.new : x))))
      .subscribe();
    return () => { alive = false; sb.removeChannel(ch); };
  }, [sb, customerId, role, markRead]);

  // links firmados para ver archivos privados
  useEffect(() => {
    const need = msgs.filter((m) => m.type === 'file' && m.file_path && !urls[m.file_path]).map((m) => m.file_path);
    if (!need.length) return;
    sb.storage.from('chat').createSignedUrls(need, 3600).then(({ data }) => {
      if (!data) return;
      setUrls((u) => { const n = { ...u }; data.forEach((d) => { if (d.signedUrl) n[d.path] = d.signedUrl; }); return n; });
    });
  }, [sb, msgs, urls]);

  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs.length, uploading]);

  async function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    const { error } = await sb.from('messages').insert({ customer_id: customerId, sender: role, type: 'text', text: t });
    if (error) { setText(t); toast('No se pudo enviar el mensaje'); }
  }

  async function sendFile(file) {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isImg = file.type.startsWith('image/');
    if (!isPdf && !isImg) return toast('Podés enviar fotos o archivos PDF');
    if (isPdf && file.size > MAX_PDF) return toast('El PDF pesa más de 10 MB. Mandá una captura del comprobante.');
    setUploading(true);
    try {
      const blob = isImg ? await shrink(file, 1800, 0.85) : file;
      const ext = isImg ? 'jpg' : 'pdf';
      const name = isImg ? (file.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg' : file.name || 'comprobante.pdf';
      const path = `${customerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await sb.storage.from('chat').upload(path, blob, { contentType: isImg ? 'image/jpeg' : 'application/pdf' });
      if (up.error) throw up.error;
      const { error } = await sb.from('messages').insert({ customer_id: customerId, sender: role, type: 'file', file_path: path, file_name: name, file_mime: isImg ? 'image/jpeg' : 'application/pdf', file_size: blob.size });
      if (error) throw error;
    } catch { toast('No se pudo enviar el archivo'); }
    setUploading(false);
  }

  async function download(m) {
    const { data } = await sb.storage.from('chat').createSignedUrl(m.file_path, 300, { download: m.file_name || true });
    if (data?.signedUrl) window.location.href = data.signedUrl;
  }

  async function setStatus(id, st) {
    const { error } = await sb.rpc('set_order_status', { p_message: id, p_status: st });
    if (error) toast('No se pudo cambiar el estado');
  }

  function bubble(m) {
    if (m.type === 'order') return <OrderCard key={m.id} m={m} admin={admin} onStatus={setStatus} />;
    if (m.type === 'status') return <div className="sys" key={m.id}>{m.text} · {when(m.created_at)}</div>;
    const mine = m.sender === role;
    if (m.type === 'file') {
      const url = urls[m.file_path];
      const isImg = (m.file_mime || '').startsWith('image/');
      return (
        <div key={m.id} className={`bub ${mine ? 'me' : 'them'}`}>
          {isImg ? (
            url ? <button type="button" className="thumb" onClick={() => setLightbox(m)} aria-label={`Ver ${m.file_name}`}><img src={url} alt={m.file_name} /></button> : <span>Cargando foto…</span>
          ) : (
            <>
              <div className="filecard"><span className="ic">PDF</span><div style={{ minWidth: 0 }}><b style={{ overflowWrap: 'anywhere' }}>{m.file_name}</b><div style={{ fontSize: 12, opacity: 0.75 }}>{Math.max(1, Math.round((m.file_size || 0) / 1024))} KB</div></div></div>
              <button type="button" className="btn ghost sm" onClick={() => download(m)}>Descargar</button>
            </>
          )}
          <small>{when(m.created_at)}</small>
        </div>
      );
    }
    return <div key={m.id} className={`bub ${mine ? 'me' : 'them'}`}>{m.text}<small>{when(m.created_at)}</small></div>;
  }

  return (
    <div className="thread">
      <div className="head">
        <div>{onBack ? <button className="btn ghost sm" onClick={onBack} style={{ marginRight: 8 }} aria-label="Volver">←</button> : null}<b>{title}</b></div>
        {subtitle ? <span className="muted" style={{ fontSize: 13 }}>{subtitle}</span> : null}
      </div>
      <div className="msgs" ref={box}>
        {msgs.length ? msgs.map(bubble) : <div className="sys">{empty}</div>}
        {uploading ? <div className="sys">Enviando archivo…</div> : null}
      </div>
      <form className="compose" onSubmit={send}>
        <label className="attach" title="Adjuntar foto o comprobante">
          <input type="file" accept="image/*,application/pdf" aria-label="Adjuntar foto o comprobante" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; sendFile(f); }} />
          <Clip />
        </label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribí un mensaje…" aria-label="Mensaje"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form.requestSubmit(); } }} />
        <button className="btn">Enviar</button>
      </form>
      {lightbox ? (
        <div className="lightbox" role="dialog" aria-label="Foto" onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}>
          <img src={urls[lightbox.file_path]} alt={lightbox.file_name} />
          <div className="row">
            <button className="btn wax" onClick={() => download(lightbox)}>Descargar</button>
            <button className="btn ghost" style={{ color: '#fff', borderColor: '#fff' }} onClick={() => setLightbox(null)}>Cerrar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
