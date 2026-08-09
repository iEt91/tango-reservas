export const BUSINESS_STOCK_UNITS = [
  "kg",
  "g",
  "l",
  "ml",
  "unidad",
  "botella",
  "caja",
  "paquete",
  "bolsa",
  "lata",
] as const;

export type BusinessStockUnit =
  (typeof BUSINESS_STOCK_UNITS)[number];

export const BUSINESS_STOCK_MOVEMENT_TYPES = [
  "opening",
  "replenishment",
  "consumption",
  "return",
  "adjustment",
] as const;

export type BusinessStockMovementType =
  (typeof BUSINESS_STOCK_MOVEMENT_TYPES)[number];

export const BUSINESS_STOCK_MOVEMENT_ORIGINS = [
  "manual",
  "reservation",
  "shipping",
  "recipe",
  "import",
] as const;

export type BusinessStockMovementOrigin =
  (typeof BUSINESS_STOCK_MOVEMENT_ORIGINS)[number];

export type BusinessStockProduct = {
  id: string;
  name: string;
  category: string;
  supplier: string;
  unit: BusinessStockUnit;
  unitCost: number;
  alertBelow: number;
  note: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BusinessStockProductSnapshot =
  BusinessStockProduct & {
    currentStock: number;
    consumedBySales: number;
    totalStock: number;
    lastUpdated: string;
  };

export type BusinessStockMovement = {
  id: string;
  productId: string;
  movementType: BusinessStockMovementType;
  origin: BusinessStockMovementOrigin;
  quantityDelta: number;
  productName: string;
  unit: BusinessStockUnit;
  unitCost: number;
  operationKey: string;
  referenceId: string;
  label: string;
  detail: string;
  createdAt: string;
};

export type BusinessStockSnapshot = {
  products: BusinessStockProductSnapshot[];
  movements: BusinessStockMovement[];
};

export type BusinessStockProductDatabaseRow = {
  id: string;
  business_id: string;
  name: string;
  category: string;
  supplier: string;
  unit: string;
  unit_cost: string | number;
  alert_below: string | number;
  note: string;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessStockMovementDatabaseRow = {
  id: string;
  business_id: string;
  product_id: string;
  movement_type: string;
  origin: string;
  quantity_delta: string | number;
  product_name_snapshot: string;
  unit_snapshot: string;
  unit_cost_snapshot: string | number;
  operation_key: string | null;
  reference_id: string | null;
  label: string;
  detail: string;
  created_at: string;
};

export type BusinessStockProductRpcPayload = {
  name: string;
  category: string;
  supplier: string;
  unit: BusinessStockUnit;
  unit_cost: number;
  alert_below: number;
  note: string;
  is_active: boolean;
};

export type BusinessStockMovementRpcPayload = {
  movement_type: BusinessStockMovementType;
  origin: BusinessStockMovementOrigin;
  quantity_delta: number;
  operation_key: string | null;
  reference_id: string | null;
  label: string;
  detail: string;
  unit_cost: number | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function normalizeText(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (typeof value !== "string") {
    throw new Error(`${label} no es válido.`);
  }

  const normalized = value.trim().replace(/\s+/gu, " ");

  if (
    normalized.length < minimum
    || normalized.length > maximum
  ) {
    throw new Error(
      `${label} debe tener entre ${minimum} y ${maximum} caracteres.`,
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: unknown,
  label: string,
  maximum: number,
) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error(`${label} no es válido.`);
  }

  const normalized = value.trim();

  if (normalized.length > maximum) {
    throw new Error(
      `${label} no puede superar ${maximum} caracteres.`,
    );
  }

  return normalized;
}

function normalizeNumber(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  const normalized =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  if (
    !Number.isFinite(normalized)
    || normalized < minimum
    || normalized > maximum
  ) {
    throw new Error(`${label} está fuera del rango permitido.`);
  }

  return normalized;
}

export function normalizeBusinessStockProductId(
  value: unknown,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (
    typeof value !== "string"
    || !UUID_PATTERN.test(value)
  ) {
    throw new Error(
      "El identificador del insumo es inválido.",
    );
  }

  return value;
}

export function isBusinessStockUnit(
  value: unknown,
): value is BusinessStockUnit {
  return (
    typeof value === "string"
    && BUSINESS_STOCK_UNITS.includes(
      value as BusinessStockUnit,
    )
  );
}

export function isBusinessStockMovementType(
  value: unknown,
): value is BusinessStockMovementType {
  return (
    typeof value === "string"
    && BUSINESS_STOCK_MOVEMENT_TYPES.includes(
      value as BusinessStockMovementType,
    )
  );
}

export function isBusinessStockMovementOrigin(
  value: unknown,
): value is BusinessStockMovementOrigin {
  return (
    typeof value === "string"
    && BUSINESS_STOCK_MOVEMENT_ORIGINS.includes(
      value as BusinessStockMovementOrigin,
    )
  );
}

export function normalizeBusinessStockProduct(
  value: unknown,
): Omit<BusinessStockProduct, "id" | "createdAt" | "updatedAt"> {
  if (!value || typeof value !== "object") {
    throw new Error("El insumo es inválido.");
  }

  const data = value as Record<string, unknown>;
  const unit = data.unit;

  if (!isBusinessStockUnit(unit)) {
    throw new Error("La unidad del insumo es inválida.");
  }

  if (typeof data.isActive !== "boolean") {
    throw new Error("El estado del insumo es inválido.");
  }

  return {
    name: normalizeText(
      data.name,
      "El nombre",
      1,
      160,
    ),
    category: normalizeText(
      data.category,
      "La categoría",
      1,
      120,
    ),
    supplier: normalizeOptionalText(
      data.supplier,
      "El proveedor",
      160,
    ),
    unit,
    unitCost: normalizeNumber(
      data.unitCost,
      "El costo por unidad",
      0,
      9_999_999_999.99,
    ),
    alertBelow: normalizeNumber(
      data.alertBelow,
      "La alerta de stock",
      0,
      99_999_999_999.999,
    ),
    note: normalizeOptionalText(
      data.note,
      "La nota",
      4000,
    ),
    isActive: data.isActive,
  };
}

export function toBusinessStockProductRpcPayload(
  value: unknown,
): BusinessStockProductRpcPayload {
  const product = normalizeBusinessStockProduct(value);

  return {
    name: product.name,
    category: product.category,
    supplier: product.supplier,
    unit: product.unit,
    unit_cost: product.unitCost,
    alert_below: product.alertBelow,
    note: product.note,
    is_active: product.isActive,
  };
}

export function normalizeBusinessStockMovement(
  value: unknown,
): BusinessStockMovementRpcPayload {
  if (!value || typeof value !== "object") {
    throw new Error("El movimiento de stock es inválido.");
  }

  const data = value as Record<string, unknown>;

  if (!isBusinessStockMovementType(data.movementType)) {
    throw new Error("El tipo de movimiento es inválido.");
  }

  if (!isBusinessStockMovementOrigin(data.origin)) {
    throw new Error("El origen del movimiento es inválido.");
  }

  const quantityDelta = normalizeNumber(
    data.quantityDelta,
    "La cantidad",
    -99_999_999_999.999,
    99_999_999_999.999,
  );

  if (quantityDelta === 0) {
    throw new Error("La cantidad del movimiento no puede ser cero.");
  }

  if (
    ["opening", "replenishment", "return"].includes(
      data.movementType,
    )
    && quantityDelta <= 0
  ) {
    throw new Error(
      "Este movimiento requiere una cantidad positiva.",
    );
  }

  if (
    data.movementType === "consumption"
    && quantityDelta >= 0
  ) {
    throw new Error(
      "Un consumo requiere una cantidad negativa.",
    );
  }

  const operationKey = normalizeOptionalText(
    data.operationKey,
    "La clave de idempotencia",
    160,
  );
  const referenceId = normalizeOptionalText(
    data.referenceId,
    "La referencia",
    160,
  );

  if (
    ["reservation", "shipping"].includes(data.origin)
    && !operationKey
  ) {
    throw new Error(
      "Los movimientos operativos requieren una clave de idempotencia.",
    );
  }

  const unitCost =
    data.unitCost === null
      || data.unitCost === undefined
      || data.unitCost === ""
      ? null
      : normalizeNumber(
          data.unitCost,
          "El costo del movimiento",
          0,
          9_999_999_999.99,
        );

  return {
    movement_type: data.movementType,
    origin: data.origin,
    quantity_delta: quantityDelta,
    operation_key: operationKey || null,
    reference_id: referenceId || null,
    label: normalizeText(
      data.label,
      "La descripción",
      1,
      160,
    ),
    detail: normalizeOptionalText(
      data.detail,
      "El detalle",
      2000,
    ),
    unit_cost: unitCost,
  };
}

export function mapBusinessStockProductRow(
  row: BusinessStockProductDatabaseRow,
): BusinessStockProduct {
  if (!isBusinessStockUnit(row.unit)) {
    throw new Error(
      "Supabase devolvió una unidad de stock inválida.",
    );
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    supplier: row.supplier,
    unit: row.unit,
    unitCost: Number(row.unit_cost),
    alertBelow: Number(row.alert_below),
    note: row.note,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBusinessStockMovementRow(
  row: BusinessStockMovementDatabaseRow,
): BusinessStockMovement {
  if (
    !isBusinessStockUnit(row.unit_snapshot)
    || !isBusinessStockMovementType(row.movement_type)
    || !isBusinessStockMovementOrigin(row.origin)
  ) {
    throw new Error(
      "Supabase devolvió un movimiento de stock inválido.",
    );
  }

  return {
    id: row.id,
    productId: row.product_id,
    movementType: row.movement_type,
    origin: row.origin,
    quantityDelta: Number(row.quantity_delta),
    productName: row.product_name_snapshot,
    unit: row.unit_snapshot,
    unitCost: Number(row.unit_cost_snapshot),
    operationKey: row.operation_key ?? "",
    referenceId: row.reference_id ?? "",
    label: row.label,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

function roundStock(value: number) {
  return Number(value.toFixed(3));
}

export function buildBusinessStockSnapshot(
  products: BusinessStockProduct[],
  movements: BusinessStockMovement[],
): BusinessStockSnapshot {
  const byProduct = new Map<
    string,
    BusinessStockMovement[]
  >();

  for (const movement of movements) {
    const current = byProduct.get(movement.productId) ?? [];
    current.push(movement);
    byProduct.set(movement.productId, current);
  }

  const productSnapshots = products.map((product) => {
    const productMovements =
      byProduct.get(product.id) ?? [];

    let currentStock = 0;
    let consumedBySales = 0;
    let lastUpdated = product.updatedAt;

    for (const movement of productMovements) {
      currentStock += movement.quantityDelta;

      if (movement.movementType === "consumption") {
        consumedBySales += Math.abs(
          movement.quantityDelta,
        );
      }

      if (movement.movementType === "return") {
        consumedBySales -= movement.quantityDelta;
      }

      if (
        new Date(movement.createdAt).getTime()
        > new Date(lastUpdated).getTime()
      ) {
        lastUpdated = movement.createdAt;
      }
    }

    currentStock = roundStock(currentStock);
    consumedBySales = Math.max(
      roundStock(consumedBySales),
      0,
    );

    return {
      ...product,
      currentStock,
      consumedBySales,
      totalStock: roundStock(
        currentStock + consumedBySales,
      ),
      lastUpdated,
    };
  });

  return {
    products: productSnapshots,
    movements,
  };
}
