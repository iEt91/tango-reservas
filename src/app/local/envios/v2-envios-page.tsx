"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  PackageCheck,
  Plus,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Badge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2MetricCard, V2Card } from "@/components/v2/v2-card";
import { V2DataTable } from "@/components/v2/v2-data-table";
import { V2FilterBar } from "@/components/v2/v2-filter-bar";
import { V2Input, V2Select, V2Textarea } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import { createV2OperationalId } from "@/lib/v2-operational-storage";
import {
  v2Deliveries,
  v2MenuCategories,
  v2MenuItems,
  v2StockProducts,
  type V2DeliveryStatus,
  type V2DeliveryType,
} from "@/lib/v2/v2-mock-data";

type V2DeliveryOrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type V2KitchenTicket = {
  id: string;
  status: "pending" | "preparing" | "ready" | "completed";
  items: V2DeliveryOrderItem[];
  createdAt: string;
  startedAt?: string;
  readyAt?: string;
  completedAt?: string;
};

type V2DeliveryWhatsAppAction = "confirmation" | "modification" | "cancellation";
type V2SortDirection = "asc" | "desc";
type V2DateFilterMode = "single" | "range" | "all";
type V2DeliveryColumnSortKey = "id" | "time" | "client" | "phone" | "type" | "total" | "payment";

type V2DeliveryStockMovement = {
  productId: string;
  productName: string;
  quantity: number;
};

type V2StockMovementLog = {
  id: string;
  createdAt: string;
  type: "discount" | "return" | "manual";
  origin: "envios" | "reservas" | "manual";
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  label: string;
  detail?: string;
  referenceId?: string;
  client?: string;
};

type V2RecipeIngredient = {
  id: string;
  stockProductId?: string;
  name: string;
  quantity: number;
  unit: string;
};

type V2RecipeConfig = {
  id: string;
  menuItemId?: string;
  name: string;
  ingredients: V2RecipeIngredient[];
};

type V2MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
};

type V2StoredMenuItem = {
  id: string;
  name: string;
  categoryId: string;
  description?: string;
  price: number;
  status?: "available" | "paused";
  visible?: boolean;
  featured?: boolean;
};

type V2StoredMenuCategory = {
  id: string;
  name: string;
  order: number;
  visible?: boolean;
  active?: boolean;
};

type V2Delivery = {
  id: string;
  date?: string;
  time: string;
  client: string;
  phone: string;
  address: string;
  deliveryType: V2DeliveryType;
  order: string;
  orderItems?: V2DeliveryOrderItem[];
  total: number;
  payment: string;
  note: string;
  status: V2DeliveryStatus;
  source?: "web" | "manual";
  needsAcceptance?: boolean;
  trackingId?: string;
  stockDiscounted?: boolean;
  stockReturned?: boolean;
  stockMovements?: V2DeliveryStockMovement[];
  createdAt?: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  onTheWayAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  kitchenStatus?: "pending" | "preparing" | "ready" | "completed";
  kitchenStartedAt?: string;
  kitchenReadyAt?: string;
  kitchenCompletedAt?: string;
  kitchenTickets?: V2KitchenTicket[];
};

type V2DeliveryFormState = {
  client: string;
  phone: string;
  time: string;
  deliveryType: V2DeliveryType;
  address: string;
  payment: string;
  note: string;
  status: V2DeliveryStatus;
};

const DELIVERIES_STORAGE_KEY = "tango-v2-deliveries-v1";
const DELIVERIES_EVENT = "tango-v2-deliveries-updated";
const STOCK_PRODUCTS_STORAGE_KEY = "tango-v2-stock-products";
const STOCK_PRODUCTS_EVENT = "tango-v2-stock-products-updated";
const STOCK_MOVEMENTS_STORAGE_KEY = "tango-v2-stock-movements";
const LOCAL_CONFIG_STORAGE_KEY = "tango-v2-local-config-v1";
const MENU_ITEMS_STORAGE_KEY = "tango-v2-menu-items";
const MENU_CATEGORIES_STORAGE_KEY = "tango-v2-menu-categories";
const CASH_REGISTER_STORAGE_KEY = "tango-v2-cash-register-v1";
const DELIVERY_WHATSAPP_TEST_PHONE = "542216145679";
const USE_DELIVERY_WHATSAPP_TEST_PHONE = false;
function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCashRegisterError(date: string) {
  if (typeof window === "undefined") return "";

  try {
    const records = JSON.parse(
      window.localStorage.getItem(CASH_REGISTER_STORAGE_KEY) ?? "[]"
    ) as Array<{ date?: string; status?: string }>;
    const cashRegister = records.find((record) => record.date === date);

    if (cashRegister?.status === "open") return "";
    if (cashRegister?.status === "closed") {
      return "La caja de este día está cerrada. Reabrila antes de registrar el cobro.";
    }

    return "No hay una caja abierta para este día. Abrila antes de registrar el cobro.";
  } catch {
    return "No se pudo comprobar el estado de la caja. Revisala antes de registrar el cobro.";
  }
}

