const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type BusinessMenuItemStatus =
  | "available"
  | "paused";

export type BusinessMenuCategoryProductInput = {
  productId: string;
  quantity: number;
};

export type BusinessMenuCategoryInput = {
  name: string;
  description: string;
  isVisible: boolean;
  isActive: boolean;
  isPromotion: boolean;
  fixedPrice: number | null;
  discountPercent: number | null;
  products: BusinessMenuCategoryProductInput[];
};

export type BusinessMenuCategoryEditor =
  BusinessMenuCategoryInput & {
    id: string;
    sortOrder: number;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };

export type BusinessMenuItemInput = {
  categoryId: string | null;
  name: string;
  description: string;
  price: number;
  status: BusinessMenuItemStatus;
  isVisible: boolean;
  isFeatured: boolean;
  imageUrl: string;
};

export type BusinessMenuItemEditor =
  BusinessMenuItemInput & {
    id: string;
    sortOrder: number;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };

export type BusinessMenuQuickChange = {
  id: string;
  categoryId: string | null;
  price: number;
  isVisible: boolean;
};

export type BusinessMenuCategoryProductDatabaseRow = {
  business_id?: string;
  category_id?: string;
  menu_item_id?: string;
  product_id?: string;
  quantity: number;
};

export type BusinessMenuCategoryDatabaseRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
  is_active: boolean;
  is_promotion: boolean;
  fixed_price: string | number | null;
  discount_percent: string | number | null;
  products?: BusinessMenuCategoryProductDatabaseRow[];
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessMenuItemDatabaseRow = {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: string | number;
  status: BusinessMenuItemStatus;
  is_visible: boolean;
  is_featured: boolean;
  image_url: string | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function asRecord(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function normalizeRequiredText(
  value: unknown,
  label: string,
  maximumLength: number,
) {
  if (typeof value !== "string") {
    throw new Error(`${label} es obligatorio.`);
  }

  const normalized = value.trim();

  if (
    normalized.length < 1
    || normalized.length > maximumLength
  ) {
    throw new Error(`${label} no es válido.`);
  }

  return normalized;
}

function normalizeOptionalText(
  value: unknown,
  label: string,
  maximumLength: number,
) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error(`${label} no es válido.`);
  }

  const normalized = value.trim();

  if (normalized.length > maximumLength) {
    throw new Error(`${label} es demasiado largo.`);
  }

  return normalized;
}

