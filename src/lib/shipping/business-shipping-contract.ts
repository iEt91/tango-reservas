export const BUSINESS_SHIPPING_TYPES = [
  "delivery",
  "pickup",
] as const;

export type BusinessShippingType =
  (typeof BUSINESS_SHIPPING_TYPES)[number];

export const BUSINESS_SHIPPING_STATUSES = [
  "confirmed",
  "completed",
  "cancelled",
] as const;

export type BusinessShippingStatus =
  (typeof BUSINESS_SHIPPING_STATUSES)[number];

export const BUSINESS_SHIPPING_PAYMENT_METHODS = [
  "cash",
  "card",
  "mercado_pago",
  "transfer",
] as const;

export type BusinessShippingPaymentMethod =
  (typeof BUSINESS_SHIPPING_PAYMENT_METHODS)[number];

export const BUSINESS_SHIPPING_MILESTONES = [
  "ready",
  "on_the_way",
] as const;

export type BusinessShippingMilestone =
  (typeof BUSINESS_SHIPPING_MILESTONES)[number];

export type BusinessShippingOrderItem = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type BusinessShippingPayment = {
  id: string;
  method: BusinessShippingPaymentMethod;
  amount: number;
  createdAt: string;
};

export type BusinessShippingOrder = {
  id: string;
  orderId: string;
  deliveryType: BusinessShippingType;
  businessDate: string;
  time: string;
  client: string;
  phone: string;
  address: string;
  note: string;
  source: "manual" | "web";
  needsAcceptance: boolean;
  trackingId: string;
  preferredPaymentMethod: BusinessShippingPaymentMethod;
  status: BusinessShippingStatus;
  etaMinutes: number | null;
  acceptedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  onTheWayAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    kind: BusinessShippingType;
    status: "open" | "completed" | "cancelled";
    revision: number;
    subtotal: number;
    kitchenStatus: "pending" | "preparing" | "ready" | "completed";
    kitchenStartedAt: string | null;
    kitchenReadyAt: string | null;
    kitchenCompletedAt: string | null;
    items: BusinessShippingOrderItem[];
  };
  payments: BusinessShippingPayment[];
};

export type BusinessShippingSnapshot = {
  startDate: string;
  endDate: string;
  deliveries: BusinessShippingOrder[];
};

export type SaveBusinessShippingOrderInput = {
  shippingId?: string | null;
  businessDate: string;
  time: string;
  deliveryType: BusinessShippingType;
  client: string;
  phone: string;
  address: string;
  note?: string;
  source?: "manual" | "web";
  needsAcceptance?: boolean;
  preferredPaymentMethod: BusinessShippingPaymentMethod;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
  operationKey: string;
};

export type AcceptBusinessShippingOrderInput = {
  shippingId: string;
  etaMinutes: number;
  operationKey: string;
};

export type CancelBusinessShippingOrderInput = {
  shippingId: string;
  returnStock: boolean;
  operationKey: string;
};

export type SetBusinessShippingMilestoneInput = {
  shippingId: string;
  milestone: BusinessShippingMilestone;
  operationKey: string;
};

export type CompleteBusinessShippingPaymentInput = {
  shippingId: string;
  payments: Array<{
    method: BusinessShippingPaymentMethod;
    amount: number;
  }>;
  operationKey: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Los datos de Envíos no son válidos.");
  }

  return value as Record<string, unknown>;
}

function stringValue(
  value: unknown,
  label: string,
  min: number,
  max: number,
) {
  if (typeof value !== "string") {
    throw new Error(`${label} no es válido.`);
  }

  const normalized = value.trim();

  if (normalized.length < min || normalized.length > max) {
    throw new Error(`${label} no es válido.`);
  }

  return normalized;
}

function optionalText(value: unknown, max: number) {
  if (value === null || value === undefined) return "";

  if (typeof value !== "string") {
    throw new Error("El texto opcional no es válido.");
  }

  const normalized = value.trim();

  if (normalized.length > max) {
    throw new Error("El texto opcional es demasiado largo.");
  }

  return normalized;
}

