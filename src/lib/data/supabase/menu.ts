import type { MenuCategory, MenuItem } from "@/data/types";
import { POSTGRES_UUID_REGEX } from "@/lib/data/business-resolution";
import { getSupabaseReadClient } from "@/lib/supabase/read-client";

export type SupabaseMenuCategoryRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type SupabaseMenuItemRow = {
  id: string;
  business_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  placeholder: string | null;
  tags: unknown;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type SupabaseMenuSnapshot = {
  categories: MenuCategory[];
  items: MenuItem[];
};

type SupabaseMenuError = {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

type MenuCategoryInput = Pick<MenuCategory, "name" | "description" | "isActive" | "sortOrder">;
type MenuItemInput = Pick<
  MenuItem,
  | "name"
  | "description"
  | "price"
  | "imageDataUrl"
  | "imageUrl"
  | "imagePlaceholder"
  | "isActive"
  | "isFeatured"
  | "sortOrder"
  | "tags"
>;

const CATEGORY_SELECT = "id, business_id, name, description, is_active, sort_order, created_at, updated_at";
const ITEM_SELECT =
  "id, business_id, category_id, name, description, price, image_url, placeholder, tags, is_active, is_featured, sort_order, created_at, updated_at";

function nowIso() {
  return new Date().toISOString();
}

function getSupabaseClientOrThrow() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  return supabase;
}

function assertUuidBusinessId(businessId: string) {
  const value = businessId.trim();

  if (!POSTGRES_UUID_REGEX.test(value)) {
    throw new Error(`businessId inválido para Supabase: se esperaba UUID y llegó ${businessId}`);
  }

  return value;
}

function normalizeText(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function formatSupabaseError(table: string, error: SupabaseMenuError | Error | unknown) {
  const data =
    error && typeof error === "object"
      ? (error as SupabaseMenuError)
      : null;

  const message =
    (error instanceof Error ? error.message : data?.message)?.trim() ||
    "No se pudo completar la operacion.";
  const code = data?.code?.trim();
  const details = data?.details?.trim();
  const hint = data?.hint?.trim();

  const parts = [`Fallo ${table}: ${message}`];

  if (code) {
    parts.push(`Code: ${code}`);
  }

  if (details) {
    parts.push(`Details: ${details}`);
  }

  if (hint) {
    parts.push(`Hint: ${hint}`);
  }

  return new Error(parts.join(". "));
}

function mapRowToCategory(row: SupabaseMenuCategoryRow): MenuCategory {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description ?? null,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
  };
}

function mapRowToItem(row: SupabaseMenuItemRow): MenuItem {
  const imageUrl = row.image_url?.trim() ?? "";

  return {
    id: row.id,
    businessId: row.business_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description ?? "",
    price: typeof row.price === "number" ? row.price : null,
    imageDataUrl: imageUrl.startsWith("data:") ? imageUrl : null,
    imageUrl: imageUrl && !imageUrl.startsWith("data:") ? imageUrl : null,
    imagePlaceholder: row.placeholder ?? row.name.slice(0, 2).toUpperCase(),
    isActive: row.is_active,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    tags: normalizeTags(row.tags),
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
  };
}

export function mapSupabaseMenuCategoryToMenuCategory(row: SupabaseMenuCategoryRow) {
  return mapRowToCategory(row);
}

export function mapMenuCategoryInputToSupabaseRow(
  businessId: string,
  data: MenuCategoryInput,
  options?: { id?: string; createdAt?: string | null; updatedAt?: string | null },
) {
  return {
    id: options?.id,
    business_id: businessId,
    name: data.name.trim(),
    description: normalizeText(data.description),
    is_active: typeof data.isActive === "boolean" ? data.isActive : true,
    sort_order: Number.isFinite(data.sortOrder) ? Number(data.sortOrder) : 0,
    created_at: options?.createdAt ?? nowIso(),
    updated_at: options?.updatedAt ?? nowIso(),
  };
}

export function mapSupabaseMenuItemToMenuItem(row: SupabaseMenuItemRow) {
  return mapRowToItem(row);
}

export function mapMenuItemInputToSupabaseRow(
  businessId: string,
  categoryId: string,
  data: MenuItemInput,
  options?: { id?: string; createdAt?: string | null; updatedAt?: string | null; sortOrder?: number },
) {
  const imageUrl = normalizeText(data.imageDataUrl) || normalizeText(data.imageUrl);

  return {
    id: options?.id,
    business_id: businessId,
    category_id: categoryId,
    name: data.name.trim(),
    description: normalizeText(data.description),
    price: typeof data.price === "number" && Number.isFinite(data.price) && data.price >= 0
      ? data.price
      : null,
    image_url: imageUrl,
    placeholder: normalizeText(data.imagePlaceholder) || normalizeText(data.name)?.slice(0, 2)?.toUpperCase() || "MN",
    tags: Array.isArray(data.tags) ? data.tags.filter(Boolean) : [],
    is_active: typeof data.isActive === "boolean" ? data.isActive : true,
    is_featured: typeof data.isFeatured === "boolean" ? data.isFeatured : false,
    sort_order: Number.isFinite(options?.sortOrder) ? Number(options?.sortOrder) : Number.isFinite(data.sortOrder) ? Number(data.sortOrder) : 0,
    created_at: options?.createdAt ?? nowIso(),
    updated_at: options?.updatedAt ?? nowIso(),
  };
}

async function readCategoriesForBusiness(businessId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("menu_categories")
    .select(CATEGORY_SELECT)
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw formatSupabaseError("menu_categories", error);
  }

  return (data ?? []) as SupabaseMenuCategoryRow[];
}

