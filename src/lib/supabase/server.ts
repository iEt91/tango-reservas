import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/lib/security/server-only";

assertServerOnly("El cliente privilegiado de Supabase");

let supabaseServerClient: SupabaseClient | null = null;

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/u, "");
}

export function hasSupabaseServerConfig() {
  if (typeof window !== "undefined") {
    return false;
  }

  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function createPublicRequestHmac(
  value: string,
) {
  assertServerOnly(
    "El HMAC de solicitudes públicas",
  );

  const secret =
    process.env.PUBLIC_REQUEST_FINGERPRINT_SECRET
      ?.trim();

  if (!secret) {
    throw new Error(
      "Falta el secreto server-only de solicitudes públicas.",
    );
  }

  return createHmac(
    "sha256",
    secret,
  )
    .update(
      value,
      "utf8",
    )
    .digest("hex");
}

export function getSupabaseServerClient() {
  assertServerOnly("El cliente privilegiado de Supabase");

  if (!hasSupabaseServerConfig()) {
    return null;
  }

  if (!supabaseServerClient) {
    supabaseServerClient = createClient(
      normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  }

  return supabaseServerClient;
}
