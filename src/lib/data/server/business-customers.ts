import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapBusinessCustomerRow,
  type BusinessCustomerDatabaseRow,
} from "@/lib/customers/business-customer-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

const BUSINESS_CUSTOMER_SELECT =
  "id, business_id, full_name, email, phone, birth_date, notes, preferences, tags, is_active, created_at, updated_at" as const;

export async function getBusinessCustomersForBusiness(
  businessId: string,
) {
  assertServerOnly("getBusinessCustomersForBusiness");

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error("No se pudo crear el cliente autenticado.");
  }

  const { data, error } = await supabase
    .from("customers")
    .select(BUSINESS_CUSTOMER_SELECT)
    .eq("business_id", businessId)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(
      "No se pudieron leer los clientes del negocio.",
    );
  }

  return (data ?? []).map((row) =>
    mapBusinessCustomerRow(
      row as unknown as BusinessCustomerDatabaseRow,
    ),
  );
}
