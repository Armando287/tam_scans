import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
// Prefer the new "publishable" key if present, fall back to the legacy anon key.
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

let _client: SupabaseClient | null = null;

// Single shared browser client so auth session + realtime state stay consistent
// across the app (AuthContext, lib/firestore.ts queries, etc.)
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _client;
}

export const supabase = getSupabaseBrowserClient();
