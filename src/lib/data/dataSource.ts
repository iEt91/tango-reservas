export type DataSource = "local" | "supabase";

export function getDataSource(): DataSource {
  const value = process.env.NEXT_PUBLIC_DATA_SOURCE?.trim().toLowerCase();

  if (value === "supabase") {
    return "supabase";
  }

  return "local";
}
