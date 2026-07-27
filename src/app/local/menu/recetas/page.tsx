"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  ChevronDown,
  ChevronRight,
  Plus,
  Image as ImageIcon,
  Save,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Badge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card } from "@/components/v2/v2-card";
import { V2Field, V2Input, V2Select } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import {
  v2MenuCategories,
  v2MenuItems,
  v2StockProducts,
} from "@/lib/v2/v2-mock-data";

const LOCAL_CONFIG_STORAGE_KEY = "tango-v2-local-config-v1";
const LOCAL_CONFIG_EVENT = "tango-v2-local-config-updated";
const MENU_ITEMS_STORAGE_KEY = "tango-v2-menu-items";
const MENU_CATEGORIES_STORAGE_KEY = "tango-v2-menu-categories";
const STOCK_PRODUCTS_STORAGE_KEY = "tango-v2-stock-products";
const MENU_ITEMS_EVENT = "tango-v2-menu-items-updated";
const MENU_CATEGORIES_EVENT = "tango-v2-menu-categories-updated";

type V2RecipeUnit =
  | "g"
  | "kg"
  | "ml"
  | "l"
  | "unidad"
  | "botella"
  | "lata"
  | "caja"
  | "paquete"
  | "bolsa";

type V2RecipeIngredient = {
  id: string;
  stockProductId: string;
  name: string;
  quantity: number;
  unit: V2RecipeUnit;
};

type V2RecipeConfig = {
  id: string;
  menuItemId: string;
  name: string;
  ingredients: V2RecipeIngredient[];
};

type V2RecipeMenuItem = {
  id: string;
  imageUrl?: string;
  name: string;
  categoryId: string;
  description?: string;
  price?: number;
  status?: "available" | "paused";
  visible?: boolean;
  featured?: boolean;
};

type V2RecipeMenuCategory = {
  id: string;
  name: string;
  description?: string;
  order: number;
  visible?: boolean;
  active?: boolean;
  isPromotion?: boolean;
};

type V2RecipeStockProduct = {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  currentStock?: number;
  totalStock?: number;
  remainingStock?: number;
  availableStock?: number;
  stock?: number;
  status?: string;
};

type V2NewRecipePlateForm = {
  name: string;
  description: string;
  imageUrl: string;
  categoryId: string;
  price: string;
  ingredients: V2RecipeIngredient[];
};

const RECIPE_UNIT_OPTIONS: V2RecipeUnit[] = [
  "g",
  "kg",
  "ml",
  "l",
  "unidad",
  "botella",
  "lata",
  "caja",
  "paquete",
  "bolsa",
];

function createEmptyNewRecipePlateForm(): V2NewRecipePlateForm {
  return {
    name: "",
    description: "",
    imageUrl: "",
    categoryId: "",
    price: "",
    ingredients: [],
  };
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function readLocalStorageList<T>(key: string, fallback: T[]) {
  if (typeof window === "undefined") return fallback;

  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) return fallback;

    const parsedValue = JSON.parse(rawValue);

    return Array.isArray(parsedValue) ? (parsedValue as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalStorageList<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(key, JSON.stringify(value));

  if (key === MENU_ITEMS_STORAGE_KEY) {
    window.dispatchEvent(new Event(MENU_ITEMS_EVENT));
  }

  if (key === MENU_CATEGORIES_STORAGE_KEY) {
    window.dispatchEvent(new Event(MENU_CATEGORIES_EVENT));
  }
}

function normalizeIngredient(value: unknown): V2RecipeIngredient | null {
  if (!value || typeof value !== "object") return null;

  const ingredient = value as Partial<V2RecipeIngredient>;
  const unit = RECIPE_UNIT_OPTIONS.includes(ingredient.unit as V2RecipeUnit)
    ? (ingredient.unit as V2RecipeUnit)
    : "g";

  return {
    id: ingredient.id || createId("ing"),
    stockProductId: ingredient.stockProductId || "",
    name: ingredient.name || "",
    quantity: Number(ingredient.quantity) || 0,
    unit,
  };
}

function normalizeRecipes(value: unknown): V2RecipeConfig[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((recipe) => {
      if (!recipe || typeof recipe !== "object") return null;

      const currentRecipe = recipe as Partial<V2RecipeConfig>;

      return {
        id: currentRecipe.id || createId("recipe"),
        menuItemId: currentRecipe.menuItemId || "",
        name: currentRecipe.name || "Receta sin nombre",
        ingredients: Array.isArray(currentRecipe.ingredients)
          ? currentRecipe.ingredients
              .map((ingredient) => normalizeIngredient(ingredient))
              .filter(Boolean) as V2RecipeIngredient[]
          : [],
      };
    })
    .filter((recipe): recipe is V2RecipeConfig => Boolean(recipe && recipe.menuItemId));
}

function readRecipesFromConfig() {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.localStorage.getItem(LOCAL_CONFIG_STORAGE_KEY);

    if (!rawValue) return [];

    const parsedConfig = JSON.parse(rawValue) as { recipes?: unknown };

    return normalizeRecipes(parsedConfig.recipes);
  } catch {
    return [];
  }
}

