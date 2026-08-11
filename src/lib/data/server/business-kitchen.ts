import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapBusinessKitchenSnapshot,
  normalizeBusinessKitchenDate,
  type BusinessKitchenSnapshot,
} from "@/lib/kitchen/business-kitchen-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function getBusinessKitchenSnapshot(
  businessId: string,
  businessDate: string,
): Promise<BusinessKitchenSnapshot> {
  assertServerOnly(
    "getBusinessKitchenSnapshot",
  );

  const normalizedDate =
    normalizeBusinessKitchenDate(
      businessDate,
    );
  const supabase =
    await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error(
      "No se pudo crear el cliente autenticado.",
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_business_kitchen_snapshot",
    {
      p_business_id:
        businessId,
      p_business_date:
        normalizedDate,
    },
  );

  if (
    error
    || !data
  ) {
    console.error(
      "[business-kitchen] snapshot RPC failed",
      {
        code:
          error?.code ?? null,
      },
    );

    throw new Error(
      "No se pudieron leer las comandas persistentes.",
    );
  }

  return mapBusinessKitchenSnapshot(
    data,
  );
}
