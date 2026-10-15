'use client';
import { createClient } from '@supabase/supabase-js';

// Cliente del navegador: usa la anon key y respeta las reglas (RLS) de la base.
let client;
export function supabase() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
