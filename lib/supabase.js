'use client';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// true si faltan las variables de entorno (la web muestra un aviso en vez de romperse)
export const missingConfig = !URL || !KEY;

// Cliente del navegador: usa la anon key y respeta las reglas (RLS) de la base.
let client;
export function supabase() {
  if (!client) {
    client = createClient(URL || 'https://falta-configurar.supabase.co', KEY || 'falta-configurar', {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