async function readItemsForBusiness(businessId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("menu_items")
    .select(ITEM_SELECT)
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw formatSupabaseError("menu_items", error);
  }

  return (data ?? []) as SupabaseMenuItemRow[];
}

async function readCategoryById(categoryId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("menu_categories")
    .select(CATEGORY_SELECT)
    .eq("id", categoryId)
    .maybeSingle();

  if (error) {
    throw formatSupabaseError("menu_categories", error);
  }

  return (data as SupabaseMenuCategoryRow | null) ?? null;
}

async function readItemById(itemId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("menu_items")
    .select(ITEM_SELECT)
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    throw formatSupabaseError("menu_items", error);
  }

  return (data as SupabaseMenuItemRow | null) ?? null;
}

function nextSortOrder(values: { sort_order: number }[]) {
  return values.reduce((max, value) => Math.max(max, value.sort_order), -1) + 1;
}

export async function getSupabaseMenuSnapshotByBusiness(businessId: string): Promise<SupabaseMenuSnapshot> {
  const [categories, items] = await Promise.all([
    readCategoriesForBusiness(businessId),
    readItemsForBusiness(businessId),
  ]);

  const categoryOrder = new Map(categories.map((category, index) => [category.id, index] as const));

  return {
    categories: categories.map(mapRowToCategory),
    items: items
      .map(mapRowToItem)
      .sort((left, right) => {
        const leftCategory = categoryOrder.get(left.categoryId) ?? 9999;
        const rightCategory = categoryOrder.get(right.categoryId) ?? 9999;

        if (leftCategory !== rightCategory) {
          return leftCategory - rightCategory;
        }

        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }

        return left.name.localeCompare(right.name);
      }),
  };
}

export async function getSupabaseMenuCategoriesByBusiness(businessId: string) {
  const snapshot = await getSupabaseMenuSnapshotByBusiness(businessId);
  return snapshot.categories;
}

export async function getSupabaseMenuItemsByBusiness(businessId: string) {
  const snapshot = await getSupabaseMenuSnapshotByBusiness(businessId);
  return snapshot.items;
}

export async function getSupabaseMenuItemsByCategory(categoryId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("menu_items")
    .select(ITEM_SELECT)
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw formatSupabaseError("menu_items", error);
  }

  return (data ?? []).map((row) => mapRowToItem(row as SupabaseMenuItemRow));
}

