"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import {
  mapBusinessMenuCategoryRow,
  mapBusinessMenuItemRow,
  normalizeBusinessMenuCategory,
  normalizeBusinessMenuEntityId,
  normalizeBusinessMenuItem,
  normalizeBusinessMenuQuickChanges,
  toBusinessMenuCategoryProductsRpcPayload,
  toBusinessMenuCategoryRpcPayload,
  toBusinessMenuItemRpcPayload,
  toBusinessMenuQuickChangesRpcPayload,
  type BusinessMenuCategoryDatabaseRow,
  type BusinessMenuCategoryEditor,
  type BusinessMenuItemDatabaseRow,
  type BusinessMenuItemEditor,
} from "@/lib/menu/business-menu-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type BusinessMenuCategoryActionResult =
  | {
      ok: true;
      category: BusinessMenuCategoryEditor;
    }
  | {
      ok: false;
      error: string;
    };

export type BusinessMenuCategoriesActionResult =
  | {
      ok: true;
      categories: BusinessMenuCategoryEditor[];
    }
  | {
      ok: false;
      error: string;
    };

export type BusinessMenuItemActionResult =
  | {
      ok: true;
      item: BusinessMenuItemEditor;
    }
  | {
      ok: false;
      error: string;
    };

export type BusinessMenuItemsActionResult =
  | {
      ok: true;
      items: BusinessMenuItemEditor[];
    }
  | {
      ok: false;
      error: string;
    };

function formatBusinessMenuMutationError(
  error: {
    code?: string | null;
  } | null,
  fallback: string,
) {
  if (error?.code === "23505") {
    return "Ya existe un registro del menú con ese nombre.";
  }

  if (error?.code === "23503") {
    return "La categoría relacionada ya no está disponible.";
  }

  if (error?.code === "23514") {
    return "Los valores de la promoción no son válidos.";
  }

  if (error?.code === "42501") {
    return "No tenés permisos para modificar este menú.";
  }

  if (error?.code === "22023") {
    return "Los datos del menú no son válidos.";
  }

  return fallback;
}

async function resolveAuthorizedMenuContext() {
  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status !== "ready") {
    return {
      ok: false as const,
      error:
        "La sesión o el negocio activo ya no son válidos.",
    };
  }

  if (
    activeBusiness.membership.role !== "owner"
    && activeBusiness.membership.role !== "admin"
  ) {
    return {
      ok: false as const,
      error:
        "Solo el dueño o un administrador pueden cambiar el menú.",
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

function revalidateMenuConsumers() {
  revalidatePath("/local/menu");
  revalidatePath("/local/menu/recetas");
  revalidatePath("/local/reservas");
  revalidatePath("/local/cocina");
}

export async function saveBusinessMenuCategoryAction(
  input: unknown,
): Promise<BusinessMenuCategoryActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error(
        "La categoría recibida es inválida.",
      );
    }

    const data = input as Record<string, unknown>;
    const categoryId =
      normalizeBusinessMenuEntityId(
        data.categoryId,
        "La categoría",
      );
    const category =
      normalizeBusinessMenuCategory(
        data.category,
      );
    const context =
      await resolveAuthorizedMenuContext();

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "save_business_menu_category_details",
        {
          p_business_id: context.businessId,
          p_category_id: categoryId,
          p_category:
            toBusinessMenuCategoryRpcPayload(
              category,
            ),
          p_products:
            toBusinessMenuCategoryProductsRpcPayload(
              category.products,
            ),
        },
      );

    if (error || !saved) {
      console.error(
        "[business-menu] category save RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatBusinessMenuMutationError(
          error,
          "No se pudo guardar la categoría.",
        ),
      };
    }

    revalidateMenuConsumers();

    return {
      ok: true,
      category: mapBusinessMenuCategoryRow(
        (saved as unknown) as BusinessMenuCategoryDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la categoría.",
    };
  }
}

export async function archiveBusinessMenuCategoryAction(
  input: unknown,
): Promise<BusinessMenuCategoryActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error(
        "La categoría recibida es inválida.",
      );
    }

    const data = input as Record<string, unknown>;
    const categoryId =
      normalizeBusinessMenuEntityId(
        data.categoryId,
        "La categoría",
      );

    if (!categoryId) {
      throw new Error(
        "La categoría es obligatoria.",
      );
    }

    const context =
      await resolveAuthorizedMenuContext();

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "archive_business_menu_category",
        {
          p_business_id: context.businessId,
          p_category_id: categoryId,
        },
      );

    if (error || !saved) {
      console.error(
        "[business-menu] category archive RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatBusinessMenuMutationError(
          error,
          "No se pudo eliminar la categoría.",
        ),
      };
    }

    revalidateMenuConsumers();

    return {
      ok: true,
      category: mapBusinessMenuCategoryRow(
        (saved as unknown) as BusinessMenuCategoryDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la categoría.",
    };
  }
}

