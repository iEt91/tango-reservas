export type SupabasePublicConfig = {
  url: string;
  key: string;
};

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  return {
    url: url.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/u, ""),
    key,
  };
}