export async function createSupabaseMenuCategory(businessId: string, data: MenuCategoryInput) {
  const safeBusinessId = assertUuidBusinessId(businessId);
  const supabase = getSupabaseClientOrThrow();
  const categories = await readCategoriesForBusiness(safeBusinessId);
  const payload = mapMenuCategoryInputToSupabaseRow(safeBusinessId, {
    name: data.name,
    description: data.description,
    isActive: data.isActive,
    sortOrder: Number.isFinite(data.sortOrder) ? data.sortOrder : nextSortOrder(categories),
  });

  const { data: inserted, error } = await supabase
    .schema("public")
    .from("menu_categories")
    .insert(payload)
    .select(CATEGORY_SELECT)
    .single();

  if (error) {
    throw formatSupabaseError("menu_categories", error);
  }

  return mapRowToCategory(inserted as SupabaseMenuCategoryRow);
}

export async function updateSupabaseMenuCategory(categoryId: string, data: Partial<MenuCategoryInput>) {
  const current = await readCategoryById(categoryId);

  if (!current) {
    throw new Error("No se encontrÃ³ la categorÃ­a para actualizar.");
  }

  const supabase = getSupabaseClientOrThrow();
  const payload = {
    name: data.name?.trim() ?? current.name,
    description:
      data.description === undefined ? current.description : normalizeText(data.description),
    is_active: typeof data.isActive === "boolean" ? data.isActive : current.is_active,
    sort_order:
      typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder)
        ? data.sortOrder
        : current.sort_order,
    updated_at: nowIso(),
  };

  const { data: updated, error } = await supabase
    .schema("public")
    .from("menu_categories")
    .update(payload)
    .eq("id", categoryId)
    .select(CATEGORY_SELECT)
    .single();

  if (error) {
    throw formatSupabaseError("menu_categories", error);
  }

  return mapRowToCategory(updated as SupabaseMenuCategoryRow);
}

export async function deleteSupabaseMenuCategory(categoryId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("menu_categories")
    .delete()
    .eq("id", categoryId)
    .select(CATEGORY_SELECT)
    .maybeSingle();

  if (error) {
    throw formatSupabaseError("menu_categories", error);
  }

  return data ? mapRowToCategory(data as SupabaseMenuCategoryRow) : null;
}

export async function setSupabaseMenuCategoryActive(categoryId: string, isActive: boolean) {
  const current = await readCategoryById(categoryId);

  if (!current) {
    throw new Error("No se encontrÃ³ la categorÃ­a para actualizar.");
  }

  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("menu_categories")
    .update({ is_active: isActive, updated_at: nowIso() })
    .eq("id", categoryId)
    .select(CATEGORY_SELECT)
    .single();

  if (error) {
    throw formatSupabaseError("menu_categories", error);
  }

  return mapRowToCategory(data as SupabaseMenuCategoryRow);
}

export async function reorderSupabaseMenuCategories(businessId: string, categories: MenuCategory[]) {
  const supabase = getSupabaseClientOrThrow();
  const ordered = categories.filter((category) => category.businessId === businessId);
  const timestamp = nowIso();

  for (const [index, category] of ordered.entries()) {
    const { error } = await supabase
      .schema("public")
      .from("menu_categories")
      .update({ sort_order: index, updated_at: timestamp })
      .eq("id", category.id);

    if (error) {
      throw formatSupabaseError("menu_categories", error);
    }
  }

  return getSupabaseMenuCategoriesByBusiness(businessId);
}

export async function createSupabaseMenuItem(
  businessId: string,
  categoryId: string,
  data: MenuItemInput,
) {
  const safeBusinessId = assertUuidBusinessId(businessId);
  const supabase = getSupabaseClientOrThrow();
  const items = await readItemsForBusiness(safeBusinessId);
  const nextItemOrder = nextSortOrder(items.filter((item) => item.category_id === categoryId));
  const payload = mapMenuItemInputToSupabaseRow(safeBusinessId, categoryId, data, {
    sortOrder: Number.isFinite(data.sortOrder) ? data.sortOrder : nextItemOrder,
  });

  const { data: inserted, error } = await supabase
    .schema("public")
    .from("menu_items")
    .insert(payload)
    .select(ITEM_SELECT)
    .single();

  if (error) {
    throw formatSupabaseError("menu_items", error);
  }

  return mapRowToItem(inserted as SupabaseMenuItemRow);
}

