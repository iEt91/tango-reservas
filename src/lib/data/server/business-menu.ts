import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapBusinessMenuCategoryRow,
  mapBusinessMenuItemRow,
  type BusinessMenuCategoryDatabaseRow,
  type BusinessMenuItemDatabaseRow,
} from "@/lib/menu/business-menu-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

const BUSINESS_MENU_CATEGORY_SELECT =
  "id, business_id, name, description, sort_order, is_visible, is_active, archived_at, created_at, updated_at" as const;
const BUSINESS_MENU_ITEM_SELECT =
  "id, business_id, category_id, name, description, price, status, is_visible, is_featured, image_url, sort_order, archived_at, created_at, updated_at" as const;

export async function getBusinessMenuForBusiness(
  businessId: string,
) {
  assertServerOnly("getBusinessMenuForBusiness");

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error(
      "No se pudo crear el cliente autenticado.",
    );
  }

  const [
    categoriesResult,
    itemsResult,
  ] = await Promise.all([
    supabase
      .from("menu_categories")
      .select(BUSINESS_MENU_CATEGORY_SELECT)
      .eq("business_id", businessId)
      .is("archived_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("menu_items")
      .select(BUSINESS_MENU_ITEM_SELECT)
      .eq("business_id", businessId)
      .is("archived_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (
    categoriesResult.error
    || itemsResult.error
  ) {
    throw new Error(
      "No se pudo leer el menú del negocio.",
    );
  }

  return {
    categories: (
      ((categoriesResult.data ?? []) as unknown) as BusinessMenuCategoryDatabaseRow[]
    ).map(mapBusinessMenuCategoryRow),
    items: (
      ((itemsResult.data ?? []) as unknown) as BusinessMenuItemDatabaseRow[]
    ).map(mapBusinessMenuItemRow),
  };
}
