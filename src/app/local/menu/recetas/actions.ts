"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import {
  mapBusinessRecipeRpcResult,
  normalizeBusinessRecipeMenuItemId,
  toBusinessRecipeRpcPayload,
  type BusinessRecipe,
} from "@/lib/recipes/business-recipe-contract";
import { hasStaffAccess } from "@/lib/staff/staff-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type BusinessRecipeActionResult =
  | {
      ok: true;
      recipe: BusinessRecipe;
    }
  | {
      ok: false;
      error: string;
    };

function formatRecipeMutationError(
  error: {
    code?: string | null;
  } | null,
  fallback: string,
) {
  if (error?.code === "23503") {
    return "El plato o uno de los insumos ya no está disponible.";
  }

  if (error?.code === "23505") {
    return "La receta contiene una relación duplicada.";
  }

  if (error?.code === "23514") {
    return "Una unidad de la receta no es compatible con el insumo.";
  }

  if (error?.code === "42501") {
    return "No tenés permisos para modificar las recetas de este local.";
  }

  if (error?.code === "22023") {
    return "Los datos de la receta no son válidos.";
  }

  return fallback;
}

async function resolveRecipesContext() {
  const activeBusiness =
    await resolveActiveBusiness();

  if (activeBusiness.status !== "ready") {
    return {
      ok: false as const,
      error:
        "La sesión o el negocio activo ya no son válidos.",
    };
  }

  if (
    activeBusiness.membership.role === "staff"
    && !hasStaffAccess(
      activeBusiness.membership.permissions,
      "recipes",
      "manage",
    )
  ) {
    return {
      ok: false as const,
      error:
        "No tenés permisos para modificar las recetas de este local.",
    };
  }

  const supabase =
    await createSupabaseAuthServerClient();

  if (!supabase) {
    return {
      ok: false as const,
      error:
        "No se pudo crear el cliente autenticado.",
    };
  }

  return {
    ok: true as const,
    businessId:
      activeBusiness.membership.businessId,
    supabase,
  };
}

function revalidateRecipeConsumers() {
  revalidatePath("/local/menu/recetas");
  revalidatePath("/local/menu");
  revalidatePath("/local/cocina");
  revalidatePath("/local/stock");
}

export async function saveBusinessMenuRecipeAction(
  input: unknown,
): Promise<BusinessRecipeActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error(
        "La receta recibida es inválida.",
      );
    }

    const data =
      input as Record<string, unknown>;
    const menuItemId =
      normalizeBusinessRecipeMenuItemId(
        data.menuItemId,
      );
    const payload =
      toBusinessRecipeRpcPayload(
        data.recipe,
      );
    const context =
      await resolveRecipesContext();

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "save_business_menu_recipe",
        {
          p_business_id:
            context.businessId,
          p_menu_item_id:
            menuItemId,
          p_recipe:
            payload.recipe,
          p_ingredients:
            payload.ingredients,
        },
      );

    if (error || !saved) {
      console.error(
        "[business-recipes] save RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatRecipeMutationError(
          error,
          "No se pudo guardar la receta en Supabase.",
        ),
      };
    }

    revalidateRecipeConsumers();

    return {
      ok: true,
      recipe:
        mapBusinessRecipeRpcResult(saved),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la receta.",
    };
  }
}
