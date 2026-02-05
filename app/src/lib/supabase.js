import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// createClient() throws if URL is empty; use a no-op mock when not configured so the app still loads
const noop = () => {};
const noopSub = { unsubscribe: noop };
const supabaseMock = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: noopSub } }),
    signInWithPassword: () => Promise.resolve({ error: { message: 'Add Supabase URL and anon key to .env' } }),
    signUp: () => Promise.resolve({ error: { message: 'Add Supabase URL and anon key to .env' } }),
    signOut: () => Promise.resolve(),
  },
};

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase =
  isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : supabaseMock;
