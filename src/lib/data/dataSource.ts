export type DataSource = "local" | "supabase";

export function getDataSource(): DataSource {
  const value = process.env.NEXT_PUBLIC_DATA_SOURCE?.trim().toLowerCase();

  if (value === "supabase") {
    return "supabase";
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_DATA_SOURCE debe ser 'supabase' en producción.",
    );
  }

  return "local";
}
