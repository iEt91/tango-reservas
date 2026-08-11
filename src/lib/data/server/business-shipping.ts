import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapBusinessShippingSnapshot,
  normalizeBusinessShippingDate,
  type BusinessShippingSnapshot,
} from "@/lib/shipping/business-shipping-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function getBusinessShippingSnapshot(
  businessId: string,
  startDate: string,
  endDate: string,
): Promise<BusinessShippingSnapshot> {
  assertServerOnly("getBusinessShippingSnapshot");

  const normalizedStart = normalizeBusinessShippingDate(startDate);
  const normalizedEnd = normalizeBusinessShippingDate(endDate);
  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error("No se pudo crear el cliente autenticado.");
  }

  const { data, error } = await supabase.rpc(
    "get_business_shipping_snapshot",
    {
      p_business_id: businessId,
      p_start_date: normalizedStart,
      p_end_date: normalizedEnd,
    },
  );

  if (error || !data) {
    console.error("[business-shipping] snapshot RPC failed", {
      code: error?.code ?? null,
    });

    throw new Error("No se pudieron leer los Envíos persistentes.");
  }

  return mapBusinessShippingSnapshot(data);
}