export async function reorderBusinessMenuCategoriesAction(
  input: unknown,
): Promise<BusinessMenuCategoriesActionResult> {
  try {
    if (!Array.isArray(input)) {
      throw new Error(
        "El orden de categorías es inválido.",
      );
    }

    const categoryIds = input.map((value) => {
      const id = normalizeBusinessMenuEntityId(
        value,
        "La categoría",
      );

      if (!id) {
        throw new Error(
          "La categoría es obligatoria.",
        );
      }

      return id;
    });

    if (
      new Set(categoryIds).size
      !== categoryIds.length
    ) {
      throw new Error(
        "El orden contiene categorías duplicadas.",
      );
    }

    const context =
      await resolveAuthorizedMenuContext();

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "reorder_business_menu_categories",
        {
          p_business_id: context.businessId,
          p_category_ids: categoryIds,
        },
      );

    if (error || !Array.isArray(saved)) {
      console.error(
        "[business-menu] category reorder RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatBusinessMenuMutationError(
          error,
          "No se pudo guardar el orden.",
        ),
      };
    }

    revalidateMenuConsumers();

    return {
      ok: true,
      categories: saved.map((row) =>
        mapBusinessMenuCategoryRow(
          (row as unknown) as BusinessMenuCategoryDatabaseRow,
        ),
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el orden.",
    };
  }
}

export async function saveBusinessMenuItemAction(
  input: unknown,
): Promise<BusinessMenuItemActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error(
        "El producto recibido es inválido.",
      );
    }

    const data = input as Record<string, unknown>;
    const menuItemId =
      normalizeBusinessMenuEntityId(
        data.menuItemId,
        "El producto",
      );
    const item = normalizeBusinessMenuItem(
      data.item,
    );
    const context =
      await resolveAuthorizedMenuContext();

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "save_business_menu_item",
        {
          p_business_id: context.businessId,
          p_menu_item_id: menuItemId,
          p_menu_item:
            toBusinessMenuItemRpcPayload(item),
        },
      );

    if (error || !saved) {
      console.error(
        "[business-menu] item save RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatBusinessMenuMutationError(
          error,
          "No se pudo guardar el producto.",
        ),
      };
    }

    revalidateMenuConsumers();

    return {
      ok: true,
      item: mapBusinessMenuItemRow(
        (saved as unknown) as BusinessMenuItemDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el producto.",
    };
  }
}

export async function archiveBusinessMenuItemAction(
  input: unknown,
): Promise<BusinessMenuItemActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error(
        "El producto recibido es inválido.",
      );
    }

    const data = input as Record<string, unknown>;
    const menuItemId =
      normalizeBusinessMenuEntityId(
        data.menuItemId,
        "El producto",
      );

    if (!menuItemId) {
      throw new Error(
        "El producto es obligatorio.",
      );
    }

    const context =
      await resolveAuthorizedMenuContext();

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "archive_business_menu_item",
        {
          p_business_id: context.businessId,
          p_menu_item_id: menuItemId,
        },
      );

    if (error || !saved) {
      console.error(
        "[business-menu] item archive RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatBusinessMenuMutationError(
          error,
          "No se pudo eliminar el producto.",
        ),
      };
    }

    revalidateMenuConsumers();

    return {
      ok: true,
      item: mapBusinessMenuItemRow(
        (saved as unknown) as BusinessMenuItemDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el producto.",
    };
  }
}

export async function saveBusinessMenuQuickChangesAction(
  input: unknown,
): Promise<BusinessMenuItemsActionResult> {
  try {
    const items =
      normalizeBusinessMenuQuickChanges(input);
    const context =
      await resolveAuthorizedMenuContext();

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "save_business_menu_item_quick_changes",
        {
          p_business_id: context.businessId,
          p_items:
            toBusinessMenuQuickChangesRpcPayload(
              items,
            ),
        },
      );

    if (error || !Array.isArray(saved)) {
      console.error(
        "[business-menu] quick changes RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatBusinessMenuMutationError(
          error,
          "No se pudieron guardar los cambios rápidos.",
        ),
      };
    }

    revalidateMenuConsumers();

    return {
      ok: true,
      items: saved.map((row) =>
        mapBusinessMenuItemRow(
          (row as unknown) as BusinessMenuItemDatabaseRow,
        ),
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron validar los cambios rápidos.",
    };
  }
}
