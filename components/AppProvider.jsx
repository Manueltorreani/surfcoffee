'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export default function AppProvider({ children }) {
  const sb = supabase();
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState(null);
  const [menu, setMenu] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [unreadClient, setUnreadClient] = useState(false);
  const [cart, setCart] = useState({});
  const [toastMsg, setToastMsg] = useState('');
  const toastT = useRef();

  const toast = useCallback((t) => {
    setToastMsg(t);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(''), 3200);
  }, []);

  // datos públicos
  const loadPublic = useCallback(async () => {
    const [s, m, r] = await Promise.all([
      sb.from('settings').select('*').eq('id', 1).maybeSingle(),
      sb.from('menu_items').select('*').order('sort'),
      sb.from('rewards').select('*').order('cost'),
    ]);
    if (s.data) setSettings(s.data);
    setMenu(m.data || []);
    setRewards(r.data || []);
  }, [sb]);
  useEffect(() => { loadPublic(); }, [loadPublic]);

  // sesión
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const uid = session?.user?.id;
  const loadMe = useCallback(async () => {
    if (!uid) { setCustomer(null); setIsAdmin(false); return; }
    const [c, a] = await Promise.all([
      sb.from('customers').select('*').eq('auth_user_id', uid).maybeSingle(),
      sb.from('admins').select('user_id').eq('user_id', uid).maybeSingle(),
    ]);
    setCustomer(c.data || null);
    setIsAdmin(!!a.data);
  }, [sb, uid]);
  useEffect(() => { loadMe(); }, [loadMe]);

  // puntos y avisos en vivo
  const cid = customer?.id;
  useEffect(() => {
    if (!cid) { setUnreadClient(false); return; }
    sb.from('conversations').select('unread_client').eq('customer_id', cid).maybeSingle().then(({ data }) => setUnreadClient(!!data?.unread_client));
    const ch = sb.channel('me-' + cid)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'customers', filter: `id=eq.${cid}` }, (p) => setCustomer((c) => ({ ...c, ...p.new })))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `customer_id=eq.${cid}` }, (p) => setUnreadClient(!!p.new?.unread_client))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [sb, cid]);

  const signOut = useCallback(async () => { await sb.auth.signOut(); setCustomer(null); setIsAdmin(false); }, [sb]);

  const value = useMemo(() => ({
    sb, session, authReady, customer, setCustomer, isAdmin, settings, setSettings, menu, setMenu, rewards, setRewards,
    loadPublic, loadMe, signOut, cart, setCart, unreadClient, toast,
  }), [sb, session, authReady, customer, isAdmin, settings, menu, rewards, loadPublic, loadMe, signOut, cart, unreadClient, toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {toastMsg ? <div className="toast" role="status">{toastMsg}</div> : null}
    </Ctx.Provider>
  );
}
