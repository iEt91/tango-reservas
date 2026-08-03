import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapBusinessServiceRow,
  type BusinessServiceDatabaseRow,
} from "@/lib/services/business-service-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

const BUSINESS_SERVICE_SELECT =
  "id, business_id, name, description, duration_minutes, capacity, price, is_active, sort_order, created_at, updated_at" as const;

export async function getBusinessServicesForBusiness(
  businessId: string,
) {
  assertServerOnly("getBusinessServicesForBusiness");

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error("No se pudo crear el cliente autenticado.");
  }

  const { data, error } = await supabase
    .from("services")
    .select(BUSINESS_SERVICE_SELECT)
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      "No se pudieron leer los servicios del negocio.",
    );
  }

  return (data ?? []).map((row) =>
    mapBusinessServiceRow(
      row as unknown as BusinessServiceDatabaseRow,
    ),
  );
}
