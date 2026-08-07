import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapBusinessMenuCategoryRow,
  mapBusinessMenuItemRow,
  type BusinessMenuCategoryDatabaseRow,
  type BusinessMenuCategoryProductDatabaseRow,
  type BusinessMenuItemDatabaseRow,
} from "@/lib/menu/business-menu-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

const BUSINESS_MENU_CATEGORY_SELECT =
  "id, business_id, name, description, sort_order, is_visible, is_active, is_promotion, fixed_price, discount_percent, archived_at, created_at, updated_at" as const;
const BUSINESS_MENU_CATEGORY_PRODUCT_SELECT =
  "business_id, category_id, menu_item_id, quantity" as const;
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
    categoryProductsResult,
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
    supabase
      .from("menu_category_products")
      .select(BUSINESS_MENU_CATEGORY_PRODUCT_SELECT)
      .eq("business_id", businessId)
      .order("category_id", { ascending: true })
      .order("menu_item_id", { ascending: true }),
  ]);

  if (
    categoriesResult.error
    || itemsResult.error
    || categoryProductsResult.error
  ) {
    throw new Error(
      "No se pudo leer el menú del negocio.",
    );
  }

  const categoryProducts = (
    (categoryProductsResult.data ?? []) as unknown
  ) as BusinessMenuCategoryProductDatabaseRow[];
  const productsByCategory = new Map<
    string,
    BusinessMenuCategoryProductDatabaseRow[]
  >();

  for (const product of categoryProducts) {
    const categoryId = product.category_id ?? "";
    if (!categoryId) continue;
    const current = productsByCategory.get(categoryId) ?? [];
    current.push(product);
    productsByCategory.set(categoryId, current);
  }

  return {
    categories: (
      ((categoriesResult.data ?? []) as unknown) as BusinessMenuCategoryDatabaseRow[]
    ).map((category) =>
      mapBusinessMenuCategoryRow({
        ...category,
        products: productsByCategory.get(category.id) ?? [],
      }),
    ),
    items: (
      ((itemsResult.data ?? []) as unknown) as BusinessMenuItemDatabaseRow[]
    ).map(mapBusinessMenuItemRow),
  };
}
