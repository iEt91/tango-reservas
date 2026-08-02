import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./auth-config";

export async function createSupabaseAuthServerClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Los Server Components no pueden escribir cookies.
          // src/proxy.ts se ocupa de renovar la sesión.
        }
      },
    },
  });
}
