import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapBusinessReservationRow,
  type BusinessReservationDatabaseRow,
} from "@/lib/reservations/business-reservation-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

const BUSINESS_RESERVATION_SELECT =
  "id, business_id, service_id, customer_id, customer_name, customer_phone, customer_email, reservation_date, reservation_time, party_size, status, notes, source, duration_minutes, public_code, created_at, updated_at, confirmed_at, completed_at, cancelled_at, no_show_at" as const;

export async function getBusinessReservationsForBusiness(
  businessId: string,
  options?: {
    fromDate?: string;
    toDate?: string;
  },
) {
  assertServerOnly("getBusinessReservationsForBusiness");

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error("No se pudo crear el cliente autenticado.");
  }

  let query = supabase
    .from("reservations")
    .select(BUSINESS_RESERVATION_SELECT)
    .eq("business_id", businessId)
    .order("reservation_date", { ascending: true })
    .order("reservation_time", { ascending: true })
    .order("created_at", { ascending: false });

  if (options?.fromDate) {
    query = query.gte("reservation_date", options.fromDate);
  }

  if (options?.toDate) {
    query = query.lte("reservation_date", options.toDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      "No se pudieron leer las reservas del negocio.",
    );
  }

  return (data ?? []).map((row: unknown) =>
    mapBusinessReservationRow(
      row as unknown as BusinessReservationDatabaseRow,
    ),
  );
}
