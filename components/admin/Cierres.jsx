'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppProvider';
import { num } from '@/lib/utils';

const TZ = 'America/Argentina/Buenos_Aires';
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const label = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return `${DAYS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const clock = (ts) => (ts ? new Date(ts).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }) : '—');

export function missingText(missing, title) {
  return `${title}\n` + missing.map((m) => `• ${m.name}: quedan ${num(m.qty)} ${m.unit}, faltan ${num(m.falta ?? m.min - m.qty)}`).join('\n');
}
export const waLink = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export default function Cierres() {
  const { sb, toast } = useApp();
  const [rows, setRows] = useState([]);
  const [limit, setLimit] = useState(30);
  const [open, setOpen] = useState(null);
  const [urls, setUrls] = useState({});
  const [big, setBig] = useState(null);

  const load = useCallback(() => sb.from('staff_closings').select('*').order('created_at', { ascending: false }).limit(limit).then(({ data }) => setRows(data || [])), [sb, limit]);
  useEffect(() => { load(); }, [load]);

  async function expand(c) {
    if (open === c.id) { setOpen(null); return; }
    setOpen(c.id);
    const paths = (c.photos || []).map((p) => p.path).filter((p) => !urls[p]);
    if (!paths.length) return;
    const { data, error } = await sb.storage.from('equipo').createSignedUrls(paths, 3600);
    if (error) return toast('No se pudieron cargar las fotos');
    setUrls((u) => ({ ...u, ...Object.fromEntries((data || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl])) }));
  }

  return (
    <>
      <div className="ph"><div><div className="eyebrow">Fin de turno</div><h2>Cierres</h2></div><span className="muted">Fotos y stock que carga el equipo en la tablet</span></div>
      {rows.length ? (
        <div className="lst">
          {rows.map((c) => {
            const miss = c.missing || [];
            return (
              <div key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <div className="li" style={{ borderBottom: 0 }}>
                  <div>
                    <b>{label(c.day)} · {c.staff_name}</b> <span className="muted mono">{clock(c.created_at)}</span>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {(c.photos || []).length} fotos · {(c.stock || []).length} insumos contados
                      {miss.length ? <> · <span className="low">{miss.length} debajo del mínimo</span></> : ' · stock OK'}
                    </div>
                    {c.note ? <div style={{ fontSize: 14, marginTop: 4 }}>“{c.note}”</div> : null}
                  </div>
                  <div className="acts">
                    {miss.length ? <a className="btn ghost sm" href={waLink(missingText(miss, `Faltantes · cierre ${label(c.day)} (${c.staff_name})`))} target="_blank" rel="noopener noreferrer">Mandar faltantes por WhatsApp</a> : null}
                    <button className="btn ghost sm" aria-expanded={open === c.id} onClick={() => expand(c)}>{open === c.id ? 'Ocultar' : 'Ver fotos y stock'}</button>
                  </div>
                </div>
                {open === c.id ? (
                  <div className="stack" style={{ padding: '0 14px 16px' }}>
                    <div className="ph-grid">
                      {(c.photos || []).map((p) => (
                        <figure key={p.path}>
                          <button type="button" onClick={() => urls[p.path] && setBig({ src: urls[p.path], name: p.name })} aria-label={`Ampliar foto: ${p.name}`}>
                            {urls[p.path] ? <img src={urls[p.path]} alt={p.name} loading="lazy" /> : null}
                          </button>
                          <figcaption>{p.name} <span className="muted mono">{clock(p.taken_at)}</span></figcaption>
                        </figure>
                      ))}
                    </div>
                    <div className="tbl">
                      <table>
                        <thead><tr><th>Insumo</th><th className="n">Quedan</th><th className="n">Mínimo</th><th className="n">Falta</th></tr></thead>
                        <tbody>
                          {(c.stock || []).map((s) => (
                            <tr key={s.item_id}>
                              <td>{s.name}</td>
                              <td className={`n ${s.qty < s.min ? 'low' : ''}`}>{num(s.qty)} {s.unit}</td>
                              <td className="n">{num(s.min)}</td>
                              <td className="n">{s.qty < s.min ? num(Math.round((s.min - s.qty) * 100) / 100) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : <div className="empty">Todavía no hay cierres. Se cargan desde la tablet en /equipo.</div>}
      {rows.length >= limit ? <div style={{ textAlign: 'center', marginTop: 12 }}><button className="btn ghost" onClick={() => setLimit((l) => l + 30)}>Ver más</button></div> : null}
      {big ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={big.name} onClick={() => setBig(null)}>
          <img src={big.src} alt={big.name} />
          <div className="row"><button className="btn wax" onClick={() => setBig(null)}>Cerrar</button></div>
        </div>
      ) : null}
    </>
  );
}
