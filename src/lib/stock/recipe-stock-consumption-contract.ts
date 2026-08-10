import {
  mapBusinessStockMovementRow,
  type BusinessStockMovement,
  type BusinessStockMovementDatabaseRow,
} from "@/lib/stock/business-stock-contract";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export const BUSINESS_RECIPE_STOCK_ORIGINS = [
  "reservation",
  "shipping",
  "recipe",
] as const;

export type BusinessRecipeStockOrigin =
  (typeof BUSINESS_RECIPE_STOCK_ORIGINS)[number];

export type BusinessRecipeStockConsumptionInput = {
  menuItemId: string;
  quantity: number;
  operationKey: string;
  referenceId: string;
  label: string;
  detail?: string;
};

export type BusinessRecipeStockOperation = {
  id: string;
  menuItemId: string;
  recipeId: string;
  recipeRevision: number;
  origin: BusinessRecipeStockOrigin;
  referenceId: string;
  soldQuantity: number;
  operationKey: string;
  label: string;
  detail: string;
  createdAt: string;
};

export type BusinessRecipeStockConsumptionResult = {
  operation: BusinessRecipeStockOperation;
  movements: BusinessStockMovement[];
};

export type BusinessRecipeStockOperationDatabaseRow = {
  id: string;
  business_id: string;
  operation_key: string;
  menu_item_id: string;
  recipe_id: string;
  recipe_revision: number;
  origin: string;
  reference_id: string;
  sold_quantity: number;
  label: string;
  detail: string;
  created_at: string;
};

export type BusinessRecipeStockConsumptionRpcPayload = {
  p_menu_item_id: string;
  p_quantity: number;
  p_operation_key: string;
  p_reference_id: string;
  p_label: string;
  p_detail: string;
};

type BusinessRecipeStockConsumptionRpcResult = {
  operation?: unknown;
  movements?: unknown;
};

function normalizeText(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (typeof value !== "string") {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  const normalized =
    value.trim().replace(/\s+/gu, " ");

  if (
    normalized.length < minimum
    || normalized.length > maximum
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: unknown,
  label: string,
  maximum: number,
) {
  if (
    value === undefined
    || value === null
  ) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  const normalized = value.trim();

  if (
    normalized.length > maximum
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return normalized;
}

export function isBusinessRecipeStockOrigin(
  value: unknown,
): value is BusinessRecipeStockOrigin {
  return (
    typeof value === "string"
    && BUSINESS_RECIPE_STOCK_ORIGINS.includes(
      value as BusinessRecipeStockOrigin,
    )
  );
}

export function normalizeBusinessRecipeStockConsumption(
  value: unknown,
): BusinessRecipeStockConsumptionInput {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "El consumo por receta es inválido.",
    );
  }

  const data =
    value as Record<string, unknown>;

  if (
    typeof data.menuItemId !== "string"
    || !UUID_PATTERN.test(
      data.menuItemId,
    )
  ) {
    throw new Error(
      "El plato del consumo es inválido.",
    );
  }

  const quantity =
    typeof data.quantity === "number"
      ? data.quantity
      : typeof data.quantity === "string"
        && data.quantity.trim() !== ""
        ? Number(data.quantity)
        : Number.NaN;

  if (
    !Number.isInteger(quantity)
    || quantity < 1
    || quantity > 9999
  ) {
    throw new Error(
      "La cantidad vendida debe ser un entero entre 1 y 9999.",
    );
  }

  return {
    menuItemId:
      data.menuItemId,
    quantity,
    operationKey:
      normalizeText(
        data.operationKey,
        "La clave de idempotencia",
        1,
        120,
      ),
    referenceId:
      normalizeText(
        data.referenceId,
        "La referencia operativa",
        1,
        160,
      ),
    label:
      normalizeText(
        data.label,
        "La descripción del consumo",
        1,
        160,
      ),
    detail:
      normalizeOptionalText(
        data.detail,
        "El detalle del consumo",
        2000,
      ),
  };
}

export function toBusinessRecipeStockConsumptionRpcPayload(
  value: unknown,
): BusinessRecipeStockConsumptionRpcPayload {
  const input =
    normalizeBusinessRecipeStockConsumption(
      value,
    );

  return {
    p_menu_item_id:
      input.menuItemId,
    p_quantity:
      input.quantity,
    p_operation_key:
      input.operationKey,
    p_reference_id:
      input.referenceId,
    p_label:
      input.label,
    p_detail:
      input.detail ?? "",
  };
}

export function mapBusinessRecipeStockOperationRow(
  row: BusinessRecipeStockOperationDatabaseRow,
): BusinessRecipeStockOperation {
  if (
    !isBusinessRecipeStockOrigin(
      row.origin,
    )
  ) {
    throw new Error(
      "Supabase devolvió un origen de consumo por receta inválido.",
    );
  }

  return {
    id: row.id,
    menuItemId:
      row.menu_item_id,
    recipeId:
      row.recipe_id,
    recipeRevision:
      Number(row.recipe_revision),
    origin:
      row.origin,
    referenceId:
      row.reference_id,
    soldQuantity:
      Number(row.sold_quantity),
    operationKey:
      row.operation_key,
    label:
      row.label,
    detail:
      row.detail,
    createdAt:
      row.created_at,
  };
}

export function mapBusinessRecipeStockConsumptionResult(
  value: unknown,
): BusinessRecipeStockConsumptionResult {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "La respuesta del consumo por receta es inválida.",
    );
  }

  const result =
    value as BusinessRecipeStockConsumptionRpcResult;

  if (
    !result.operation
    || typeof result.operation !== "object"
    || !Array.isArray(
      result.movements,
    )
  ) {
    throw new Error(
      "La respuesta del consumo por receta está incompleta.",
    );
  }

  return {
    operation:
      mapBusinessRecipeStockOperationRow(
        result.operation as BusinessRecipeStockOperationDatabaseRow,
      ),
    movements:
      result.movements.map(
        (movement) =>
          mapBusinessStockMovementRow(
            movement as BusinessStockMovementDatabaseRow,
          ),
      ),
  };
}