function writeRecipesToConfig(recipes: V2RecipeConfig[]) {
  if (typeof window === "undefined") return;

  let currentConfig: Record<string, unknown> = {};

  try {
    const rawValue = window.localStorage.getItem(LOCAL_CONFIG_STORAGE_KEY);
    currentConfig = rawValue ? (JSON.parse(rawValue) as Record<string, unknown>) : {};
  } catch {
    currentConfig = {};
  }

  window.localStorage.setItem(
    LOCAL_CONFIG_STORAGE_KEY,
    JSON.stringify({
      ...currentConfig,
      recipes,
    })
  );
  window.dispatchEvent(new Event(LOCAL_CONFIG_EVENT));
}

function syncRecipesWithMenu(
  menuItems: V2RecipeMenuItem[],
  storedRecipes: V2RecipeConfig[]
) {
  const recipeByMenuItemId = new Map(
    storedRecipes.map((recipe) => [recipe.menuItemId, recipe])
  );

  return menuItems.map((item) => {
    const storedRecipe = recipeByMenuItemId.get(item.id);

    return {
      id: storedRecipe?.id || `recipe-${item.id}`,
      menuItemId: item.id,
      name: item.name,
      ingredients: storedRecipe?.ingredients ?? [],
    };
  });
}

function getStockProductName(product: V2RecipeStockProduct) {
  return product.name;
}

function getStockProductRemaining(product: V2RecipeStockProduct) {
  const value =
    product.remainingStock ??
    product.availableStock ??
    product.currentStock ??
    product.totalStock ??
    product.stock ??
    0;

  return Number(value) || 0;
}