export async function updateSupabaseMenuItem(itemId: string, data: Partial<MenuItemInput>) {
  const current = await readItemById(itemId);

  if (!current) {
    throw new Error("No se encontrÃ³ el item para actualizar.");
  }

  const supabase = getSupabaseClientOrThrow();
  const payload = {
    name: data.name?.trim() ?? current.name,
    description: data.description === undefined ? current.description : normalizeText(data.description),
    price:
      typeof data.price === "number" && Number.isFinite(data.price) && data.price >= 0
        ? data.price
        : data.price === null
          ? null
          : current.price,
    image_url:
      data.imageDataUrl === undefined && data.imageUrl === undefined
        ? current.image_url
        : normalizeText(data.imageDataUrl) || normalizeText(data.imageUrl),
    placeholder:
      data.imagePlaceholder === undefined
        ? current.placeholder
        : normalizeText(data.imagePlaceholder) || current.placeholder,
    tags: Array.isArray(data.tags) ? data.tags.filter(Boolean) : current.tags ?? [],
    is_active: typeof data.isActive === "boolean" ? data.isActive : current.is_active,
    is_featured: typeof data.isFeatured === "boolean" ? data.isFeatured : current.is_featured,
    sort_order:
      typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder)
        ? data.sortOrder
        : current.sort_order,
    updated_at: nowIso(),
  };

  const { data: updated, error } = await supabase
    .schema("public")
    .from("menu_items")
    .update(payload)
    .eq("id", itemId)
    .select(ITEM_SELECT)
    .single();

  if (error) {
    throw formatSupabaseError("menu_items", error);
  }

  return mapRowToItem(updated as SupabaseMenuItemRow);
}

export async function deleteSupabaseMenuItem(itemId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("menu_items")
    .delete()
    .eq("id", itemId)
    .select(ITEM_SELECT)
    .maybeSingle();

  if (error) {
    throw formatSupabaseError("menu_items", error);
  }

  return data ? mapRowToItem(data as SupabaseMenuItemRow) : null;
}

export async function setSupabaseMenuItemActive(itemId: string, isActive: boolean) {
  const current = await readItemById(itemId);

  if (!current) {
    throw new Error("No se encontrÃ³ el item para actualizar.");
  }

  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("menu_items")
    .update({ is_active: isActive, updated_at: nowIso() })
    .eq("id", itemId)
    .select(ITEM_SELECT)
    .single();

  if (error) {
    throw formatSupabaseError("menu_items", error);
  }

  return mapRowToItem(data as SupabaseMenuItemRow);
}

export async function setSupabaseMenuItemFeatured(itemId: string, isFeatured: boolean) {
  const current = await readItemById(itemId);

  if (!current) {
    throw new Error("No se encontrÃ³ el item para actualizar.");
  }

  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("menu_items")
    .update({ is_featured: isFeatured, updated_at: nowIso() })
    .eq("id", itemId)
    .select(ITEM_SELECT)
    .single();

  if (error) {
    throw formatSupabaseError("menu_items", error);
  }

  return mapRowToItem(data as SupabaseMenuItemRow);
}

export async function reorderSupabaseMenuItems(categoryId: string, items: MenuItem[]) {
  const supabase = getSupabaseClientOrThrow();
  const ordered = items.filter((item) => item.categoryId === categoryId);
  const timestamp = nowIso();

  for (const [index, item] of ordered.entries()) {
    const { error } = await supabase
      .schema("public")
      .from("menu_items")
      .update({ sort_order: index, updated_at: timestamp })
      .eq("id", item.id);

    if (error) {
      throw formatSupabaseError("menu_items", error);
    }
  }

  return getSupabaseMenuItemsByCategory(categoryId);
}

