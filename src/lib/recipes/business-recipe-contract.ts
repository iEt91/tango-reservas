import {
  BUSINESS_STOCK_UNITS,
  isBusinessStockUnit,
  type BusinessStockUnit,
} from "@/lib/stock/business-stock-contract";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type BusinessRecipeIngredientInput = {
  stockProductId: string;
  quantity: number;
  unit: BusinessStockUnit;
};

export type BusinessRecipeIngredient =
  BusinessRecipeIngredientInput & {
    id: string;
    sortOrder: number;
    createdAt: string;
  };

export type BusinessRecipe = {
  id: string;
  menuItemId: string;
  name: string;
  preparationTimeSeconds: number;
  revision: number;
  ingredients: BusinessRecipeIngredient[];
  createdAt: string;
  updatedAt: string;
};

export type BusinessRecipeInput = {
  name: string;
  preparationTimeSeconds: number;
  ingredients: BusinessRecipeIngredientInput[];
};

export type BusinessRecipeDatabaseRow = {
  id: string;
  business_id: string;
  menu_item_id: string;
  name: string;
  preparation_time_seconds: number;
  revision: number;
  created_at: string;
  updated_at: string;
};

export type BusinessRecipeIngredientDatabaseRow = {
  id: string;
  business_id: string;
  recipe_id: string;
  stock_product_id: string;
  quantity: string | number;
  unit: string;
  sort_order: number;
  created_at: string;
};

export type BusinessRecipeRpcPayload = {
  name: string;
  preparation_time_seconds: number;
};

export type BusinessRecipeIngredientRpcPayload = {
  stock_product_id: string;
  quantity: number;
  unit: BusinessStockUnit;
};

type BusinessRecipeRpcResult = {
  recipe?: unknown;
  ingredients?: unknown;
};

function normalizeUuid(
  value: unknown,
  label: string,
) {
  if (
    typeof value !== "string"
    || !UUID_PATTERN.test(value)
  ) {
    throw new Error(`${label} no es válido.`);
  }

  return value;
}

function normalizeText(
  value: unknown,
  label: string,
  maximum: number,
) {
  if (typeof value !== "string") {
    throw new Error(`${label} es obligatorio.`);
  }

  const normalized =
    value.trim().replace(/\s+/gu, " ");

  if (
    normalized.length < 1
    || normalized.length > maximum
  ) {
    throw new Error(`${label} no es válido.`);
  }

  return normalized;
}

function normalizeNumber(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  if (
    !Number.isFinite(numeric)
    || numeric < minimum
    || numeric > maximum
  ) {
    throw new Error(`${label} no es válido.`);
  }

  return numeric;
}

export function normalizeBusinessRecipeMenuItemId(
  value: unknown,
) {
  return normalizeUuid(
    value,
    "El plato de la receta",
  );
}

export function normalizeBusinessRecipe(
  value: unknown,
): BusinessRecipeInput {
  if (!value || typeof value !== "object") {
    throw new Error("La receta es inválida.");
  }

  const data =
    value as Record<string, unknown>;
  const preparationTimeSeconds =
    normalizeNumber(
      data.preparationTimeSeconds,
      "El tiempo de preparación",
      1,
      86400,
    );

  if (!Number.isInteger(preparationTimeSeconds)) {
    throw new Error(
      "El tiempo de preparación debe expresarse en segundos enteros.",
    );
  }

  if (!Array.isArray(data.ingredients)) {
    throw new Error(
      "Los ingredientes de la receta son inválidos.",
    );
  }

  if (data.ingredients.length > 500) {
    throw new Error(
      "La receta no puede superar 500 ingredientes.",
    );
  }

  const seenStockProducts = new Set<string>();

  const ingredients =
    data.ingredients.map(
      (ingredient, index) => {
        if (
          !ingredient
          || typeof ingredient !== "object"
        ) {
          throw new Error(
            `El ingrediente ${index + 1} es inválido.`,
          );
        }

        const entry =
          ingredient as Record<string, unknown>;
        const stockProductId =
          normalizeUuid(
            entry.stockProductId,
            `El insumo del ingrediente ${index + 1}`,
          );

        if (seenStockProducts.has(stockProductId)) {
          throw new Error(
            "La receta no puede repetir el mismo insumo.",
          );
        }

        if (!isBusinessStockUnit(entry.unit)) {
          throw new Error(
            `La unidad del ingrediente ${index + 1} es inválida.`,
          );
        }

        const quantity =
          normalizeNumber(
            entry.quantity,
            `La cantidad del ingrediente ${index + 1}`,
            0.001,
            99_999_999_999.999,
          );

        seenStockProducts.add(stockProductId);

        return {
          stockProductId,
          quantity:
            Math.round(quantity * 1000) / 1000,
          unit: entry.unit,
        };
      },
    );

  return {
    name: normalizeText(
      data.name,
      "El nombre de la receta",
      160,
    ),
    preparationTimeSeconds,
    ingredients,
  };
}

