export type PublicShippingPaymentMethod =
  | "cash"
  | "card"
  | "mercado_pago"
  | "transfer";

export type PublicShippingOrderingBusiness = {
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
};

export type PublicShippingOrderingCategoryProduct = {
  productId: string;
  quantity: number;
};

export type PublicShippingOrderingCategory = {
  id: string;
  name: string;
  description: string;
  order: number;
  visible: boolean;
  active: boolean;
  isPromotion: boolean;
  fixedPrice: number | null;
  discountPercent: number | null;
  products: PublicShippingOrderingCategoryProduct[];
};

export type PublicShippingOrderingItem = {
  id: string;
  imageUrl: string;
  name: string;
  categoryId: string;
  description: string;
  price: number;
  status: "available";
  visible: boolean;
  featured: boolean;
};

export type PublicShippingOrderingSnapshot = {
  business: PublicShippingOrderingBusiness;
  categories: PublicShippingOrderingCategory[];
  items: PublicShippingOrderingItem[];
};

export type PublicShippingCreatedItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type PublicShippingCreateResult = {
  trackingId: string;
  deliveryType: "delivery" | "pickup";
  status: "confirmed";
  needsAcceptance: true;
  total: number;
  createdAt: string;
  items: PublicShippingCreatedItem[];
};

export type PublicShippingTrackingItem = {
  name: string;
  quantity: number;
};