export function normalizeBusinessShippingId(
  value: unknown,
  options: { nullable: true },
): string | null;
export function normalizeBusinessShippingId(
  value: unknown,
  options?: { nullable?: false },
): string;
export function normalizeBusinessShippingId(
  value: unknown,
  options: { nullable?: boolean } = {},
): string | null {
  if (
    options.nullable
    && (value === null || value === undefined || value === "")
  ) {
    return null;
  }

  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error("El identificador de Envíos no es válido.");
  }

  return value.toLowerCase();
}

export function normalizeBusinessShippingDate(value: unknown) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw new Error("La fecha de Envíos no es válida.");
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime())
    || date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("La fecha de Envíos no es válida.");
  }

  return value;
}

export function normalizeBusinessShippingTime(value: unknown) {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) {
    throw new Error("La hora de Envíos no es válida.");
  }

  return value;
}

export function normalizeBusinessShippingOperationKey(value: unknown) {
  return stringValue(value, "La clave de operación", 8, 120);
}

function shippingType(value: unknown): BusinessShippingType {
  if (
    typeof value !== "string"
    || !BUSINESS_SHIPPING_TYPES.includes(value as BusinessShippingType)
  ) {
    throw new Error("El tipo de Envíos no es válido.");
  }

  return value as BusinessShippingType;
}

function paymentMethod(value: unknown): BusinessShippingPaymentMethod {
  if (
    typeof value !== "string"
    || !BUSINESS_SHIPPING_PAYMENT_METHODS.includes(
      value as BusinessShippingPaymentMethod,
    )
  ) {
    throw new Error("El medio de pago no es válido.");
  }

  return value as BusinessShippingPaymentMethod;
}

function positiveInteger(value: unknown, label: string, max: number) {
  if (
    typeof value !== "number"
    || !Number.isInteger(value)
    || value < 1
    || value > max
  ) {
    throw new Error(`${label} no es válido.`);
  }

  return value;
}

export function normalizeSaveBusinessShippingOrderInput(
  value: unknown,
): SaveBusinessShippingOrderInput {
  const source = record(value);
  const deliveryType = shippingType(source.deliveryType);
  const rawItems = source.items;

  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 100) {
    throw new Error("El pedido debe tener entre 1 y 100 productos.");
  }

  const seen = new Set<string>();
  const items = rawItems.map((rawItem) => {
    const item = record(rawItem);
    const menuItemId = normalizeBusinessShippingId(item.menuItemId);

    if (seen.has(menuItemId)) {
      throw new Error("El pedido no puede repetir productos.");
    }

    seen.add(menuItemId);

    return {
      menuItemId,
      quantity: positiveInteger(item.quantity, "La cantidad", 9999),
    };
  });

  const normalizedSource = source.source ?? "manual";

  if (normalizedSource !== "manual" && normalizedSource !== "web") {
    throw new Error("El origen del pedido no es válido.");
  }

  const needsAcceptance = source.needsAcceptance ?? false;

  if (typeof needsAcceptance !== "boolean") {
    throw new Error("El estado de aceptación no es válido.");
  }

  if (normalizedSource === "manual" && needsAcceptance) {
    throw new Error("Un pedido manual no puede quedar pendiente de aceptación.");
  }

  const address = optionalText(source.address, 500);

  if (deliveryType === "delivery" && !address) {
    throw new Error("La dirección es obligatoria para Delivery.");
  }

  return {
    shippingId: normalizeBusinessShippingId(source.shippingId, {
      nullable: true,
    }),
    businessDate: normalizeBusinessShippingDate(source.businessDate),
    time: normalizeBusinessShippingTime(source.time),
    deliveryType,
    client: stringValue(source.client, "El cliente", 1, 160),
    phone: stringValue(source.phone, "El teléfono", 3, 40),
    address: deliveryType === "pickup" ? "" : address,
    note: optionalText(source.note, 4000),
    source: normalizedSource,
    needsAcceptance,
    preferredPaymentMethod: paymentMethod(source.preferredPaymentMethod),
    items,
    operationKey: normalizeBusinessShippingOperationKey(source.operationKey),
  };
}