export function toBusinessRecipeRpcPayload(
  value: unknown,
): {
  recipe: BusinessRecipeRpcPayload;
  ingredients: BusinessRecipeIngredientRpcPayload[];
} {
  const recipe =
    normalizeBusinessRecipe(value);

  return {
    recipe: {
      name: recipe.name,
      preparation_time_seconds:
        recipe.preparationTimeSeconds,
    },
    ingredients: recipe.ingredients.map(
      (ingredient) => ({
        stock_product_id:
          ingredient.stockProductId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      }),
    ),
  };
}

export function mapBusinessRecipeIngredientRow(
  row: BusinessRecipeIngredientDatabaseRow,
): BusinessRecipeIngredient {
  if (!isBusinessStockUnit(row.unit)) {
    throw new Error(
      "La unidad persistida del ingrediente es inválida.",
    );
  }

  return {
    id: row.id,
    stockProductId: row.stock_product_id,
    quantity: Number(row.quantity) || 0,
    unit: row.unit,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function mapBusinessRecipeRow(
  row: BusinessRecipeDatabaseRow,
  ingredients: BusinessRecipeIngredient[] = [],
): BusinessRecipe {
  return {
    id: row.id,
    menuItemId: row.menu_item_id,
    name: row.name,
    preparationTimeSeconds:
      Number(row.preparation_time_seconds) || 900,
    revision: Number(row.revision) || 1,
    ingredients: [...ingredients].sort(
      (first, second) =>
        first.sortOrder - second.sortOrder,
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBusinessRecipeRpcResult(
  value: unknown,
): BusinessRecipe {
  if (!value || typeof value !== "object") {
    throw new Error(
      "La respuesta persistida de la receta es inválida.",
    );
  }

  const result =
    value as BusinessRecipeRpcResult;

  if (
    !result.recipe
    || typeof result.recipe !== "object"
    || !Array.isArray(result.ingredients)
  ) {
    throw new Error(
      "La respuesta persistida de la receta está incompleta.",
    );
  }

  const recipeRow =
    result.recipe as BusinessRecipeDatabaseRow;
  const ingredientRows =
    result.ingredients as BusinessRecipeIngredientDatabaseRow[];

  return mapBusinessRecipeRow(
    recipeRow,
    ingredientRows.map(
      mapBusinessRecipeIngredientRow,
    ),
  );
}

export function isRecipeUnitCompatibleWithStock(
  recipeUnit: BusinessStockUnit,
  stockUnit: BusinessStockUnit,
) {
  if (recipeUnit === stockUnit) {
    return true;
  }

  return (
    (recipeUnit === "g" && stockUnit === "kg")
    || (recipeUnit === "kg" && stockUnit === "g")
    || (recipeUnit === "ml" && stockUnit === "l")
    || (recipeUnit === "l" && stockUnit === "ml")
  );
}

export {
  BUSINESS_STOCK_UNITS as BUSINESS_RECIPE_UNITS,
};