export default function MenuRecetasPage() {
  const [recipes, setRecipes] = useState<V2RecipeConfig[]>([]);
  const [activeRecipeId, setActiveRecipeId] = useState("");
  const [menuItems, setMenuItems] = useState<V2RecipeMenuItem[]>(v2MenuItems);
  const [menuCategories, setMenuCategories] =
    useState<V2RecipeMenuCategory[]>(v2MenuCategories);
  const [stockProducts, setStockProducts] =
    useState<V2RecipeStockProduct[]>(v2StockProducts);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [isNewPlatePopupOpen, setIsNewPlatePopupOpen] = useState(false);
  const [newPlateForm, setNewPlateForm] = useState<V2NewRecipePlateForm>(() =>
    createEmptyNewRecipePlateForm()
  );

  function loadMenuStockAndRecipes(options?: { preserveActive?: boolean }) {
    const nextMenuItems = readLocalStorageList<V2RecipeMenuItem>(
      MENU_ITEMS_STORAGE_KEY,
      v2MenuItems
    );
    const nextMenuCategories = readLocalStorageList<V2RecipeMenuCategory>(
      MENU_CATEGORIES_STORAGE_KEY,
      v2MenuCategories
    );
    const nextStockProducts = readLocalStorageList<V2RecipeStockProduct>(
      STOCK_PRODUCTS_STORAGE_KEY,
      v2StockProducts
    );
    const nextRecipes = syncRecipesWithMenu(nextMenuItems, readRecipesFromConfig());

    setMenuItems(nextMenuItems);
    setMenuCategories(nextMenuCategories);
    setStockProducts(nextStockProducts);
    setRecipes(nextRecipes);

    setExpandedCategoryIds((current) => {
      if (current.length > 0) return current;

      return nextMenuCategories
        .filter((category) => !category.isPromotion)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .map((category) => category.id)
        .concat("without-category");
    });

    setActiveRecipeId((currentId) => {
      if (
        options?.preserveActive &&
        currentId &&
        nextRecipes.some((recipe) => recipe.id === currentId)
      ) {
        return currentId;
      }

      return nextRecipes[0]?.id ?? "";
    });
  }

  useEffect(() => {
    loadMenuStockAndRecipes();

    function syncFromExternalChanges() {
      loadMenuStockAndRecipes({ preserveActive: true });
    }

    window.addEventListener("focus", syncFromExternalChanges);
    window.addEventListener("storage", syncFromExternalChanges);
    window.addEventListener(MENU_ITEMS_EVENT, syncFromExternalChanges);
    window.addEventListener(MENU_CATEGORIES_EVENT, syncFromExternalChanges);

    return () => {
      window.removeEventListener("focus", syncFromExternalChanges);
      window.removeEventListener("storage", syncFromExternalChanges);
      window.removeEventListener(MENU_ITEMS_EVENT, syncFromExternalChanges);
      window.removeEventListener(MENU_CATEGORIES_EVENT, syncFromExternalChanges);
    };
  }, []);

  useEffect(() => {
    if (saveStatus !== "saved") return;

    const timeout = window.setTimeout(() => setSaveStatus("idle"), 1600);

    return () => window.clearTimeout(timeout);
  }, [saveStatus]);

  const categoryById = useMemo(
    () => new Map(menuCategories.map((category) => [category.id, category])),
    [menuCategories]
  );

  const recipeByMenuItemId = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.menuItemId, recipe])),
    [recipes]
  );

  const stockProductsSorted = useMemo(
    () =>
      [...stockProducts].sort((first, second) =>
        getStockProductName(first).localeCompare(getStockProductName(second), "es")
      ),
    [stockProducts]
  );

  const menuCategoriesAlphabetical = useMemo(
    () =>
      menuCategories
        .filter((category) => !category.isPromotion)
        .sort((first, second) => first.name.localeCompare(second.name, "es")),
    [menuCategories]
  );

  const menuSections = useMemo(() => {
    const usableCategories = [...menuCategoriesAlphabetical];

    const itemsByCategory = new Map<string, V2RecipeMenuItem[]>();

    menuItems.forEach((item) => {
      const categoryId = item.categoryId || "without-category";
      const currentItems = itemsByCategory.get(categoryId) ?? [];

      itemsByCategory.set(categoryId, [...currentItems, item]);
    });

    const sections = usableCategories.map((category) => ({
      id: category.id,
      name: category.name,
      items: (itemsByCategory.get(category.id) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, "es")
      ),
    }));

    const withoutCategoryItems = (itemsByCategory.get("without-category") ?? []).sort(
      (a, b) => a.name.localeCompare(b.name, "es")
    );

    sections.push({
      id: "without-category",
      name: "Sin categoría",
      items: withoutCategoryItems,
    });

    return sections;
  }, [menuCategoriesAlphabetical, menuItems]);

  const activeRecipe =
    recipes.find((recipe) => recipe.id === activeRecipeId) ?? recipes[0] ?? null;
  const activeMenuItem = activeRecipe
    ? menuItems.find((item) => item.id === activeRecipe.menuItemId) ?? null
    : null;
  const activeCategory = activeMenuItem?.categoryId
    ? categoryById.get(activeMenuItem.categoryId)
    : null;

  const configuredRecipesCount = recipes.filter(
    (recipe) => recipe.ingredients.length > 0
  ).length;
  const pendingRecipesCount = Math.max(recipes.length - configuredRecipesCount, 0);

  function persistRecipes(nextRecipes = recipes) {
    writeRecipesToConfig(nextRecipes);
    setSaveStatus("saved");
  }

  function updateActiveRecipe(recipeId: string) {
    setActiveRecipeId(recipeId);
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  }

  function updateActiveRecipeName(name: string) {
    if (!activeRecipe) return;

    setRecipes((current) =>
      current.map((recipe) =>
        recipe.id === activeRecipe.id ? { ...recipe, name } : recipe
      )
    );
  }

  function addIngredient() {
    if (!activeRecipe) return;

    setRecipes((current) =>
      current.map((recipe) =>
        recipe.id === activeRecipe.id
          ? {
              ...recipe,
              ingredients: [
                ...recipe.ingredients,
                {
                  id: createId("ing"),
                  stockProductId: "",
                  name: "",
                  quantity: 0,
                  unit: "g",
                },
              ],
            }
          : recipe
      )
    );
  }

  function updateIngredient(
    ingredientId: string,
    patch: Partial<V2RecipeIngredient>
  ) {
    if (!activeRecipe) return;

    setRecipes((current) =>
      current.map((recipe) =>
        recipe.id === activeRecipe.id
          ? {
              ...recipe,
              ingredients: recipe.ingredients.map((ingredient) =>
                ingredient.id === ingredientId
                  ? {
                      ...ingredient,
                      ...patch,
                    }
                  : ingredient
              ),
            }
          : recipe
      )
    );
  }

  function selectStockProduct(ingredientId: string, stockProductId: string) {
    const stockProduct = stockProducts.find((product) => product.id === stockProductId);

    updateIngredient(ingredientId, {
      stockProductId,
      name: stockProduct ? getStockProductName(stockProduct) : "",
    });
  }

  function removeIngredient(ingredientId: string) {
    if (!activeRecipe) return;

    setRecipes((current) =>
      current.map((recipe) =>
        recipe.id === activeRecipe.id
          ? {
              ...recipe,
              ingredients: recipe.ingredients.filter(
                (ingredient) => ingredient.id !== ingredientId
              ),
            }
          : recipe
      )
    );
  }

  function clearActiveRecipe() {
    if (!activeRecipe) return;

    setRecipes((current) =>
      current.map((recipe) =>
        recipe.id === activeRecipe.id ? { ...recipe, ingredients: [] } : recipe
      )
    );
  }

  function openNewPlatePopup() {
    setNewPlateForm(createEmptyNewRecipePlateForm());
    setIsNewPlatePopupOpen(true);
  }

  function closeNewPlatePopup() {
    setIsNewPlatePopupOpen(false);
  }

  function updateNewPlateForm(patch: Partial<V2NewRecipePlateForm>) {
    setNewPlateForm((current) => ({
      ...current,
      ...patch,
    }));
  }

  function addNewPlateIngredient() {
    setNewPlateForm((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        {
          id: createId("ing"),
          stockProductId: "",
          name: "",
          quantity: 0,
          unit: "g",
        },
      ],
    }));
  }

  function updateNewPlateIngredient(
    ingredientId: string,
    patch: Partial<V2RecipeIngredient>
  ) {
    setNewPlateForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient) =>
        ingredient.id === ingredientId
          ? {
              ...ingredient,
              ...patch,
            }
          : ingredient
      ),
    }));
  }

  function selectNewPlateStockProduct(ingredientId: string, stockProductId: string) {
    const stockProduct = stockProducts.find((product) => product.id === stockProductId);

    updateNewPlateIngredient(ingredientId, {
      stockProductId,
      name: stockProduct ? getStockProductName(stockProduct) : "",
    });
  }

  function removeNewPlateIngredient(ingredientId: string) {
    setNewPlateForm((current) => ({
      ...current,
      ingredients: current.ingredients.filter(
        (ingredient) => ingredient.id !== ingredientId
      ),
    }));
  }

  function createMenuItemFromRecipes() {
    const cleanName = newPlateForm.name.trim() || "Nuevo plato sin nombre";
    const newItemId = createId("menu");
    const newItem: V2RecipeMenuItem = {
      id: newItemId,
      imageUrl: newPlateForm.imageUrl.trim(),
      name: cleanName,
      categoryId: newPlateForm.categoryId,
      description: newPlateForm.description.trim(),
      price: Number(newPlateForm.price) || 0,
      status: "available",
      visible: true,
      featured: false,
    };

    const newRecipe: V2RecipeConfig = {
      id: `recipe-${newItemId}`,
      menuItemId: newItemId,
      name: cleanName,
      ingredients: newPlateForm.ingredients,
    };

    const nextMenuItems = [...menuItems, newItem];
    const nextRecipes = syncRecipesWithMenu(nextMenuItems, [...recipes, newRecipe]);

    setMenuItems(nextMenuItems);
    setRecipes(nextRecipes);
    setActiveRecipeId(newRecipe.id);

    if (newPlateForm.categoryId) {
      setExpandedCategoryIds((current) =>
        current.includes(newPlateForm.categoryId) ? current : [...current, newPlateForm.categoryId]
      );
    } else {
      setExpandedCategoryIds((current) =>
        current.includes("without-category") ? current : [...current, "without-category"]
      );
    }

    writeLocalStorageList(MENU_ITEMS_STORAGE_KEY, nextMenuItems);
    persistRecipes(nextRecipes);
    closeNewPlatePopup();
  }

  return (
    <V2AppShell activeItem="menu">
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          eyebrow="Demuru"
          title="Recetas"
          description="Conectá cada plato real del menú con los insumos de stock que consume."
          actions={
            <>
              <Link
                href="/local/menu"
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={18} />
                Volver al menú
              </Link>

              <V2Button
                type="button"
                variant="primary"
                icon={<Plus size={17} />}
                onClick={openNewPlatePopup}
              >
                Nuevo plato
              </V2Button>

              <V2Button
                type="button"
                variant="secondary"
                icon={<Save size={17} />}
                onClick={() => persistRecipes()}
              >
                {saveStatus === "saved" ? "Guardado" : "Guardar"}
              </V2Button>
            </>
          }
        />

        <div className="mt-4 grid shrink-0 gap-3 md:grid-cols-4">
          <V2Card className="py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Platos del menú
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">{menuItems.length}</p>
            <p className="mt-1 text-xs text-slate-500">Leídos desde /local/menu</p>
          </V2Card>

          <V2Card className="py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Recetas cargadas
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {configuredRecipesCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Con ingredientes</p>
          </V2Card>

          <V2Card className="py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Pendientes
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {pendingRecipesCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Sin ingredientes</p>
          </V2Card>

          <V2Card className="py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Insumos
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {stockProducts.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Disponibles para recetas</p>
          </V2Card>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_1fr]">
          <V2Card className="min-h-0 overflow-hidden">
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Menú</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Platos agrupados por sección del menú.
                  </p>
                </div>
                <V2Badge tone="blue">{menuSections.length}</V2Badge>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-3">
                  {menuSections.map((section) => {
                    const expanded = expandedCategoryIds.includes(section.id);

                    return (
                      <div
                        key={section.id}
                        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => toggleCategory(section.id)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {expanded ? (
                              <ChevronDown size={16} className="text-slate-500" />
                            ) : (
                              <ChevronRight size={16} className="text-slate-500" />
                            )}
                            <span className="truncate text-sm font-bold text-slate-950">
                              {section.name}
                            </span>
                          </span>
                          <V2Badge tone={section.items.length > 0 ? "green" : "blue"}>
                            {section.items.length}
                          </V2Badge>
                        </button>

                        {expanded ? (
                          <div className="space-y-2 border-t border-slate-100 p-2">
                            {section.items.length > 0 ? (
                              section.items.map((item) => {
                                const recipe = recipeByMenuItemId.get(item.id);
                                const active = recipe?.id === activeRecipe?.id;
                                const configured = Boolean(recipe?.ingredients.length);

                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => recipe && updateActiveRecipe(recipe.id)}
                                    className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                                      active
                                        ? "border-emerald-300 bg-emerald-50 shadow-sm"
                                        : "border-slate-200 bg-slate-50 hover:border-emerald-200 hover:bg-white hover:shadow-sm"
                                    }`}
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate font-semibold text-slate-900">
                                        {item.name}
                                      </span>
                                      <span className="mt-0.5 block text-xs text-slate-500">
                                        {formatCurrency(item.price)}
                                      </span>
                                    </span>
                                    <span
                                      className={`mt-0.5 rounded-full px-2 py-1 text-[11px] font-bold ${
                                        configured
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-amber-100 text-amber-700"
                                      }`}
                                    >
                                      {configured ? "OK" : "Pendiente"}
                                    </span>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                                Sin platos en esta sección.
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </V2Card>

          {activeRecipe && activeMenuItem ? (
            <div className="grid min-h-0 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <V2Card className="min-h-0 overflow-hidden">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Producto final
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-950">
                        {activeMenuItem.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {activeCategory?.name ?? "Sin categoría"} ·{" "}
                        {formatCurrency(activeMenuItem.price)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={clearActiveRecipe}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                      title="Limpiar ingredientes"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="mt-6 space-y-4">
                    <V2Field label="Plato del menú">
                      <V2Input value={activeMenuItem.name} readOnly />
                    </V2Field>

                    <V2Field label="Nombre interno de la receta">
                      <V2Input
                        value={activeRecipe.name}
                        onChange={(event) => updateActiveRecipeName(event.target.value)}
                      />
                    </V2Field>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                          <BookOpenText size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-950">
                            Regla operativa
                          </p>
                          <p className="mt-1 text-sm leading-6 text-emerald-900">
                            Esta receta descuenta stock cuando el plato se vende en un envío
                            entregado o cuando una reserva se completa con consumo cargado.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Estado
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {activeRecipe.ingredients.length > 0
                          ? `${activeRecipe.ingredients.length} ingredientes cargados`
                          : "Todavía no tiene ingredientes"}
                      </p>
                    </div>
                  </div>
                </div>
              </V2Card>

              <V2Card className="min-h-0 overflow-hidden">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Ingredientes
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Elegí insumo real de Stock, cantidad y unidad consumida por unidad
                        vendida.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href="/local/stock"
                        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Plus size={16} />
                        Crear insumo
                      </Link>

                      <V2Button
                        type="button"
                        variant="primary"
                        icon={<Plus size={16} />}
                        onClick={addIngredient}
                      >
                        Ingrediente
                      </V2Button>
                    </div>
                  </div>

                  <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                    {activeRecipe.ingredients.length > 0 ? (
                      <div className="space-y-3">
                        {activeRecipe.ingredients.map((ingredient) => {
                          const stockProduct = stockProducts.find(
                            (product) => product.id === ingredient.stockProductId
                          );

                          return (
                            <div
                              key={ingredient.id}
                              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                            >
                              <div className="grid gap-3 lg:grid-cols-[1fr_120px_120px_44px]">
                                <V2Field label="Insumo de stock">
                                  <V2Select
                                    value={ingredient.stockProductId}
                                    onChange={(event) =>
                                      selectStockProduct(ingredient.id, event.target.value)
                                    }
                                  >
                                    <option value="">Seleccionar insumo</option>
                                    {stockProductsSorted.map((product) => (
                                      <option key={product.id} value={product.id}>
                                        {getStockProductName(product)}
                                      </option>
                                    ))}
                                  </V2Select>
                                </V2Field>

                                <V2Field label="Cantidad">
                                  <V2Input
                                    type="number"
                                    min={0}
                                    value={String(ingredient.quantity)}
                                    onChange={(event) =>
                                      updateIngredient(ingredient.id, {
                                        quantity: Number(event.target.value) || 0,
                                      })
                                    }
                                  />
                                </V2Field>

                                <V2Field label="Unidad">
                                  <V2Select
                                    value={ingredient.unit}
                                    onChange={(event) =>
                                      updateIngredient(ingredient.id, {
                                        unit: event.target.value as V2RecipeUnit,
                                      })
                                    }
                                  >
                                    {RECIPE_UNIT_OPTIONS.map((unit) => (
                                      <option key={unit} value={unit}>
                                        {unit}
                                      </option>
                                    ))}
                                  </V2Select>
                                </V2Field>

                                <button
                                  type="button"
                                  onClick={() => removeIngredient(ingredient.id)}
                                  className="mt-6 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                                  title="Eliminar ingrediente"
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>

                              {stockProduct ? (
                                <p className="mt-2 text-xs text-slate-500">
                                  Stock actual:{" "}
                                  <span className="font-semibold text-slate-800">
                                    {getStockProductRemaining(stockProduct)}{" "}
                                    {stockProduct.unit || ingredient.unit}
                                  </span>
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                        <div>
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                            <Utensils size={22} />
                          </div>
                          <p className="mt-3 font-semibold text-slate-950">
                            Receta sin ingredientes
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Agregá los insumos que consume este plato para controlar stock.
                          </p>
                          <V2Button
                            type="button"
                            variant="primary"
                            icon={<Plus size={16} />}
                            onClick={addIngredient}
                            className="mt-4"
                          >
                            Agregar ingrediente
                          </V2Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </V2Card>
            </div>
          ) : (
            <V2Card className="flex min-h-[420px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <BookOpenText size={26} />
                </div>
                <p className="mt-3 font-semibold text-slate-950">No hay platos en el menú</p>
                <p className="mt-1 text-sm text-slate-500">
                  Cargá productos desde /local/menu o crealos desde el panel izquierdo.
                </p>
              </div>
            </V2Card>
          )}
        </div>
      </div>
      {isNewPlatePopupOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Recetas
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Nuevo plato
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Crea el plato del menú y su receta de stock en un solo paso.
                </p>
              </div>

              <button
                type="button"
                onClick={closeNewPlatePopup}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <V2Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <Utensils size={19} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-950">Datos del plato</p>
                        <p className="text-sm text-slate-500">
                          Información visible en el menú interno y público.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <V2Field label="Nombre">
                        <V2Input
                          value={newPlateForm.name}
                          onChange={(event) => updateNewPlateForm({ name: event.target.value })}
                          placeholder="Ej: Raviolón de calabaza"
                        />
                      </V2Field>

                      <V2Field label="Descripción">
                        <textarea
                          value={newPlateForm.description}
                          onChange={(event) =>
                            updateNewPlateForm({ description: event.target.value })
                          }
                          placeholder="Descripción breve del plato"
                          className="min-h-[96px] w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                      </V2Field>

                      <div className="grid gap-4 md:grid-cols-2">
                        <V2Field label="Sección">
                          <V2Select
                            value={newPlateForm.categoryId}
                            onChange={(event) =>
                              updateNewPlateForm({ categoryId: event.target.value })
                            }
                          >
                            <option value="">Sin categoría</option>
                            {menuCategoriesAlphabetical.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </V2Select>
                        </V2Field>

                        <V2Field label="Precio inicial">
                          <V2Input
                            type="number"
                            min={0}
                            value={newPlateForm.price}
                            onChange={(event) => updateNewPlateForm({ price: event.target.value })}
                            placeholder="Ej: 18000"
                          />
                        </V2Field>
                      </div>

                      <V2Field label="Imagen del plato">
                        <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                          <V2Input
                            value={newPlateForm.imageUrl}
                            onChange={(event) =>
                              updateNewPlateForm({ imageUrl: event.target.value })
                            }
                            placeholder="/api/menu-images/nombre-del-plato"
                          />

                          <div className="flex h-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            {newPlateForm.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={newPlateForm.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon size={24} className="text-slate-300" />
                            )}
                          </div>
                        </div>
                      </V2Field>
                    </div>
                  </V2Card>
                </div>

                <V2Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">Insumos que consume</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Estos ingredientes quedan guardados como receta del plato.
                      </p>
                    </div>

                    <V2Button
                      type="button"
                      variant="primary"
                      icon={<Plus size={16} />}
                      onClick={addNewPlateIngredient}
                    >
                      Ingrediente
                    </V2Button>
                  </div>

                  <div className="mt-4 max-h-[440px] overflow-y-auto pr-1">
                    {newPlateForm.ingredients.length > 0 ? (
                      <div className="space-y-3">
                        {newPlateForm.ingredients.map((ingredient) => (
                          <div
                            key={ingredient.id}
                            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                          >
                            <div className="grid gap-3 lg:grid-cols-[1fr_120px_120px_44px]">
                              <V2Field label="Insumo">
                                <V2Select
                                  value={ingredient.stockProductId}
                                  onChange={(event) =>
                                    selectNewPlateStockProduct(ingredient.id, event.target.value)
                                  }
                                >
                                  <option value="">Seleccionar insumo</option>
                                  {stockProductsSorted.map((product) => (
                                    <option key={product.id} value={product.id}>
                                      {getStockProductName(product)}
                                    </option>
                                  ))}
                                </V2Select>
                              </V2Field>

                              <V2Field label="Cantidad">
                                <V2Input
                                  type="number"
                                  min={0}
                                  value={String(ingredient.quantity)}
                                  onChange={(event) =>
                                    updateNewPlateIngredient(ingredient.id, {
                                      quantity: Number(event.target.value) || 0,
                                    })
                                  }
                                />
                              </V2Field>

                              <V2Field label="Unidad">
                                <V2Select
                                  value={ingredient.unit}
                                  onChange={(event) =>
                                    updateNewPlateIngredient(ingredient.id, {
                                      unit: event.target.value as V2RecipeUnit,
                                    })
                                  }
                                >
                                  {RECIPE_UNIT_OPTIONS.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                </V2Select>
                              </V2Field>

                              <button
                                type="button"
                                onClick={() => removeNewPlateIngredient(ingredient.id)}
                                className="mt-6 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                                title="Eliminar ingrediente"
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                        <div>
                          <p className="font-semibold text-slate-950">
                            Todavía no cargaste insumos
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Podés crear el plato ahora y completar la receta después.
                          </p>
                          <V2Button
                            type="button"
                            variant="secondary"
                            icon={<Plus size={16} />}
                            onClick={addNewPlateIngredient}
                            className="mt-4"
                          >
                            Agregar ingrediente
                          </V2Button>
                        </div>
                      </div>
                    )}
                  </div>
                </V2Card>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
              <V2Button type="button" variant="secondary" onClick={closeNewPlatePopup}>
                Cancelar
              </V2Button>
              <V2Button
                type="button"
                variant="primary"
                icon={<Save size={16} />}
                onClick={createMenuItemFromRecipes}
              >
                Guardar plato
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}

    </V2AppShell>
  );
}
