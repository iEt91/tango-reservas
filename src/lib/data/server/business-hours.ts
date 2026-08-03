import { assertServerOnly } from "@/lib/security/server-only";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import {
  mapBusinessHourRowsToEditor,
  type BusinessHourDatabaseRow,
} from "@/lib/configuration/business-hours-contract";

const BUSINESS_HOURS_SELECT =
  "id, business_id, day_of_week, is_open, open_time, close_time, break_start_time, break_end_time, created_at, updated_at" as const;

export async function getBusinessHoursForBusiness(
  businessId: string,
) {
  assertServerOnly("getBusinessHoursForBusiness");

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error("No se pudo crear el cliente autenticado.");
  }

  const { data, error } = await supabase
    .from("business_hours")
    .select(BUSINESS_HOURS_SELECT)
    .eq("business_id", businessId);

  if (error) {
    throw new Error("No se pudieron leer los horarios del negocio.");
  }

  return mapBusinessHourRowsToEditor(
    (data ?? []) as unknown as BusinessHourDatabaseRow[],
  );
}
