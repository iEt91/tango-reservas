"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenText, Plus, Trash2, X } from "lucide-react";
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

type V2RecipeIngredient = {
  id: string;
  stockProductId: string;
  name: string;
  quantity: number;
  unit: "g" | "kg" | "ml" | "l" | "unidad" | "botella" | "lata" | "caja" | "paquete" | "bolsa";
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
  order: number;
  visible?: boolean;
  active?: boolean;
};

type V2RecipeStockProduct = (typeof v2StockProducts)[number];

const RECIPE_UNIT_OPTIONS: V2RecipeIngredient["unit"][] = [
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

const DEFAULT_RECIPES: V2RecipeConfig[] = [
  {
    id: "recipe-pizza-jamon-queso",
    menuItemId: "menu-1",
    name: "Pizza jamón y queso",
    ingredients: [
      { id: "ing-harina", stockProductId: "stock-3", name: "Harina 000", quantity: 300, unit: "g" },
      { id: "ing-levadura", stockProductId: "", name: "Levadura", quantity: 10, unit: "g" },
      { id: "ing-aceite", stockProductId: "", name: "Aceite", quantity: 20, unit: "ml" },
      { id: "ing-muzzarella", stockProductId: "stock-4", name: "Muzzarella", quantity: 180, unit: "g" },
      { id: "ing-jamon", stockProductId: "", name: "Jamón", quantity: 100, unit: "g" },
      { id: "ing-caja", stockProductId: "stock-7", name: "Caja pizza grande", quantity: 1, unit: "unidad" },
    ],
  },
];

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
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

function getTodayLabel() {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

function parseRecipeAmount(value: unknown) {
  const rawValue = String(value ?? "").trim();
  const quantity = Number.parseFloat(rawValue.replace(",", "."));
  const unit = RECIPE_UNIT_OPTIONS.find((option) => rawValue.toLowerCase().includes(option));

  return {
    quantity: Number.isFinite(quantity) ? quantity : 0,
    unit: unit ?? "g",
  };
}

function normalizeRecipes(recipes: unknown): V2RecipeConfig[] {
  if (!Array.isArray(recipes) || recipes.length === 0) return DEFAULT_RECIPES;

  return recipes.map((recipe, recipeIndex) => {
    const draft = recipe as Partial<V2RecipeConfig>;

    return {
      id: draft.id || `recipe-${recipeIndex + 1}`,
      menuItemId: draft.menuItemId || "",
      name: draft.name || `Comida ${recipeIndex + 1}`,
      ingredients:
        Array.isArray(draft.ingredients) && draft.ingredients.length > 0
          ? draft.ingredients.map((ingredient, ingredientIndex) => ({
              id: ingredient.id || `ingredient-${recipeIndex + 1}-${ingredientIndex + 1}`,
              stockProductId: ingredient.stockProductId || "",
              name: ingredient.name || "Insumo",
              quantity:
                typeof ingredient.quantity === "number"
                  ? ingredient.quantity
                  : parseRecipeAmount((ingredient as { amount?: string }).amount).quantity,
              unit:
                (ingredient.unit as V2RecipeIngredient["unit"]) ||
                parseRecipeAmount((ingredient as { amount?: string }).amount).unit,
            }))
          : [{ id: `ingredient-${recipeIndex + 1}-1`, stockProductId: "", name: "Insumo", quantity: 0, unit: "g" }],
    };
  });
}

function readRecipesFromConfig() {
  if (typeof window === "undefined") return DEFAULT_RECIPES;

  try {
    const rawValue = window.localStorage.getItem(LOCAL_CONFIG_STORAGE_KEY);

    if (!rawValue) return DEFAULT_RECIPES;

    const parsedConfig = JSON.parse(rawValue) as { recipes?: unknown };

    return normalizeRecipes(parsedConfig.recipes);
  } catch {
    return DEFAULT_RECIPES;
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

type NewMenuItemForm = {
  name: string;
  categoryId: string;
  price: number;
  description: string;
};

type NewStockProductForm = {
  name: string;
  category: string;
  unit: V2RecipeIngredient["unit"];
  totalStock: number;
  alertBelow: number;
  unitCost: number;
  supplier: string;
};

export default function MenuRecetasPage() {
  const [recipes, setRecipes] = useState<V2RecipeConfig[]>(DEFAULT_RECIPES);
  const [activeRecipeId, setActiveRecipeId] = useState(DEFAULT_RECIPES[0]?.id ?? "");
  const [menuItems, setMenuItems] = useState<V2RecipeMenuItem[]>(v2MenuItems);
  const [menuCategories, setMenuCategories] = useState<V2RecipeMenuCategory[]>(v2MenuCategories);
  const [stockProducts, setStockProducts] = useState<V2RecipeStockProduct[]>(v2StockProducts);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [isNewMenuItemOpen, setIsNewMenuItemOpen] = useState(false);
  const [isNewStockProductOpen, setIsNewStockProductOpen] = useState(false);
  const [newMenuItemForm, setNewMenuItemForm] = useState<NewMenuItemForm>({
    name: "",
    categoryId: "",
    price: 0,
    description: "",
  });
  const [newStockProductForm, setNewStockProductForm] = useState<NewStockProductForm>({
    name: "",
    category: "Almacén",
    unit: "g",
    totalStock: 0,
    alertBelow: 0,
    unitCost: 0,
    supplier: "",
  });

  useEffect(() => {
    const nextRecipes = readRecipesFromConfig();

    setRecipes(nextRecipes);
    setActiveRecipeId(nextRecipes[0]?.id ?? "");
  }, []);

  useEffect(() => {
    function syncMenuAndStock() {
      setMenuItems(readLocalStorageList<V2RecipeMenuItem>(MENU_ITEMS_STORAGE_KEY, v2MenuItems));
      setMenuCategories(
        readLocalStorageList<V2RecipeMenuCategory>(MENU_CATEGORIES_STORAGE_KEY, v2MenuCategories)
      );
      setStockProducts(
        readLocalStorageList<V2RecipeStockProduct>(STOCK_PRODUCTS_STORAGE_KEY, v2StockProducts)
      );
    }

    syncMenuAndStock();

    window.addEventListener("focus", syncMenuAndStock);
    window.addEventListener("storage", syncMenuAndStock);

    return () => {
      window.removeEventListener("focus", syncMenuAndStock);
      window.removeEventListener("storage", syncMenuAndStock);
    };
  }, []);

  const activeRecipe =
    recipes.find((recipe) => recipe.id === activeRecipeId) ?? recipes[0] ?? null;

  const selectableMenuItems = useMemo(() => {
    const categoryById = new Map(menuCategories.map((category) => [category.id, category]));

    return menuItems
      .filter((item) => item.visible !== false && item.status !== "paused")
      .sort((a, b) => {
        const firstCategory = categoryById.get(a.categoryId);
        const secondCategory = categoryById.get(b.categoryId);
        const categoryDiff = (firstCategory?.order ?? 999) - (secondCategory?.order ?? 999);

        if (categoryDiff !== 0) return categoryDiff;

        return a.name.localeCompare(b.name, "es");
      });
  }, [menuCategories, menuItems]);

  const stockProductById = useMemo(() => {
    return new Map(stockProducts.map((product) => [product.id, product]));
  }, [stockProducts]);

  const sortedStockProducts = useMemo(() => {
    return [...stockProducts].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [stockProducts]);

  const sortedMenuCategories = useMemo(() => {
    return [...menuCategories].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [menuCategories]);

  const stockCategories = useMemo(() => {
    return Array.from(new Set(stockProducts.map((product) => product.category))).sort((a, b) =>
      String(a).localeCompare(String(b), "es")
    );
  }, [stockProducts]);

  function openNewMenuItemFromRecipe() {
    setNewMenuItemForm({
      name: activeRecipe?.name ?? "",
      categoryId: "",
      price: 0,
      description: "",
    });
    setIsNewMenuItemOpen(true);
  }

  function createMenuItemFromRecipe() {
    const name = newMenuItemForm.name.trim();

    if (!name) return;

    const nextMenuItem: V2RecipeMenuItem = {
      id: `menu-${Date.now()}`,
      imageUrl: "",
      name,
      categoryId: newMenuItemForm.categoryId,
      description: newMenuItemForm.description.trim(),
      price: Number(newMenuItemForm.price) || 0,
      status: "available",
      visible: true,
      featured: false,
    };

    const nextMenuItems = [...menuItems, nextMenuItem];

    setMenuItems(nextMenuItems);
    writeLocalStorageList(MENU_ITEMS_STORAGE_KEY, nextMenuItems);

    if (activeRecipe) {
      markDirty(
        recipes.map((recipe) =>
          recipe.id === activeRecipe.id
            ? { ...recipe, menuItemId: nextMenuItem.id, name: nextMenuItem.name }
            : recipe
        )
      );
    }

    setIsNewMenuItemOpen(false);
  }

  function openNewStockProductFromIngredient() {
    setNewStockProductForm({
      name: "",
      category: stockCategories[0] ?? "Almacén",
      unit: "g",
      totalStock: 0,
      alertBelow: 0,
      unitCost: 0,
      supplier: "",
    });
    setIsNewStockProductOpen(true);
  }

  function createStockProductFromRecipe() {
    const name = newStockProductForm.name.trim();

    if (!name) return;

    const nextStockProduct = {
      id: `stock-${Date.now()}`,
      supplier: newStockProductForm.supplier.trim() || "Sin proveedor",
      unitCost: Number(newStockProductForm.unitCost) || 0,
      name,
      category: newStockProductForm.category || "Almacén",
      unit: newStockProductForm.unit,
      totalStock: Number(newStockProductForm.totalStock) || 0,
      consumedBySales: 0,
      alertBelow: Number(newStockProductForm.alertBelow) || 0,
      lastUpdated: getTodayLabel(),
      note: "Creado desde Recetas.",
    } as V2RecipeStockProduct;

    const nextStockProducts = [...stockProducts, nextStockProduct];

    setStockProducts(nextStockProducts);
    writeLocalStorageList(STOCK_PRODUCTS_STORAGE_KEY, nextStockProducts);
    setIsNewStockProductOpen(false);
  }

  function persistRecipes(nextRecipes: V2RecipeConfig[]) {
    setRecipes(nextRecipes);
    writeRecipesToConfig(nextRecipes);
    setSaveStatus("saved");
  }

  function markDirty(nextRecipes: V2RecipeConfig[]) {
    setRecipes(nextRecipes);
    setSaveStatus("idle");
  }

  function addRecipe() {
    const nextRecipe: V2RecipeConfig = {
      id: `recipe-${Date.now()}`,
      menuItemId: selectableMenuItems[0]?.id ?? "",
      name: selectableMenuItems[0]?.name ?? `Nueva comida ${recipes.length + 1}`,
      ingredients: [{ id: `ingredient-${Date.now()}`, stockProductId: "", name: "Insumo", quantity: 0, unit: "g" }],
    };

    markDirty([...recipes, nextRecipe]);
    setActiveRecipeId(nextRecipe.id);
  }

  function deleteRecipe(recipeId: string) {
    const nextRecipes = recipes.filter((recipe) => recipe.id !== recipeId);
    const safeRecipes = nextRecipes.length > 0 ? nextRecipes : DEFAULT_RECIPES;

    markDirty(safeRecipes);
    setActiveRecipeId(safeRecipes[0]?.id ?? "");
  }

  function updateRecipeName(recipeId: string, name: string) {
    markDirty(
      recipes.map((recipe) =>
        recipe.id === recipeId ? { ...recipe, name } : recipe
      )
    );
  }

  function updateRecipeMenuItem(recipeId: string, menuItemId: string) {
    const selectedItem = selectableMenuItems.find((item) => item.id === menuItemId);

    markDirty(
      recipes.map((recipe) =>
        recipe.id === recipeId
          ? {
              ...recipe,
              menuItemId,
              name: selectedItem?.name ?? recipe.name,
            }
          : recipe
      )
    );
  }

  function addRecipeIngredient(recipeId: string) {
    markDirty(
      recipes.map((recipe) =>
        recipe.id === recipeId
          ? {
              ...recipe,
              ingredients: [
                ...recipe.ingredients,
                { id: `ingredient-${Date.now()}`, stockProductId: "", name: "Insumo", quantity: 0, unit: "g" },
              ],
            }
          : recipe
      )
    );
  }

  function updateRecipeIngredient(
    recipeId: string,
    ingredientId: string,
    field: "name" | "quantity" | "unit",
    value: string | number
  ) {
    markDirty(
      recipes.map((recipe) =>
        recipe.id === recipeId
          ? {
              ...recipe,
              ingredients: recipe.ingredients.map((ingredient) =>
                ingredient.id === ingredientId ? { ...ingredient, [field]: value } : ingredient
              ),
            }
          : recipe
      )
    );
  }

  function updateRecipeIngredientStockProduct(
    recipeId: string,
    ingredientId: string,
    stockProductId: string
  ) {
    const selectedStockProduct = stockProductById.get(stockProductId);

    markDirty(
      recipes.map((recipe) =>
        recipe.id === recipeId
          ? {
              ...recipe,
              ingredients: recipe.ingredients.map((ingredient) =>
                ingredient.id === ingredientId
                  ? {
                      ...ingredient,
                      stockProductId,
                      name: selectedStockProduct?.name ?? ingredient.name,
                      unit:
                        selectedStockProduct?.unit &&
                        RECIPE_UNIT_OPTIONS.includes(selectedStockProduct.unit)
                          ? selectedStockProduct.unit
                          : ingredient.unit,
                    }
                  : ingredient
              ),
            }
          : recipe
      )
    );
  }

  function deleteRecipeIngredient(recipeId: string, ingredientId: string) {
    markDirty(
      recipes.map((recipe) =>
        recipe.id === recipeId
          ? {
              ...recipe,
              ingredients:
                recipe.ingredients.length > 1
                  ? recipe.ingredients.filter((ingredient) => ingredient.id !== ingredientId)
                  : recipe.ingredients,
            }
          : recipe
      )
    );
  }

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Recetas"
          description="Conectá cada comida del menú con los insumos de stock que consume."
          actions={
            <>
              <Link
                href="/local/menu"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              >
                <ArrowLeft size={18} />
                Volver al menú
              </Link>
              <V2Button
                type="button"
                variant="primary"
                icon={<Plus size={17} />}
                onClick={addRecipe}
              >
                Agregar receta
              </V2Button>
              <V2Button
                type="button"
                variant="secondary"
                onClick={() => persistRecipes(recipes)}
              >
                {saveStatus === "saved" ? "Guardado" : "Guardar"}
              </V2Button>
            </>
          }
        />

        <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_1fr]">
          <V2Card className="min-h-0 overflow-hidden">
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Comidas</h2>
                  <p className="mt-1 text-sm text-slate-500">Pills de recetas configuradas.</p>
                </div>
                <V2Badge tone="blue">{recipes.length}</V2Badge>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="flex flex-wrap gap-2">
                  {recipes.map((recipe) => {
                    const active = activeRecipe?.id === recipe.id;

                    return (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => setActiveRecipeId(recipe.id)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? "border-emerald-300 bg-emerald-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                        }`}
                      >
                        {recipe.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </V2Card>

          {activeRecipe ? (
            <div className="min-h-0 overflow-y-auto pr-1">
              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <V2Card>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Producto final
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-950">
                        {activeRecipe.name}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteRecipe(activeRecipe.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                      aria-label="Eliminar receta"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-2">
                      <V2Field label="Comida del menú">
                        <V2Select
                          value={activeRecipe.menuItemId}
                          onChange={(event) =>
                            updateRecipeMenuItem(activeRecipe.id, event.target.value)
                          }
                        >
                          <option value="">Seleccionar comida</option>
                          {selectableMenuItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </V2Select>
                      </V2Field>

                      <button
                        type="button"
                        onClick={openNewMenuItemFromRecipe}
                        className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Plus size={15} />
                        Crear comida en menú
                      </button>
                    </div>

                    <V2Field label="Nombre de la receta">
                      <V2Input
                        value={activeRecipe.name}
                        onChange={(event) => updateRecipeName(activeRecipe.id, event.target.value)}
                      />
                    </V2Field>
                  </div>

                  <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-950">
                    <p className="font-semibold">Regla operativa</p>
                    <p className="mt-1 leading-6">
                      Esta receta será la base para descontar stock exacto cuando se acepte un pedido.
                    </p>
                  </div>
                </V2Card>

                <V2Card>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Ingredientes
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Elegí insumo real de Stock, cantidad y unidad consumida por unidad vendida.
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <V2Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        icon={<Plus size={15} />}
                        onClick={openNewStockProductFromIngredient}
                      >
                        Crear insumo
                      </V2Button>

                      <V2Button
                        type="button"
                        size="sm"
                        variant="primary"
                        icon={<Plus size={15} />}
                        onClick={() => addRecipeIngredient(activeRecipe.id)}
                      >
                        Ingrediente
                      </V2Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {activeRecipe.ingredients.map((ingredient) => (
                      <div
                        key={ingredient.id}
                        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_120px_130px_42px]"
                      >
                        <V2Field label="Insumo de stock">
                          <V2Select
                            value={ingredient.stockProductId}
                            onChange={(event) =>
                              updateRecipeIngredientStockProduct(
                                activeRecipe.id,
                                ingredient.id,
                                event.target.value
                              )
                            }
                          >
                            <option value="">Seleccionar insumo</option>
                            {sortedStockProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </V2Select>
                        </V2Field>

                        <V2Field label="Cantidad">
                          <V2Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={ingredient.quantity}
                            onChange={(event) =>
                              updateRecipeIngredient(
                                activeRecipe.id,
                                ingredient.id,
                                "quantity",
                                Number(event.target.value)
                              )
                            }
                          />
                        </V2Field>

                        <V2Field label="Unidad">
                          <V2Select
                            value={ingredient.unit}
                            onChange={(event) =>
                              updateRecipeIngredient(
                                activeRecipe.id,
                                ingredient.id,
                                "unit",
                                event.target.value
                              )
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
                          onClick={() => deleteRecipeIngredient(activeRecipe.id, ingredient.id)}
                          disabled={activeRecipe.ingredients.length <= 1}
                          className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Eliminar ingrediente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </V2Card>
              </div>
            </div>
          ) : (
            <V2Card>
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <div>
                  <BookOpenText className="mx-auto text-slate-300" size={42} />
                  <p className="mt-3 font-semibold text-slate-950">No hay recetas</p>
                  <p className="mt-1 text-sm text-slate-500">Agregá una receta para empezar.</p>
                </div>
              </div>
            </V2Card>
          )}
        </div>
      </div>

      {isNewMenuItemOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => setIsNewMenuItemOpen(false)}
        >
          <div
            className="w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-sm text-slate-500">Crear comida en menú</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Producto final
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsNewMenuItemOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-5">
              <V2Field label="Nombre">
                <V2Input
                  value={newMenuItemForm.name}
                  onChange={(event) =>
                    setNewMenuItemForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </V2Field>

              <V2Field label="Categoría">
                <V2Select
                  value={newMenuItemForm.categoryId}
                  onChange={(event) =>
                    setNewMenuItemForm((current) => ({ ...current, categoryId: event.target.value }))
                  }
                >
                  <option value="">Sin categoría</option>
                  {sortedMenuCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </V2Select>
              </V2Field>

              <V2Field label="Precio">
                <V2Input
                  type="number"
                  min={0}
                  value={newMenuItemForm.price}
                  onChange={(event) =>
                    setNewMenuItemForm((current) => ({
                      ...current,
                      price: Number(event.target.value),
                    }))
                  }
                />
              </V2Field>

              <V2Field label="Descripción">
                <V2Input
                  value={newMenuItemForm.description}
                  onChange={(event) =>
                    setNewMenuItemForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </V2Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <V2Button
                type="button"
                variant="secondary"
                onClick={() => setIsNewMenuItemOpen(false)}
              >
                Cancelar
              </V2Button>
              <V2Button type="button" variant="primary" onClick={createMenuItemFromRecipe}>
                Crear y vincular
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}

      {isNewStockProductOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => setIsNewStockProductOpen(false)}
        >
          <div
            className="w-full max-w-[620px] rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-sm text-slate-500">Crear insumo de stock</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Nuevo insumo
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsNewStockProductOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <V2Field label="Nombre">
                <V2Input
                  value={newStockProductForm.name}
                  onChange={(event) =>
                    setNewStockProductForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </V2Field>

              <V2Field label="Categoría">
                <V2Input
                  value={newStockProductForm.category}
                  onChange={(event) =>
                    setNewStockProductForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />
              </V2Field>

              <V2Field label="Unidad base">
                <V2Select
                  value={newStockProductForm.unit}
                  onChange={(event) =>
                    setNewStockProductForm((current) => ({
                      ...current,
                      unit: event.target.value as NewStockProductForm["unit"],
                    }))
                  }
                >
                  {RECIPE_UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </V2Select>
              </V2Field>

              <V2Field label="Stock total">
                <V2Input
                  type="number"
                  min={0}
                  value={newStockProductForm.totalStock}
                  onChange={(event) =>
                    setNewStockProductForm((current) => ({
                      ...current,
                      totalStock: Number(event.target.value),
                    }))
                  }
                />
              </V2Field>

              <V2Field label="Alerta debajo de">
                <V2Input
                  type="number"
                  min={0}
                  value={newStockProductForm.alertBelow}
                  onChange={(event) =>
                    setNewStockProductForm((current) => ({
                      ...current,
                      alertBelow: Number(event.target.value),
                    }))
                  }
                />
              </V2Field>

              <V2Field label="Costo por unidad">
                <V2Input
                  type="number"
                  min={0}
                  value={newStockProductForm.unitCost}
                  onChange={(event) =>
                    setNewStockProductForm((current) => ({
                      ...current,
                      unitCost: Number(event.target.value),
                    }))
                  }
                />
              </V2Field>

              <div className="md:col-span-2">
                <V2Field label="Proveedor">
                  <V2Input
                    value={newStockProductForm.supplier}
                    onChange={(event) =>
                      setNewStockProductForm((current) => ({
                        ...current,
                        supplier: event.target.value,
                      }))
                    }
                  />
                </V2Field>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <V2Button
                type="button"
                variant="secondary"
                onClick={() => setIsNewStockProductOpen(false)}
              >
                Cancelar
              </V2Button>
              <V2Button type="button" variant="primary" onClick={createStockProductFromRecipe}>
                Crear insumo
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}

    </V2AppShell>
  );
}