const TODAY_DELIVERIES_DATE = getTodayDateKey();

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const FALLBACK_MENU_ITEMS: V2MenuItem[] = v2MenuItems
  .filter((item) => item.visible !== false && item.status !== "paused")
  .map((item) => {
    const category = v2MenuCategories.find((candidate) => candidate.id === item.categoryId);

    return {
      id: item.id,
      name: item.name,
      price: item.price,
      category: category?.name ?? "Sin categoría",
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

const FALLBACK_MENU_CATEGORIES = [
  "Todos",
  ...Array.from(new Set(FALLBACK_MENU_ITEMS.map((item) => item.category))).sort((a, b) =>
    a.localeCompare(b, "es")
  ),
];

type V2MenuCategory = string;

const DEFAULT_DELIVERY_FORM: V2DeliveryFormState = {
  client: "",
  phone: "",
  time: "20:00",
  deliveryType: "delivery",
  address: "",
  payment: "Efectivo",
  note: "",
  status: "confirmed",
};

function readFromStorage<T>(key: string, fallback: T) {
  if (typeof window === "undefined") return fallback;

  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) return fallback;

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function writeToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(DELIVERIES_EVENT));
}

function readDeliveryMenuItems() {
  const storedCategories = readFromStorage<V2StoredMenuCategory[]>(
    MENU_CATEGORIES_STORAGE_KEY,
    v2MenuCategories
  );
  const categoryNameById = new Map(
    storedCategories.map((category) => [category.id, category.name])
  );

  return readFromStorage<V2StoredMenuItem[]>(MENU_ITEMS_STORAGE_KEY, v2MenuItems)
    .filter((item) => item.visible !== false && item.status !== "paused")
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price) || 0,
      category: categoryNameById.get(item.categoryId) ?? "Sin categoría",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function readDeliveryMenuCategories(items: V2MenuItem[]) {
  return [
    "Todos",
    ...Array.from(new Set(items.map((item) => item.category))).sort((a, b) =>
      a.localeCompare(b, "es")
    ),
  ];
}

type V2StockProductDraft = (typeof v2StockProducts)[number];

function normalizeTextForStock(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function readStockProductsFromStorage() {
  return readFromStorage<V2StockProductDraft[]>(
    STOCK_PRODUCTS_STORAGE_KEY,
    v2StockProducts
  );
}

function writeStockProductsToStorage(products: V2StockProductDraft[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STOCK_PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  window.dispatchEvent(new Event(STOCK_PRODUCTS_EVENT));
}

function readStockMovementHistory() {
  return readFromStorage<V2StockMovementLog[]>(STOCK_MOVEMENTS_STORAGE_KEY, []);
}

function appendStockMovementHistory(
  movements: V2DeliveryStockMovement[],
  direction: "discount" | "return",
  delivery: V2Delivery
) {
  if (typeof window === "undefined" || movements.length === 0) return;

  const stockProducts = readStockProductsFromStorage();
  const logs: V2StockMovementLog[] = movements.map((movement) => {
    const product = stockProducts.find((item) => item.id === movement.productId);

    return {
      id: createV2OperationalId("stock-mov-env"),
      createdAt: new Date().toISOString(),
      type: direction,
      origin: "envios",
      productId: movement.productId,
      productName: movement.productName,
      quantity: movement.quantity,
      unit: product?.unit ?? "unidad",
      label: direction === "discount" ? "Pedido web aceptado" : "Stock devuelto por pedido cancelado",
      detail: delivery.order,
      referenceId: delivery.id,
      client: delivery.client,
    };
  });

  const nextHistory = [...logs, ...readStockMovementHistory()].slice(0, 200);

  window.localStorage.setItem(STOCK_MOVEMENTS_STORAGE_KEY, JSON.stringify(nextHistory));
  window.dispatchEvent(new Event(STOCK_PRODUCTS_EVENT));
}

function readRecipesFromConfig() {
  if (typeof window === "undefined") return [] as V2RecipeConfig[];

  try {
    const rawValue = window.localStorage.getItem(LOCAL_CONFIG_STORAGE_KEY);

    if (!rawValue) return [];

    const parsedConfig = JSON.parse(rawValue) as { recipes?: unknown };

    if (!Array.isArray(parsedConfig.recipes)) return [];

    return parsedConfig.recipes
      .map((recipe) => recipe as Partial<V2RecipeConfig>)
      .filter((recipe) => recipe.id && Array.isArray(recipe.ingredients))
      .map((recipe) => ({
        id: recipe.id ?? "",
        menuItemId: recipe.menuItemId ?? "",
        name: recipe.name ?? "",
        ingredients: (recipe.ingredients ?? []).map((ingredient) => ({
          id: ingredient.id ?? `ingredient-${Date.now()}`,
          stockProductId: ingredient.stockProductId ?? "",
          name: ingredient.name ?? "Insumo",
          quantity: Number(ingredient.quantity) || 0,
          unit: ingredient.unit ?? "unidad",
        })),
      }));
  } catch {
    return [] as V2RecipeConfig[];
  }
}

function convertRecipeQuantityToStockUnit(quantity: number, fromUnit: string, toUnit: string) {
  const from = normalizeTextForStock(fromUnit);
  const to = normalizeTextForStock(toUnit);

  if (from === to) return quantity;

  if (from === "g" && to === "kg") return quantity / 1000;
  if (from === "kg" && to === "g") return quantity * 1000;
  if (from === "ml" && to === "l") return quantity / 1000;
  if (from === "l" && to === "ml") return quantity * 1000;

  return quantity;
}

function findStockProductByName(products: V2StockProductDraft[], search: string) {
  const query = normalizeTextForStock(search);

  return products.find((product) => {
    const name = normalizeTextForStock(product.name);

    return name === query || name.includes(query) || query.includes(name);
  });
}

function addMovement(
  movements: Map<string, V2DeliveryStockMovement>,
  stockProduct: V2StockProductDraft | undefined,
  quantity: number
) {
  if (!stockProduct || quantity <= 0) return;

  const current = movements.get(stockProduct.id);

  movements.set(stockProduct.id, {
    productId: stockProduct.id,
    productName: stockProduct.name,
    quantity: Number(((current?.quantity ?? 0) + quantity).toFixed(2)),
  });
}

function resolveStockMovementsForDelivery(delivery: V2Delivery) {
  const stockProducts = readStockProductsFromStorage();
  const recipes = readRecipesFromConfig();
  const recipeByMenuItemId = new Map(
    recipes
      .filter((recipe) => recipe.menuItemId)
      .map((recipe) => [recipe.menuItemId, recipe])
  );
  const movements = new Map<string, V2DeliveryStockMovement>();

  function addFallbackMovement(
    stockProduct: V2StockProductDraft | undefined,
    quantity: number
  ) {
    addMovement(movements, stockProduct, quantity);
  }

  const stock = {
    harina: findStockProductByName(stockProducts, "Harina 000"),
    muzzarella: findStockProductByName(stockProducts, "Muzzarella"),
    carne: findStockProductByName(stockProducts, "Carne picada"),
    vino: findStockProductByName(stockProducts, "Vino Malbec"),
    gaseosa: findStockProductByName(stockProducts, "Gaseosa cola 1.5L"),
    cajasPizza: findStockProductByName(stockProducts, "Cajas de pizza grandes"),
  };

  (delivery.orderItems ?? []).forEach((item) => {
    const quantity = Number(item.quantity) || 0;

    if (quantity <= 0) return;

    const recipe = recipeByMenuItemId.get(item.id);

    if (recipe) {
      recipe.ingredients.forEach((ingredient) => {
        if (!ingredient.stockProductId) return;

        const stockProduct = stockProducts.find(
          (product) => product.id === ingredient.stockProductId
        );

        if (!stockProduct) return;

        const movementQuantity = convertRecipeQuantityToStockUnit(
          ingredient.quantity * quantity,
          ingredient.unit,
          stockProduct.unit
        );

        addMovement(movements, stockProduct, movementQuantity);
      });

      return;
    }

    const name = normalizeTextForStock(item.name);
    const isThreeForTwo = name.includes("3x2");
    const pizzaUnits = isThreeForTwo ? quantity * 3 : quantity;

    if (name.includes("pizza") || name.includes("muzzarella") || name.includes("fugazzeta")) {
      addFallbackMovement(stock.harina, pizzaUnits * 0.25);
      addFallbackMovement(stock.muzzarella, pizzaUnits * 0.35);
      addFallbackMovement(stock.cajasPizza, pizzaUnits);
    }

    if (name.includes("empanada")) {
      const empanadaUnits = name.includes("6 empanadas") ? quantity * 6 : quantity;

      addFallbackMovement(stock.harina, empanadaUnits * 0.05);

      if (name.includes("carne")) {
        addFallbackMovement(stock.carne, empanadaUnits * 0.08);
      }

      if (name.includes("jamon") || name.includes("queso")) {
        addFallbackMovement(stock.muzzarella, empanadaUnits * 0.04);
      }
    }

    if (name.includes("combo") && name.includes("pizza")) {
      addFallbackMovement(stock.harina, quantity * 0.25);
      addFallbackMovement(stock.muzzarella, quantity * 0.35);
      addFallbackMovement(stock.cajasPizza, quantity);
    }

    if (name.includes("gaseosa") || name.includes("cola")) {
      addFallbackMovement(stock.gaseosa, quantity);
    }

    if (name.includes("vino")) {
      addFallbackMovement(stock.vino, quantity);
    }
  });

  return Array.from(movements.values());
}
function applyStockMovements(
  movements: V2DeliveryStockMovement[],
  direction: "discount" | "return",
  delivery?: V2Delivery
) {
  if (movements.length === 0) return;

  const stockProducts = readStockProductsFromStorage();
  const multiplier = direction === "discount" ? 1 : -1;

  const nextProducts = stockProducts.map((product) => {
    const movement = movements.find((item) => item.productId === product.id);

    if (!movement) return product;

    return {
      ...product,
      consumedBySales: Math.max(
        0,
        Number((Number(product.consumedBySales) + movement.quantity * multiplier).toFixed(2))
      ),
      lastUpdated: "Hoy",
    };
  });

  writeStockProductsToStorage(nextProducts);

  if (delivery) {
    appendStockMovementHistory(movements, direction, delivery);
  }
}

function formatStockMovementsSummary(movements: V2DeliveryStockMovement[]) {
  if (movements.length === 0) return "sin movimientos de stock";

  return movements
    .map((movement) => `${movement.productName}: ${movement.quantity}`)
    .join(", ");
}

function createDeliveryTimestamp(date?: string, time?: string) {
  const fallbackDate = date || TODAY_DELIVERIES_DATE;
  const fallbackTime = time || "00:00";
  const parsedDate = new Date(`${fallbackDate}T${fallbackTime}:00`);

  return Number.isNaN(parsedDate.getTime())
    ? new Date().toISOString()
    : parsedDate.toISOString();
}

function getNowTimestamp() {
  return new Date().toISOString();
}

function withDeliveryStatusTimestamp(
  delivery: V2Delivery,
  status: V2DeliveryStatus
): V2Delivery {
  const now = getNowTimestamp();

  if (status === "confirmed") {
    return {
      ...delivery,
      status,
      acceptedAt: delivery.acceptedAt ?? now,
      preparingAt: delivery.preparingAt ?? now,
    };
  }

  if (status === "completed") {
    return {
      ...delivery,
      status,
      deliveredAt: delivery.deliveredAt ?? now,
    };
  }

  if (status === "cancelled") {
    return {
      ...delivery,
      status,
      cancelledAt: delivery.cancelledAt ?? now,
    };
  }

  return { ...delivery, status };
}

function normalizeDelivery(delivery: V2Delivery): V2Delivery {
  return {
    ...delivery,
    date: delivery.date || TODAY_DELIVERIES_DATE,
    note: delivery.note || "—",
    address:
      delivery.deliveryType === "pickup"
        ? "Retira en local"
        : delivery.address || "Sin dirección",
    total: Number(delivery.total) || 0,
    source: delivery.source ?? "manual",
    needsAcceptance: Boolean(delivery.needsAcceptance),
    trackingId: delivery.trackingId ?? createPublicCode("PED", delivery.id),
    stockDiscounted: Boolean(delivery.stockDiscounted),
    stockReturned: Boolean(delivery.stockReturned),
    stockMovements: delivery.stockMovements ?? [],
    createdAt: delivery.createdAt ?? createDeliveryTimestamp(delivery.date, delivery.time),
    acceptedAt:
      delivery.acceptedAt ??
      (!delivery.needsAcceptance && delivery.status === "confirmed"
        ? createDeliveryTimestamp(delivery.date, delivery.time)
        : undefined),
    preparingAt:
      delivery.preparingAt ??
      (!delivery.needsAcceptance && delivery.status === "confirmed"
        ? delivery.acceptedAt ?? createDeliveryTimestamp(delivery.date, delivery.time)
        : undefined),
    deliveredAt:
      delivery.deliveredAt ??
      (delivery.status === "completed"
        ? createDeliveryTimestamp(delivery.date, delivery.time)
        : undefined),
    cancelledAt:
      delivery.cancelledAt ??
      (delivery.status === "cancelled"
        ? createDeliveryTimestamp(delivery.date, delivery.time)
        : undefined),
  };
}

function isWebDeliveryPendingAcceptance(delivery: V2Delivery) {
  return delivery.source === "web" && delivery.needsAcceptance && delivery.status === "confirmed";
}

function hasStockDiscountEvidence(delivery: V2Delivery) {
  const note = delivery.note?.toLowerCase() ?? "";

  return Boolean(delivery.stockDiscounted) || note.includes("stock descontado");
}

function shouldAskToReturnStock(delivery: V2Delivery) {
  return hasStockDiscountEvidence(delivery) && !delivery.stockReturned;
}

function shouldReserveStockForDelivery(delivery: V2Delivery) {
  if (delivery.status === "cancelled") return false;
  if (delivery.needsAcceptance) return false;

  return Boolean(delivery.orderItems?.some((item) => Number(item.quantity) > 0));
}

function reserveStockForDeliveryIfNeeded(delivery: V2Delivery) {
  if (delivery.stockDiscounted || delivery.stockReturned) return delivery;
  if (!shouldReserveStockForDelivery(delivery)) return delivery;

  const stockMovements = resolveStockMovementsForDelivery(delivery);

  if (stockMovements.length === 0) return delivery;

  applyStockMovements(stockMovements, "discount", delivery);

  return {
    ...delivery,
    stockDiscounted: true,
    stockReturned: false,
    stockMovements,
    note:
      delivery.note && delivery.note !== "—"
        ? `${delivery.note} · Stock reservado: ${formatStockMovementsSummary(stockMovements)}.`
        : `Stock reservado: ${formatStockMovementsSummary(stockMovements)}.`,
  };
}

function getDeliveryRowToneClass(delivery: V2Delivery) {
  if (isWebDeliveryPendingAcceptance(delivery)) {
    return "bg-amber-100/60 hover:bg-amber-100";
  }

  if (delivery.status === "completed") {
    return "bg-blue-100/60 hover:bg-blue-100";
  }

  if (delivery.status === "cancelled") {
    return "bg-red-100/60 hover:bg-red-100";
  }

  return "bg-emerald-100/60 hover:bg-emerald-100";
}


function parseLocalDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function addDays(date: string, days: number) {
  const parsedDate = parseLocalDate(date);
  parsedDate.setDate(parsedDate.getDate() + days);

  return parsedDate.toISOString().slice(0, 10);
}

function formatDateLabel(date: string) {
  const parsedDate = parseLocalDate(date);

  return `${DAY_NAMES[parsedDate.getDay()]}, ${parsedDate.getDate()} de ${
    MONTH_NAMES[parsedDate.getMonth()]
  } de ${parsedDate.getFullYear()}`;
}

function formatCompactDate(date: string) {
  const parsedDate = parseLocalDate(date);

  return `${parsedDate.getDate()} ${MONTH_NAMES[parsedDate.getMonth()]} ${
    parsedDate.getFullYear()
  }`;
}

function formatShortDate(date: string) {
  const parsedDate = parseLocalDate(date);

  return `${String(parsedDate.getDate()).padStart(2, "0")}/${String(
    parsedDate.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getRangeBounds(startDate: string, endDate: string) {
  if (startDate <= endDate) {
    return { start: startDate, end: endDate };
  }

  return { start: endDate, end: startDate };
}

function formatCompactDateTime(value?: string) {
  if (!value) return "—";

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return `${parsedDate.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  })} ${parsedDate.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}


function getMonthKey(date: string) {
  return date.slice(0, 7);
}

function getMonthStart(date: string) {
  return `${getMonthKey(date)}-01`;
}

function getMonthDays(date: string) {
  const monthStart = parseLocalDate(getMonthStart(date));
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = monthStart.getDay();

  return {
    year,
    month,
    daysInMonth,
    firstWeekday,
  };
}

function moveMonth(date: string, amount: number) {
  const parsedDate = parseLocalDate(getMonthStart(date));
  parsedDate.setMonth(parsedDate.getMonth() + amount);

  return parsedDate.toISOString().slice(0, 10);
}

function getDateFromMonthDay(year: number, month: number, day: number) {
  return new Date(year, month, day, 12, 0, 0).toISOString().slice(0, 10);
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}


function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeCsvValue(value: string | number | null | undefined) {
  const rawValue = String(value ?? "");
  const escapedValue = rawValue.replace(/"/g, '""');

  return `"${escapedValue}"`;
}

function downloadCsvFile(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  if (typeof window === "undefined") return;

  const csvContent = rows
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(";"))
    .join("\n");
  const blob = new Blob([`\ufeff${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function comparePrimitiveValues(
  firstValue: string | number,
  secondValue: string | number,
  direction: "asc" | "desc"
) {
  const multiplier = direction === "asc" ? 1 : -1;

  if (typeof firstValue === "number" && typeof secondValue === "number") {
    return (firstValue - secondValue) * multiplier;
  }

  return String(firstValue).localeCompare(String(secondValue), "es", {
    numeric: true,
    sensitivity: "base",
  }) * multiplier;
}

function timeToMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");

  return Number(hours) * 60 + Number(minutes);
}

function shortenOrder(order: string) {
  if (order.length <= 42) return order;
  return `${order.slice(0, 42)}...`;
}

function summarizeOrderItems(orderItems?: V2DeliveryOrderItem[]) {
  if (!orderItems || orderItems.length === 0) return "Pedido sin detalle";

  return orderItems
    .filter((item) => item.quantity > 0)
    .map((item) => `${item.quantity}x ${item.name} (${formatCurrency(item.price)})`)
    .join(", ");
}

function calculateOrderTotal(orderItems: V2DeliveryOrderItem[]) {
  return orderItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
}

function getAddedOrderItems(
  previousItems: V2DeliveryOrderItem[],
  nextItems: V2DeliveryOrderItem[],
) {
  return nextItems.flatMap((item) => {
    const previousQuantity =
      previousItems.find((previousItem) => previousItem.id === item.id)?.quantity ?? 0;
    const addedQuantity = item.quantity - previousQuantity;

    return addedQuantity > 0 ? [{ ...item, quantity: addedQuantity }] : [];
  });
}

function getRemovedOrderItems(
  previousItems: V2DeliveryOrderItem[],
  nextItems: V2DeliveryOrderItem[],
) {
  return previousItems.flatMap((item) => {
    const nextQuantity =
      nextItems.find((nextItem) => nextItem.id === item.id)?.quantity ?? 0;
    const removedQuantity = item.quantity - nextQuantity;

    return removedQuantity > 0 ? [{ ...item, quantity: removedQuantity }] : [];
  });
}

function appendDeliveryKitchenTicket(
  tickets: V2KitchenTicket[],
  items: V2DeliveryOrderItem[],
  deliveryId: string,
) {
  const pendingTicketIndex = tickets.findLastIndex((ticket) => ticket.status === "pending");

  if (pendingTicketIndex < 0) {
    return [
      ...tickets,
      {
        id: `kitchen-${deliveryId}-${Date.now()}`,
        status: "pending" as const,
        items,
        createdAt: getNowTimestamp(),
      },
    ];
  }

  return tickets.map((ticket, index) => {
    if (index !== pendingTicketIndex) return ticket;

    const nextItems = [...ticket.items];

    items.forEach((item) => {
      const existingIndex = nextItems.findIndex((ticketItem) => ticketItem.id === item.id);

      if (existingIndex >= 0) {
        nextItems[existingIndex] = {
          ...nextItems[existingIndex],
          quantity: nextItems[existingIndex].quantity + item.quantity,
        };
      } else {
        nextItems.push(item);
      }
    });

    return { ...ticket, items: nextItems };
  });
}

function subtractDeliveryKitchenTicketItems(
  tickets: V2KitchenTicket[],
  removedItems: V2DeliveryOrderItem[],
) {
  const nextTickets = tickets.map((ticket) => ({
    ...ticket,
    items: ticket.items.map((item) => ({ ...item })),
  }));
  const removableStatuses: V2KitchenTicket["status"][] = [
    "pending",
    "preparing",
    "ready",
  ];

  removedItems.forEach((removedItem) => {
    let remainingQuantity = removedItem.quantity;

    removableStatuses.forEach((status) => {
      for (
        let index = nextTickets.length - 1;
        index >= 0 && remainingQuantity > 0;
        index -= 1
      ) {
        const ticket = nextTickets[index];
        if (ticket.status !== status) continue;

        const itemIndex = ticket.items.findIndex((item) => item.id === removedItem.id);
        if (itemIndex < 0) continue;

        const currentItem = ticket.items[itemIndex];
        const removedQuantity = Math.min(currentItem.quantity, remainingQuantity);
        const nextQuantity = currentItem.quantity - removedQuantity;

        remainingQuantity -= removedQuantity;
        ticket.items =
          nextQuantity > 0
            ? ticket.items.map((item, currentIndex) =>
                currentIndex === itemIndex ? { ...item, quantity: nextQuantity } : item,
              )
            : ticket.items.filter((_, currentIndex) => currentIndex !== itemIndex);
      }
    });
  });

  return nextTickets.filter((ticket) => ticket.items.length > 0);
}

function V2DeliveryStatusBadge({ status }: { status: V2DeliveryStatus }) {
  const config: Record<
    V2DeliveryStatus,
    { label: string; tone: "green" | "blue" | "red" }
  > = {
    confirmed: { label: "Confirmado", tone: "green" },
    completed: { label: "Entregado", tone: "blue" },
    cancelled: { label: "Cancelado", tone: "red" },
  };

  return <V2Badge tone={config[status].tone}>{config[status].label}</V2Badge>;
}

function createPublicCode(prefix: "PED" | "RES", seed?: string) {
  if (!seed) {
    return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `${prefix}-${hash.toString(36).toUpperCase().slice(0, 5).padStart(5, "0")}`;
}

function getDeliveryTrackingId(delivery: Pick<V2Delivery, "id" | "trackingId">) {
  return delivery.trackingId || createPublicCode("PED", delivery.id);
}

function getDeliveryTrackingPath(delivery: Pick<V2Delivery, "id" | "trackingId">) {
  return `/demuru/pedido/${getDeliveryTrackingId(delivery)}`;
}

function getDeliveryTrackingUrl(delivery: Pick<V2Delivery, "id" | "trackingId">) {
  if (typeof window === "undefined") return getDeliveryTrackingPath(delivery);

  return `${window.location.origin}${getDeliveryTrackingPath(delivery)}`;
}

function normalizeWhatsAppPhone(value: string) {
  return value.replace(/\D/g, "");
}

function V2DeliveryTypeBadge({ type }: { type: V2DeliveryType }) {
  const config: Record<
    V2DeliveryType,
    { label: string; tone: "green" | "slate" }
  > = {
    delivery: { label: "Delivery", tone: "green" },
    pickup: { label: "Retira", tone: "slate" },
  };

  return <V2Badge tone={config[type].tone}>{config[type].label}</V2Badge>;
}

export function V2EnviosPage() {
  const [deliveries, setDeliveries] = useState<V2Delivery[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>("");
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [newDeliveryTab, setNewDeliveryTab] = useState<"cliente" | "pedido">(
    "cliente"
  );
  const [selectedMenuCategory, setSelectedMenuCategory] =
    useState<V2MenuCategory>("Todos");
  const [deliveryMenuItems, setDeliveryMenuItems] =
    useState<V2MenuItem[]>(FALLBACK_MENU_ITEMS);
  const [deliveryMenuCategories, setDeliveryMenuCategories] =
    useState<string[]>(FALLBACK_MENU_CATEGORIES);
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>(
    {}
  );
  const [selectedDate, setSelectedDate] = useState(TODAY_DELIVERIES_DATE);
  const [dateFilterMode, setDateFilterMode] = useState<V2DateFilterMode>("single");
  const [rangeStartDate, setRangeStartDate] = useState(TODAY_DELIVERIES_DATE);
  const [rangeEndDate, setRangeEndDate] = useState(addDays(TODAY_DELIVERIES_DATE, 3));
  const [isPickingRangeEnd, setIsPickingRangeEnd] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(TODAY_DELIVERIES_DATE);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<V2DeliveryStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<V2DeliveryType | "all">("all");
  const [tableSort, setTableSort] = useState<{
    key: V2DeliveryColumnSortKey;
    direction: V2SortDirection;
  } | null>(null);
  const [deliveryForm, setDeliveryForm] =
    useState<V2DeliveryFormState>(DEFAULT_DELIVERY_FORM);
  const [deliveryFormError, setDeliveryFormError] = useState("");
  const [acceptanceDeliveryId, setAcceptanceDeliveryId] = useState<string | null>(null);
  const [acceptanceEtaMinutes, setAcceptanceEtaMinutes] = useState(45);
  const [stockReturnDeliveryId, setStockReturnDeliveryId] = useState<string | null>(null);
  const [openActionsDeliveryId, setOpenActionsDeliveryId] = useState<string | null>(null);
  const [cashRegisterError, setCashRegisterError] = useState("");
  const [whatsAppDraft, setWhatsAppDraft] = useState<{
    delivery: V2Delivery;
    action: V2DeliveryWhatsAppAction;
    note: string;
  } | null>(null);

  useEffect(() => {
    function syncDeliveriesFromStorage() {
      const fallbackDeliveries = v2Deliveries.map((delivery) =>
        normalizeDelivery(delivery as V2Delivery)
      );
      const storedDeliveries = readFromStorage<V2Delivery[]>(
        DELIVERIES_STORAGE_KEY,
        fallbackDeliveries
      ).map((delivery) => normalizeDelivery(delivery));
      const nextMenuItems = readDeliveryMenuItems();

      setDeliveries(storedDeliveries);
      setDeliveryMenuItems(nextMenuItems);
      setDeliveryMenuCategories(readDeliveryMenuCategories(nextMenuItems));
      setSelectedDeliveryId((current) => current || storedDeliveries[0]?.id || "");
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key &&
        event.key !== DELIVERIES_STORAGE_KEY &&
        event.key !== MENU_ITEMS_STORAGE_KEY &&
        event.key !== MENU_CATEGORIES_STORAGE_KEY
      ) {
        return;
      }

      syncDeliveriesFromStorage();
    }

    syncDeliveriesFromStorage();

    window.addEventListener("focus", syncDeliveriesFromStorage);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(DELIVERIES_EVENT, syncDeliveriesFromStorage);

    return () => {
      window.removeEventListener("focus", syncDeliveriesFromStorage);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(DELIVERIES_EVENT, syncDeliveriesFromStorage);
    };
  }, []);

  const editingDelivery =
    editingDeliveryId ? deliveries.find((delivery) => delivery.id === editingDeliveryId) ?? null : null;

  const availableMenuItems = useMemo(() => {
    const existingItems = editingDelivery?.orderItems ?? [];
    const mergedItems = new Map<string, V2MenuItem>();

    deliveryMenuItems.forEach((item) => mergedItems.set(item.id, item));

    existingItems.forEach((item) => {
      if (mergedItems.has(item.id)) return;

      mergedItems.set(item.id, {
        id: item.id,
        name: item.name,
        price: item.price,
        category: "Sin categoría",
      });
    });

    return Array.from(mergedItems.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "es")
    );
  }, [deliveryMenuItems, editingDelivery]);

  const filteredMenuItems = availableMenuItems
    .filter(
      (item) =>
        selectedMenuCategory === "Todos" || item.category === selectedMenuCategory
    )
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const currentOrderItems = availableMenuItems.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: orderQuantities[item.id] ?? 0,
  })).filter((item) => item.quantity > 0);

  const currentOrderTotal = calculateOrderTotal(currentOrderItems);

  const knownDeliveryClients = useMemo(() => {
    const clients = new Map<
      string,
      {
        name: string;
        phone: string;
        address: string;
      }
    >();

    deliveries.forEach((delivery) => {
      const key = normalizeSearch(delivery.client);
      if (!key) return;

      clients.set(key, {
        name: delivery.client,
        phone: delivery.phone,
        address:
          delivery.deliveryType === "pickup" ? "" : delivery.address || "",
      });
    });

    return Array.from(clients.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "es")
    );
  }, [deliveries]);

  const selectedDelivery =
    deliveries.find((delivery) => delivery.id === selectedDeliveryId) ??
    deliveries[0] ??
    null;

  const selectedDateLabel = useMemo(() => {
    if (dateFilterMode === "all") {
      return "Todo el historial";
    }

    if (dateFilterMode === "single") {
      return formatDateLabel(selectedDate);
    }

    const { start, end } = getRangeBounds(rangeStartDate, rangeEndDate);

    return `${formatCompactDate(start)} — ${formatCompactDate(end)}`;
  }, [dateFilterMode, rangeEndDate, rangeStartDate, selectedDate]);

  function getDeliverySortValue(delivery: V2Delivery, key: V2DeliveryColumnSortKey) {
    if (key === "id") return getDeliveryTrackingId(delivery);
    if (key === "time") return `${delivery.date ?? TODAY_DELIVERIES_DATE}${delivery.time}`;
    if (key === "client") return delivery.client;
    if (key === "phone") return delivery.phone;
    if (key === "type") return delivery.deliveryType;
    if (key === "total") return delivery.total;
    if (key === "payment") return delivery.payment;

    return "";
  }

  function toggleDeliveryTableSort(key: string) {
    const nextKey = key as V2DeliveryColumnSortKey;

    setTableSort((current) =>
      current?.key === nextKey
        ? { key: nextKey, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key: nextKey, direction: "asc" }
    );
  }

  const filteredDeliveries = useMemo(() => {
    const query = normalizeSearch(searchValue);
    const { start, end } = getRangeBounds(rangeStartDate, rangeEndDate);

    const filtered = deliveries.filter((delivery) => {
      const deliveryDate = delivery.date ?? TODAY_DELIVERIES_DATE;
      const matchesDate =
        dateFilterMode === "all"
          ? true
          : dateFilterMode === "single"
            ? deliveryDate === selectedDate
            : deliveryDate >= start && deliveryDate <= end;
      const matchesSearch =
        query.length === 0 ||
        delivery.client.toLowerCase().includes(query) ||
        delivery.phone.toLowerCase().includes(query) ||
        delivery.address.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || delivery.status === statusFilter;
      const matchesType =
        typeFilter === "all" || delivery.deliveryType === typeFilter;

      return matchesDate && matchesSearch && matchesStatus && matchesType;
    });

    return [...filtered].sort((a, b) => {
      if (tableSort) {
        const sortComparison = comparePrimitiveValues(
          getDeliverySortValue(a, tableSort.key),
          getDeliverySortValue(b, tableSort.key),
          tableSort.direction
        );

        if (sortComparison !== 0) return sortComparison;
      }

      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
  }, [
    dateFilterMode,
    deliveries,
    rangeEndDate,
    rangeStartDate,
    searchValue,
    selectedDate,
    statusFilter,
    tableSort,
    typeFilter,
  ]);

  const webDeliveriesPendingAcceptance = filteredDeliveries.filter((item) =>
    isWebDeliveryPendingAcceptance(item)
  );

  const confirmedDeliveries = filteredDeliveries.filter(
    (item) => item.status === "confirmed" && !isWebDeliveryPendingAcceptance(item)
  );
  const completedDeliveries = filteredDeliveries.filter(
    (item) => item.status === "completed"
  );
  const cancelledDeliveries = filteredDeliveries.filter(
    (item) => item.status === "cancelled"
  );

  const totalBilling = filteredDeliveries
    .filter((item) => item.status !== "cancelled")
    .reduce((total, item) => total + item.total, 0);

  function moveSelectedDate(days: number) {
    setDateFilterMode("single");
    setIsPickingRangeEnd(false);
    setSelectedDate((current) => {
      const nextDate = addDays(current, days);

      setCalendarMonth(nextDate);
      setRangeStartDate(nextDate);
      setRangeEndDate(nextDate);

      return nextDate;
    });
    setIsCalendarOpen(false);
  }

  const calendarMonthData = useMemo(() => {
    return getMonthDays(calendarMonth);
  }, [calendarMonth]);

  const deliveryCountByDate = useMemo(() => {
    return deliveries.reduce<Record<string, number>>((accumulator, delivery) => {
      const date = delivery.date ?? TODAY_DELIVERIES_DATE;
      accumulator[date] = (accumulator[date] ?? 0) + 1;

      return accumulator;
    }, {});
  }, [deliveries]);

  function selectCalendarDate(date: string) {
    if (dateFilterMode === "single" || dateFilterMode === "all") {
      setDateFilterMode("single");
      setSelectedDate(date);
      setRangeStartDate(date);
      setRangeEndDate(date);
      setCalendarMonth(date);
      setIsCalendarOpen(false);
      return;
    }

    if (!isPickingRangeEnd) {
      setRangeStartDate(date);
      setRangeEndDate(date);
      setCalendarMonth(date);
      setIsPickingRangeEnd(true);
      return;
    }

    const { start, end } = getRangeBounds(rangeStartDate, date);
    setRangeStartDate(start);
    setRangeEndDate(end);
    setCalendarMonth(date);
    setIsPickingRangeEnd(false);
  }

  function applyDeliveryRange(startDate: string, endDate: string) {
    const { start, end } = getRangeBounds(startDate, endDate);

    setDateFilterMode("range");
    setRangeStartDate(start);
    setRangeEndDate(end);
    setCalendarMonth(start);
    setIsPickingRangeEnd(false);
  }

  function showSingleDeliveryDay() {
    setDateFilterMode("single");
    setRangeStartDate(selectedDate);
    setRangeEndDate(selectedDate);
    setCalendarMonth(selectedDate);
    setIsPickingRangeEnd(false);
  }

  function startDeliveryRangeSelection() {
    setDateFilterMode("range");
    setRangeStartDate(selectedDate);
    setRangeEndDate(selectedDate);
    setCalendarMonth(selectedDate);
    setIsPickingRangeEnd(false);
    setIsCalendarOpen(true);
  }

  function showThirtyDeliveryDays() {
    const startDate = addDays(TODAY_DELIVERIES_DATE, -29);

    applyDeliveryRange(startDate, TODAY_DELIVERIES_DATE);
  }

  function showAllDeliveries() {
    setDateFilterMode("all");
    setIsPickingRangeEnd(false);
    setIsCalendarOpen(false);
  }

  function selectDelivery(delivery: V2Delivery) {
    setSelectedDeliveryId(delivery.id);
  }

  function openNewDeliveryModal() {
    setEditingDeliveryId(null);
    setDeliveryForm(DEFAULT_DELIVERY_FORM);
    setDeliveryFormError("");
    setNewDeliveryTab("cliente");
    setSelectedMenuCategory("Todos");
    setOrderQuantities({});
    setIsNewDeliveryOpen(true);
  }

  function closeDeliveryModal() {
    setIsNewDeliveryOpen(false);
    setEditingDeliveryId(null);
    setDeliveryForm(DEFAULT_DELIVERY_FORM);
    setDeliveryFormError("");
    setNewDeliveryTab("cliente");
    setSelectedMenuCategory("Todos");
    setOrderQuantities({});
  }

  function openDeliveryEditor(delivery: V2Delivery) {
    const nextQuantities = Object.fromEntries(
      (delivery.orderItems ?? []).map((item) => [item.id, item.quantity])
    );

    setEditingDeliveryId(delivery.id);
    setSelectedDeliveryId(delivery.id);
    setDeliveryForm({
      client: delivery.client,
      phone: delivery.phone,
      time: delivery.time,
      deliveryType: delivery.deliveryType,
      address: delivery.deliveryType === "pickup" ? "" : delivery.address,
      payment: delivery.payment || "Efectivo",
      note: delivery.note && delivery.note !== "—" ? delivery.note : "",
      status: delivery.status,
    });
    setDeliveryFormError("");
    setNewDeliveryTab("cliente");
    setSelectedMenuCategory("Todos");
    setOrderQuantities(nextQuantities);
    setIsNewDeliveryOpen(true);
  }

  function updateDeliveryFormField<K extends keyof V2DeliveryFormState>(
    field: K,
    value: V2DeliveryFormState[K]
  ) {
    setDeliveryForm((current) => ({
      ...current,
      [field]: value,
    }));
    setDeliveryFormError("");
  }

  function handleClientInput(value: string) {
    const matchedClient = knownDeliveryClients.find(
      (client) => normalizeSearch(client.name) === normalizeSearch(value)
    );

    setDeliveryForm((current) => ({
      ...current,
      client: value,
      phone: matchedClient?.phone || current.phone,
      address:
        current.deliveryType === "delivery"
          ? matchedClient?.address || current.address
          : current.address,
    }));
    setDeliveryFormError("");
  }

  function updateOrderQuantity(itemId: string, nextQuantity: number) {
    setOrderQuantities((current) => ({
      ...current,
      [itemId]: Math.max(0, Number(nextQuantity) || 0),
    }));
    setDeliveryFormError("");
  }

  function persistDeliveries(nextDeliveries: V2Delivery[]) {
    setDeliveries(nextDeliveries);
    writeToStorage(DELIVERIES_STORAGE_KEY, nextDeliveries);
  }

  function applyEditedDeliveryStockDifference(
    existingDelivery: V2Delivery | null,
    nextDelivery: V2Delivery
  ) {
    if (!existingDelivery?.stockDiscounted || existingDelivery.stockReturned) return nextDelivery;
    if (nextDelivery.status === "cancelled") return nextDelivery;

    const previousMovements =
      existingDelivery.stockMovements && existingDelivery.stockMovements.length > 0
        ? existingDelivery.stockMovements
        : resolveStockMovementsForDelivery(existingDelivery);
    const nextMovements = resolveStockMovementsForDelivery(nextDelivery);

    applyStockMovements(previousMovements, "return", existingDelivery);
    applyStockMovements(nextMovements, "discount", nextDelivery);

    return {
      ...nextDelivery,
      stockDiscounted: nextMovements.length > 0,
      stockReturned: false,
      stockMovements: nextMovements,
      note: nextDelivery.note,
    };
  }

  function createDelivery(formData: FormData) {
    const deliveryType = String(
      formData.get("deliveryType") ?? "delivery"
    ) as V2DeliveryType;
    const existingDelivery = editingDeliveryId
      ? deliveries.find((delivery) => delivery.id === editingDeliveryId)
      : null;
    const nextOrderItems = currentOrderItems;
    const hasMenuOrder = nextOrderItems.length > 0;
    const existingHasOrder =
      Boolean(existingDelivery?.orderItems?.length) ||
      Boolean(
        existingDelivery?.order &&
          existingDelivery.order !== "Pedido sin detalle"
      );
    const nextOrderTotal = calculateOrderTotal(nextOrderItems);
    const client = String(formData.get("client") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const time = String(formData.get("time") ?? "").trim() || "20:00";
    const payment =
      String(formData.get("payment") ?? "Efectivo").trim() || "Efectivo";
    const note = String(formData.get("note") ?? "").trim() || "—";
    const status = String(
      formData.get("status") ?? existingDelivery?.status ?? "confirmed"
    ) as V2DeliveryStatus;

    if (!client) {
      setDeliveryFormError("Completá el nombre del cliente.");
      setNewDeliveryTab("cliente");
      return;
    }

    if (!phone) {
      setDeliveryFormError("Completá el teléfono del cliente.");
      setNewDeliveryTab("cliente");
      return;
    }

    if (deliveryType === "delivery" && !address) {
      setDeliveryFormError("Completá la dirección para pedidos con delivery.");
      setNewDeliveryTab("cliente");
      return;
    }

    if (!hasMenuOrder && !existingHasOrder) {
      setDeliveryFormError("Agregá al menos un producto del menú al pedido.");
      setNewDeliveryTab("pedido");
      return;
    }

    const addedOrderItems = getAddedOrderItems(
      existingDelivery?.orderItems ?? [],
      hasMenuOrder ? nextOrderItems : existingDelivery?.orderItems ?? [],
    );
    const removedOrderItems = getRemovedOrderItems(
      existingDelivery?.orderItems ?? [],
      hasMenuOrder ? nextOrderItems : existingDelivery?.orderItems ?? [],
    );
    const shouldCreateKitchenTicket =
      Boolean(existingDelivery) &&
      addedOrderItems.length > 0 &&
      (existingDelivery?.kitchenStatus === "preparing" ||
        existingDelivery?.kitchenStatus === "ready" ||
        existingDelivery?.kitchenStatus === "completed");

    let nextDelivery: V2Delivery = {
      id: existingDelivery?.id ?? `env-${Date.now()}`,
      date:
        existingDelivery?.date ??
        (dateFilterMode === "range"
          ? getRangeBounds(rangeStartDate, rangeEndDate).start
          : selectedDate),
      time,
      client,
      phone,
      address: deliveryType === "pickup" ? "Retira en local" : address,
      deliveryType,
      order: hasMenuOrder
        ? summarizeOrderItems(nextOrderItems)
        : existingDelivery?.order ?? "Pedido sin detalle",
      orderItems: hasMenuOrder ? nextOrderItems : existingDelivery?.orderItems,
      total: hasMenuOrder ? nextOrderTotal : existingDelivery?.total ?? 0,
      payment,
      note,
      status,
      source: existingDelivery?.source ?? "manual",
      needsAcceptance: existingDelivery?.needsAcceptance ?? false,
      trackingId:
        existingDelivery?.trackingId ??
        createPublicCode("PED", existingDelivery?.id ?? `env-${Date.now()}`),
      stockDiscounted: existingDelivery?.stockDiscounted ?? false,
      stockReturned: existingDelivery?.stockReturned ?? false,
      stockMovements: existingDelivery?.stockMovements ?? [],
      createdAt: existingDelivery?.createdAt ?? getNowTimestamp(),
      acceptedAt: existingDelivery?.acceptedAt,
      preparingAt: existingDelivery?.preparingAt,
      readyAt: existingDelivery?.readyAt,
      onTheWayAt: existingDelivery?.onTheWayAt,
      deliveredAt: existingDelivery?.deliveredAt,
      cancelledAt: existingDelivery?.cancelledAt,
      kitchenStatus: existingDelivery?.kitchenStatus,
      kitchenStartedAt: existingDelivery?.kitchenStartedAt,
      kitchenReadyAt: existingDelivery?.kitchenReadyAt,
      kitchenCompletedAt: existingDelivery?.kitchenCompletedAt,
      kitchenTickets: subtractDeliveryKitchenTicketItems(
        shouldCreateKitchenTicket
          ? appendDeliveryKitchenTicket(
              existingDelivery?.kitchenTickets ?? [],
              addedOrderItems,
              existingDelivery?.id ?? `env-${Date.now()}`,
            )
          : existingDelivery?.kitchenTickets ?? [],
        removedOrderItems,
      ),
    };

    const shouldAskStockReturn =
      status === "cancelled" &&
      (existingDelivery ? shouldAskToReturnStock(existingDelivery) : shouldAskToReturnStock(nextDelivery));

    if (hasStockDiscountEvidence(nextDelivery)) {
      nextDelivery.stockDiscounted = true;
      nextDelivery.stockMovements =
        nextDelivery.stockMovements && nextDelivery.stockMovements.length > 0
          ? nextDelivery.stockMovements
          : resolveStockMovementsForDelivery(nextDelivery);
    }

    nextDelivery = withDeliveryStatusTimestamp(nextDelivery, status);

    if (existingDelivery && hasMenuOrder) {
      nextDelivery = applyEditedDeliveryStockDifference(existingDelivery, nextDelivery);
    }

    if (!existingDelivery) {
      nextDelivery = reserveStockForDeliveryIfNeeded(nextDelivery);
    }

    if (
      existingDelivery &&
      !existingDelivery.stockDiscounted &&
      !existingDelivery.stockReturned
    ) {
      nextDelivery = reserveStockForDeliveryIfNeeded(nextDelivery);
    }

    const nextDeliveries = existingDelivery
      ? deliveries.map((delivery) =>
          delivery.id === existingDelivery.id ? nextDelivery : delivery
        )
      : [nextDelivery, ...deliveries];

    persistDeliveries(nextDeliveries);
    setSelectedDeliveryId(nextDelivery.id);
    closeDeliveryModal();

    if (shouldAskStockReturn) {
      setStockReturnDeliveryId(nextDelivery.id);
    }
  }

  function acceptWebDelivery(id: string) {
    setAcceptanceDeliveryId(id);
    setAcceptanceEtaMinutes(45);
  }

  function confirmAcceptWebDelivery() {
    if (!acceptanceDeliveryId) return;

    const acceptedDelivery = deliveries.find((delivery) => delivery.id === acceptanceDeliveryId);

    if (!acceptedDelivery) {
      setAcceptanceDeliveryId(null);
      return;
    }

    const stockMovements = acceptedDelivery.stockDiscounted
      ? acceptedDelivery.stockMovements ?? []
      : resolveStockMovementsForDelivery(acceptedDelivery);

    if (!acceptedDelivery.stockDiscounted) {
      applyStockMovements(stockMovements, "discount", acceptedDelivery);
    }

    const nextDeliveries = deliveries.map((delivery) =>
      delivery.id === acceptanceDeliveryId
        ? {
            ...delivery,
            needsAcceptance: false,
            acceptedAt: delivery.acceptedAt ?? getNowTimestamp(),
            preparingAt: delivery.preparingAt ?? getNowTimestamp(),
            stockDiscounted: true,
            stockReturned: false,
            stockMovements,
            note:
              delivery.note && delivery.note !== "—"
                ? `${delivery.note} · Pedido aceptado por el local. ETA ${acceptanceEtaMinutes} min. Stock descontado: ${formatStockMovementsSummary(stockMovements)}.`
                : `Pedido aceptado por el local. ETA ${acceptanceEtaMinutes} min. Stock descontado: ${formatStockMovementsSummary(stockMovements)}.`,
          }
        : delivery
    );

    persistDeliveries(nextDeliveries);
    setAcceptanceDeliveryId(null);

    const clientPhone = acceptedDelivery.phone.replace(/\D/g, "");
    const trackingId = getDeliveryTrackingId(acceptedDelivery);
    const trackingUrl = getDeliveryTrackingUrl(acceptedDelivery);
    const whatsappMessage = [
      `Hola ${acceptedDelivery.client}, tu pedido ${trackingId} en Demuru fue aceptado.`,
      "",
      "Ya está en preparación.",
      `Tiempo estimado: ${acceptanceEtaMinutes} minutos.`,
      acceptedDelivery.deliveryType === "delivery"
        ? `Entrega en: ${acceptedDelivery.address}`
        : "Retiro en el local.",
      "",
      `Código de pedido: ${trackingId}`,
      `Pedido: ${acceptedDelivery.order}`,
      `Total: ${formatCurrency(acceptedDelivery.total)}`,
      "",
      "Podés seguir tu pedido acá:",
      trackingUrl,
    ].join("\n");

    if (clientPhone) {
      window.open(
        `https://wa.me/${clientPhone}?text=${encodeURIComponent(whatsappMessage)}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  }

  function rejectWebDelivery(id: string) {
    const nextDeliveries = deliveries.map((delivery) =>
      delivery.id === id
        ? {
            ...delivery,
            status: "cancelled" as V2DeliveryStatus,
            needsAcceptance: false,
            note:
              delivery.note && delivery.note !== "—"
                ? `${delivery.note} · Pedido rechazado por el local.`
                : "Pedido rechazado por el local.",
          }
        : delivery
    );

    persistDeliveries(nextDeliveries);
  }

  function requestCancelDelivery(id: string) {
    const delivery = deliveries.find((item) => item.id === id);

    if (delivery && shouldAskToReturnStock(delivery)) {
      setStockReturnDeliveryId(id);
      return;
    }

    updateDeliveryStatus(id, "cancelled");
  }

  function confirmCancelDelivery(shouldReturnStock: boolean) {
    if (!stockReturnDeliveryId) return;

    const targetDelivery = deliveries.find((delivery) => delivery.id === stockReturnDeliveryId);

    if (!targetDelivery) {
      setStockReturnDeliveryId(null);
      return;
    }

    const stockMovements =
      targetDelivery.stockMovements && targetDelivery.stockMovements.length > 0
        ? targetDelivery.stockMovements
        : resolveStockMovementsForDelivery(targetDelivery);

    if (shouldReturnStock && stockMovements.length > 0) {
      applyStockMovements(stockMovements, "return", targetDelivery);
    }

    const nextDeliveries = deliveries.map((delivery) =>
      delivery.id === stockReturnDeliveryId
        ? {
            ...delivery,
            status: "cancelled" as V2DeliveryStatus,
            stockDiscounted: true,
            stockReturned: shouldReturnStock,
            stockMovements,
            note:
              delivery.note && delivery.note !== "—"
                ? `${delivery.note} · Pedido cancelado${
                    shouldReturnStock ? " y stock devuelto." : " sin devolver stock."
                  }`
                : `Pedido cancelado${
                    shouldReturnStock ? " y stock devuelto." : " sin devolver stock."
                  }`,
          }
        : delivery
    );

    persistDeliveries(nextDeliveries);
    setStockReturnDeliveryId(null);
  }

  function updateDeliveryStatus(id: string, status: V2DeliveryStatus) {
    const nextDeliveries = deliveries.map((delivery) => {
      if (delivery.id !== id) return delivery;

      const nextDelivery = withDeliveryStatusTimestamp(delivery, status);

      if (status === "cancelled") return nextDelivery;

      return reserveStockForDeliveryIfNeeded(nextDelivery);
    });

    persistDeliveries(nextDeliveries);
  }

  function completeDelivery(id: string) {
    const delivery = deliveries.find((item) => item.id === id);
    if (!delivery) return;

    const error = getCashRegisterError(delivery.date ?? TODAY_DELIVERIES_DATE);
    if (error) {
      setOpenActionsDeliveryId(null);
      setCashRegisterError(error);
      return;
    }

    updateDeliveryStatus(id, "completed");
  }

  function markDeliveryOnTheWay(id: string) {
    const timestamp = new Date().toISOString();
    const nextDeliveries = deliveries.map((delivery) =>
      delivery.id === id
        ? {
            ...delivery,
            onTheWayAt: delivery.onTheWayAt ?? timestamp,
          }
        : delivery,
    );

    persistDeliveries(nextDeliveries);
  }

  function getDeliveryWhatsAppActionLabel(action: V2DeliveryWhatsAppAction) {
    if (action === "cancellation") return "Enviar cancelación";
    if (action === "modification") return "Enviar modificación";

    return "Enviar confirmación";
  }

  function buildDeliveryWhatsAppMessage(
    delivery: V2Delivery,
    action: V2DeliveryWhatsAppAction,
    note: string
  ) {
    const trackingId = getDeliveryTrackingId(delivery);
    const trackingUrl = getDeliveryTrackingUrl(delivery);
    const cleanNote = note.trim();
    const deliveryTypeLabel =
      delivery.deliveryType === "delivery" ? "Delivery" : "Retiro en el local";
    const destinationLabel =
      delivery.deliveryType === "delivery" ? `Dirección: ${delivery.address}` : "Retira en el local.";

    const introByAction: Record<V2DeliveryWhatsAppAction, string> = {
      confirmation: `Hola ${delivery.client}, tu pedido en Demuru está confirmado.`,
      modification: `Hola ${delivery.client}, actualizamos tu pedido en Demuru.`,
      cancellation: `Hola ${delivery.client}, tu pedido en Demuru fue cancelado.`,
    };

    return [
      introByAction[action],
      ...(cleanNote ? ["", `Nota: ${cleanNote}`] : []),
      "",
      `Código: ${trackingId}`,
      `Fecha: ${formatDateLabel(delivery.date || TODAY_DELIVERIES_DATE)}`,
      `Hora: ${delivery.time}`,
      `Tipo: ${deliveryTypeLabel}`,
      destinationLabel,
      `Pedido: ${delivery.order}`,
      `Total: ${formatCurrency(delivery.total)}`,
      "",
      action === "cancellation"
        ? "Si necesitás ayuda, comunicate con el restaurante por WhatsApp."
        : "Podés seguir tu pedido acá:",
      ...(action === "cancellation" ? [] : [trackingUrl]),
    ].join("\n");
  }

  function openDeliveryWhatsApp(
    delivery: V2Delivery,
    action: V2DeliveryWhatsAppAction,
    note: string
  ) {
    const targetPhone = USE_DELIVERY_WHATSAPP_TEST_PHONE
      ? DELIVERY_WHATSAPP_TEST_PHONE
      : normalizeWhatsAppPhone(delivery.phone);

    if (!targetPhone) return;

    const message = buildDeliveryWhatsAppMessage(delivery, action, note);
    const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function renderSelectableCell(delivery: V2Delivery, content: ReactNode) {
    return (
      <button
        type="button"
        onClick={() => selectDelivery(delivery)}
        className="w-full text-left"
      >
        {content}
      </button>
    );
  }

  function closeActivePopup() {
    if (openActionsDeliveryId) {
      setOpenActionsDeliveryId(null);
      return;
    }

    if (acceptanceDeliveryId) {
      setAcceptanceDeliveryId(null);
      return;
    }

    if (stockReturnDeliveryId) {
      setStockReturnDeliveryId(null);
      return;
    }

    if (whatsAppDraft) {
      setWhatsAppDraft(null);
      return;
    }

    if (isNewDeliveryOpen) {
      closeDeliveryModal();
    }
  }

  useEffect(() => {
    if (
      !isNewDeliveryOpen &&
      !acceptanceDeliveryId &&
      !stockReturnDeliveryId &&
      !openActionsDeliveryId &&
      !whatsAppDraft
    ) return;

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeActivePopup();
      }
    }

    window.addEventListener("keydown", handleEscapeKey);

    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [
    isNewDeliveryOpen,
    acceptanceDeliveryId,
    stockReturnDeliveryId,
    openActionsDeliveryId,
    whatsAppDraft,
  ]);

  function exportDeliveriesCsv() {
    const header = [
      "ID",
      "Fecha",
      "Hora",
      "Cliente",
      "Teléfono",
      "Tipo",
      "Dirección",
      "Pedido",
      "Total",
      "Pago",
      "Estado",
      "Nota",
    ];
    const rows = filteredDeliveries.map((delivery) => [
      getDeliveryTrackingId(delivery),
      delivery.date ?? TODAY_DELIVERIES_DATE,
      delivery.time,
      delivery.client,
      delivery.phone,
      delivery.deliveryType === "delivery" ? "Delivery" : "Retiro",
      delivery.deliveryType === "delivery" ? delivery.address : "Retira en local",
      delivery.order,
      delivery.total,
      delivery.payment,
      delivery.status,
      delivery.note,
    ]);

    const exportDateLabel =
      dateFilterMode === "single"
        ? selectedDate
        : `${getRangeBounds(rangeStartDate, rangeEndDate).start}-${getRangeBounds(rangeStartDate, rangeEndDate).end}`;

    downloadCsvFile(`envios-${exportDateLabel}.csv`, [header, ...rows]);
  }

  return (
    <>
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        textarea:-webkit-autofill,
        textarea:-webkit-autofill:hover,
        textarea:-webkit-autofill:focus,
        select:-webkit-autofill,
        select:-webkit-autofill:hover,
        select:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          -webkit-text-fill-color: #0f172a !important;
          caret-color: #0f172a !important;
          transition: background-color 9999s ease-out 0s;
        }
      `}</style>
      <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Envíos"
          description="Gestioná pedidos por teléfono, WhatsApp y delivery."
          actions={
            <>
              <V2Button
                variant="secondary"
                icon={<Download size={17} />}
                onClick={exportDeliveriesCsv}
              >
                Exportar
              </V2Button>

              <V2Button
                variant="primary"
                icon={<Plus size={18} />}
                onClick={openNewDeliveryModal}
              >
                Nuevo envío
              </V2Button>
            </>
          }
        />

        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-4 xl:grid-cols-[1fr_320px]">
          <div className="flex min-h-0 flex-col gap-4">
            <div className="grid shrink-0 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <V2MetricCard
                label="Total"
                value={filteredDeliveries.length}
                helper="Pedidos filtrados"
                tone="blue"
                icon={<PackageCheck size={22} />}
              />

              <V2MetricCard
                label="Confirmados"
                value={confirmedDeliveries.length}
                helper="Por preparar/enviar"
                tone="green"
                icon={<CheckCircle2 size={22} />}
              />

              <V2MetricCard
                label="Entregados"
                value={completedDeliveries.length}
                helper="Pedidos"
                tone="blue"
                icon={<CheckCircle2 size={22} />}
              />

              <V2MetricCard
                label="Cancelados"
                value={cancelledDeliveries.length}
                helper="Pedidos"
                tone="red"
                icon={<XCircle size={22} />}
              />

              <V2MetricCard
                label="Facturación"
                value={formatCurrency(totalBilling)}
                helper="Sin cancelados"
                tone="green"
                icon={<DollarSign size={22} />}
              />
            </div>

            <div className="-mt-2 shrink-0">
              <V2FilterBar>
                <div className="relative flex min-w-[340px] flex-1 items-center gap-2">
                  <V2Button
                    size="md"
                    variant="secondary"
                    aria-label="Día anterior"
                    icon={<ChevronLeft size={17} />}
                    onClick={() => moveSelectedDate(-1)}
                  />

                  <div className="relative min-w-0 flex-1">
                    <V2Input
                      className="min-w-0 bg-slate-50 pr-11 font-semibold text-slate-950"
                      value={selectedDateLabel}
                      readOnly
                    />

                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen((current) => !current)}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Abrir calendario"
                    >
                      <CalendarDays size={17} />
                    </button>
                  </div>

                  <V2Button
                    size="md"
                    variant="secondary"
                    aria-label="Día siguiente"
                    icon={<ChevronRight size={17} />}
                    onClick={() => moveSelectedDate(1)}
                  />

                  {isCalendarOpen ? (
                    <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setCalendarMonth((current) => moveMonth(current, -1))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                          aria-label="Mes anterior"
                        >
                          <ChevronLeft size={17} />
                        </button>

                        <div className="text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {dateFilterMode === "range"
                              ? isPickingRangeEnd
                                ? "Seleccionar hasta"
                                : "Seleccionar desde"
                              : "Seleccionar día"}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold capitalize text-slate-950">
                            {MONTH_NAMES[calendarMonthData.month]} {calendarMonthData.year}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCalendarMonth((current) => moveMonth(current, 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                          aria-label="Mes siguiente"
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((weekday, index) => (
                          <span key={`${weekday}-${index}`}>{weekday}</span>
                        ))}
                      </div>

                      <div className="mt-2 grid grid-cols-7 gap-1.5">
                        {Array.from({ length: calendarMonthData.firstWeekday }).map((_, index) => (
                          <span key={`empty-${index}`} className="h-9" />
                        ))}

                        {Array.from({ length: calendarMonthData.daysInMonth }).map((_, index) => {
                          const day = index + 1;
                          const date = getDateFromMonthDay(
                            calendarMonthData.year,
                            calendarMonthData.month,
                            day
                          );
                          const { start, end } = getRangeBounds(rangeStartDate, rangeEndDate);
                          const isSelected =
                            dateFilterMode === "single"
                              ? date === selectedDate
                              : date === start || date === end;
                          const isInsideRange =
                            dateFilterMode === "range" && date > start && date < end;
                          const hasDeliveries = Boolean(deliveryCountByDate[date]);

                          return (
                            <button
                              key={date}
                              type="button"
                              onClick={() => selectCalendarDate(date)}
                              className={[
                                "relative flex h-9 items-center justify-center rounded-xl border text-xs font-semibold transition",
                                isSelected
                                  ? "border-emerald-700 bg-emerald-600 text-white shadow-sm"
                                  : isInsideRange
                                    ? "border-emerald-200 bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800",
                              ].join(" ")}
                            >
                              {day}
                              {hasDeliveries ? (
                                <span
                                  className={[
                                    "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                                    isSelected ? "bg-white" : "bg-emerald-500",
                                  ].join(" ")}
                                />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-3">
                        {dateFilterMode === "range" ? (
                          <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                            <p className="font-semibold">
                              {isPickingRangeEnd ? "Ahora elegí la fecha final." : "Elegí la fecha inicial."}
                            </p>
                            <p className="mt-1 text-emerald-800">
                              Rango: {formatShortDate(getRangeBounds(rangeStartDate, rangeEndDate).start)} — {formatShortDate(getRangeBounds(rangeStartDate, rangeEndDate).end)}
                            </p>
                          </div>
                        ) : null}

                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setDateFilterMode("single");
                              setSelectedDate(TODAY_DELIVERIES_DATE);
                              setRangeStartDate(TODAY_DELIVERIES_DATE);
                              setRangeEndDate(TODAY_DELIVERIES_DATE);
                              setCalendarMonth(TODAY_DELIVERIES_DATE);
                              setIsPickingRangeEnd(false);
                            }}
                            className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            Hoy
                          </button>
                          <button
                            type="button"
                            onClick={startDeliveryRangeSelection}
                            className="h-9 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                          >
                            Rango
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCalendarOpen(false)}
                            className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex min-w-0 justify-end gap-2">
                  <button
                    type="button"
                    onClick={showSingleDeliveryDay}
                    className={`h-10 shrink-0 rounded-xl border px-3 text-xs font-semibold transition ${
                      dateFilterMode === "single"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    Día
                  </button>

                  <button
                    type="button"
                    onClick={startDeliveryRangeSelection}
                    className={`h-10 shrink-0 rounded-xl border px-3 text-xs font-semibold transition ${
                      dateFilterMode === "range"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    Rango
                  </button>

                  <button
                    type="button"
                    onClick={showThirtyDeliveryDays}
                    className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    30 días
                  </button>

                  <button
                    type="button"
                    onClick={showAllDeliveries}
                    className={`h-10 shrink-0 rounded-xl border px-3 text-xs font-semibold transition ${
                      dateFilterMode === "all"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    Todo
                  </button>
                </div>

                <div className="min-w-[260px] flex-[1.5]">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-2.5 text-slate-400"
                      size={18}
                    />
                    <V2Input
                      className="pl-10"
                      placeholder="Buscar por cliente, teléfono o dirección"
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                    />
                  </div>
                </div>

                <div className="min-w-[160px]">
                  <V2Select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as V2DeliveryStatus | "all")
                    }
                  >
                    <option value="all">Todos los estados</option>
                    <option value="confirmed">Confirmados</option>
                    <option value="completed">Entregados</option>
                    <option value="cancelled">Cancelados</option>
                  </V2Select>
                </div>

                <div className="min-w-[145px]">
                  <V2Select
                    value={typeFilter}
                    onChange={(event) =>
                      setTypeFilter(event.target.value as V2DeliveryType | "all")
                    }
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="delivery">Delivery</option>
                    <option value="pickup">Retira</option>
                  </V2Select>
                </div>

              </V2FilterBar>
            </div>

            <div className="-mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                <span className="text-slate-400">Leyenda:</span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-200" />
                  Pendiente web
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-200" />
                  Confirmado
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-200" />
                  Entregado
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-200" />
                  Cancelado
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <V2DataTable
                rows={filteredDeliveries}
                getRowKey={(row) => row.id}
                rowClassName={(row) => getDeliveryRowToneClass(row)}
                sortKey={tableSort?.key ?? null}
                sortDirection={tableSort?.direction}
                onSortChange={toggleDeliveryTableSort}
                columns={[
                  {
                    header: "ID",
                    sortKey: "id",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <span className="font-semibold text-slate-950">
                          {getDeliveryTrackingId(row)}
                        </span>
                      ),
                  },
                  {
                    header: dateFilterMode === "range" ? "Fecha / hora" : "Hora",
                    sortKey: "time",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <div>
                          {dateFilterMode === "range" ? (
                            <p className="text-xs font-semibold text-slate-500">
                              {formatShortDate(row.date ?? TODAY_DELIVERIES_DATE)}
                            </p>
                          ) : null}
                          <span className="font-semibold text-slate-950">
                            {row.time}
                          </span>
                        </div>
                      ),
                  },
                  {
                    header: "Cliente",
                    sortKey: "client",
                    cell: (row) => renderSelectableCell(row, row.client),
                  },
                  {
                    header: "Teléfono",
                    sortKey: "phone",
                    cell: (row) => renderSelectableCell(row, row.phone),
                  },
                  {
                    header: "Tipo",
                    sortKey: "type",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <V2DeliveryTypeBadge type={row.deliveryType} />
                      ),
                  },
                  {
                    header: "Total",
                    sortKey: "total",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <span className="font-semibold text-slate-950">
                          {formatCurrency(row.total)}
                        </span>
                      ),
                  },
                  {
                    header: "Pago",
                    sortKey: "payment",
                    cell: (row) => renderSelectableCell(row, row.payment),
                  },
                  {
                    header: "Acciones",
                    cell: (row) => (
                      <div
                        className="flex justify-end gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <V2Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openDeliveryEditor(row)}
                        >
                          Editar
                        </V2Button>

                        <V2Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setOpenActionsDeliveryId(row.id)}
                        >
                          Acciones
                        </V2Button>
                      </div>
                    ),
                    className: "text-right",
                  },
                ]}
                className="h-full"
              />
            </div>
          </div>

          <aside className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <V2Card className="flex max-h-[260px] shrink-0 flex-col overflow-hidden">
              {webDeliveriesPendingAcceptance.length > 0 ? (
                <div className="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h2 className="text-sm font-semibold text-amber-950">
                    Pedidos web para aceptar
                  </h2>
                  <div className="mt-3 space-y-3">
                    {webDeliveriesPendingAcceptance.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-amber-200 bg-white p-3 text-left text-sm transition hover:border-amber-300"
                      >
                        <button
                          type="button"
                          onClick={() => selectDelivery(item)}
                          className="block w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">
                                {item.time} · {item.client}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.deliveryType === "delivery" ? item.address : "Retira en local"}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold text-amber-700">
                              {formatCurrency(item.total)}
                            </span>
                          </div>
                        </button>

                        <div className="mt-3 flex gap-2">
                          <V2Button
                            size="sm"
                            variant="success"
                            onClick={(event) => {
                              event.stopPropagation();
                              acceptWebDelivery(item.id);
                            }}
                          >
                            Aceptar
                          </V2Button>
                          <V2Button
                            size="sm"
                            variant="danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              rejectWebDelivery(item.id);
                            }}
                          >
                            Rechazar
                          </V2Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <h2 className="shrink-0 text-base font-semibold text-slate-950">
                Envíos pendientes
              </h2>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-3 text-sm">
                  {confirmedDeliveries.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => selectDelivery(item)}
                      className="group block w-full rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {item.time} · {item.client}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.deliveryType === "delivery"
                              ? item.address
                              : "Retira en local"}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-emerald-700">
                          {formatCurrency(item.total)}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        {shortenOrder(item.order)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </V2Card>

            <V2Card className="flex min-h-[420px] flex-1 flex-col overflow-hidden shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">
                Pedido seleccionado
              </h2>

              {!selectedDelivery ? (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Seleccioná un pedido para ver su información operativa.
                </p>
              ) : (
              <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {getDeliveryTrackingId(selectedDelivery)}
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {selectedDelivery.client}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateLabel(selectedDelivery.date ?? TODAY_DELIVERIES_DATE)} · {selectedDelivery.time}
                      </p>
                    </div>
                    <V2DeliveryStatusBadge status={selectedDelivery.status} />
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                    Tracking público
                  </p>
                  <p className="mt-1 break-all text-xs font-medium text-blue-700">
                    {getDeliveryTrackingPath(selectedDelivery)}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <V2Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        window.open(
                          getDeliveryTrackingPath(selectedDelivery),
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      Ver tracking
                    </V2Button>

                    <V2Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const url = getDeliveryTrackingUrl(selectedDelivery);

                        try {
                          await window.navigator.clipboard.writeText(url);
                        } catch {
                          const tempInput = document.createElement("input");
                          tempInput.value = url;
                          document.body.appendChild(tempInput);
                          tempInput.select();
                          document.execCommand("copy");
                          document.body.removeChild(tempInput);
                        }
                      }}
                    >
                      Copiar link
                    </V2Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Tipo
                    </p>
                    <p className="mt-1 text-slate-700">
                      {selectedDelivery.deliveryType === "delivery" ? "Delivery" : "Retira"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Total
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {formatCurrency(selectedDelivery.total)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Teléfono
                  </p>
                  <p className="mt-1 break-words text-slate-700">
                    {selectedDelivery.phone}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {selectedDelivery.deliveryType === "delivery" ? "Dirección" : "Entrega"}
                  </p>
                  <p className="mt-1 text-slate-700">
                    {selectedDelivery.deliveryType === "delivery"
                      ? selectedDelivery.address
                      : "Retira en local"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Pedido completo
                  </p>
                  <p className="mt-1 leading-6 text-slate-700">
                    {selectedDelivery.order}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Pago
                  </p>
                  <p className="mt-1 text-slate-700">
                    {selectedDelivery.payment}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Nota
                  </p>
                  <p className="mt-1 leading-6 text-slate-700">
                    {selectedDelivery.note}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Timeline
                  </p>
                  <div className="mt-3 space-y-2">
                    {[
                      ["Entró pedido", selectedDelivery.createdAt],
                      ["Confirmado", selectedDelivery.acceptedAt],
                      ["En preparación", selectedDelivery.preparingAt],
                      [
                        selectedDelivery.deliveryType === "pickup"
                          ? "Listo para retirar"
                          : "En viaje al cliente",
                        selectedDelivery.deliveryType === "pickup"
                          ? selectedDelivery.readyAt
                          : selectedDelivery.onTheWayAt,
                      ],
                      ["Entregado", selectedDelivery.deliveredAt],
                      ["Cancelado", selectedDelivery.cancelledAt],
                    ].map(([label, value]) =>
                      value ? (
                        <div key={label} className="flex justify-between gap-3 text-xs">
                          <span className="font-medium text-slate-600">{label}</span>
                          <span className="text-slate-500">
                            {formatCompactDateTime(value)}
                          </span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
              )}
            </V2Card>
          </aside>
        </div>
      </div>

      {whatsAppDraft ? (
        <div
          className="fixed inset-0 z-[76] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => setWhatsAppDraft(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-sm text-slate-500">WhatsApp de pedido</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {getDeliveryWhatsAppActionLabel(whatsAppDraft.action)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {getDeliveryTrackingId(whatsAppDraft.delivery)} · {whatsAppDraft.delivery.time}
                </p>
                {USE_DELIVERY_WHATSAPP_TEST_PHONE ? (
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    Modo prueba: WhatsApp se abre hacia +54 221 614-5679
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setWhatsAppDraft(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar WhatsApp"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <p className="font-medium text-slate-950">
                  {whatsAppDraft.action === "confirmation"
                    ? `Hola ${whatsAppDraft.delivery.client}, tu pedido en Demuru está confirmado.`
                    : whatsAppDraft.action === "cancellation"
                      ? `Hola ${whatsAppDraft.delivery.client}, tu pedido en Demuru fue cancelado.`
                      : `Hola ${whatsAppDraft.delivery.client}, actualizamos tu pedido en Demuru.`}
                </p>
                <p className="mt-2 text-xs">
                  La nota se agregará debajo de este mensaje como “Nota: ...”.
                </p>
              </div>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Nota opcional del local
                </span>
                <textarea
                  value={whatsAppDraft.note}
                  onChange={(event) =>
                    setWhatsAppDraft((current) =>
                      current ? { ...current, note: event.target.value } : current
                    )
                  }
                  rows={5}
                  placeholder={
                    whatsAppDraft.action === "cancellation"
                      ? "Ej: Tuvimos que cancelar por un inconveniente operativo. Te pedimos disculpas."
                      : "Ej: El pedido ya está avanzando. Cualquier cambio, escribinos por WhatsApp."
                  }
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <V2Button
                type="button"
                variant="secondary"
                onClick={() => setWhatsAppDraft(null)}
              >
                Cancelar
              </V2Button>

              <V2Button
                type="button"
                variant="primary"
                onClick={() => {
                  openDeliveryWhatsApp(
                    whatsAppDraft.delivery,
                    whatsAppDraft.action,
                    whatsAppDraft.note
                  );
                  setWhatsAppDraft(null);
                }}
              >
                Abrir WhatsApp
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}

      {openActionsDeliveryId ? (() => {
        const actionsDelivery =
          filteredDeliveries.find((delivery) => delivery.id === openActionsDeliveryId) ??
          deliveries.find((delivery) => delivery.id === openActionsDeliveryId);

        if (!actionsDelivery) return null;

        const isPendingWebDelivery = isWebDeliveryPendingAcceptance(actionsDelivery);
        const isConfirmedDelivery =
          !isPendingWebDelivery && actionsDelivery.status === "confirmed";
        const canReturnStock =
          actionsDelivery.status === "cancelled" && shouldAskToReturnStock(actionsDelivery);
        const canSendConfirmationWhatsApp = actionsDelivery.status !== "cancelled";
        const canSendModificationWhatsApp = actionsDelivery.status !== "cancelled";
        const canSendCancellationWhatsApp = actionsDelivery.status !== "completed";
        const hasAvailableActions =
          isPendingWebDelivery ||
          isConfirmedDelivery ||
          canReturnStock ||
          canSendConfirmationWhatsApp ||
          canSendModificationWhatsApp ||
          canSendCancellationWhatsApp;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
            onClick={() => setOpenActionsDeliveryId(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
                <div>
                  <p className="text-sm text-slate-500">Acciones del envío</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {actionsDelivery.client || "Pedido sin cliente"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {getDeliveryTrackingId(actionsDelivery)} · {actionsDelivery.time}
                  </p>
                  {USE_DELIVERY_WHATSAPP_TEST_PHONE ? (
                    <p className="mt-1 text-xs font-medium text-emerald-600">
                      Modo prueba: WhatsApp se abre hacia +54 221 614-5679
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setOpenActionsDeliveryId(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                  aria-label="Cerrar acciones"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 p-5">
                {canSendConfirmationWhatsApp ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionsDeliveryId(null);
                      setWhatsAppDraft({
                        delivery: actionsDelivery,
                        action: "confirmation",
                        note: "",
                      });
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Enviar confirmación por WhatsApp
                  </button>
                ) : null}

                {canSendModificationWhatsApp ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionsDeliveryId(null);
                      setWhatsAppDraft({
                        delivery: actionsDelivery,
                        action: "modification",
                        note: "",
                      });
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    Enviar modificación por WhatsApp
                  </button>
                ) : null}

                {canSendCancellationWhatsApp ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionsDeliveryId(null);
                      setWhatsAppDraft({
                        delivery: actionsDelivery,
                        action: "cancellation",
                        note: "",
                      });
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Enviar cancelación por WhatsApp
                  </button>
                ) : null}

                {isPendingWebDelivery ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionsDeliveryId(null);
                        acceptWebDelivery(actionsDelivery.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Aceptar pedido
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionsDeliveryId(null);
                        rejectWebDelivery(actionsDelivery.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Rechazar pedido
                    </button>
                  </>
                ) : null}

                {isConfirmedDelivery ? (
                  <>
                    {actionsDelivery.deliveryType === "delivery" && !actionsDelivery.onTheWayAt ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionsDeliveryId(null);
                          markDeliveryOnTheWay(actionsDelivery.id);
                        }}
                        className="flex w-full items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                      >
                        En camino al cliente
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionsDeliveryId(null);
                        completeDelivery(actionsDelivery.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Marcar entregado
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionsDeliveryId(null);
                        requestCancelDelivery(actionsDelivery.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Cancelar pedido
                    </button>
                  </>
                ) : null}

                {canReturnStock ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionsDeliveryId(null);
                      setStockReturnDeliveryId(actionsDelivery.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Devolver stock
                  </button>
                ) : null}

                {!hasAvailableActions ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Este envío no tiene acciones disponibles.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })() : null}

      {acceptanceDeliveryId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => setAcceptanceDeliveryId(null)}
        >
          <div
            className="w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-sm text-slate-500">Confirmar pedido web</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Avisar al cliente
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setAcceptanceDeliveryId(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar confirmación"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm leading-6 text-slate-600">
                Al confirmar, el pedido queda aceptado y se abre WhatsApp para avisarle al cliente
                que el pedido está en preparación.
              </p>

              <label className="mt-5 grid gap-2 text-sm font-medium text-slate-700">
                Tiempo estimado
                <V2Select
                  value={String(acceptanceEtaMinutes)}
                  onChange={(event) => setAcceptanceEtaMinutes(Number(event.target.value))}
                >
                  {Array.from({ length: 8 }).map((_, index) => {
                    const minutes = (index + 1) * 15;

                    return (
                      <option key={minutes} value={minutes}>
                        {minutes} minutos
                      </option>
                    );
                  })}
                </V2Select>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <V2Button
                type="button"
                variant="secondary"
                onClick={() => setAcceptanceDeliveryId(null)}
              >
                Cancelar
              </V2Button>
              <V2Button
                type="button"
                variant="primary"
                onClick={confirmAcceptWebDelivery}
              >
                Confirmar y enviar WhatsApp
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}

      {stockReturnDeliveryId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => setStockReturnDeliveryId(null)}
        >
          <div
            className="w-full max-w-[540px] rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-sm text-slate-500">Cancelar pedido</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  ¿Devolver stock?
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setStockReturnDeliveryId(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar devolución de stock"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm leading-6 text-slate-600">
                Este pedido ya tenía stock descontado. Si la comida ya fue preparada, quizá no
                conviene devolver el stock. Elegí si querés devolverlo o mantenerlo descontado.
              </p>
            </div>

            <div className="grid gap-2 border-t border-slate-200 p-5 sm:grid-cols-2">
              <V2Button
                type="button"
                variant="danger"
                onClick={() => confirmCancelDelivery(false)}
              >
                Mantener descontado
              </V2Button>
              <V2Button
                type="button"
                variant="primary"
                onClick={() => confirmCancelDelivery(true)}
              >
                Devolver stock
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}

      {isNewDeliveryOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={closeActivePopup}
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              createDelivery(new FormData(event.currentTarget));
            }}
            className={`flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl ${
              newDeliveryTab === "pedido"
                ? "h-[850px]"
                : "max-h-[calc(100vh-48px)]"
            }`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">
                  {editingDelivery ? "Editar envío" : "Nuevo envío"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {editingDelivery
                    ? editingDelivery.client
                    : "Pedido para delivery o retiro"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDeliveryModal}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex shrink-0 gap-2 border-b border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setNewDeliveryTab("cliente")}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  newDeliveryTab === "cliente"
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-purple-50"
                }`}
              >
                Datos del cliente
              </button>
              <button
                type="button"
                onClick={() => setNewDeliveryTab("pedido")}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  newDeliveryTab === "pedido"
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-purple-50"
                }`}
              >
                Pedido
              </button>
            </div>

            <datalist id="delivery-client-suggestions">
              {knownDeliveryClients.map((client) => (
                <option key={`${client.name}-${client.phone}`} value={client.name}>
                  {client.phone}
                </option>
              ))}
            </datalist>

            {deliveryFormError ? (
              <div className="mx-5 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {deliveryFormError}
              </div>
            ) : null}

            {newDeliveryTab === "cliente" ? (
              <div className="grid content-start gap-4 px-5 py-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Cliente
                  <input type="hidden" name="client" value={deliveryForm.client} />
                  <V2Input
                    name="deliveryClientSearch"
                    required
                    list="delivery-client-suggestions"
                    autoComplete="off"
                    placeholder="Nombre del cliente"
                    value={deliveryForm.client}
                    onChange={(event) => handleClientInput(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Teléfono
                  <V2Input
                    name="phone"
                    autoComplete="off"
                    placeholder="Teléfono"
                    value={deliveryForm.phone}
                    onChange={(event) =>
                      updateDeliveryFormField("phone", event.target.value)
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Hora
                  <V2Input
                    name="time"
                    type="time"
                    value={deliveryForm.time}
                    onChange={(event) =>
                      updateDeliveryFormField("time", event.target.value)
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Tipo
                  <V2Select
                    name="deliveryType"
                    value={deliveryForm.deliveryType}
                    onChange={(event) =>
                      updateDeliveryFormField(
                        "deliveryType",
                        event.target.value as V2DeliveryType
                      )
                    }
                  >
                    <option value="delivery">Delivery</option>
                    <option value="pickup">Retira en local</option>
                  </V2Select>
                </label>
                {deliveryForm.deliveryType === "delivery" ? (
                  <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                    Dirección
                    <V2Input
                      name="address"
                      autoComplete="off"
                      placeholder="Dirección de entrega"
                      value={deliveryForm.address}
                      onChange={(event) =>
                        updateDeliveryFormField("address", event.target.value)
                      }
                    />
                  </label>
                ) : (
                  <input type="hidden" name="address" value="" />
                )}
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Pago
                  <V2Select
                    name="payment"
                    value={deliveryForm.payment}
                    onChange={(event) =>
                      updateDeliveryFormField("payment", event.target.value)
                    }
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </V2Select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Estado
                  <V2Select
                    name="status"
                    value={deliveryForm.status}
                    onChange={(event) =>
                      updateDeliveryFormField(
                        "status",
                        event.target.value as V2DeliveryStatus
                      )
                    }
                  >
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Entregado</option>
                    <option value="cancelled">Cancelado</option>
                  </V2Select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Nota
                  <V2Textarea
                    name="note"
                    rows={5}
                    placeholder="Indicaciones internas"
                    value={deliveryForm.note}
                    onChange={(event) =>
                      updateDeliveryFormField("note", event.target.value)
                    }
                  />
                </label>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Resumen del pedido
                  </p>

                  {currentOrderItems.length > 0 ? (
                    <div className="mt-3 max-h-32 space-y-2 overflow-y-auto pr-1 text-sm">
                      {currentOrderItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
                        >
                          <div>
                            <p className="font-semibold text-slate-950">{item.name}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.quantity} × {formatCurrency(item.price)}
                            </p>
                          </div>
                          <p className="shrink-0 font-semibold text-slate-950">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">
                      Todavía no agregaste productos al pedido.
                    </p>
                  )}

                  <p className="mt-3 text-2xl font-bold text-slate-950">
                    {formatCurrency(currentOrderTotal)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setNewDeliveryTab("pedido")}
                    className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-purple-50"
                  >
                    Ir al pedido
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-2 md:col-span-2">
                  <V2Button
                    type="button"
                    variant="secondary"
                    onClick={closeDeliveryModal}
                  >
                    Cancelar
                  </V2Button>
                  <V2Button type="submit" variant="primary">
                    {editingDelivery ? "Guardar" : "Crear envío"}
                  </V2Button>
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-5 md:grid-cols-[112px_minmax(0,1fr)_285px]">
                <input type="hidden" name="client" value={deliveryForm.client} />
                <input type="hidden" name="phone" value={deliveryForm.phone} />
                <input type="hidden" name="time" value={deliveryForm.time} />
                <input
                  type="hidden"
                  name="deliveryType"
                  value={deliveryForm.deliveryType}
                />
                <input type="hidden" name="address" value={deliveryForm.address} />
                <input type="hidden" name="payment" value={deliveryForm.payment} />
                <input type="hidden" name="note" value={deliveryForm.note} />
                <input type="hidden" name="status" value={deliveryForm.status} />
                <aside className="min-h-0">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Categorías
                  </h3>

                  <div className="mt-3 grid gap-1.5">
                    {deliveryMenuCategories.map((category) => {
                      const isSelected = selectedMenuCategory === category;

                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setSelectedMenuCategory(category)}
                          className={`rounded-xl border px-3 py-1.5 text-left text-xs font-semibold transition ${
                            isSelected
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <div className="flex min-h-0 flex-col">
                  <h3 className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {editingDelivery ? "Agregar o modificar productos" : "Agregar productos"} del menú
                  </h3>

                  <div className="mt-3 grid min-h-0 flex-1 content-start overflow-y-auto pr-2">
                    {filteredMenuItems.map((item) => {
                      const quantity = orderQuantities[item.id] ?? 0;

                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[92px_1fr_auto] items-center gap-3 border-b border-slate-100 bg-white py-1.5 text-sm transition last:border-b-0 hover:bg-[#BA68C8]/10"
                        >
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateOrderQuantity(item.id, quantity - 1)
                              }
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-xs font-semibold leading-none text-red-700 transition hover:border-red-300 hover:bg-red-100"
                              aria-label={`Quitar ${item.name}`}
                            >
                              -
                            </button>

                            <input
                              value={quantity}
                              onChange={(event) =>
                                updateOrderQuantity(
                                  item.id,
                                  Number(event.target.value)
                                )
                              }
                              type="number"
                              min="0"
                              className="h-7 w-8 rounded-lg border border-slate-200 bg-white px-1 text-center text-xs font-semibold leading-none text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                              aria-label={`Cantidad de ${item.name}`}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                updateOrderQuantity(item.id, quantity + 1)
                              }
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold leading-none text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                              aria-label={`Agregar ${item.name}`}
                            >
                              +
                            </button>
                          </div>

                          <span className="pl-2 font-medium text-slate-950">
                            {item.name}
                          </span>

                          <span className="font-semibold text-slate-700">
                            {formatCurrency(item.price)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pedido actual
                  </h3>

                  <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 pr-2 text-sm leading-6 text-slate-600">
                    {currentOrderItems.length > 0 ? (
                      <div className="space-y-1">
                        {currentOrderItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-2 py-1"
                          >
                            <span>
                              {item.name} ({formatCurrency(item.price)})
                            </span>
                            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-emerald-700">
                              {item.quantity}x
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500">Sin productos cargados.</p>
                    )}
                  </div>

                  <div className="mt-3 rounded-xl bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Total gastado
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {formatCurrency(currentOrderTotal)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    <V2Button
                      type="button"
                      variant="secondary"
                      onClick={() => setOrderQuantities({})}
                    >
                      Vaciar pedido
                    </V2Button>

                    <div className="grid grid-cols-[1fr_1.15fr] gap-2">
                      <V2Button
                        type="button"
                        variant="secondary"
                        onClick={closeDeliveryModal}
                      >
                        Cancelar
                      </V2Button>
                      <V2Button type="submit" variant="primary">
                        {editingDelivery ? "Guardar" : "Crear envío"}
                      </V2Button>
                    </div>
                  </div>
                </div>
              </div>
            )}


          </form>
        </div>
      ) : null}

      {cashRegisterError ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => setCashRegisterError("")}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-sm font-semibold text-amber-700">Cobro pendiente</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  No se puede marcar como entregado
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCashRegisterError("")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                aria-label="Cerrar aviso de caja"
              >
                <X size={18} />
              </button>
            </div>
            <p className="p-5 text-sm leading-6 text-slate-600">{cashRegisterError}</p>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <V2Button type="button" variant="secondary" onClick={() => setCashRegisterError("")}>
                Volver
              </V2Button>
              <a
                href="/local/caja"
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Ir a Caja
              </a>
            </div>
          </div>
        </div>
      ) : null}
      </V2AppShell>
    </>
  );
}
