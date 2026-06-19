import type { MenuCategory, MenuItem } from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import {
  dispatchLocalStoreEvent,
  isBrowser,
  LOCAL_STORE_EVENTS,
} from "@/lib/data/localStore";
import {
  createMenuCategory as createLocalMenuCategory,
  createMenuItem as createLocalMenuItem,
  deleteMenuCategory as deleteLocalMenuCategory,
  deleteMenuForBusiness as deleteLocalMenuForBusiness,
  deleteMenuItem as deleteLocalMenuItem,
  duplicateMenuForBusiness as duplicateLocalMenuForBusiness,
  duplicateMenuItem as duplicateLocalMenuItem,
  getMenuCategoriesByBusinessId as getLocalMenuCategoriesByBusinessId,
  getMenuItemsByBusinessId as getLocalMenuItemsByBusinessId,
  getMenuItemsByCategoryId as getLocalMenuItemsByCategoryId,
  getMenuSummary as getLocalMenuSummary,
  moveMenuCategory as moveLocalMenuCategory,
  moveMenuItem as moveLocalMenuItem,
  resetMenuForBusiness as resetLocalMenuForBusiness,
  subscribeMenu as subscribeLocalMenu,
  toggleMenuCategoryStatus as toggleLocalMenuCategoryStatus,
  toggleMenuItemStatus as toggleLocalMenuItemStatus,
  updateMenuCategory as updateLocalMenuCategory,
  updateMenuItem as updateLocalMenuItem,
} from "@/lib/menu";
import { getInitialMenuCategoriesForBusiness, getInitialMenuItemsForBusiness } from "@/mocks/menu";
import {
  createSupabaseMenuCategory,
  createSupabaseMenuItem,
  deleteSupabaseMenuCategory,
  deleteSupabaseMenuForBusiness,
  deleteSupabaseMenuItem,
  duplicateSupabaseMenuForBusiness,
  duplicateSupabaseMenuItem,
  getSupabaseMenuCategoriesByBusiness,
  getSupabaseMenuItemsByBusiness,
  getSupabaseMenuItemsByCategory,
  getSupabaseMenuSnapshotByBusiness,
  reorderSupabaseMenuCategories,
  reorderSupabaseMenuItems,
  resetSupabaseMenuForBusiness,
  setSupabaseMenuCategoryActive,
  setSupabaseMenuItemActive,
  setSupabaseMenuItemFeatured,
  updateSupabaseMenuCategory,
  updateSupabaseMenuItem,
} from "@/lib/data/supabase/menu";

type MenuCacheEntry = {
  loaded: boolean;
  loading: boolean;
  categories: MenuCategory[];
  items: MenuItem[];
  error: string | null;
  promise: Promise<void> | null;
};

const CHANGE_EVENT = LOCAL_STORE_EVENTS.menu;
const supabaseCache = new Map<string, MenuCacheEntry>();

function cloneCategory(category: MenuCategory) {
  return { ...category };
}

function cloneItem(item: MenuItem) {
  return {
    ...item,
    tags: [...(item.tags ?? [])],
  };
}

function cloneCategories(categories: MenuCategory[]) {
  return categories.map(cloneCategory);
}

function cloneItems(items: MenuItem[]) {
  return items.map(cloneItem);
}

function ensureCacheEntry(businessId: string) {
  const current = supabaseCache.get(businessId);

  if (current) {
    return current;
  }

  const next: MenuCacheEntry = {
    loaded: false,
    loading: false,
    categories: [],
    items: [],
    error: null,
    promise: null,
  };

  supabaseCache.set(businessId, next);
  return next;
}

function emitMenuChange() {
  if (!isBrowser()) {
    return;
  }

  dispatchLocalStoreEvent(CHANGE_EVENT);
}

async function refreshSupabaseCache(businessId: string) {
  const entry = ensureCacheEntry(businessId);

  if (entry.loading && entry.promise) {
    return entry.promise;
  }

  entry.loading = true;
  entry.promise = (async () => {
    try {
      const snapshot = await getSupabaseMenuSnapshotByBusiness(businessId);
      entry.categories = cloneCategories(snapshot.categories);
      entry.items = cloneItems(snapshot.items);
      entry.error = null;
      entry.loaded = true;
    } catch (error) {
      entry.categories = [];
      entry.items = [];
      entry.error = error instanceof Error ? error.message : "No se pudo cargar el menu desde Supabase.";
      entry.loaded = true;
    } finally {
      entry.loading = false;
      entry.promise = null;
      emitMenuChange();
    }
  })();

  return entry.promise;
}