export async function duplicateSupabaseMenuItem(itemId: string) {
  const current = await readItemById(itemId);

  if (!current) {
    throw new Error("No se encontrÃ³ el item para duplicar.");
  }

  return createSupabaseMenuItem(current.business_id, current.category_id, {
    name: `${current.name} Copia`,
    description: current.description ?? "",
    price: current.price,
    imageDataUrl: current.image_url?.startsWith("data:") ? current.image_url : "",
    imageUrl: current.image_url?.startsWith("data:") ? "" : current.image_url ?? "",
    imagePlaceholder: current.placeholder ?? "",
    isActive: current.is_active,
    isFeatured: current.is_featured,
    sortOrder: current.sort_order + 1,
    tags: normalizeTags(current.tags),
  });
}

export async function deleteSupabaseMenuForBusiness(businessId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error: itemsError } = await supabase
    .schema("public")
    .from("menu_items")
    .delete()
    .eq("business_id", businessId);

  if (itemsError) {
    throw formatSupabaseError("menu_items", itemsError);
  }

  const { error: categoriesError } = await supabase
    .schema("public")
    .from("menu_categories")
    .delete()
    .eq("business_id", businessId);

  if (categoriesError) {
    throw formatSupabaseError("menu_categories", categoriesError);
  }
}

export async function resetSupabaseMenuForBusiness(businessId: string) {
  const supabase = getSupabaseClientOrThrow();
  await deleteSupabaseMenuForBusiness(businessId);

  const { getInitialMenuCategoriesForBusiness, getInitialMenuItemsForBusiness } = await import(
    "@/mocks/menu"
  );

  const businessIdBySlug = new Map<string, string>([
    ["demuru", "biz_demuru"],
    ["barbados", "biz_barbados"],
    ["cafe-demo", "biz_cafe_demo"],
  ]);

  const businessSnapshot = await supabase
    .schema("public")
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .maybeSingle();

  const slug = (businessSnapshot.data as { slug?: string | null } | null)?.slug ?? "";
  const mockBusinessId = businessIdBySlug.get(slug) ?? "biz_demuru";
  const categories = getInitialMenuCategoriesForBusiness(mockBusinessId);
  const items = getInitialMenuItemsForBusiness(mockBusinessId);
  const categoryMap = new Map<string, string>();

  for (const category of categories) {
    const created = await createSupabaseMenuCategory(businessId, {
      name: category.name,
      description: category.description ?? "",
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    });
    categoryMap.set(category.id, created.id);
  }

  for (const item of items) {
    await createSupabaseMenuItem(businessId, categoryMap.get(item.categoryId) ?? item.categoryId, {
      name: item.name,
      description: item.description,
      price: item.price ?? null,
      imageDataUrl: item.imageDataUrl ?? "",
      imageUrl: item.imageUrl ?? "",
      imagePlaceholder: item.imagePlaceholder ?? "",
      isActive: item.isActive,
      isFeatured: item.isFeatured ?? false,
      sortOrder: item.sortOrder,
      tags: item.tags ?? [],
    });
  }
}

export async function duplicateSupabaseMenuForBusiness(sourceBusinessId: string, targetBusinessId: string) {
  await deleteSupabaseMenuForBusiness(targetBusinessId);

  const snapshot = await getSupabaseMenuSnapshotByBusiness(sourceBusinessId);
  const categoryMap = new Map<string, string>();

  for (const category of snapshot.categories) {
    const created = await createSupabaseMenuCategory(targetBusinessId, {
      name: category.name,
      description: category.description ?? "",
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    });
    categoryMap.set(category.id, created.id);
  }

  for (const item of snapshot.items) {
    await createSupabaseMenuItem(
      targetBusinessId,
      categoryMap.get(item.categoryId) ?? item.categoryId,
      {
        name: item.name,
        description: item.description,
        price: item.price ?? null,
        imageDataUrl: item.imageDataUrl ?? "",
        imageUrl: item.imageUrl ?? "",
        imagePlaceholder: item.imagePlaceholder ?? "",
        isActive: item.isActive,
        isFeatured: item.isFeatured ?? false,
        sortOrder: item.sortOrder,
        tags: item.tags ?? [],
      },
    );
  }
}

