import type {
  BusinessKitchenCommandItem,
  BusinessKitchenStatus,
} from "@/lib/kitchen/business-kitchen-contract";
import {
  BUSINESS_KITCHEN_STATUSES,
  normalizeBusinessKitchenDate,
} from "@/lib/kitchen/business-kitchen-contract";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type BusinessShippingKitchenCommand = {
  id: string;
  orderId: string;
  shippingId: string;
  ticketId: string | null;
  source: "delivery";
  sourceLabel: "Delivery" | "Retiro";
  client: string;
  time: string;
  note: string;
  items: BusinessKitchenCommandItem[];
  status: BusinessKitchenStatus;
  targetSeconds: number;
  enteredAt: string;
  startedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  isAddition: boolean;
};

export type BusinessShippingKitchenSnapshot = {
  businessDate: string;
  commands: BusinessShippingKitchenCommand[];
};

function record(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

function uuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} no es válido.`);
  }
  return value.toLowerCase();
}

function nullableUuid(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  return uuid(value, label);
}

function text(value: unknown, label: string, maximumLength: number) {
  if (typeof value !== "string") throw new Error(`${label} no es válido.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) {
    throw new Error(`${label} no es válido.`);
  }
  return normalized;
}

function optionalText(value: unknown, maximumLength: number) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") {
    throw new Error("La nota de Cocina no es válida.");
  }
  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    throw new Error("La nota de Cocina es demasiado larga.");
  }
  return normalized;
}

function timestamp(
  value: unknown,
  label: string,
  nullable = false,
): string | null {
  if (
    nullable
    && (value === null || value === undefined || value === "")
  ) {
    return null;
  }
  if (
    typeof value !== "string"
    || !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(`${label} no es válido.`);
  }
  return value;
}

function status(value: unknown): BusinessKitchenStatus {
  if (
    typeof value !== "string"
    || !BUSINESS_KITCHEN_STATUSES.includes(
      value as BusinessKitchenStatus,
    )
  ) {
    throw new Error("El estado de Cocina no es válido.");
  }
  return value as BusinessKitchenStatus;
}

function targetSeconds(value: unknown) {
  const normalized = Number(value);
  if (
    !Number.isInteger(normalized)
    || normalized < 1
    || normalized > 86400
  ) {
    throw new Error("El tiempo objetivo de Cocina no es válido.");
  }
  return normalized;
}

function item(value: unknown): BusinessKitchenCommandItem {
  const source = record(
    value,
    "Uno de los platos de Cocina no es válido.",
  );
  const quantity = Number(source.quantity);
  if (
    !Number.isInteger(quantity)
    || quantity < 1
    || quantity > 9999
  ) {
    throw new Error("La cantidad de Cocina no es válida.");
  }
  return {
    menuItemId: uuid(source.menuItemId, "El plato de Cocina"),
    name: text(source.name, "El nombre del plato", 160),
    quantity,
  };
}

function command(value: unknown): BusinessShippingKitchenCommand {
  const source = record(value, "Una comanda Shipping no es válida.");
  const rawItems = source.items;

  if (
    !Array.isArray(rawItems)
    || rawItems.length < 1
    || rawItems.length > 100
  ) {
    throw new Error(
      "Los platos de la comanda Shipping no son válidos.",
    );
  }

  if (
    source.source !== "delivery"
    || (source.sourceLabel !== "Delivery" && source.sourceLabel !== "Retiro")
  ) {
    throw new Error("El origen Shipping de Cocina no es válido.");
  }

  const time = text(source.time, "La hora de Cocina", 5);
  if (!/^\d{2}:\d{2}$/u.test(time)) {
    throw new Error("La hora de Cocina no es válida.");
  }

  return {
    id: text(source.id, "La comanda Shipping", 200),
    orderId: uuid(source.orderId, "El pedido Shipping"),
    shippingId: uuid(source.shippingId, "El Envío de Cocina"),
    ticketId: nullableUuid(source.ticketId, "La comanda agregada"),
    source: "delivery",
    sourceLabel: source.sourceLabel,
    client: text(source.client, "El cliente de Cocina", 160),
    time,
    note: optionalText(source.note, 2000),
    items: rawItems.map(item),
    status: status(source.status),
    targetSeconds: targetSeconds(source.targetSeconds),
    enteredAt: timestamp(source.enteredAt, "El ingreso a Cocina") as string,
    startedAt: timestamp(source.startedAt, "El inicio de Cocina", true),
    readyAt: timestamp(
      source.readyAt,
      "La finalización de preparación",
      true,
    ),
    completedAt: timestamp(
      source.completedAt,
      "La entrega de Cocina",
      true,
    ),
    isAddition: source.isAddition === true,
  };
}

export function mapBusinessShippingKitchenSnapshot(
  value: unknown,
): BusinessShippingKitchenSnapshot {
  const source = record(
    value,
    "La respuesta Shipping de Cocina no es válida.",
  );

  if (!Array.isArray(source.commands)) {
    throw new Error("Las comandas Shipping no son válidas.");
  }

  return {
    businessDate: normalizeBusinessKitchenDate(source.businessDate),
    commands: source.commands.map(command),
  };
}
