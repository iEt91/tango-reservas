import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapBusinessRecipeStockConsumptionResult,
  toBusinessRecipeStockConsumptionRpcPayload,
  type BusinessRecipeStockConsumptionInput,
} from "@/lib/stock/recipe-stock-consumption-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function consumeBusinessMenuRecipeStockForBusiness(
  businessId: string,
  input: BusinessRecipeStockConsumptionInput,
) {
  assertServerOnly(
    "consumeBusinessMenuRecipeStockForBusiness",
  );

  const supabase =
    await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error(
      "No se pudo crear el cliente autenticado.",
    );
  }

  const payload =
    toBusinessRecipeStockConsumptionRpcPayload(
      input,
    );

  const {
    data,
    error,
  } = await supabase.rpc(
    "consume_business_menu_recipe_stock",
    {
      p_business_id:
        businessId,
      ...payload,
    },
  );

  if (
    error
    || !data
  ) {
    console.error(
      "[recipe-stock] consumption RPC failed",
      {
        code:
          error?.code ?? null,
      },
    );

    if (
      error?.code === "23514"
    ) {
      throw new Error(
        "No se pudo descontar Stock: falta receta, ingredientes o saldo suficiente.",
      );
    }

    if (
      error?.code === "23503"
    ) {
      throw new Error(
        "El plato o uno de sus insumos ya no está disponible.",
      );
    }

    if (
      error?.code === "23505"
    ) {
      throw new Error(
        "La operación de Stock ya existe con datos diferentes.",
      );
    }

    if (
      error?.code === "42501"
    ) {
      throw new Error(
        "No tenés permisos para ejecutar este consumo de Stock.",
      );
    }

    throw new Error(
      "No se pudo descontar Stock a partir de la receta.",
    );
  }

  return mapBusinessRecipeStockConsumptionResult(
    data,
  );
}
