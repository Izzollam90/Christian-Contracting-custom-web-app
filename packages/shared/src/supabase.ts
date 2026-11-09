import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const hasSupabaseConfig = Boolean(url && key && !url.includes('YOUR-PROJECT'));

let client: SupabaseClient | null = null;

// Use the publishable or legacy anon key with the browser client.
export const supabase = (): SupabaseClient => {
  if (!client) {
    if (!hasSupabaseConfig || !url || !key) {
      throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local.');
    }
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        experimental: { passkey: true },
      },
    });
  }
  return client;
};