export function normalizeAcceptBusinessShippingOrderInput(
  value: unknown,
): AcceptBusinessShippingOrderInput {
  const source = record(value);

  return {
    shippingId: normalizeBusinessShippingId(source.shippingId),
    etaMinutes: positiveInteger(source.etaMinutes, "El tiempo estimado", 1440),
    operationKey: normalizeBusinessShippingOperationKey(source.operationKey),
  };
}

export function normalizeCancelBusinessShippingOrderInput(
  value: unknown,
): CancelBusinessShippingOrderInput {
  const source = record(value);

  if (typeof source.returnStock !== "boolean") {
    throw new Error("La opción de devolución de Stock no es válida.");
  }

  return {
    shippingId: normalizeBusinessShippingId(source.shippingId),
    returnStock: source.returnStock,
    operationKey: normalizeBusinessShippingOperationKey(source.operationKey),
  };
}

export function normalizeSetBusinessShippingMilestoneInput(
  value: unknown,
): SetBusinessShippingMilestoneInput {
  const source = record(value);

  if (
    typeof source.milestone !== "string"
    || !BUSINESS_SHIPPING_MILESTONES.includes(
      source.milestone as BusinessShippingMilestone,
    )
  ) {
    throw new Error("El hito de Envíos no es válido.");
  }

  return {
    shippingId: normalizeBusinessShippingId(source.shippingId),
    milestone: source.milestone as BusinessShippingMilestone,
    operationKey: normalizeBusinessShippingOperationKey(source.operationKey),
  };
}

export function normalizeCompleteBusinessShippingPaymentInput(
  value: unknown,
): CompleteBusinessShippingPaymentInput {
  const source = record(value);

  if (!Array.isArray(source.payments) || source.payments.length > 4) {
    throw new Error("Los pagos de Envíos no son válidos.");
  }

  const seen = new Set<BusinessShippingPaymentMethod>();
  const payments = source.payments.map((rawPayment) => {
    const raw = record(rawPayment);
    const method = paymentMethod(raw.method);

    if (seen.has(method)) {
      throw new Error("No se puede repetir un medio de pago.");
    }

    seen.add(method);

    if (
      typeof raw.amount !== "number"
      || !Number.isFinite(raw.amount)
      || raw.amount <= 0
      || raw.amount > 9999999999.99
      || Math.round(raw.amount * 100) / 100 !== raw.amount
    ) {
      throw new Error("El importe del pago no es válido.");
    }

    return {
      method,
      amount: raw.amount,
    };
  });

  return {
    shippingId: normalizeBusinessShippingId(source.shippingId),
    payments,
    operationKey: normalizeBusinessShippingOperationKey(source.operationKey),
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function finiteNumber(value: unknown, label: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`${label} persistente no es válido.`);
  }

  return number;
}