function ensureSupabaseMenuLoaded(businessId: string) {
  const entry = ensureCacheEntry(businessId);

  if (!entry.loaded && !entry.loading) {
    void refreshSupabaseCache(businessId);
  }

  return entry;
}

function getSupabaseCategoriesSync(businessId: string) {
  return cloneCategories(ensureSupabaseMenuLoaded(businessId).categories);
}

function getSupabaseItemsSync(businessId: string) {
  return cloneItems(ensureSupabaseMenuLoaded(businessId).items);
}

function getSupabaseSummarySync(businessId: string) {
  const categories = getSupabaseCategoriesSync(businessId);
  const items = getSupabaseItemsSync(businessId);
  const activeCategories = categories.filter((category) => category.isActive).length;
  const activeItems = items.filter((item) => item.isActive).length;
  const featuredItems = items.filter((item) => item.isActive && item.isFeatured).length;
  const itemsWithoutPrice = items.filter((item) => item.isActive && item.price == null).length;

  return {
    totalCategories: categories.length,
    activeCategories,
    totalItems: items.length,
    activeItems,
    featuredItems,
    itemsWithoutPrice,
  };
}

function findCachedCategory(categoryId: string) {
  for (const entry of supabaseCache.values()) {
    const category = entry.categories.find((current) => current.id === categoryId);
    if (category) {
      return { entry, category };
    }
  }

  return null;
}

function findCachedItem(itemId: string) {
  for (const entry of supabaseCache.values()) {
    const item = entry.items.find((current) => current.id === itemId);
    if (item) {
      return { entry, item };
    }
  }

  return null;
}

async function syncSupabaseBusinessMenuFromSnapshot(businessId: string) {
  const snapshot = await getSupabaseMenuSnapshotByBusiness(businessId);
  const entry = ensureCacheEntry(businessId);
  entry.categories = cloneCategories(snapshot.categories);
  entry.items = cloneItems(snapshot.items);
  entry.error = null;
  entry.loaded = true;
  emitMenuChange();
}

function seedBusinessIdBySlug(slug: string) {
  if (slug === "barbados") {
    return "biz_barbados";
  }

  if (slug === "cafe-demo") {
    return "biz_cafe_demo";
  }

  return "biz_demuru";
}

async function resolveBusinessSeedIdForSupabase(businessId: string) {
  const businesses = await import("@/lib/data/businesses");
  const business = await businesses.getBusinessById(businessId);
  return seedBusinessIdBySlug(business?.slug ?? "");
}

export function getMenuCategoriesByBusinessId(businessId: string) {
  if (getDataSource() === "supabase") {
    void refreshSupabaseCache(businessId);
    return getSupabaseCategoriesSync(businessId);
  }

  return getLocalMenuCategoriesByBusinessId(businessId);
}

export function getMenuItemsByBusinessId(businessId: string) {
  if (getDataSource() === "supabase") {
    void refreshSupabaseCache(businessId);
    return getSupabaseItemsSync(businessId);
  }

  return getLocalMenuItemsByBusinessId(businessId);
}

export function getMenuItemsByCategoryId(businessId: string, categoryId: string) {
  if (getDataSource() === "supabase") {
    return getMenuItemsByBusinessId(businessId).filter((item) => item.categoryId === categoryId);
  }

  return getLocalMenuItemsByCategoryId(businessId, categoryId);
}

export function getMenuSummary(businessId: string) {
  if (getDataSource() === "supabase") {
    void refreshSupabaseCache(businessId);
    return getSupabaseSummarySync(businessId);
  }

  return getLocalMenuSummary(businessId);
}

export function subscribeMenu(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  if (getDataSource() === "supabase") {
    const onChange = () => listener();
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }

  return subscribeLocalMenu(listener);
}

export function createMenuCategory(
  businessId: string,
  data: Pick<MenuCategory, "name" | "description" | "isActive">,
) {
  if (getDataSource() === "supabase") {
    return createSupabaseMenuCategory(businessId, {
      name: data.name,
      description: data.description ?? "",
      isActive: data.isActive,
      sortOrder: Number.NaN,
    }).then(async (created) => {
      await syncSupabaseBusinessMenuFromSnapshot(created.businessId);
      return created;
    });
  }

  return createLocalMenuCategory(businessId, data);
}

