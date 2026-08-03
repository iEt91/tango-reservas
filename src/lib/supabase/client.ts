import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./auth-config";

let supabaseClient: SupabaseClient | null = null;

export function hasSupabaseConfig() {
  return getSupabasePublicConfig() !== null;
}

export function getSupabaseClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      config.url,
      config.key,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  }

  return supabaseClient;
}