export function mapBusinessShippingOrder(value: unknown): BusinessShippingOrder {
  const source = record(value);
  const order = record(source.order);
  const rawItems = order.items;
  const rawPayments = source.payments;

  if (!Array.isArray(rawItems) || !Array.isArray(rawPayments)) {
    throw new Error("El snapshot persistente de Envíos no es válido.");
  }

  const status = source.status;
  const deliveryType = shippingType(source.deliveryType);
  const preferredPaymentMethod = paymentMethod(source.preferredPaymentMethod);

  if (
    typeof status !== "string"
    || !BUSINESS_SHIPPING_STATUSES.includes(status as BusinessShippingStatus)
  ) {
    throw new Error("El estado persistente de Envíos no es válido.");
  }

  return {
    id: normalizeBusinessShippingId(source.id),
    orderId: normalizeBusinessShippingId(source.orderId),
    deliveryType,
    businessDate: normalizeBusinessShippingDate(source.businessDate),
    time: normalizeBusinessShippingTime(source.time),
    client: stringValue(source.client, "El cliente", 1, 160),
    phone: stringValue(source.phone, "El teléfono", 3, 40),
    address: optionalText(source.address, 500),
    note: optionalText(source.note, 4000),
    source: source.source === "web" ? "web" : "manual",
    needsAcceptance: source.needsAcceptance === true,
    trackingId: stringValue(source.trackingId, "El código de seguimiento", 14, 36),
    preferredPaymentMethod,
    status: status as BusinessShippingStatus,
    etaMinutes: source.etaMinutes === null
      ? null
      : positiveInteger(Number(source.etaMinutes), "El ETA", 1440),
    acceptedAt: stringOrNull(source.acceptedAt),
    preparingAt: stringOrNull(source.preparingAt),
    readyAt: stringOrNull(source.readyAt),
    onTheWayAt: stringOrNull(source.onTheWayAt),
    completedAt: stringOrNull(source.completedAt),
    cancelledAt: stringOrNull(source.cancelledAt),
    revision: positiveInteger(Number(source.revision), "La revisión", 2147483647),
    createdAt: stringValue(source.createdAt, "La fecha de creación", 1, 80),
    updatedAt: stringValue(source.updatedAt, "La fecha de actualización", 1, 80),
    order: {
      id: normalizeBusinessShippingId(order.id),
      kind: shippingType(order.kind),
      status: order.status === "completed"
        ? "completed"
        : order.status === "cancelled"
          ? "cancelled"
          : "open",
      revision: positiveInteger(Number(order.revision), "La revisión del pedido", 2147483647),
      subtotal: finiteNumber(order.subtotal, "El subtotal"),
      kitchenStatus: order.kitchenStatus === "preparing"
        ? "preparing"
        : order.kitchenStatus === "ready"
          ? "ready"
          : order.kitchenStatus === "completed"
            ? "completed"
            : "pending",
      kitchenStartedAt: stringOrNull(order.kitchenStartedAt),
      kitchenReadyAt: stringOrNull(order.kitchenReadyAt),
      kitchenCompletedAt: stringOrNull(order.kitchenCompletedAt),
      items: rawItems.map((rawItem) => {
        const item = record(rawItem);

        return {
          menuItemId: normalizeBusinessShippingId(item.menuItemId),
          name: stringValue(item.name, "El nombre del producto", 1, 160),
          unitPrice: finiteNumber(item.unitPrice, "El precio"),
          quantity: positiveInteger(Number(item.quantity), "La cantidad", 9999),
        };
      }),
    },
    payments: rawPayments.map((rawPayment) => {
      const payment = record(rawPayment);

      return {
        id: normalizeBusinessShippingId(payment.id),
        method: paymentMethod(payment.method),
        amount: finiteNumber(payment.amount, "El importe"),
        createdAt: stringValue(payment.createdAt, "La fecha del pago", 1, 80),
      };
    }),
  };
}

export function mapBusinessShippingSnapshot(value: unknown): BusinessShippingSnapshot {
  const source = record(value);

  if (!Array.isArray(source.deliveries)) {
    throw new Error("El snapshot persistente de Envíos no es válido.");
  }

  return {
    startDate: normalizeBusinessShippingDate(source.startDate),
    endDate: normalizeBusinessShippingDate(source.endDate),
    deliveries: source.deliveries.map(mapBusinessShippingOrder),
  };
}

export function toBusinessShippingItemsRpcPayload(
  items: SaveBusinessShippingOrderInput["items"],
) {
  return items.map((item) => ({
    menu_item_id: item.menuItemId,
    quantity: item.quantity,
  }));
}