export function updateMenuCategory(
  categoryId: string,
  data: Partial<Pick<MenuCategory, "name" | "description" | "isActive" | "sortOrder">>,
) {
  if (getDataSource() === "supabase") {
    return updateSupabaseMenuCategory(categoryId, {
      name: data.name ?? "",
      description: data.description ?? "",
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    }).then(async (updated) => {
      const cached = findCachedCategory(categoryId);
      if (cached) {
        await syncSupabaseBusinessMenuFromSnapshot(cached.category.businessId);
      }
      return updated;
    });
  }

  return updateLocalMenuCategory(categoryId, data);
}

export function toggleMenuCategoryStatus(categoryId: string) {
  if (getDataSource() === "supabase") {
    const cached = findCachedCategory(categoryId);
    const nextActive = cached ? !cached.category.isActive : true;

    return setSupabaseMenuCategoryActive(categoryId, nextActive).then(async (updated) => {
      if (cached) {
        await syncSupabaseBusinessMenuFromSnapshot(cached.category.businessId);
      }
      return updated;
    });
  }

  return toggleLocalMenuCategoryStatus(categoryId);
}

export function deleteMenuCategory(categoryId: string) {
  if (getDataSource() === "supabase") {
    const cached = findCachedCategory(categoryId);

    return deleteSupabaseMenuCategory(categoryId).then(async (result) => {
      if (cached) {
        await syncSupabaseBusinessMenuFromSnapshot(cached.category.businessId);
      }
      return Boolean(result);
    });
  }

  return deleteLocalMenuCategory(categoryId);
}