export type PublicShippingTrackingSnapshot = {
  businessName: string;
  trackingId: string;
  deliveryType: "delivery" | "pickup";
  status: "confirmed" | "completed" | "cancelled";
  needsAcceptance: boolean;
  etaMinutes: number | null;
  createdAt: string;
  acceptedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  onTheWayAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  total: number;
  items: PublicShippingTrackingItem[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const TRACKING_PATTERN =
  /^PED-[A-Z0-9]{10,32}$/u;

function objectValue(
  value: unknown,
  label: string,
) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return value as Record<string, unknown>;
}

function textValue(
  value: unknown,
  label: string,
  maximumLength: number,
  allowEmpty = false,
) {
  if (typeof value !== "string") {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  const normalized = value.trim();

  if (
    (!allowEmpty && !normalized)
    || normalized.length > maximumLength
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return normalized;
}

function uuidValue(
  value: unknown,
  label: string,
) {
  const normalized =
    textValue(
      value,
      label,
      36,
    );

  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return normalized.toLowerCase();
}

function numberValue(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  const normalized = Number(value);

  if (
    !Number.isFinite(normalized)
    || normalized < minimum
    || normalized > maximum
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return normalized;
}

function nullableNumber(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (
    value === null
    || value === undefined
  ) {
    return null;
  }

  return numberValue(
    value,
    label,
    minimum,
    maximum,
  );
}

function booleanValue(
  value: unknown,
  label: string,
) {
  if (typeof value !== "boolean") {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return value;
}

function timestampValue(
  value: unknown,
  label: string,
  nullable = false,
): string | null {
  if (
    nullable
    && (
      value === null
      || value === undefined
      || value === ""
    )
  ) {
    return null;
  }

  if (
    typeof value !== "string"
    || !Number.isFinite(
      Date.parse(value),
    )
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return value;
}

function arrayValue(
  value: unknown,
  label: string,
  maximumLength: number,
) {
  if (
    !Array.isArray(value)
    || value.length > maximumLength
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return value;
}

function deliveryTypeValue(
  value: unknown,
) {
  if (
    value !== "delivery"
    && value !== "pickup"
  ) {
    throw new Error(
      "El tipo de envío no es válido.",
    );
  }

  return value;
}

function shippingStatusValue(
  value: unknown,
) {
  if (
    value !== "confirmed"
    && value !== "completed"
    && value !== "cancelled"
  ) {
    throw new Error(
      "El estado de envío no es válido.",
    );
  }

  return value;
}

function mapCategoryProduct(
  value: unknown,
): PublicShippingOrderingCategoryProduct {
  const source =
    objectValue(
      value,
      "La composición de promoción",
    );

  return {
    productId:
      uuidValue(
        source.productId,
        "El producto de promoción",
      ),
    quantity:
      numberValue(
        source.quantity,
        "La cantidad de promoción",
        1,
        9999,
      ),
  };
}

function mapCategory(
  value: unknown,
): PublicShippingOrderingCategory {
  const source =
    objectValue(
      value,
      "La categoría pública",
    );

  return {
    id:
      uuidValue(
        source.id,
        "La categoría pública",
      ),
    name:
      textValue(
        source.name,
        "El nombre de categoría",
        120,
      ),
    description:
      textValue(
        source.description ?? "",
        "La descripción de categoría",
        1000,
        true,
      ),
    order:
      numberValue(
        source.order,
        "El orden de categoría",
        0,
        1000000,
      ),
    visible:
      booleanValue(
        source.visible,
        "La visibilidad de categoría",
      ),
    active:
      booleanValue(
        source.active,
        "El estado de categoría",
      ),
    isPromotion:
      booleanValue(
        source.isPromotion,
        "La promoción",
      ),
    fixedPrice:
      nullableNumber(
        source.fixedPrice,
        "El precio fijo",
        0,
        9999999999.99,
      ),
    discountPercent:
      nullableNumber(
        source.discountPercent,
        "El descuento",
        0,
        100,
      ),
    products:
      arrayValue(
        source.products,
        "Los productos de promoción",
        100,
      ).map(
        mapCategoryProduct,
      ),
  };
}

function mapOrderingItem(
  value: unknown,
): PublicShippingOrderingItem {
  const source =
    objectValue(
      value,
      "El producto público",
    );

  if (source.status !== "available") {
    throw new Error(
      "El producto público no está disponible.",
    );
  }

  return {
    id:
      uuidValue(
        source.id,
        "El producto público",
      ),
    imageUrl:
      textValue(
        source.imageUrl ?? "",
        "La imagen pública",
        2000,
        true,
      ),
    name:
      textValue(
        source.name,
        "El nombre del producto",
        160,
      ),
    categoryId:
      source.categoryId === ""
        ? ""
        : uuidValue(
            source.categoryId,
            "La categoría del producto",
          ),
    description:
      textValue(
        source.description ?? "",
        "La descripción del producto",
        2000,
        true,
      ),
    price:
      numberValue(
        source.price,
        "El precio público",
        0,
        9999999999.99,
      ),
    status: "available",
    visible:
      booleanValue(
        source.visible,
        "La visibilidad del producto",
      ),
    featured:
      booleanValue(
        source.featured,
        "El destacado del producto",
      ),
  };
}

export function mapPublicShippingOrderingSnapshot(
  value: unknown,
): PublicShippingOrderingSnapshot {
  const source =
    objectValue(
      value,
      "La configuración pública de pedidos",
    );
  const business =
    objectValue(
      source.business,
      "El negocio público",
    );

  return {
    business: {
      name:
        textValue(
          business.name,
          "El nombre del negocio",
          160,
        ),
      address:
        textValue(
          business.address ?? "",
          "La dirección pública",
          500,
          true,
        ),
      phone:
        textValue(
          business.phone ?? "",
          "El teléfono público",
          80,
          true,
        ),
      whatsapp:
        textValue(
          business.whatsapp ?? "",
          "El WhatsApp público",
          80,
          true,
        ),
    },
    categories:
      arrayValue(
        source.categories,
        "Las categorías públicas",
        500,
      ).map(
        mapCategory,
      ),
    items:
      arrayValue(
        source.items,
        "Los productos públicos",
        2000,
      ).map(
        mapOrderingItem,
      ),
  };
}

function mapCreatedItem(
  value: unknown,
): PublicShippingCreatedItem {
  const source =
    objectValue(
      value,
      "El producto creado",
    );

  return {
    id:
      uuidValue(
        source.id,
        "El producto creado",
      ),
    name:
      textValue(
        source.name,
        "El nombre creado",
        160,
      ),
    price:
      numberValue(
        source.price,
        "El precio creado",
        0,
        9999999999.99,
      ),
    quantity:
      numberValue(
        source.quantity,
        "La cantidad creada",
        1,
        9999,
      ),
  };
}

export function mapPublicShippingCreateResult(
  value: unknown,
): PublicShippingCreateResult {
  const source =
    objectValue(
      value,
      "El pedido público creado",
    );
  const trackingId =
    textValue(
      source.trackingId,
      "El tracking público",
      40,
    );

  if (!TRACKING_PATTERN.test(trackingId)) {
    throw new Error(
      "El tracking público no es válido.",
    );
  }

  if (
    source.status !== "confirmed"
    || source.needsAcceptance !== true
  ) {
    throw new Error(
      "El estado inicial del pedido público no es válido.",
    );
  }

  return {
    trackingId,
    deliveryType:
      deliveryTypeValue(
        source.deliveryType,
      ),
    status: "confirmed",
    needsAcceptance: true,
    total:
      numberValue(
        source.total,
        "El total público",
        0,
        9999999999.99,
      ),
    createdAt:
      timestampValue(
        source.createdAt,
        "La creación pública",
      ) as string,
    items:
      arrayValue(
        source.items,
        "Los productos creados",
        100,
      ).map(
        mapCreatedItem,
      ),
  };
}

function mapTrackingItem(
  value: unknown,
): PublicShippingTrackingItem {
  const source =
    objectValue(
      value,
      "El producto de tracking",
    );

  return {
    name:
      textValue(
        source.name,
        "El nombre de tracking",
        160,
      ),
    quantity:
      numberValue(
        source.quantity,
        "La cantidad de tracking",
        1,
        9999,
      ),
  };
}

export function mapPublicShippingTrackingSnapshot(
  value: unknown,
): PublicShippingTrackingSnapshot {
  const source =
    objectValue(
      value,
      "El tracking público",
    );
  const trackingId =
    textValue(
      source.trackingId,
      "El código de tracking",
      40,
    );

  if (!TRACKING_PATTERN.test(trackingId)) {
    throw new Error(
      "El código de tracking no es válido.",
    );
  }

  return {
    businessName:
      textValue(
        source.businessName,
        "El negocio de tracking",
        160,
      ),
    trackingId,
    deliveryType:
      deliveryTypeValue(
        source.deliveryType,
      ),
    status:
      shippingStatusValue(
        source.status,
      ),
    needsAcceptance:
      booleanValue(
        source.needsAcceptance,
        "La aceptación del tracking",
      ),
    etaMinutes:
      nullableNumber(
        source.etaMinutes,
        "La demora estimada",
        1,
        1440,
      ),
    createdAt:
      timestampValue(
        source.createdAt,
        "La creación de tracking",
      ) as string,
    acceptedAt:
      timestampValue(
        source.acceptedAt,
        "La aceptación de tracking",
        true,
      ),
    preparingAt:
      timestampValue(
        source.preparingAt,
        "La preparación de tracking",
        true,
      ),
    readyAt:
      timestampValue(
        source.readyAt,
        "El listo de tracking",
        true,
      ),
    onTheWayAt:
      timestampValue(
        source.onTheWayAt,
        "El viaje de tracking",
        true,
      ),
    completedAt:
      timestampValue(
        source.completedAt,
        "La entrega de tracking",
        true,
      ),
    cancelledAt:
      timestampValue(
        source.cancelledAt,
        "La cancelación de tracking",
        true,
      ),
    total:
      numberValue(
        source.total,
        "El total de tracking",
        0,
        9999999999.99,
      ),
    items:
      arrayValue(
        source.items,
        "Los productos de tracking",
        100,
      ).map(
        mapTrackingItem,
      ),
  };
}

export function normalizePublicShippingPaymentMethod(
  value: unknown,
): PublicShippingPaymentMethod {
  if (typeof value !== "string") {
    return "cash";
  }

  const normalized =
    value.trim().toLowerCase();

  if (
    normalized === "transfer"
    || normalized === "transferencia"
  ) {
    return "transfer";
  }

  if (
    normalized === "card"
    || normalized === "tarjeta"
  ) {
    return "card";
  }

  if (
    normalized === "mercado_pago"
    || normalized === "mercado pago"
    || normalized === "mercadopago"
  ) {
    return "mercado_pago";
  }

  return "cash";
}

export function normalizePublicShippingSlug(
  value: unknown,
) {
  if (typeof value !== "string") {
    return "";
  }

  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .slice(0, 120);
}

export function normalizePublicTrackingCode(
  value: unknown,
) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized =
    decodeURIComponent(value)
      .trim()
      .toUpperCase()
      .slice(0, 40);

  return TRACKING_PATTERN.test(normalized)
    ? normalized
    : "";
}
