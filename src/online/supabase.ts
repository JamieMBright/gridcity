// Supabase client, lazily created. The URL and publishable key ship in
// the bundle by design (they're public, protected by RLS); env vars can
// override them per deployment. If creation fails the game simply stays
// guest-only.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://mhgpzhtusrddwtgogjbv.supabase.co';
const KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_GyafPrdk_AfjDim7SjI4lA_M8JNzPY3';

let client: SupabaseClient | undefined;
let failed = false;

export function supabase(): SupabaseClient | undefined {
  if (failed) return undefined;
  if (!client) {
    try {
      client = createClient(URL, KEY, {
        auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true },
      });
    } catch {
      failed = true;
      return undefined;
    }
  }
  return client;
}