function normalizeBoolean(
  value: unknown,
  label: string,
) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} no es válido.`);
  }

  return value;
}

function normalizeMoney(
  value: unknown,
  label: string,
) {
  const numeric = Number(value);

  if (
    !Number.isFinite(numeric)
    || numeric < 0
    || numeric > 9_999_999_999.99
  ) {
    throw new Error(`${label} no es válido.`);
  }

  return Math.round(numeric * 100) / 100;
}

function normalizeOptionalMoney(
  value: unknown,
  label: string,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return normalizeMoney(value, label);
}

function normalizeDiscountPercent(
  value: unknown,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
    throw new Error("El descuento de la categoría no es válido.");
  }

  return Math.round(numeric * 100) / 100;
}

function normalizeBusinessMenuCategoryProducts(
  value: unknown,
): BusinessMenuCategoryProductInput[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.length > 500) {
    throw new Error("Los productos de la promoción no son válidos.");
  }

  const ids = new Set<string>();

  return value.map((entry) => {
    const record = asRecord(
      entry,
      "Un producto de la promoción no es válido.",
    );
    const productId = normalizeBusinessMenuEntityId(
      record.productId,
      "El producto de la promoción",
    );
    const quantity = Number(record.quantity);

    if (!productId || ids.has(productId)) {
      throw new Error("La promoción contiene productos duplicados o inválidos.");
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
      throw new Error("La cantidad de la promoción debe estar entre 1 y 9999.");
    }

    ids.add(productId);

    return { productId, quantity };
  });
}

export function normalizeBusinessMenuEntityId(
  value: unknown,
  label = "El identificador",
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (
    typeof value !== "string"
    || !UUID_PATTERN.test(value)
  ) {
    throw new Error(`${label} no es válido.`);
  }

  return value;
}

export function normalizeBusinessMenuCategory(
  value: unknown,
): BusinessMenuCategoryInput {
  const record = asRecord(
    value,
    "La categoría recibida es inválida.",
  );

  const isPromotion = record.isPromotion === undefined
    ? false
    : normalizeBoolean(
        record.isPromotion,
        "La promoción de la categoría",
      );
  const products = normalizeBusinessMenuCategoryProducts(
    record.products,
  );

  if (!isPromotion && products.length > 0) {
    throw new Error("Solo una promoción puede guardar cantidades de productos.");
  }

  return {
    name: normalizeRequiredText(
      record.name,
      "El nombre de la categoría",
      120,
    ),
    description: normalizeOptionalText(
      record.description,
      "La descripción de la categoría",
      2000,
    ),
    isVisible: normalizeBoolean(
      record.isVisible,
      "La visibilidad de la categoría",
    ),
    isActive: normalizeBoolean(
      record.isActive,
      "El estado de la categoría",
    ),
    isPromotion,
    fixedPrice: normalizeOptionalMoney(
      record.fixedPrice,
      "El precio fijo de la categoría",
    ),
    discountPercent: normalizeDiscountPercent(
      record.discountPercent,
    ),
    products,
  };
}

export function normalizeBusinessMenuItem(
  value: unknown,
): BusinessMenuItemInput {
  const record = asRecord(
    value,
    "El producto recibido es inválido.",
  );
  const status = record.status;

  if (status !== "available" && status !== "paused") {
    throw new Error(
      "El estado del producto no es válido.",
    );
  }

  return {
    categoryId: normalizeBusinessMenuEntityId(
      record.categoryId,
      "La categoría del producto",
    ),
    name: normalizeRequiredText(
      record.name,
      "El nombre del producto",
      160,
    ),
    description: normalizeOptionalText(
      record.description,
      "La descripción del producto",
      4000,
    ),
    price: normalizeMoney(
      record.price,
      "El precio del producto",
    ),
    status,
    isVisible: normalizeBoolean(
      record.isVisible,
      "La visibilidad del producto",
    ),
    isFeatured: normalizeBoolean(
      record.isFeatured,
      "El destacado del producto",
    ),
    imageUrl: normalizeOptionalText(
      record.imageUrl,
      "La imagen del producto",
      2048,
    ),
  };
}

export function normalizeBusinessMenuQuickChanges(
  value: unknown,
): BusinessMenuQuickChange[] {
  if (!Array.isArray(value) || value.length > 500) {
    throw new Error(
      "Los cambios rápidos recibidos son inválidos.",
    );
  }

  const ids = new Set<string>();

  return value.map((entry) => {
    const record = asRecord(
      entry,
      "Un cambio rápido no es válido.",
    );
    const id = normalizeBusinessMenuEntityId(
      record.id,
      "El producto",
    );

    if (!id || ids.has(id)) {
      throw new Error(
        "Los cambios rápidos contienen productos duplicados.",
      );
    }

    ids.add(id);

    return {
      id,
      categoryId: normalizeBusinessMenuEntityId(
        record.categoryId,
        "La categoría del producto",
      ),
      price: normalizeMoney(
        record.price,
        "El precio del producto",
      ),
      isVisible: normalizeBoolean(
        record.isVisible,
        "La visibilidad del producto",
      ),
    };
  });
}

function normalizeDateString(
  value: unknown,
) {
  return typeof value === "string" ? value : "";
}

export function mapBusinessMenuCategoryRow(
  row: BusinessMenuCategoryDatabaseRow,
): BusinessMenuCategoryEditor {
  const products = Array.isArray(row.products)
    ? row.products.flatMap((product) => {
        const productId =
          product.menu_item_id ?? product.product_id;

        if (!productId) {
          return [];
        }

        return [{
          productId,
          quantity: Number(product.quantity),
        }];
      })
    : [];

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    sortOrder: Number(row.sort_order),
    isVisible: Boolean(row.is_visible),
    isActive: Boolean(row.is_active),
    isPromotion: Boolean(row.is_promotion),
    fixedPrice:
      row.fixed_price === null ? null : Number(row.fixed_price),
    discountPercent:
      row.discount_percent === null
        ? null
        : Number(row.discount_percent),
    products,
    archivedAt: row.archived_at,
    createdAt: normalizeDateString(row.created_at),
    updatedAt: normalizeDateString(row.updated_at),
  };
}

export function mapBusinessMenuItemRow(
  row: BusinessMenuItemDatabaseRow,
): BusinessMenuItemEditor {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description ?? "",
    price: Number(row.price),
    status: row.status,
    isVisible: Boolean(row.is_visible),
    isFeatured: Boolean(row.is_featured),
    imageUrl: row.image_url ?? "",
    sortOrder: Number(row.sort_order),
    archivedAt: row.archived_at,
    createdAt: normalizeDateString(row.created_at),
    updatedAt: normalizeDateString(row.updated_at),
  };
}

export function toBusinessMenuCategoryRpcPayload(
  category: BusinessMenuCategoryInput,
) {
  return {
    name: category.name,
    description: category.description,
    is_visible: category.isVisible,
    is_active: category.isActive,
    is_promotion: category.isPromotion,
    fixed_price: category.fixedPrice,
    discount_percent: category.discountPercent,
  };
}

export function toBusinessMenuCategoryProductsRpcPayload(
  products: BusinessMenuCategoryProductInput[],
) {
  return products.map((product) => ({
    product_id: product.productId,
    quantity: product.quantity,
  }));
}

export function toBusinessMenuItemRpcPayload(
  item: BusinessMenuItemInput,
) {
  return {
    category_id: item.categoryId,
    name: item.name,
    description: item.description,
    price: item.price,
    status: item.status,
    is_visible: item.isVisible,
    is_featured: item.isFeatured,
    image_url: item.imageUrl,
  };
}

export function toBusinessMenuQuickChangesRpcPayload(
  items: BusinessMenuQuickChange[],
) {
  return items.map((item) => ({
    id: item.id,
    category_id: item.categoryId,
    price: item.price,
    is_visible: item.isVisible,
  }));
}
