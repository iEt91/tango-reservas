import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapReservationSettingsRowToEditor,
  type ReservationSettingsDatabaseRow,
} from "@/lib/configuration/reservation-settings-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

const RESERVATION_SETTINGS_SELECT =
  "business_id, reservations_enabled, default_reservation_duration_minutes, requires_confirmation, min_notice_minutes, max_days_ahead, max_people_per_slot, allow_reservations_without_table, auto_assign_reservation_tables, allow_table_combinations, updated_at" as const;

export async function getReservationSettingsForBusiness(
  businessId: string,
) {
  assertServerOnly("getReservationSettingsForBusiness");

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error("No se pudo crear el cliente autenticado.");
  }

  const { data, error } = await supabase
    .from("reservation_rules")
    .select(RESERVATION_SETTINGS_SELECT)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    throw new Error(
      "No se pudieron leer las reglas de reserva del negocio.",
    );
  }

  if (!data) {
    return null;
  }

  return mapReservationSettingsRowToEditor(
    data as unknown as ReservationSettingsDatabaseRow,
  );
}