export function moveMenuCategory(categoryId: string, direction: -1 | 1) {
  if (getDataSource() === "supabase") {
    const cached = findCachedCategory(categoryId);
    if (!cached) {
      return Promise.resolve(null);
    }

    const ordered = [...cached.entry.categories].sort(
      (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    );
    const index = ordered.findIndex((category) => category.id === categoryId);
    const targetIndex = index + direction;

    if (index === -1 || targetIndex < 0 || targetIndex >= ordered.length) {
      return Promise.resolve(null);
    }

    const current = ordered[index];
    const target = ordered[targetIndex];

    ordered[index] = { ...current, sortOrder: target.sortOrder };
    ordered[targetIndex] = { ...target, sortOrder: current.sortOrder };

    return reorderSupabaseMenuCategories(cached.category.businessId, ordered).then(async (result) => {
      await syncSupabaseBusinessMenuFromSnapshot(cached.category.businessId);
      return result.find((category) => category.id === categoryId) ?? null;
    });
  }

  return moveLocalMenuCategory(categoryId, direction);
}

export function createMenuItem(
  businessId: string,
  data: Pick<
    MenuItem,
    | "categoryId"
    | "name"
    | "description"
    | "price"
    | "imageDataUrl"
    | "imageUrl"
    | "imagePlaceholder"
    | "isActive"
    | "isFeatured"
    | "tags"
  >,
) {
  if (getDataSource() === "supabase") {
    return createSupabaseMenuItem(businessId, data.categoryId, {
      name: data.name,
      description: data.description,
      price: data.price ?? null,
      imageDataUrl: data.imageDataUrl ?? "",
      imageUrl: data.imageUrl ?? "",
      imagePlaceholder: data.imagePlaceholder ?? "",
      isActive: data.isActive,
      isFeatured: data.isFeatured ?? false,
      sortOrder: Number.NaN,
      tags: data.tags ?? [],
    }).then(async (created) => {
      await syncSupabaseBusinessMenuFromSnapshot(businessId);
      return created;
    });
  }

  return createLocalMenuItem(businessId, data);
}

export function updateMenuItem(
  itemId: string,
  data: Partial<
    Pick<
      MenuItem,
      | "categoryId"
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
    >
  >,
) {
  if (getDataSource() === "supabase") {
    const cached = findCachedItem(itemId);
    return updateSupabaseMenuItem(itemId, {
      name: data.name ?? "",
      description: data.description ?? "",
      price: data.price ?? null,
      imageDataUrl: data.imageDataUrl ?? "",
      imageUrl: data.imageUrl ?? "",
      imagePlaceholder: data.imagePlaceholder ?? "",
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      sortOrder: data.sortOrder ?? 0,
      tags: data.tags ?? [],
    }).then(async (updated) => {
      if (cached) {
        await syncSupabaseBusinessMenuFromSnapshot(cached.item.businessId);
      }
      return updated;
    });
  }

  return updateLocalMenuItem(itemId, data);
}

export function toggleMenuItemStatus(itemId: string) {
  if (getDataSource() === "supabase") {
    const cached = findCachedItem(itemId);
    const nextActive = cached ? !cached.item.isActive : true;
    return setSupabaseMenuItemActive(itemId, nextActive).then(async (updated) => {
      if (cached) {
        await syncSupabaseBusinessMenuFromSnapshot(cached.item.businessId);
      }
      return updated;
    });
  }

  return toggleLocalMenuItemStatus(itemId);
}

export function deleteMenuItem(itemId: string) {
  if (getDataSource() === "supabase") {
    const cached = findCachedItem(itemId);
    return deleteSupabaseMenuItem(itemId).then(async (result) => {
      if (cached) {
        await syncSupabaseBusinessMenuFromSnapshot(cached.item.businessId);
      }
      return Boolean(result);
    });
  }

  return deleteLocalMenuItem(itemId);
}

export function duplicateMenuItem(itemId: string) {
  if (getDataSource() === "supabase") {
    const cached = findCachedItem(itemId);
    return duplicateSupabaseMenuItem(itemId).then(async (created) => {
      if (cached) {
        await syncSupabaseBusinessMenuFromSnapshot(cached.item.businessId);
      }
      return created;
    });
  }

  return duplicateLocalMenuItem(itemId);
}

export function moveMenuItem(itemId: string, direction: -1 | 1) {
  if (getDataSource() === "supabase") {
    const cached = findCachedItem(itemId);
    if (!cached) {
      return Promise.resolve(null);
    }

    const ordered = [...cached.entry.items]
      .filter((item) => item.categoryId === cached.item.categoryId)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
    const index = ordered.findIndex((item) => item.id === itemId);
    const targetIndex = index + direction;

    if (index === -1 || targetIndex < 0 || targetIndex >= ordered.length) {
      return Promise.resolve(null);
    }

    const current = ordered[index];
    const target = ordered[targetIndex];

    ordered[index] = { ...current, sortOrder: target.sortOrder };
    ordered[targetIndex] = { ...target, sortOrder: current.sortOrder };

    return reorderSupabaseMenuItems(cached.item.categoryId, ordered).then(async (result) => {
      await syncSupabaseBusinessMenuFromSnapshot(cached.item.businessId);
      return result.find((item) => item.id === itemId) ?? null;
    });
  }

  return moveLocalMenuItem(itemId, direction);
}

export function resetMenuForBusiness(businessId: string) {
  if (getDataSource() === "supabase") {
    return resolveBusinessSeedIdForSupabase(businessId).then(async (seedBusinessId) => {
      await deleteSupabaseMenuForBusiness(businessId);
      const categories = getInitialMenuCategoriesForBusiness(seedBusinessId);
      const items = getInitialMenuItemsForBusiness(seedBusinessId);
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

      await syncSupabaseBusinessMenuFromSnapshot(businessId);
      return {
        categories: getSupabaseCategoriesSync(businessId),
        items: getSupabaseItemsSync(businessId),
      };
    });
  }

  return resetLocalMenuForBusiness(businessId);
}

export function deleteMenuForBusiness(businessId: string) {
  if (getDataSource() === "supabase") {
    return deleteSupabaseMenuForBusiness(businessId).then(() => {
      const entry = supabaseCache.get(businessId);
      if (entry) {
        entry.loaded = true;
        entry.loading = false;
        entry.categories = [];
        entry.items = [];
        entry.error = null;
      }
      emitMenuChange();
    });
  }

  return deleteLocalMenuForBusiness(businessId);
}

export function duplicateMenuForBusiness(sourceBusinessId: string, targetBusinessId: string) {
  if (getDataSource() === "supabase") {
    return duplicateSupabaseMenuForBusiness(sourceBusinessId, targetBusinessId).then(async () => {
      await syncSupabaseBusinessMenuFromSnapshot(targetBusinessId);
      return {
        categories: getSupabaseCategoriesSync(targetBusinessId),
        items: getSupabaseItemsSync(targetBusinessId),
      };
    });
  }

  return duplicateLocalMenuForBusiness(sourceBusinessId, targetBusinessId);
}
