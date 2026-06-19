import { hasSupabaseConfig } from "@/lib/supabase/client";
import { fetchSupabaseBusinesses, type SupabaseBusinessRow } from "./businesses";

export type SupabaseHealthResult = {
  configured: boolean;
  connected: boolean;
  error: string | null;
  rawMessage: string | null;
  errorCode: string | null;
  businessCount: number;
  businessesCount: number;
  businesses: SupabaseBusinessRow[];
  slugs: string[];
  table: string;
};

export async function checkSupabaseConnection(): Promise<SupabaseHealthResult> {
  if (!hasSupabaseConfig()) {
    return {
      configured: false,
      connected: false,
      error: "Faltan variables de entorno de Supabase.",
      rawMessage: null,
      errorCode: null,
      businessCount: 0,
      businessesCount: 0,
      businesses: [],
      slugs: [],
      table: "public.businesses",
    };
  }

  const result = await fetchSupabaseBusinesses();

  if (!result.connected) {
    return {
      configured: true,
      connected: false,
      error: result.error?.message ?? "No se pudo crear el cliente de Supabase.",
      rawMessage: result.error?.details ?? result.error?.hint ?? result.error?.message ?? null,
      errorCode: result.error?.code ?? null,
      businessCount: 0,
      businessesCount: 0,
      businesses: [],
      slugs: [],
      table: "public.businesses",
    };
  }
  const businesses = result.businesses.map((business) => ({ ...business }));

  return {
    configured: true,
    connected: true,
    error: null,
    rawMessage: null,
    errorCode: null,
    businessCount: result.count,
    businessesCount: result.count,
    businesses,
    slugs: businesses.map((business) => business.slug),
    table: "public.businesses",
  };
}
