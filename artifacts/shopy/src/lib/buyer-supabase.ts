import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Separate Supabase client for BUYER auth only.
 * Uses localStorage with a unique key so sessions persist across tab closes,
 * but never interfere with the seller session (which uses "shopgram-auth").
 */
export const buyerSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "shopgram-buyer-auth",
  },
});
