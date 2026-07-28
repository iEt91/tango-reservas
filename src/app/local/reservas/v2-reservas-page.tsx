"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Filter,
  Landmark,
  Plus,
  Search,
  UserRound,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2ReservationStatusBadge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2MetricCard, V2Card } from "@/components/v2/v2-card";
import { V2DataTable } from "@/components/v2/v2-data-table";
import { V2FilterBar } from "@/components/v2/v2-filter-bar";
import { V2Field, V2Input, V2Select, V2Textarea } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import {
  v2MenuCategories,
  v2MenuItems,
  v2Reservations,
  v2StockProducts,
  type V2ReservationStatus,
} from "@/lib/v2/v2-mock-data";

type V2ReservationWhatsAppAction = "confirmation" | "cancellation" | "modification";
type V2ReservationPaymentMethod = "cash" | "card" | "mercado_pago" | "transfer" | "mixed";

type V2ReservationPaymentBreakdown = {
  cash: number;
  card: number;
  mercadoPago: number;
  transfer: number;
};

type V2ReservationPaymentForm = {
  method: V2ReservationPaymentMethod;
  amount: string;
  cash: string;
  card: string;
  mercadoPago: string;
  transfer: string;
};

type V2ReservationOrderLineItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
};

type V2ReservationDraft = {
  id: string;
  date: string;
  time: string;
  client: string;
  people: number;
  phone: string;
  note: string;
  status: V2ReservationStatus;
  email?: string;
  durationMinutes?: number;
  tableName?: string;
  origin?: V2ReservationOrigin;
  orderItems?: string;
  orderLineItems?: V2ReservationOrderLineItem[];
  orderTotal?: number;
  paymentMethod?: string;
  paidAmount?: number;
  paymentBreakdown?: V2ReservationPaymentBreakdown;
  paymentClosedAt?: string;
  reservationCode?: string;
  stockDiscounted?: boolean;
  stockReturned?: boolean;
  stockMovements?: V2ReservationStockMovement[];
  createdAt?: string;
  confirmedAt?: string;
  seatedAt?: string;
  consumptionStartedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  noShowAt?: string;
};

type V2ReservationStockMovement = {
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

type V2StockProductDraft = (typeof v2StockProducts)[number];

type V2FloorPlanTable = {
  id: string;
  name: string;
  capacity: number;
  status?: "available" | "reserved" | "occupied" | "blocked";
  locked?: boolean;
  mergedTables?: V2FloorPlanTable[];
};

type V2TableOptionForReservation = {
  id: string;
  name: string;
  capacity: number;
  disabled: boolean;
  reason: string;
  isCombined?: boolean;
};

type V2BusinessHourSlot = {
  open: string;
  close: string;
};

type V2BusinessHourConfig = {
  day: string;
  open: string;
  close: string;
  enabled: boolean;
  slots?: V2BusinessHourSlot[];
};

type V2LocalConfigState = {
  businessHours: V2BusinessHourConfig[];
  reservationEnabled: boolean;
  standardDurationMinutes: number;
  confirmationMode: "manual" | "automatic";
  defaultReservationStatus: "pending" | "confirmed";
  minimumNoticeHours: number;
  bookingWindowDays: number;
  maxPeoplePerSlot: number;
  allowReservationsWithoutTable: boolean;
  autoAssignReservationTables: boolean;
  allowTableCombinations: boolean;
};

type V2SortMode = "time" | "latest" | "status";
type V2SortDirection = "asc" | "desc";
type V2ReservationColumnSortKey = "id" | "time" | "client" | "people" | "phone" | "table";
type V2DateFilterMode = "single" | "range";
type V2ReservationStatusFilter = V2ReservationStatus | "all";
type V2ReservationOrigin =
  | "web"
  | "whatsapp"
  | "phone"
  | "instagram"
  | "manual";

type V2MenuCategory = string;

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

type V2MenuOrderItem = {
  id: string;
  name: string;
  price: number;
  category: string;
};

const RESERVATIONS_STORAGE_KEY = "tango-v2-reservations-calendar-v2";
const LOCAL_CONFIG_STORAGE_KEY = "tango-v2-local-config-v1";
const LOCAL_CONFIG_EVENT = "tango-v2-local-config-updated";
const STOCK_PRODUCTS_STORAGE_KEY = "tango-v2-stock-products";
const STOCK_PRODUCTS_EVENT = "tango-v2-stock-products-updated";
const STOCK_MOVEMENTS_STORAGE_KEY = "tango-v2-stock-movements";
const MENU_ITEMS_STORAGE_KEY = "tango-v2-menu-items";
const MENU_CATEGORIES_STORAGE_KEY = "tango-v2-menu-categories";

const DEFAULT_LOCAL_CONFIG: V2LocalConfigState = {
  businessHours: [
    { day: "Domingo", open: "12:00", close: "00:00", enabled: true, slots: [{ open: "12:00", close: "00:00" }] },
    { day: "Lunes", open: "12:00", close: "00:00", enabled: false, slots: [{ open: "12:00", close: "00:00" }] },
    { day: "Martes", open: "12:00", close: "00:00", enabled: true, slots: [{ open: "12:00", close: "00:00" }] },
    { day: "Miércoles", open: "12:00", close: "00:00", enabled: true, slots: [{ open: "12:00", close: "00:00" }] },
    { day: "Jueves", open: "12:00", close: "00:00", enabled: true, slots: [{ open: "12:00", close: "00:00" }] },
    { day: "Viernes", open: "12:00", close: "00:00", enabled: true, slots: [{ open: "12:00", close: "00:00" }] },
    { day: "Sábado", open: "12:00", close: "00:00", enabled: true, slots: [{ open: "12:00", close: "00:00" }] },
  ],
  reservationEnabled: true,
  standardDurationMinutes: 120,
  confirmationMode: "manual",
  defaultReservationStatus: "pending",
  minimumNoticeHours: 2,
  bookingWindowDays: 14,
  maxPeoplePerSlot: 40,
  allowReservationsWithoutTable: true,
  autoAssignReservationTables: true,
  allowTableCombinations: true,
};

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const FLOOR_TABLES_STORAGE_KEY = "tango-v2-floor-tables";
const RESERVATIONS_EVENT = "tango-v2-reservations-updated";
const FLOOR_TABLES_EVENT = "tango-v2-floor-tables-updated";

const DEFAULT_FLOOR_TABLES: V2FloorPlanTable[] = [
  { id: "table-1", name: "Mesa 1", capacity: 4, status: "available" },
  { id: "table-2", name: "Mesa 2", capacity: 2, status: "available" },
  { id: "table-3", name: "Mesa 3", capacity: 4, status: "available" },
  { id: "table-4", name: "Mesa 4", capacity: 4, status: "blocked", locked: true },
  { id: "table-5", name: "Mesa 5", capacity: 2, status: "available" },
  { id: "table-6-7", name: "Mesa 6-7", capacity: 8, status: "available" },
  { id: "table-8", name: "Mesa 8", capacity: 4, status: "available" },
  { id: "table-9", name: "Mesa 9", capacity: 4, status: "available" },
  { id: "table-10", name: "Mesa 10", capacity: 2, status: "blocked", locked: true },
  { id: "table-11", name: "Mesa 11", capacity: 4, status: "available" },
  { id: "table-12", name: "Mesa 12", capacity: 4, status: "available" },
  { id: "table-13", name: "Mesa 13", capacity: 4, status: "available" },
  { id: "table-14", name: "Mesa 14", capacity: 2, status: "available" },
];

const STATUS_PRIORITY: Record<V2ReservationStatus, number> = {
  pending: 1,
  confirmed: 2,
  completed: 3,
  cancelled: 4,
  no_show: 5,
};

const TODAY_RESERVATIONS_DATE = getTodayDateKey();

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

const DETAIL_BORDER_TONES = [
  "!border-emerald-300 ring-4 ring-emerald-100",
  "!border-blue-300 ring-4 ring-blue-100",
  "!border-purple-300 ring-4 ring-purple-100",
  "!border-orange-300 ring-4 ring-orange-100",
  "!border-rose-300 ring-4 ring-rose-100",
];

const RESERVATION_WHATSAPP_TEST_PHONE = "542216145679";
const USE_RESERVATION_WHATSAPP_TEST_PHONE = false;

const ORIGIN_LABELS: Record<V2ReservationOrigin, string> = {
  web: "Web",
  whatsapp: "WhatsApp",
  phone: "Teléfono",
  instagram: "Instagram",
  manual: "Manual",
};

const FALLBACK_MENU_CATEGORIES: { id: V2MenuCategory; label: string }[] = [
  { id: "all", label: "Todos" },
  ...v2MenuCategories
    .filter((category) => category.visible !== false && category.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((category) => ({ id: category.id, label: category.name })),
];

const FALLBACK_MENU_ORDER_ITEMS: V2MenuOrderItem[] = v2MenuItems
  .filter((item) => item.visible !== false && item.status !== "paused")
  .map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    category: item.categoryId || "sin-categoria",
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const storedValue = window.localStorage.getItem(key);

    if (!storedValue) return fallback;

    return JSON.parse(storedValue) as T;
  } catch {
    return fallback;
  }
}

function readStoredMenuItems() {
  return readFromStorage<V2StoredMenuItem[]>(MENU_ITEMS_STORAGE_KEY, v2MenuItems)
    .filter((item) => item.visible !== false && item.status !== "paused")
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price) || 0,
      category: item.categoryId || "sin-categoria",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function readStoredMenuCategories() {
  const menuItems = readStoredMenuItems();
  const storedCategories = readFromStorage<V2StoredMenuCategory[]>(
    MENU_CATEGORIES_STORAGE_KEY,
    v2MenuCategories
  );
  const categoryIdsWithItems = new Set(menuItems.map((item) => item.category));
  const visibleCategories = storedCategories
    .filter((category) => category.visible !== false && category.active !== false)
    .filter((category) => categoryIdsWithItems.has(category.id))
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((category) => ({ id: category.id, label: category.name }));

  return [
    { id: "all", label: "Todos" },
    ...(categoryIdsWithItems.has("sin-categoria")
      ? [{ id: "sin-categoria", label: "Sin categoría" }]
      : []),
    ...visibleCategories,
  ];
}

function writeToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(key, JSON.stringify(value));
}

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
  movements: V2ReservationStockMovement[],
  direction: "discount" | "return",
  reservation: V2ReservationDraft,
  detail?: string
) {
  if (typeof window === "undefined" || movements.length === 0) return;

  const stockProducts = readStockProductsFromStorage();
  const logs: V2StockMovementLog[] = movements.map((movement, index) => {
    const product = stockProducts.find((item) => item.id === movement.productId);

    return {
      id: `stock-mov-res-${Date.now()}-${index}`,
      createdAt: new Date().toISOString(),
      type: direction,
      origin: "reservas",
      productId: movement.productId,
      productName: movement.productName,
      quantity: movement.quantity,
      unit: product?.unit ?? "unidad",
      label: direction === "discount" ? "Consumo de mesa cargado" : "Stock devuelto por reserva",
      detail: detail ?? formatReservationOrderItems(reservation),
      referenceId: reservation.id,
      client: reservation.client,
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

function addStockMovement(
  movements: Map<string, V2ReservationStockMovement>,
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

function resolveStockMovementsForMenuItem(
  item:
    | Pick<V2MenuOrderItem, "id" | "name">
    | Pick<V2ReservationOrderLineItem, "menuItemId" | "name">
    | string,
  quantity: number
) {
  const stockProducts = readStockProductsFromStorage();
  const recipes = readRecipesFromConfig();
  const movements = new Map<string, V2ReservationStockMovement>();
  const itemId =
    typeof item === "string"
      ? ""
      : "menuItemId" in item
        ? item.menuItemId
        : item.id;
  const itemName = typeof item === "string" ? item : item.name;
  const normalizedItemName = normalizeTextForStock(itemName);
  const recipe =
    recipes.find((candidate) => candidate.menuItemId && candidate.menuItemId === itemId) ??
    recipes.find((candidate) => normalizeTextForStock(candidate.name) === normalizedItemName);

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

      addStockMovement(movements, stockProduct, movementQuantity);
    });

    return Array.from(movements.values());
  }

  const stock = {
    harina: findStockProductByName(stockProducts, "Harina 000"),
    muzzarella: findStockProductByName(stockProducts, "Muzzarella"),
    carne: findStockProductByName(stockProducts, "Carne picada"),
    vino: findStockProductByName(stockProducts, "Vino Malbec"),
    gaseosa: findStockProductByName(stockProducts, "Gaseosa cola 1.5L"),
    cajasPizza: findStockProductByName(stockProducts, "Cajas de pizza grandes"),
  };

  if (
    normalizedItemName.includes("pizza") ||
    normalizedItemName.includes("muzzarella") ||
    normalizedItemName.includes("fugazzeta")
  ) {
    addStockMovement(movements, stock.harina, quantity * 0.25);
    addStockMovement(movements, stock.muzzarella, quantity * 0.35);
    addStockMovement(movements, stock.cajasPizza, quantity);
  }

  if (normalizedItemName.includes("empanada")) {
    addStockMovement(movements, stock.harina, quantity * 0.05);

    if (normalizedItemName.includes("carne")) {
      addStockMovement(movements, stock.carne, quantity * 0.08);
    }

    if (normalizedItemName.includes("jamon") || normalizedItemName.includes("queso")) {
      addStockMovement(movements, stock.muzzarella, quantity * 0.04);
    }
  }

  if (normalizedItemName.includes("gaseosa") || normalizedItemName.includes("cola")) {
    addStockMovement(movements, stock.gaseosa, quantity);
  }

  if (normalizedItemName.includes("vino")) {
    addStockMovement(movements, stock.vino, quantity);
  }

  return Array.from(movements.values());
}

function applyStockMovements(
  movements: V2ReservationStockMovement[],
  direction: "discount" | "return",
  reservation?: V2ReservationDraft,
  detail?: string
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

  if (reservation) {
    appendStockMovementHistory(movements, direction, reservation, detail);
  }
}

function mergeStockMovements(
  baseMovements: V2ReservationStockMovement[],
  extraMovements: V2ReservationStockMovement[]
) {
  const mergedMovements = new Map<string, V2ReservationStockMovement>();

  [...baseMovements, ...extraMovements].forEach((movement) => {
    const current = mergedMovements.get(movement.productId);

    mergedMovements.set(movement.productId, {
      ...movement,
      quantity: Number(((current?.quantity ?? 0) + movement.quantity).toFixed(2)),
    });
  });

  return Array.from(mergedMovements.values()).filter((movement) => movement.quantity > 0);
}

function subtractStockMovements(
  baseMovements: V2ReservationStockMovement[],
  returnedMovements: V2ReservationStockMovement[]
) {
  const remainingMovements = new Map<string, V2ReservationStockMovement>();

  baseMovements.forEach((movement) => {
    remainingMovements.set(movement.productId, movement);
  });

  returnedMovements.forEach((movement) => {
    const current = remainingMovements.get(movement.productId);

    if (!current) return;

    remainingMovements.set(movement.productId, {
      ...current,
      quantity: Number((current.quantity - movement.quantity).toFixed(2)),
    });
  });

  return Array.from(remainingMovements.values()).filter((movement) => movement.quantity > 0);
}

function formatStockMovementsSummary(movements: V2ReservationStockMovement[]) {
  if (movements.length === 0) return "sin movimientos de stock";

  return movements
    .map((movement) => `${movement.productName}: ${movement.quantity}`)
    .join(", ");
}

function formatReservationNote(note?: string) {
  const cleanNote = (note ?? "")
    .replace(/\s*·?\s*Stock ajustado por consumo de mesa:[^.]*\./gi, " ")
    .replace(/\s*·?\s*Consumo de mesa vaciado y stock devuelto\./gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleanNote || "—";
}

function normalizeLocalConfig(value: Partial<V2LocalConfigState> | null | undefined): V2LocalConfigState {
  const mergedConfig = {
    ...DEFAULT_LOCAL_CONFIG,
    ...(value ?? {}),
  };

  return {
    ...mergedConfig,
    businessHours:
      Array.isArray(mergedConfig.businessHours) && mergedConfig.businessHours.length > 0
        ? mergedConfig.businessHours
        : DEFAULT_LOCAL_CONFIG.businessHours,
    standardDurationMinutes: Math.max(Number(mergedConfig.standardDurationMinutes) || 120, 15),
    minimumNoticeHours: Math.max(Number(mergedConfig.minimumNoticeHours) || 0, 0),
    bookingWindowDays: Math.max(Number(mergedConfig.bookingWindowDays) || 14, 1),
    maxPeoplePerSlot: Math.max(Number(mergedConfig.maxPeoplePerSlot) || 40, 1),
    defaultReservationStatus:
      mergedConfig.defaultReservationStatus === "confirmed" ? "confirmed" : "pending",
    confirmationMode: mergedConfig.confirmationMode === "automatic" ? "automatic" : "manual",
    reservationEnabled: Boolean(mergedConfig.reservationEnabled),
    allowReservationsWithoutTable: Boolean(mergedConfig.allowReservationsWithoutTable),
    autoAssignReservationTables:
      mergedConfig.autoAssignReservationTables !== false,
    allowTableCombinations:
      mergedConfig.allowTableCombinations !== false,
  };
}

function loadLocalConfig() {
  return normalizeLocalConfig(
    readFromStorage<Partial<V2LocalConfigState>>(LOCAL_CONFIG_STORAGE_KEY, DEFAULT_LOCAL_CONFIG)
  );
}

function getBusinessHourForDate(config: V2LocalConfigState, date: string) {
  const parsedDate = parseDate(date);
  const dayName = DAY_NAMES[parsedDate.getDay()];

  return config.businessHours.find((item) => item.day === dayName) ?? null;
}

function getBusinessHourSlots(item: V2BusinessHourConfig | null | undefined) {
  if (!item?.enabled) return [];

  const slots =
    Array.isArray(item.slots) && item.slots.length > 0
      ? item.slots
      : [{ open: item.open, close: item.close }];

  return slots.slice(0, 2);
}

function getBusinessHourSlotsForDate(config: V2LocalConfigState, date: string) {
  return getBusinessHourSlots(getBusinessHourForDate(config, date));
}

function formatBusinessHourSlots(slots: V2BusinessHourSlot[]) {
  if (slots.length === 0) return "Cerrado";

  return slots.map((slot) => `${slot.open} — ${slot.close}`).join(" / ");
}

function isDateOpenForReservations(config: V2LocalConfigState, date: string) {
  return getBusinessHourSlotsForDate(config, date).length > 0;
}

function getMaxBookingDate(config: V2LocalConfigState) {
  return addDays(TODAY_RESERVATIONS_DATE, config.bookingWindowDays - 1);
}

function isDateInsideBookingWindow(config: V2LocalConfigState, date: string) {
  return date >= TODAY_RESERVATIONS_DATE && date <= getMaxBookingDate(config);
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function formatMoney(value: number) {
  return `$${Math.max(Number(value) || 0, 0).toLocaleString("es-AR")}`;
}

function parsePaymentAmount(value: string) {
  const normalizedValue = value.replace(",", ".");
  const amount = Number(normalizedValue);

  return Number.isFinite(amount) ? Math.max(amount, 0) : 0;
}

function formatPaymentMethod(method?: string) {
  if (!method) return "Sin método";

  const normalizedMethod = method.trim().toLowerCase();

  if (normalizedMethod === "cash" || normalizedMethod.includes("efectivo")) return "Efectivo";
  if (normalizedMethod === "card" || normalizedMethod.includes("tarjeta")) return "Tarjeta";
  if (
    normalizedMethod === "mercado_pago" ||
    normalizedMethod.includes("mercado") ||
    normalizedMethod.includes("mp")
  ) {
    return "Mercado Pago";
  }
  if (normalizedMethod === "transfer" || normalizedMethod.includes("transfer")) return "Transferencia";
  if (normalizedMethod === "mixed" || normalizedMethod.includes("mixto")) return "Mixto";

  return method;
}

function getPaymentBreakdownTotal(breakdown?: V2ReservationPaymentBreakdown) {
  if (!breakdown) return 0;

  return (
    Number(breakdown.cash) +
    Number(breakdown.card) +
    Number(breakdown.mercadoPago) +
    Number(breakdown.transfer)
  );
}

function createPaymentForm(reservation: V2ReservationDraft): V2ReservationPaymentForm {
  const total = Math.max(Number(reservation.orderTotal) || 0, 0);
  const breakdown = reservation.paymentBreakdown;

  return {
    method:
      reservation.paymentMethod === "Mixto" || reservation.paymentMethod === "mixed"
        ? "mixed"
        : "cash",
    amount: String(Number(reservation.paidAmount ?? total) || 0),
    cash: String(Number(breakdown?.cash) || 0),
    card: String(Number(breakdown?.card) || 0),
    mercadoPago: String(Number(breakdown?.mercadoPago) || 0),
    transfer: String(Number(breakdown?.transfer) || 0),
  };
}

function getPaymentBreakdownFromForm(form: V2ReservationPaymentForm): V2ReservationPaymentBreakdown {
  if (form.method === "mixed") {
    return {
      cash: parsePaymentAmount(form.cash),
      card: parsePaymentAmount(form.card),
      mercadoPago: parsePaymentAmount(form.mercadoPago),
      transfer: parsePaymentAmount(form.transfer),
    };
  }

  const amount = parsePaymentAmount(form.amount);

  return {
    cash: form.method === "cash" ? amount : 0,
    card: form.method === "card" ? amount : 0,
    mercadoPago: form.method === "mercado_pago" ? amount : 0,
    transfer: form.method === "transfer" ? amount : 0,
  };
}

const PAYMENT_METHOD_OPTIONS: {
  method: V2ReservationPaymentMethod;
  label: string;
  icon: "cash" | "card" | "mercado_pago" | "transfer" | "mixed";
}[] = [
  { method: "cash", label: "Efectivo", icon: "cash" },
  { method: "card", label: "Tarjeta", icon: "card" },
  { method: "transfer", label: "Transferencia", icon: "transfer" },
  { method: "mercado_pago", label: "Mercado Pago", icon: "mercado_pago" },
  { method: "mixed", label: "Mixto", icon: "mixed" },
];

function renderPaymentMethodIcon(icon: (typeof PAYMENT_METHOD_OPTIONS)[number]["icon"]) {
  if (icon === "cash") return <Banknote size={20} />;
  if (icon === "card") return <CreditCard size={20} />;
  if (icon === "transfer") return <Landmark size={20} />;
  if (icon === "mercado_pago") return <Wallet size={20} />;

  return <ArrowRightLeft size={20} />;
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

function getOrderItemGroups(orderItems?: string) {
  const groups = new Map<string, number>();

  (orderItems ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      groups.set(item, (groups.get(item) ?? 0) + 1);
    });

  return Array.from(groups.entries()).map(([item, quantity]) => ({
    item,
    quantity,
  }));
}

function getMenuItemToken(item: Pick<V2MenuOrderItem, "name" | "price">) {
  return `${item.name} (${formatMoney(item.price)})`;
}

function buildOrderItemsTextFromLineItems(lineItems?: V2ReservationOrderLineItem[]) {
  return (lineItems ?? [])
    .flatMap((item) =>
      Array.from({ length: Math.max(Number(item.quantity) || 0, 0) }, () =>
        getMenuItemToken({ name: item.name, price: item.price })
      )
    )
    .join(", ");
}

function normalizeOrderLineItems(
  value: unknown,
  legacyOrderItems?: string,
  menuItems: V2MenuOrderItem[] = FALLBACK_MENU_ORDER_ITEMS
): V2ReservationOrderLineItem[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => item as Partial<V2ReservationOrderLineItem>)
      .filter((item) => item.menuItemId || item.name)
      .map((item) => {
        const matchedMenuItem =
          menuItems.find((menuItem) => menuItem.id === item.menuItemId) ??
          menuItems.find(
            (menuItem) =>
              normalizeTextForStock(menuItem.name) === normalizeTextForStock(item.name ?? "")
          );

        return {
          menuItemId: item.menuItemId || matchedMenuItem?.id || "",
          name: item.name || matchedMenuItem?.name || "Plato sin nombre",
          price: Number(item.price ?? matchedMenuItem?.price) || 0,
          quantity: Math.max(Number(item.quantity) || 0, 0),
        };
      })
      .filter((item) => item.quantity > 0);
  }

  const groupedItems = getOrderItemGroups(legacyOrderItems);

  return groupedItems
    .map(({ item, quantity }) => {
      const matchedMenuItem =
        menuItems.find((menuItem) => item === getMenuItemToken(menuItem)) ??
        menuItems.find((menuItem) =>
          normalizeTextForStock(item).includes(normalizeTextForStock(menuItem.name))
        );

      if (!matchedMenuItem) {
        return {
          menuItemId: "",
          name: item.replace(/\s*\([^)]*\)\s*$/, ""),
          price: 0,
          quantity,
        };
      }

      return {
        menuItemId: matchedMenuItem.id,
        name: matchedMenuItem.name,
        price: matchedMenuItem.price,
        quantity,
      };
    })
    .filter((item) => item.quantity > 0);
}

function formatOrderLineItems(lineItems?: V2ReservationOrderLineItem[]) {
  const validItems = (lineItems ?? []).filter((item) => Number(item.quantity) > 0);

  if (validItems.length === 0) return "Sin platos asignados";

  return validItems
    .map((item) => `${item.quantity}x ${item.name} (${formatMoney(item.price)})`)
    .join(", ");
}

function formatReservationOrderItems(
  reservation: Pick<V2ReservationDraft, "orderItems" | "orderLineItems">
) {
  if (reservation.orderLineItems && reservation.orderLineItems.length > 0) {
    return formatOrderLineItems(reservation.orderLineItems);
  }

  const groups = getOrderItemGroups(reservation.orderItems);

  if (groups.length === 0) return "Sin platos asignados";

  return groups
    .map(({ item, quantity }) => `${quantity}x ${item}`)
    .join(", ");
}

function getMenuItemQuantity(
  orderLineItems: V2ReservationOrderLineItem[] | undefined,
  item: V2MenuOrderItem
) {
  return orderLineItems?.find((lineItem) => lineItem.menuItemId === item.id)?.quantity ?? 0;
}

function calculateOrderTotal(
  orderItems?: string,
  menuItems: V2MenuOrderItem[] = FALLBACK_MENU_ORDER_ITEMS
) {
  const rawItems = (orderItems ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return rawItems.reduce((total, rawItem) => {
    const matchingItem = menuItems.find((item) => rawItem === getMenuItemToken(item));

    return total + (matchingItem?.price ?? 0);
  }, 0);
}

function calculateOrderLineItemsTotal(lineItems?: V2ReservationOrderLineItem[]) {
  return (lineItems ?? []).reduce(
    (total, item) => total + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );
}

function timeToMinutes(time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);

  if (Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes)) return 0;

  return parsedHours * 60 + parsedMinutes;
}

function normalizeTableName(tableName?: string) {
  const normalized = tableName?.trim().toLowerCase() ?? "";

  if (!normalized) return "";
  if (/^\d+$/.test(normalized)) return `mesa ${Number(normalized)}`;

  return normalized
    .replace(/mesa\s*0*(\d+)/, "mesa $1")
    .replace(/\s+/g, " ");
}

function splitTableNames(tableName?: string) {
  return (tableName ?? "")
    .split("+")
    .map((name) => normalizeTableName(name))
    .filter(Boolean);
}

function joinTableNames(tables: Pick<V2FloorPlanTable, "name">[]) {
  return tables.map((table) => table.name).join(" + ");
}

function getReservationRange(reservation: Pick<V2ReservationDraft, "time" | "durationMinutes">) {
  const startsAt = timeToMinutes(reservation.time);
  const endsAt = startsAt + (reservation.durationMinutes ?? 120);

  return { startsAt, endsAt };
}

function reservationRangesOverlap(
  firstReservation: Pick<V2ReservationDraft, "time" | "durationMinutes">,
  secondReservation: Pick<V2ReservationDraft, "time" | "durationMinutes">
) {
  const firstRange = getReservationRange(firstReservation);
  const secondRange = getReservationRange(secondReservation);

  return (
    firstRange.startsAt < secondRange.endsAt &&
    secondRange.startsAt < firstRange.endsAt
  );
}

function isActiveReservationStatus(status: V2ReservationStatus) {
  return status === "pending" || status === "confirmed";
}

function getBestAvailableTableForReservation(
  reservation: V2ReservationDraft,
  reservations: V2ReservationDraft[],
  floorTables: V2FloorPlanTable[],
  allowTableCombinations: boolean
) {
  function tableConflict(tableName: string) {
    const normalizedTableName = normalizeTableName(tableName);

    return reservations.some((currentReservation) => {
      if (currentReservation.id === reservation.id) return false;
      if (currentReservation.date !== reservation.date) return false;
      if (!isActiveReservationStatus(currentReservation.status)) return false;
      if (!splitTableNames(currentReservation.tableName).includes(normalizedTableName)) return false;

      return reservationRangesOverlap(currentReservation, reservation);
    });
  }

  const availableSingleTables = floorTables
    .filter((table) => table.status !== "blocked" && !table.locked)
    .filter((table) => Number(table.capacity) >= Number(reservation.people))
    .filter((table) => !tableConflict(table.name))
    .sort(
      (first, second) =>
        Number(first.capacity) - Number(second.capacity) ||
        first.name.localeCompare(second.name, "es")
    );

  if (availableSingleTables[0]) return availableSingleTables[0].name;

  if (!allowTableCombinations) return "";

  const availableTables = floorTables
    .filter((table) => table.status !== "blocked" && !table.locked)
    .filter((table) => !tableConflict(table.name))
    .sort(
      (first, second) =>
        Number(first.capacity) - Number(second.capacity) ||
        first.name.localeCompare(second.name, "es")
    );

  for (let firstIndex = 0; firstIndex < availableTables.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < availableTables.length; secondIndex += 1) {
      const pair = [availableTables[firstIndex], availableTables[secondIndex]];
      const capacity = pair.reduce((total, table) => total + Number(table.capacity), 0);

      if (capacity >= Number(reservation.people)) {
        return joinTableNames(pair);
      }
    }
  }

  for (let firstIndex = 0; firstIndex < availableTables.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < availableTables.length; secondIndex += 1) {
      for (let thirdIndex = secondIndex + 1; thirdIndex < availableTables.length; thirdIndex += 1) {
        const group = [
          availableTables[firstIndex],
          availableTables[secondIndex],
          availableTables[thirdIndex],
        ];
        const capacity = group.reduce((total, table) => total + Number(table.capacity), 0);

        if (capacity >= Number(reservation.people)) {
          return joinTableNames(group);
        }
      }
    }
  }

  return "";
}

function parseDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function formatDateLabel(date: string) {
  const parsedDate = parseDate(date);

  return `${DAY_NAMES[parsedDate.getDay()]}, ${parsedDate.getDate()} de ${
    MONTH_NAMES[parsedDate.getMonth()]
  } de ${parsedDate.getFullYear()}`;
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

function addDays(date: string, days: number) {
  const parsedDate = parseDate(date);
  parsedDate.setDate(parsedDate.getDate() + days);

  return parsedDate.toISOString().slice(0, 10);
}

function getMonthKey(date: string) {
  return date.slice(0, 7);
}

function getMonthStart(date: string) {
  return `${getMonthKey(date)}-01`;
}

function getMonthDays(date: string) {
  const monthStart = parseDate(getMonthStart(date));
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

function getRangeBounds(startDate: string, endDate: string) {
  if (startDate <= endDate) {
    return { start: startDate, end: endDate };
  }

  return { start: endDate, end: startDate };
}

function formatCompactDate(date: string) {
  const parsedDate = parseDate(date);

  return `${parsedDate.getDate()} ${MONTH_NAMES[parsedDate.getMonth()]} ${
    parsedDate.getFullYear()
  }`;
}

function formatShortDate(date: string) {
  const parsedDate = parseDate(date);

  return `${String(parsedDate.getDate()).padStart(2, "0")}/${String(
    parsedDate.getMonth() + 1
  ).padStart(2, "0")}`;
}

function createReservationTimestamp(date?: string, time?: string) {
  const fallbackDate = date || TODAY_RESERVATIONS_DATE;
  const fallbackTime = time || "00:00";
  const parsedDate = new Date(`${fallbackDate}T${fallbackTime}:00`);

  return Number.isNaN(parsedDate.getTime())
    ? new Date().toISOString()
    : parsedDate.toISOString();
}

function getNowTimestamp() {
  return new Date().toISOString();
}

function withReservationStatusTimestamp(
  reservation: V2ReservationDraft,
  status: V2ReservationStatus
): V2ReservationDraft {
  const now = getNowTimestamp();

  if (status === "confirmed") {
    return {
      ...reservation,
      status,
      confirmedAt: reservation.confirmedAt ?? now,
    };
  }

  if (status === "completed") {
    return {
      ...reservation,
      status,
      completedAt: reservation.completedAt ?? now,
    };
  }

  if (status === "cancelled") {
    return {
      ...reservation,
      status,
      cancelledAt: reservation.cancelledAt ?? now,
    };
  }

  if (status === "no_show") {
    return {
      ...reservation,
      status,
      noShowAt: reservation.noShowAt ?? now,
    };
  }

  return { ...reservation, status };
}

function createEmptyReservation(
  date: string,
  config: V2LocalConfigState
): V2ReservationDraft {
  return {
    id: `res-${Date.now()}`,
    date,
    time: getBusinessHourSlotsForDate(config, date)[0]?.open ?? "20:00",
    client: "",
    people: 2,
    phone: "",
    email: "",
    note: "",
    status: config.defaultReservationStatus,
    durationMinutes: config.standardDurationMinutes,
    tableName: "",
    origin: "manual",
    reservationCode: createPublicCode("RES"),
    createdAt: getNowTimestamp(),
  };
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

function getReservationCode(reservation: Pick<V2ReservationDraft, "id" | "reservationCode">) {
  return reservation.reservationCode || createPublicCode("RES", reservation.id);
}

function getReservationTrackingPath(reservation: Pick<V2ReservationDraft, "id" | "reservationCode">) {
  return `/demuru/reserva/${getReservationCode(reservation)}`;
}

function getReservationTrackingUrl(reservation: Pick<V2ReservationDraft, "id" | "reservationCode">) {
  if (typeof window === "undefined") return getReservationTrackingPath(reservation);

  return `${window.location.origin}${getReservationTrackingPath(reservation)}`;
}

function normalizeWhatsAppPhone(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeReservation(reservation: V2ReservationDraft): V2ReservationDraft {
  return {
    ...reservation,
    date: reservation.date || TODAY_RESERVATIONS_DATE,
    client: reservation.client.trim() || "Cliente sin nombre",
    phone: reservation.phone.trim(),
    email: reservation.email?.trim() ?? "",
    note: formatReservationNote(reservation.note),
    people: Math.max(Number(reservation.people) || 1, 1),
    durationMinutes: Math.max(Number(reservation.durationMinutes) || 120, 15),
    tableName: reservation.tableName?.trim() ?? "",
    origin: reservation.origin ?? "manual",
    orderItems:
      reservation.orderLineItems && reservation.orderLineItems.length > 0
        ? buildOrderItemsTextFromLineItems(reservation.orderLineItems)
        : reservation.orderItems?.trim() ?? "",
    orderLineItems: normalizeOrderLineItems(
      reservation.orderLineItems,
      reservation.orderItems,
      readStoredMenuItems()
    ),
    orderTotal:
      reservation.orderLineItems && reservation.orderLineItems.length > 0
        ? calculateOrderLineItemsTotal(reservation.orderLineItems)
        : Math.max(
            Number(reservation.orderTotal) ||
              calculateOrderTotal(reservation.orderItems, readStoredMenuItems()) ||
              0,
            0
          ),
    reservationCode: reservation.reservationCode ?? createPublicCode("RES", reservation.id),
    stockDiscounted: Boolean(reservation.stockDiscounted),
    stockReturned: Boolean(reservation.stockReturned),
    stockMovements: reservation.stockMovements ?? [],
    createdAt: reservation.createdAt ?? createReservationTimestamp(reservation.date, reservation.time),
    confirmedAt:
      reservation.confirmedAt ??
      (reservation.status === "confirmed" || reservation.status === "completed"
        ? createReservationTimestamp(reservation.date, reservation.time)
        : undefined),
    consumptionStartedAt:
      reservation.consumptionStartedAt ??
      (reservation.orderItems?.trim() || (reservation.orderLineItems?.length ?? 0) > 0
        ? createReservationTimestamp(reservation.date, reservation.time)
        : undefined),
    completedAt:
      reservation.completedAt ??
      (reservation.status === "completed"
        ? createReservationTimestamp(reservation.date, reservation.time)
        : undefined),
    cancelledAt:
      reservation.cancelledAt ??
      (reservation.status === "cancelled"
        ? createReservationTimestamp(reservation.date, reservation.time)
        : undefined),
    noShowAt:
      reservation.noShowAt ??
      (reservation.status === "no_show"
        ? createReservationTimestamp(reservation.date, reservation.time)
        : undefined),
  };
}

function loadStoredReservations() {
  return readFromStorage<V2ReservationDraft[]>(
    RESERVATIONS_STORAGE_KEY,
    v2Reservations
  ).map((reservation) => normalizeReservation(reservation));
}

function loadStoredFloorTables() {
  return readFromStorage<V2FloorPlanTable[]>(
    FLOOR_TABLES_STORAGE_KEY,
    DEFAULT_FLOOR_TABLES
  ).map((table) => ({
    ...table,
    capacity: Math.max(Number(table.capacity) || 1, 1),
  }));
}

function reservationHasNoTable(reservation: V2ReservationDraft) {
  return !reservation.tableName?.trim();
}

function reservationNeedsTable(reservation: V2ReservationDraft) {
  return (
    reservationHasNoTable(reservation) &&
    reservation.status === "confirmed"
  );
}

function reservationCanBeCompleted(reservation: V2ReservationDraft) {
  return reservation.status === "confirmed" && !reservationNeedsTable(reservation);
}

function getReservationRowToneClass(reservation: V2ReservationDraft) {
  if (reservation.status === "completed") {
    return "bg-blue-100/60 hover:bg-blue-100/100";
  }

  if (reservation.status === "cancelled") {
    return "bg-red-100/60 hover:bg-red-100/100";
  }

  if (reservation.status === "no_show") {
    return "bg-slate-100/30 hover:bg-slate-100/100";
  }

  if (reservation.status === "pending") {
    return "bg-amber-100/60 hover:bg-amber-100/100";
  }

  return "bg-emerald-100/60 hover:bg-emerald-100/100";
}

function getReservationRowAccentClass(reservation: V2ReservationDraft) {
  return reservationNeedsTable(reservation)
    ? "border-l-4 border-l-amber-400"
    : "border-l-4 border-l-transparent";
}

function getMaxSingleTableCapacity(tables: V2FloorPlanTable[]) {
  return tables
    .filter((table) => table.status !== "blocked" && !table.locked)
    .reduce((maxCapacity, table) => Math.max(maxCapacity, Number(table.capacity) || 0), 0);
}

export function V2ReservasPage() {
  const [reservations, setReservations] =
    useState<V2ReservationDraft[]>(v2Reservations);
  const [hasLoadedStoredReservations, setHasLoadedStoredReservations] =
    useState(false);
  const [floorTables, setFloorTables] =
    useState<V2FloorPlanTable[]>(DEFAULT_FLOOR_TABLES);
  const [localConfig, setLocalConfig] =
    useState<V2LocalConfigState>(() => DEFAULT_LOCAL_CONFIG);

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<V2ReservationStatusFilter>("all");
  const [sortMode, setSortMode] = useState<V2SortMode>("time");
  const [tableSort, setTableSort] = useState<{
    key: V2ReservationColumnSortKey;
    direction: V2SortDirection;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState(TODAY_RESERVATIONS_DATE);
  const [dateFilterMode, setDateFilterMode] = useState<V2DateFilterMode>("single");
  const [rangeStartDate, setRangeStartDate] = useState(TODAY_RESERVATIONS_DATE);
  const [rangeEndDate, setRangeEndDate] = useState(addDays(TODAY_RESERVATIONS_DATE, 3));
  const [isPickingRangeEnd, setIsPickingRangeEnd] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(TODAY_RESERVATIONS_DATE);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editorCalendarMonth, setEditorCalendarMonth] = useState(TODAY_RESERVATIONS_DATE);
  const [isEditorCalendarOpen, setIsEditorCalendarOpen] = useState(false);

  const [editingReservation, setEditingReservation] =
    useState<V2ReservationDraft | null>(null);
  const [editingMode, setEditingMode] = useState<"create" | "edit">("edit");
  const [selectedReservation, setSelectedReservation] =
    useState<V2ReservationDraft | null>(null);
  const [noteModalReservation, setNoteModalReservation] =
    useState<V2ReservationDraft | null>(null);
  const [openActionsReservationId, setOpenActionsReservationId] =
    useState<string | null>(null);
  const [whatsAppDraft, setWhatsAppDraft] = useState<{
    reservation: V2ReservationDraft;
    action: V2ReservationWhatsAppAction;
    note: string;
  } | null>(null);
  const [selectedDetailToneIndex, setSelectedDetailToneIndex] = useState(0);
  const [reservationFormError, setReservationFormError] = useState("");
  const [quickActionReservation, setQuickActionReservation] =
    useState<V2ReservationDraft | null>(null);
  const [orderReservation, setOrderReservation] =
    useState<V2ReservationDraft | null>(null);
  const [selectedMenuCategory, setSelectedMenuCategory] =
    useState<V2MenuCategory>("all");
  const [menuOrderItems, setMenuOrderItems] =
    useState<V2MenuOrderItem[]>(FALLBACK_MENU_ORDER_ITEMS);
  const [menuOrderCategories, setMenuOrderCategories] =
    useState<{ id: V2MenuCategory; label: string }[]>(FALLBACK_MENU_CATEGORIES);
  const [stockDecisionReservation, setStockDecisionReservation] =
    useState<{ reservationId: string; status: V2ReservationStatus } | null>(null);
  const [paymentCloseReservation, setPaymentCloseReservation] =
    useState<V2ReservationDraft | null>(null);
  const [paymentCloseForm, setPaymentCloseForm] = useState<V2ReservationPaymentForm>({
    method: "cash",
    amount: "0",
    cash: "0",
    card: "0",
    mercadoPago: "0",
    transfer: "0",
  });
  const [paymentCloseError, setPaymentCloseError] = useState("");

  useEffect(() => {
    function syncReservationsFromStorage() {
      setReservations(loadStoredReservations());
    }

    function syncFloorTablesFromStorage() {
      setFloorTables(loadStoredFloorTables());
    }

    function syncLocalConfigFromStorage() {
      setLocalConfig(loadLocalConfig());
    }

    function syncMenuFromStorage() {
      setMenuOrderItems(readStoredMenuItems());
      setMenuOrderCategories(readStoredMenuCategories());
    }

    function syncAllFromStorage() {
      syncReservationsFromStorage();
      syncFloorTablesFromStorage();
      syncLocalConfigFromStorage();
      syncMenuFromStorage();
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key !== RESERVATIONS_STORAGE_KEY &&
        event.key !== FLOOR_TABLES_STORAGE_KEY &&
        event.key !== LOCAL_CONFIG_STORAGE_KEY &&
        event.key !== MENU_ITEMS_STORAGE_KEY &&
        event.key !== MENU_CATEGORIES_STORAGE_KEY
      ) {
        return;
      }

      syncAllFromStorage();
    }

    syncAllFromStorage();
    setHasLoadedStoredReservations(true);

    window.addEventListener("focus", syncAllFromStorage);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(FLOOR_TABLES_EVENT, syncFloorTablesFromStorage);
    window.addEventListener(LOCAL_CONFIG_EVENT, syncLocalConfigFromStorage);

    return () => {
      window.removeEventListener("focus", syncAllFromStorage);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(FLOOR_TABLES_EVENT, syncFloorTablesFromStorage);
      window.removeEventListener(LOCAL_CONFIG_EVENT, syncLocalConfigFromStorage);
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredReservations) return;

    writeToStorage(RESERVATIONS_STORAGE_KEY, reservations);
  }, [hasLoadedStoredReservations, reservations]);

  useEffect(() => {
    if (!isCalendarOpen) return;

    function handleCalendarEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCalendarOpen(false);
      }
    }

    window.addEventListener("keydown", handleCalendarEscape);

    return () => {
      window.removeEventListener("keydown", handleCalendarEscape);
    };
  }, [isCalendarOpen]);

  useEffect(() => {
    if (!noteModalReservation) return;

    function handleNoteModalEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNoteModalReservation(null);
      }
    }

    window.addEventListener("keydown", handleNoteModalEscape);

    return () => {
      window.removeEventListener("keydown", handleNoteModalEscape);
    };
  }, [noteModalReservation]);

  useEffect(() => {
    if (!openActionsReservationId) return;

    function handleActionsModalEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenActionsReservationId(null);
      }
    }

    window.addEventListener("keydown", handleActionsModalEscape);

    return () => {
      window.removeEventListener("keydown", handleActionsModalEscape);
    };
  }, [openActionsReservationId]);

  useEffect(() => {
    if (!orderReservation) return;

    function handleOrderPopupEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeOrderPopup();
      }
    }

    window.addEventListener("keydown", handleOrderPopupEscape);

    return () => {
      window.removeEventListener("keydown", handleOrderPopupEscape);
    };
  }, [orderReservation]);

  const calendarMonthData = useMemo(() => {
    return getMonthDays(calendarMonth);
  }, [calendarMonth]);

  const editorCalendarMonthData = useMemo(() => {
    return getMonthDays(editorCalendarMonth);
  }, [editorCalendarMonth]);

  const reservationCountByDate = useMemo(() => {
    return reservations.reduce<Record<string, number>>((accumulator, reservation) => {
      accumulator[reservation.date] = (accumulator[reservation.date] ?? 0) + 1;

      return accumulator;
    }, {});
  }, [reservations]);

  const selectedDateLabel = useMemo(() => {
    if (dateFilterMode === "single") {
      return formatDateLabel(selectedDate);
    }

    const { start, end } = getRangeBounds(rangeStartDate, rangeEndDate);

    return `${formatCompactDate(start)} — ${formatCompactDate(end)}`;
  }, [dateFilterMode, rangeEndDate, rangeStartDate, selectedDate]);

  const selectedDateBusinessSlots = useMemo(
    () => getBusinessHourSlotsForDate(localConfig, selectedDate),
    [localConfig, selectedDate]
  );

  const isSelectedDateOpen = selectedDateBusinessSlots.length > 0;
  const isSelectedDateInsideBookingWindow = isDateInsideBookingWindow(localConfig, selectedDate);
  const maxBookingDate = getMaxBookingDate(localConfig);

  const peopleBySelectedSlot = useMemo(() => {
    return reservations
      .filter((reservation) => {
        if (reservation.id === editingReservation?.id) return false;
        if (reservation.date !== selectedDate) return false;
        if (!isActiveReservationStatus(reservation.status)) return false;

        return reservationRangesOverlap(reservation, {
          time: editingReservation?.time ?? "20:00",
          durationMinutes: editingReservation?.durationMinutes ?? localConfig.standardDurationMinutes,
        });
      })
      .reduce((total, reservation) => total + reservation.people, 0);
  }, [
    editingReservation?.durationMinutes,
    editingReservation?.id,
    editingReservation?.time,
    localConfig.standardDurationMinutes,
    reservations,
    selectedDate,
  ]);

  function getReservationSortValue(
    reservation: V2ReservationDraft,
    key: V2ReservationColumnSortKey
  ) {
    if (key === "id") return getReservationCode(reservation);
    if (key === "time") return reservation.date + reservation.time;
    if (key === "client") return reservation.client;
    if (key === "people") return reservation.people;
    if (key === "phone") return reservation.phone;
    if (key === "table") return reservation.tableName || "Sin asignar";

    return "";
  }

  function toggleReservationTableSort(key: string) {
    const nextKey = key as V2ReservationColumnSortKey;

    setTableSort((current) =>
      current?.key === nextKey
        ? { key: nextKey, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key: nextKey, direction: "asc" }
    );
  }

  const filteredReservations = useMemo(() => {
    const query = normalizeSearch(searchValue);
    const { start, end } = getRangeBounds(rangeStartDate, rangeEndDate);

    const filtered = reservations.filter((reservation) => {
      const matchesDate =
        dateFilterMode === "single"
          ? reservation.date === selectedDate
          : reservation.date >= start && reservation.date <= end;

      const matchesSearch =
        query.length === 0 ||
        reservation.client.toLowerCase().includes(query) ||
        reservation.phone.toLowerCase().includes(query) ||
        reservation.email?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || reservation.status === statusFilter;

      return matchesDate && matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (tableSort) {
        const sortComparison = comparePrimitiveValues(
          getReservationSortValue(a, tableSort.key),
          getReservationSortValue(b, tableSort.key),
          tableSort.direction
        );

        if (sortComparison !== 0) return sortComparison;

        return timeToMinutes(a.time) - timeToMinutes(b.time);
      }

      if (sortMode === "latest") {
        const dateComparison = b.date.localeCompare(a.date);

        if (dateComparison !== 0) return dateComparison;

        return Number(b.id.replace(/\D/g, "")) - Number(a.id.replace(/\D/g, ""));
      }

      if (sortMode === "status") {
        const statusComparison = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];

        if (statusComparison !== 0) return statusComparison;

        const dateComparison = a.date.localeCompare(b.date);

        if (dateComparison !== 0) return dateComparison;

        return timeToMinutes(a.time) - timeToMinutes(b.time);
      }

      const dateComparison = a.date.localeCompare(b.date);

      if (dateComparison !== 0) return dateComparison;

      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
  }, [
    dateFilterMode,
    rangeEndDate,
    rangeStartDate,
    reservations,
    searchValue,
    selectedDate,
    sortMode,
    statusFilter,
    tableSort,
  ]);

  const totalReservations = filteredReservations.length;

  const pendingReservations = filteredReservations.filter(
    (item) => item.status === "pending"
  );

  const confirmedReservations = filteredReservations.filter(
    (item) => item.status === "confirmed"
  );

  const cancelledReservations = filteredReservations.filter(
    (item) => item.status === "cancelled"
  );

  const noShowReservations = filteredReservations.filter(
    (item) => item.status === "no_show"
  );

  const totalPeople = filteredReservations
    .filter(
      (item) => item.status !== "cancelled" && item.status !== "no_show"
    )
    .reduce((total, item) => {
      return total + item.people;
    }, 0);

  const upcomingReservations = filteredReservations
    .filter((item) => item.status === "pending" || item.status === "confirmed")
    .sort((a, b) => {
      const statusComparison = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];

      if (statusComparison !== 0) return statusComparison;

      if (a.status === "confirmed" && b.status === "confirmed") {
        const aNeedsTable = reservationNeedsTable(a);
        const bNeedsTable = reservationNeedsTable(b);

        if (aNeedsTable !== bNeedsTable) {
          return aNeedsTable ? -1 : 1;
        }
      }

      const dateComparison = a.date.localeCompare(b.date);

      if (dateComparison !== 0) return dateComparison;

      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });

  const duplicateActiveReservation = useMemo(() => {
    if (!editingReservation) return null;

    const normalizedPhone = editingReservation.phone.trim();

    if (!normalizedPhone) return null;

    return (
      reservations.find((reservation) => {
        if (reservation.id === editingReservation.id) return false;
        if (reservation.date !== editingReservation.date) return false;
        if (reservation.phone.trim() !== normalizedPhone) return false;

        return reservation.status === "pending" || reservation.status === "confirmed";
      }) ?? null
    );
  }, [editingReservation, reservations]);

  const tableOptionsForEditing = useMemo<V2TableOptionForReservation[]>(() => {
    if (!editingReservation) return [];
    const currentReservation = editingReservation;

    function tableConflict(tableName: string) {
      const normalizedTableName = normalizeTableName(tableName);

      return (
        reservations.find((reservation) => {
          if (reservation.id === currentReservation.id) return false;
          if (reservation.date !== currentReservation.date) return false;
          if (!isActiveReservationStatus(reservation.status)) return false;
          if (!splitTableNames(reservation.tableName).includes(normalizedTableName)) return false;

          return reservationRangesOverlap(reservation, currentReservation);
        }) ?? null
      );
    }

    const singleTableOptions = floorTables.map((table) => {
      const normalizedTableName = normalizeTableName(table.name);
      const isSelectedTable =
        normalizeTableName(editingReservation.tableName) === normalizedTableName;
      const isBlocked = table.status === "blocked" || Boolean(table.locked);
      const isTooSmall = Number(editingReservation.people) > Number(table.capacity);
      const conflictingReservation = tableConflict(table.name);
      const disabled = !isSelectedTable && (isBlocked || isTooSmall || Boolean(conflictingReservation));

      let reason = "";

      if (isBlocked) reason = "bloqueada";
      else if (isTooSmall) reason = `capacidad ${table.capacity}p`;
      else if (conflictingReservation) reason = `ocupada ${conflictingReservation.time}`;

      return {
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        disabled,
        reason,
      };
    });

    const availableTablesForCombination = floorTables.filter((table) => {
      if (table.status === "blocked" || table.locked) return false;
      if (tableConflict(table.name)) return false;

      return true;
    });

    const combinedOptions: V2TableOptionForReservation[] = [];

    if (!localConfig.allowTableCombinations) {
      return singleTableOptions;
    }

    for (let firstIndex = 0; firstIndex < availableTablesForCombination.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < availableTablesForCombination.length; secondIndex += 1) {
        const pair = [
          availableTablesForCombination[firstIndex],
          availableTablesForCombination[secondIndex],
        ];
        const capacity = pair.reduce((total, table) => total + Number(table.capacity), 0);

        if (capacity >= Number(editingReservation.people)) {
          combinedOptions.push({
            id: `combined-${pair.map((table) => table.id).join("-")}`,
            name: joinTableNames(pair),
            capacity,
            disabled: false,
            reason: "unir mesas",
            isCombined: true,
          });
        }
      }
    }

    if (combinedOptions.length === 0) {
      for (let firstIndex = 0; firstIndex < availableTablesForCombination.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < availableTablesForCombination.length; secondIndex += 1) {
          for (let thirdIndex = secondIndex + 1; thirdIndex < availableTablesForCombination.length; thirdIndex += 1) {
            const group = [
              availableTablesForCombination[firstIndex],
              availableTablesForCombination[secondIndex],
              availableTablesForCombination[thirdIndex],
            ];
            const capacity = group.reduce((total, table) => total + Number(table.capacity), 0);

            if (capacity >= Number(editingReservation.people)) {
              combinedOptions.push({
                id: `combined-${group.map((table) => table.id).join("-")}`,
                name: joinTableNames(group),
                capacity,
                disabled: false,
                reason: "unir mesas",
                isCombined: true,
              });
            }
          }
        }
      }
    }

    return [...singleTableOptions, ...combinedOptions.slice(0, 12)];
  }, [editingReservation, floorTables, localConfig.allowTableCombinations, reservations]);

  const selectedEditingTable = useMemo(() => {
    if (!editingReservation?.tableName) return null;

    const selectedNames = splitTableNames(editingReservation.tableName);
    const selectedTables = selectedNames
      .map(
        (tableName) =>
          floorTables.find((table) => normalizeTableName(table.name) === tableName) ?? null
      )
      .filter(Boolean) as V2FloorPlanTable[];

    if (selectedTables.length === 0) return null;

    return {
      name: joinTableNames(selectedTables),
      capacity: selectedTables.reduce((total, table) => total + Number(table.capacity), 0),
      count: selectedTables.length,
    };
  }, [editingReservation?.tableName, floorTables]);

  const availableTableOptionsForEditing = useMemo(
    () => tableOptionsForEditing.filter((table) => !table.disabled),
    [tableOptionsForEditing]
  );

  const unavailableTableOptionsForEditing = useMemo(
    () => tableOptionsForEditing.filter((table) => table.disabled),
    [tableOptionsForEditing]
  );

  const tableAvailabilitySummary = useMemo(() => {
    const available = availableTableOptionsForEditing.length;
    const unavailable = unavailableTableOptionsForEditing.length;

    return {
      available,
      unavailable,
      total: available + unavailable,
    };
  }, [availableTableOptionsForEditing.length, unavailableTableOptionsForEditing.length]);

  const filteredMenuOrderItems = useMemo(() => {
    const items =
      selectedMenuCategory === "all"
        ? menuOrderItems
        : menuOrderItems.filter((item) => item.category === selectedMenuCategory);

    return [...items].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [menuOrderItems, selectedMenuCategory]);

  const selectedEditingTableConflict = useMemo(() => {
    if (!editingReservation?.tableName) return null;

    const selectedNames = splitTableNames(editingReservation.tableName);

    return (
      reservations.find((reservation) => {
        if (reservation.id === editingReservation.id) return false;
        if (reservation.date !== editingReservation.date) return false;
        if (!isActiveReservationStatus(reservation.status)) return false;

        const assignedNames = splitTableNames(reservation.tableName);
        const usesSameTable = selectedNames.some((tableName) =>
          assignedNames.includes(tableName)
        );

        if (!usesSameTable) return false;

        return reservationRangesOverlap(reservation, editingReservation);
      }) ?? null
    );
  }, [editingReservation, reservations]);

  useEffect(() => {
    if (!selectedReservation?.id) return;

    const latestSelectedReservation =
      reservations.find((reservation) => reservation.id === selectedReservation.id) ?? null;

    if (latestSelectedReservation) {
      setSelectedReservation(latestSelectedReservation);
    }
  }, [reservations, selectedReservation?.id]);

  useEffect(() => {
    if (!orderReservation?.id) return;

    const latestOrderReservation =
      reservations.find((reservation) => reservation.id === orderReservation.id) ?? null;

    if (latestOrderReservation) {
      setOrderReservation(latestOrderReservation);
    }
  }, [reservations, orderReservation?.id]);

  function selectReservationWithTone(reservation: V2ReservationDraft) {
    setSelectedReservation(reservation);
    setSelectedDetailToneIndex((current) => (current + 1) % DETAIL_BORDER_TONES.length);
  }

  function openQuickAction(reservation: V2ReservationDraft) {
    selectReservationWithTone(reservation);
    setQuickActionReservation(reservation);
  }

  function closeQuickAction() {
    setQuickActionReservation(null);
  }

  function resolveQuickActionStatus(status: V2ReservationStatus) {
    if (!quickActionReservation) return;

    updateReservationStatus(quickActionReservation.id, status);
    closeQuickAction();
  }

  function editQuickActionReservation() {
    if (!quickActionReservation) return;

    openReservationEditor(quickActionReservation);
    closeQuickAction();
  }

  function assignTableFromQuickAction() {
    if (!quickActionReservation) return;

    openReservationEditor(quickActionReservation);
    closeQuickAction();
  }

  function openNewReservation() {
    setReservationFormError("");
    setEditingMode("create");
    setEditingReservation(createEmptyReservation(selectedDate, localConfig));
  }

  function moveEditorCalendarMonth(monthOffset: number) {
    setEditorCalendarMonth((current) => {
      const nextMonth = parseDate(getMonthStart(current));
      nextMonth.setMonth(nextMonth.getMonth() + monthOffset);

      return nextMonth.toISOString().slice(0, 10);
    });
  }

  function selectEditorReservationDate(date: string) {
    if (!isDateInsideBookingWindow(localConfig, date)) return;

    setReservationFormError("");
    setEditingReservation((current) =>
      current
        ? {
            ...current,
            date,
          }
        : current
    );
    setEditorCalendarMonth(date);
    setIsEditorCalendarOpen(false);
  }

  function moveSelectedDate(days: number) {
    setDateFilterMode("single");
    setSelectedDate((current) => {
      const nextDate = addDays(current, days);
      setCalendarMonth(nextDate);

      return nextDate;
    });
  }

  function selectCalendarDate(date: string) {
    if (dateFilterMode === "single") {
      setSelectedDate(date);
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

  function applyRange(startDate: string, endDate: string) {
    const { start, end } = getRangeBounds(startDate, endDate);

    setDateFilterMode("range");
    setRangeStartDate(start);
    setRangeEndDate(end);
    setCalendarMonth(start);
    setIsPickingRangeEnd(false);
  }

  function openSingleDate(date: string) {
    setDateFilterMode("single");
    setSelectedDate(date);
    setRangeStartDate(date);
    setRangeEndDate(date);
    setCalendarMonth(date);
    setIsPickingRangeEnd(false);
    setIsCalendarOpen(false);
  }

  function startReservationRangeSelection() {
    setDateFilterMode("range");
    setRangeStartDate(selectedDate);
    setRangeEndDate(selectedDate);
    setCalendarMonth(selectedDate);
    setIsPickingRangeEnd(false);
    setIsCalendarOpen(true);
  }

  function openReservationEditor(reservation: V2ReservationDraft) {
    setReservationFormError("");
    setEditingMode("edit");
    setEditingReservation({
      durationMinutes: localConfig.standardDurationMinutes,
      tableName: "",
      email: "",
      origin: "manual",
      orderItems: "",
      orderLineItems: [],
      ...reservation,
    });
    setEditorCalendarMonth(reservation.date || selectedDate);
    setIsEditorCalendarOpen(false);
    selectReservationWithTone(reservation);
  }

  function closeReservationEditor() {
    setReservationFormError("");
    setIsEditorCalendarOpen(false);
    setEditingReservation(null);
  }

  function openReservationTracking(reservation: V2ReservationDraft) {
    window.open(getReservationTrackingPath(reservation), "_blank", "noopener,noreferrer");
  }

  async function copyReservationTrackingLink(reservation: V2ReservationDraft) {
    const url = getReservationTrackingUrl(reservation);

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
  }

  function buildReservationWhatsAppMessage(
    reservation: V2ReservationDraft,
    action: V2ReservationWhatsAppAction,
    note: string
  ) {
    const tableLabel = reservation.tableName?.trim() || "A asignar por el local";
    const trackingUrl = getReservationTrackingUrl(reservation);
    const cleanNote = note.trim();

    const introByAction: Record<V2ReservationWhatsAppAction, string> = {
      confirmation: `Hola ${reservation.client}, tu reserva en Demuru está confirmada.`,
      cancellation: `Hola ${reservation.client}, tu reserva en Demuru fue cancelada.`,
      modification: `Hola ${reservation.client}, actualizamos tu reserva en Demuru.`,
    };

    return [
      introByAction[action],
      ...(cleanNote ? ["", `Nota: ${cleanNote}`] : []),
      "",
      `Código: ${getReservationCode(reservation)}`,
      `Fecha: ${formatDateLabel(reservation.date)}`,
      `Hora: ${reservation.time}`,
      `Personas: ${reservation.people}`,
      `Mesa: ${tableLabel}`,
      "",
      action === "cancellation"
        ? "Si querés hacer una nueva reserva, podés contactarnos por WhatsApp."
        : "Podés consultar tu reserva acá:",
      ...(action === "cancellation" ? [] : [trackingUrl]),
    ].join("\n");
  }

  function openReservationWhatsApp(
    reservation: V2ReservationDraft,
    action: V2ReservationWhatsAppAction,
    note: string
  ) {
    const targetPhone = USE_RESERVATION_WHATSAPP_TEST_PHONE
      ? RESERVATION_WHATSAPP_TEST_PHONE
      : normalizeWhatsAppPhone(reservation.phone);

    if (!targetPhone) return;

    const message = buildReservationWhatsAppMessage(reservation, action, note);
    const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function getReservationWhatsAppActionLabel(action: V2ReservationWhatsAppAction) {
    if (action === "cancellation") return "Enviar cancelación";
    if (action === "modification") return "Enviar modificación";

    return "Enviar confirmación";
  }

  function saveReservation() {
    if (!editingReservation) return;

    const missingFields: string[] = [];

    if (!editingReservation.date) missingFields.push("día");
    if (!editingReservation.time) missingFields.push("hora");
    if (!editingReservation.client.trim()) missingFields.push("nombre");
    if (!editingReservation.phone.trim()) missingFields.push("teléfono");
    if (!Number(editingReservation.people) || Number(editingReservation.people) < 1) {
      missingFields.push("personas");
    }

    if (missingFields.length > 0) {
      setReservationFormError(
        `Faltan datos obligatorios: ${missingFields.join(", ")}.`
      );
      return;
    }

    if (!localConfig.reservationEnabled) {
      setReservationFormError("Las reservas están desactivadas desde Configuración.");
      return;
    }

    if (!isDateInsideBookingWindow(localConfig, editingReservation.date)) {
      setReservationFormError(
        `La fecha debe estar dentro de los próximos ${localConfig.bookingWindowDays} días.`
      );
      return;
    }

    if (!isDateOpenForReservations(localConfig, editingReservation.date)) {
      setReservationFormError("El local está cerrado ese día según Configuración.");
      return;
    }

    const validSlots = getBusinessHourSlotsForDate(localConfig, editingReservation.date);
    const reservationStartMinutes = timeToMinutes(editingReservation.time);
    const isInsideBusinessSlot = validSlots.some((slot) => {
      const slotStart = timeToMinutes(slot.open);
      const rawSlotEnd = timeToMinutes(slot.close);
      const slotEnd = rawSlotEnd <= slotStart ? rawSlotEnd + 24 * 60 : rawSlotEnd;
      const normalizedReservationStart =
        reservationStartMinutes < slotStart ? reservationStartMinutes + 24 * 60 : reservationStartMinutes;

      return normalizedReservationStart >= slotStart && normalizedReservationStart < slotEnd;
    });

    if (!isInsideBusinessSlot) {
      setReservationFormError(
        `La hora elegida está fuera del horario configurado: ${formatBusinessHourSlots(validSlots)}.`
      );
      return;
    }

    let reservationToSave = editingReservation;

    if (
      localConfig.autoAssignReservationTables &&
      !reservationToSave.tableName?.trim()
    ) {
      const assignedTableName = getBestAvailableTableForReservation(
        reservationToSave,
        reservations,
        floorTables,
        localConfig.allowTableCombinations
      );

      if (assignedTableName) {
        reservationToSave = {
          ...reservationToSave,
          tableName: assignedTableName,
        };
      }
    }

    const maxSingleTableCapacity = getMaxSingleTableCapacity(floorTables);

    if (
      !localConfig.allowTableCombinations &&
      maxSingleTableCapacity > 0 &&
      Number(reservationToSave.people) > maxSingleTableCapacity
    ) {
      setReservationFormError(
        `La reserva supera el máximo actual por mesa individual (${maxSingleTableCapacity} personas). Activá “Permitir unir mesas” o contactá al cliente para resolver una reserva especial.`
      );
      return;
    }

    if (!localConfig.allowReservationsWithoutTable && !reservationToSave.tableName?.trim()) {
      setReservationFormError("No hay una mesa disponible para ese horario y Configuración no permite guardar reservas sin mesa.");
      return;
    }

    const activePeopleInSlot = reservations
      .filter((reservation) => {
        if (reservation.id === reservationToSave.id) return false;
        if (reservation.date !== reservationToSave.date) return false;
        if (!isActiveReservationStatus(reservation.status)) return false;

        return reservationRangesOverlap(reservation, editingReservation);
      })
      .reduce((total, reservation) => total + reservation.people, 0);

    if (activePeopleInSlot + Number(reservationToSave.people) > localConfig.maxPeoplePerSlot) {
      setReservationFormError(
        `Este horario supera la capacidad configurada: ${activePeopleInSlot + Number(reservationToSave.people)} de ${localConfig.maxPeoplePerSlot} personas.`
      );
      return;
    }

    if (reservationToSave.tableName?.trim()) {
      const selectedNames = splitTableNames(reservationToSave.tableName);
      const selectedTables = selectedNames
        .map(
          (tableName) =>
            floorTables.find((table) => normalizeTableName(table.name) === tableName) ?? null
        )
        .filter(Boolean) as V2FloorPlanTable[];

      if (selectedTables.length !== selectedNames.length) {
        setReservationFormError("Una o más mesas asignadas no existen en el plano.");
        return;
      }

      const blockedTable = selectedTables.find(
        (table) => table.status === "blocked" || table.locked
      );

      if (blockedTable) {
        setReservationFormError(`No podés asignar una reserva a ${blockedTable.name} porque está bloqueada.`);
        return;
      }

      if (!localConfig.allowTableCombinations && selectedTables.length > 1) {
        setReservationFormError("Configuración no permite unir mesas para reservas.");
        return;
      }

      const totalCapacity = selectedTables.reduce(
        (total, table) => total + Number(table.capacity),
        0
      );

      if (Number(reservationToSave.people) > totalCapacity) {
        setReservationFormError(
          `La reserva es para ${reservationToSave.people} personas y la selección tiene capacidad para ${totalCapacity}.`
        );
        return;
      }

      if (selectedEditingTableConflict) {
        setReservationFormError(
          `La selección ya se cruza con una reserva de ${selectedEditingTableConflict.client} a las ${selectedEditingTableConflict.time}.`
        );
        return;
      }
    }

    setReservationFormError("");

    const sanitizedReservation = withReservationStatusTimestamp(
      normalizeReservation(reservationToSave),
      reservationToSave.status
    );

    if (editingMode === "create") {
      setReservations((current) => [sanitizedReservation, ...current]);
      setSelectedReservation(sanitizedReservation);
    } else {
      setReservations((current) =>
        current.map((reservation) =>
          reservation.id === sanitizedReservation.id
            ? sanitizedReservation
            : reservation
        )
      );
      setSelectedReservation(sanitizedReservation);
    }

    closeReservationEditor();
  }

  function applyReservationStatusChange(nextReservation: V2ReservationDraft) {
    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === nextReservation.id ? nextReservation : reservation
      )
    );

    setSelectedReservation((current) =>
      current?.id === nextReservation.id ? nextReservation : current
    );
    setQuickActionReservation((current) =>
      current?.id === nextReservation.id ? nextReservation : current
    );
    setOrderReservation((current) =>
      current?.id === nextReservation.id ? nextReservation : current
    );
  }

  function reservationHasDiscountedStock(reservation: V2ReservationDraft) {
    return Boolean(reservation.stockDiscounted) && (reservation.stockMovements?.length ?? 0) > 0;
  }

  function updateReservationStatus(
    reservationId: string,
    status: V2ReservationStatus
  ) {
    const reservation = reservations.find((item) => item.id === reservationId);

    if (
      reservation &&
      (status === "cancelled" || status === "no_show") &&
      reservationHasDiscountedStock(reservation)
    ) {
      setStockDecisionReservation({ reservationId, status });
      return;
    }

    if (reservation) {
      applyReservationStatusChange(withReservationStatusTimestamp(reservation, status));
    }
  }

  function openPaymentCloseModal(reservation: V2ReservationDraft) {
    const normalizedReservation = normalizeReservation(reservation);

    setPaymentCloseReservation(normalizedReservation);
    setPaymentCloseForm(createPaymentForm(normalizedReservation));
    setPaymentCloseError("");
  }

  function closePaymentCloseModal() {
    setPaymentCloseReservation(null);
    setPaymentCloseError("");
  }

  function completeReservationWithPayment() {
    if (!paymentCloseReservation) return;

    const expectedTotal = Math.max(Number(paymentCloseReservation.orderTotal) || 0, 0);
    const paymentBreakdown = getPaymentBreakdownFromForm(paymentCloseForm);
    const paidAmount = Number(getPaymentBreakdownTotal(paymentBreakdown).toFixed(2));
    const totalDifference = Math.abs(paidAmount - expectedTotal);

    if (expectedTotal > 0 && totalDifference > 0.01) {
      setPaymentCloseError(
        `El pago cargado (${formatMoney(paidAmount)}) debe coincidir con el total del consumo (${formatMoney(expectedTotal)}).`
      );
      return;
    }

    const paymentMethod =
      paymentCloseForm.method === "mixed"
        ? "Mixto"
        : formatPaymentMethod(paymentCloseForm.method);

    applyReservationStatusChange({
      ...withReservationStatusTimestamp(paymentCloseReservation, "completed"),
      paymentMethod,
      paidAmount,
      paymentBreakdown,
      paymentClosedAt: getNowTimestamp(),
    });

    closePaymentCloseModal();
  }

  function resolveStockDecision(shouldReturnStock: boolean) {
    if (!stockDecisionReservation) return;

    const reservation = reservations.find(
      (item) => item.id === stockDecisionReservation.reservationId
    );

    if (!reservation) {
      setStockDecisionReservation(null);
      return;
    }

    const stockMovements = reservation.stockMovements ?? [];

    if (shouldReturnStock) {
      applyStockMovements(stockMovements, "return", reservation, "Reserva cancelada/no-show");
    }

    applyReservationStatusChange({
      ...withReservationStatusTimestamp(reservation, stockDecisionReservation.status),
      stockDiscounted: shouldReturnStock ? false : reservation.stockDiscounted,
      stockReturned: shouldReturnStock ? true : reservation.stockReturned,
      stockMovements: shouldReturnStock ? [] : stockMovements,
    });
    setStockDecisionReservation(null);
  }

  function openOrderPopup(reservation: V2ReservationDraft) {
    selectReservationWithTone(reservation);
    setSelectedMenuCategory("all");
    setOrderReservation(reservation);
  }

  function closeOrderPopup() {
    setOrderReservation(null);
  }

  function updateOrderReservation(nextReservation: V2ReservationDraft) {
    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === nextReservation.id ? nextReservation : reservation
      )
    );
    setSelectedReservation((current) =>
      current?.id === nextReservation.id ? nextReservation : current
    );
    setQuickActionReservation((current) =>
      current?.id === nextReservation.id ? nextReservation : current
    );
    setOrderReservation(nextReservation);
  }

  function setMenuItemQuantity(
    item: V2MenuOrderItem,
    requestedQuantity: number
  ) {
    if (!orderReservation) return;

    const currentLineItems = normalizeOrderLineItems(
      orderReservation.orderLineItems,
      orderReservation.orderItems,
      menuOrderItems
    );
    const previousQuantity = getMenuItemQuantity(currentLineItems, item);
    const quantity = Math.max(Number(requestedQuantity) || 0, 0);
    const quantityDiff = quantity - previousQuantity;
    const otherLineItems = currentLineItems.filter(
      (lineItem) => lineItem.menuItemId !== item.id
    );

    const nextOrderLineItems =
      quantity > 0
        ? [
            ...otherLineItems,
            {
              menuItemId: item.id,
              name: item.name,
              price: item.price,
              quantity,
            },
          ].sort((a, b) => a.name.localeCompare(b.name, "es"))
        : otherLineItems.sort((a, b) => a.name.localeCompare(b.name, "es"));

    const nextOrderItems = buildOrderItemsTextFromLineItems(nextOrderLineItems);
    let nextStockMovements = orderReservation.stockMovements ?? [];

    if (quantityDiff > 0) {
      const stockMovements = resolveStockMovementsForMenuItem(item, quantityDiff);

      applyStockMovements(stockMovements, "discount", orderReservation, item.name);
      nextStockMovements = mergeStockMovements(nextStockMovements, stockMovements);
    }

    if (quantityDiff < 0) {
      const stockMovements = resolveStockMovementsForMenuItem(item, Math.abs(quantityDiff));

      applyStockMovements(stockMovements, "return", orderReservation, item.name);
      nextStockMovements = subtractStockMovements(nextStockMovements, stockMovements);
    }

    updateOrderReservation({
      ...orderReservation,
      orderItems: nextOrderItems,
      orderLineItems: nextOrderLineItems,
      orderTotal: calculateOrderLineItemsTotal(nextOrderLineItems),
      stockDiscounted: nextStockMovements.length > 0,
      stockReturned: nextStockMovements.length === 0 && Boolean(orderReservation.stockDiscounted),
      stockMovements: nextStockMovements,
      consumptionStartedAt:
        quantityDiff !== 0
          ? orderReservation.consumptionStartedAt ?? getNowTimestamp()
          : orderReservation.consumptionStartedAt,
      note: formatReservationNote(orderReservation.note),
    });
  }

  function addMenuItemToReservation(item: V2MenuOrderItem) {
    if (!orderReservation) return;

    const currentQuantity = getMenuItemQuantity(orderReservation.orderLineItems, item);
    setMenuItemQuantity(item, currentQuantity + 1);
  }

  function removeMenuItemFromReservation(item: V2MenuOrderItem) {
    if (!orderReservation) return;

    const currentQuantity = getMenuItemQuantity(orderReservation.orderLineItems, item);
    setMenuItemQuantity(item, currentQuantity - 1);
  }

  function clearReservationOrder() {
    if (!orderReservation) return;

    const stockMovements = orderReservation.stockMovements ?? [];

    if (stockMovements.length > 0) {
      applyStockMovements(
        stockMovements,
        "return",
        orderReservation,
        "Consumo de mesa vaciado"
      );
    }

    updateOrderReservation({
      ...orderReservation,
      orderItems: "",
      orderLineItems: [],
      orderTotal: 0,
      stockDiscounted: false,
      stockReturned: true,
      stockMovements: [],
      note: formatReservationNote(orderReservation.note),
    });
  }

  function renderSelectableCell(
    reservation: V2ReservationDraft,
    content: ReactNode
  ) {
    return (
      <button
        type="button"
        onClick={() => selectReservationWithTone(reservation)}
        className="w-full text-left"
      >
        {content}
      </button>
    );
  }

  function exportReservationsCsv() {
    const header = [
      "ID",
      "Fecha",
      "Hora",
      "Cliente",
      "Email",
      "Personas",
      "Teléfono",
      "Mesa",
      "Estado",
      "Origen",
      "Nota",
      "Pedido / consumo",
      "Total consumo",
    ];
    const rows = filteredReservations.map((reservation) => [
      getReservationCode(reservation),
      reservation.date,
      reservation.time,
      reservation.client,
      reservation.email || "",
      reservation.people,
      reservation.phone,
      reservation.tableName || "Sin asignar",
      reservation.status,
      ORIGIN_LABELS[reservation.origin ?? "manual"],
      formatReservationNote(reservation.note),
      formatReservationOrderItems(reservation),
      reservation.orderTotal ?? 0,
    ]);

    downloadCsvFile(`reservas-${selectedDate}.csv`, [header, ...rows]);
  }

  return (
    <V2AppShell>
      <style>
        {`
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
            transition: background-color 9999s ease-in-out 0s;
          }
        `}
      </style>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Reservas"
          description="Gestioná, filtrá y actualizá las reservas del local."
          actions={
            <>
              <V2Button
                variant="secondary"
                icon={<Download size={17} />}
                onClick={exportReservationsCsv}
              >
                Exportar
              </V2Button>

              <V2Button
                variant="primary"
                icon={<Plus size={18} />}
                onClick={openNewReservation}
                disabled={!localConfig.reservationEnabled}
                title={
                  localConfig.reservationEnabled
                    ? "Crear nueva reserva"
                    : "Las reservas están desactivadas desde Configuración"
                }
              >
                Nueva reserva
              </V2Button>
            </>
          }
        />
        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-4 xl:grid-cols-[1fr_320px]">
          <div className="flex min-h-0 flex-col gap-4">
            <div className="grid shrink-0 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <V2MetricCard
                label="Total"
                value={totalReservations}
                helper="Reservas filtradas"
                tone="blue"
                icon={<CalendarDays size={22} />}
              />

              <V2MetricCard
                label="Pendientes"
                value={pendingReservations.length}
                helper="Por confirmar"
                tone="orange"
                icon={<Clock3 size={22} />}
              />

              <V2MetricCard
                label="Confirmadas"
                value={confirmedReservations.length}
                helper="Reservas activas"
                tone="green"
                icon={<CheckCircle2 size={22} />}
              />

              <V2MetricCard
                label="Personas"
                value={totalPeople}
                helper="Total día"
                tone="purple"
                icon={<Users size={22} />}
              />

              <V2MetricCard
                label="Canceladas"
                value={cancelledReservations.length + noShowReservations.length}
                helper="Canceladas / no-show"
                tone="red"
                icon={<XCircle size={22} />}
              />
            </div>

            <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span>
                  Duración estándar:{" "}
                  <strong className="text-slate-950">{localConfig.standardDurationMinutes} min</strong>
                </span>
                <span>
                  Ventana:{" "}
                  <strong className="text-slate-950">{localConfig.bookingWindowDays} días</strong>
                </span>
                <span>
                  Capacidad por horario:{" "}
                  <strong className="text-slate-950">
                    {peopleBySelectedSlot}/{localConfig.maxPeoplePerSlot} personas
                  </strong>
                </span>
                <span>
                  Horario del día:{" "}
                  <strong className="text-slate-950">
                    {formatBusinessHourSlots(selectedDateBusinessSlots)}
                  </strong>
                </span>
              </div>
              {!localConfig.reservationEnabled ? (
                <p className="mt-2 font-semibold text-red-600">
                  Reservas desactivadas desde Configuración.
                </p>
              ) : null}
              {localConfig.reservationEnabled && !isSelectedDateOpen ? (
                <p className="mt-2 font-semibold text-orange-600">
                  El local figura cerrado para esta fecha.
                </p>
              ) : null}
              {localConfig.reservationEnabled && !isSelectedDateInsideBookingWindow ? (
                <p className="mt-2 font-semibold text-orange-600">
                  Esta fecha está fuera de la ventana configurada. Máximo: {formatCompactDate(maxBookingDate)}.
                </p>
              ) : null}
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
                                  onClick={() => setCalendarMonth((current) => addDays(getMonthStart(current), -1))}
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
                                  onClick={() => {
                                    const nextMonth = parseDate(getMonthStart(calendarMonth));
                                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                                    setCalendarMonth(nextMonth.toISOString().slice(0, 10));
                                  }}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                                  aria-label="Mes siguiente"
                                >
                                  <ChevronRight size={17} />
                                </button>
                              </div>

                              <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day, index) => (
                                  <span key={`${day}-${index}`}>{day}</span>
                                ))}
                              </div>

                              <div className="mt-2 grid grid-cols-7 gap-1.5">
                                {Array.from({ length: calendarMonthData.firstWeekday }).map((_, index) => (
                                  <span key={`empty-${index}`} className="h-9" />
                                ))}

                                {Array.from({ length: calendarMonthData.daysInMonth }).map((_, index) => {
                                  const day = index + 1;
                                  const date = `${calendarMonthData.year}-${String(
                                    calendarMonthData.month + 1
                                  ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                  const { start, end } = getRangeBounds(rangeStartDate, rangeEndDate);
                                  const isSelected =
                                    dateFilterMode === "single"
                                      ? date === selectedDate
                                      : date === start || date === end;
                                  const isInsideRange =
                                    dateFilterMode === "range" && date > start && date < end;
                                  const isToday = date === TODAY_RESERVATIONS_DATE;
                                  const reservationsCount = reservationCountByDate[date] ?? 0;

                                  return (
                                    <button
                                      key={date}
                                      type="button"
                                      onClick={() => selectCalendarDate(date)}
                                      className={`relative flex h-9 items-center justify-center rounded-xl border text-xs font-semibold transition ${
                                        isSelected
                                          ? "border-emerald-700 bg-emerald-600 text-white shadow-sm"
                                          : isInsideRange
                                            ? "border-emerald-200 bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                                            : isToday
                                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                                      }`}
                                    >
                                      {day}

                                      {reservationsCount > 0 ? (
                                        <span
                                          className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                                            isSelected ? "bg-white" : "bg-emerald-500"
                                          }`}
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
                                    onClick={() => openSingleDate(TODAY_RESERVATIONS_DATE)}
                                    className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                                  >
                                    Hoy
                                  </button>
                                  <button
                                    type="button"
                                    onClick={startReservationRangeSelection}
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

                        <div className="min-w-[260px] flex-[1.5]">
                          <div className="relative">
                            <Search
                              className="pointer-events-none absolute left-3 top-2.5 text-slate-400"
                              size={18}
                            />
                            <V2Input
                              className="pl-10"
                              placeholder="Buscar por cliente, teléfono o email"
                              value={searchValue}
                              onChange={(event) => setSearchValue(event.target.value)}
                            />
                          </div>
                        </div>

                        <div className="min-w-[180px]">
                          <V2Select
                            value={statusFilter}
                            onChange={(event) =>
                              setStatusFilter(event.target.value as V2ReservationStatusFilter)
                            }
                          >
                            <option value="all">Todos los estados</option>
                            <option value="pending">Pendientes</option>
                            <option value="confirmed">Confirmadas</option>
                            <option value="completed">Completadas</option>
                            <option value="cancelled">Canceladas</option>
                            <option value="no_show">No-show</option>
                          </V2Select>
                        </div>

                        <div className="min-w-[150px]">
                          <V2Select
                            value={sortMode}
                            onChange={(event) => {
                              setSortMode(event.target.value as V2SortMode);
                              setTableSort(null);
                            }}
                          >
                            <option value="time">Horario</option>
                            <option value="latest">Últimas primero</option>
                            <option value="status">Estado</option>
                          </V2Select>
                        </div>

                        <V2Button variant="secondary" icon={<Filter size={17} />}>
                          Más filtros
                        </V2Button>
                      </V2FilterBar>
                    </div>

            <div className="-mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                <span className="text-slate-400">Leyenda:</span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-200" />
                  Confirmada
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-200" />
                  Pendiente
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-200" />
                  Completada
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-200" />
                  Cancelada
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-slate-300" />
                  No-show
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-amber-400" />
                  Requiere mesa
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <V2DataTable
                rows={filteredReservations}
                getRowKey={(row) => row.id}
                rowClassName={(row) =>
                  `${getReservationRowToneClass(row)} ${getReservationRowAccentClass(row)}`
                }
                sortKey={tableSort?.key ?? null}
                sortDirection={tableSort?.direction}
                onSortChange={toggleReservationTableSort}
                columns={[
                  {
                    header: "ID",
                    sortKey: "id",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <span className="font-semibold text-slate-950">
                          {getReservationCode(row)}
                        </span>
                      ),
                  },
                  {
                    header: dateFilterMode === "range" ? "Fecha / hora" : "Hora",
                    sortKey: "time",
                    align: "center",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <div className="text-center">
                          {dateFilterMode === "range" ? (
                            <span className="mb-1 block text-[11px] font-semibold text-slate-400">
                              {formatShortDate(row.date)}
                            </span>
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
                    align: "left",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <div>
                          <p className="font-semibold text-slate-950">
                            {row.client}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {row.email || "Sin email"}
                          </p>
                        </div>
                      ),
                  },
                  {
                    header: "Personas",
                    sortKey: "people",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <span className="font-semibold text-slate-950">
                          {row.people}
                        </span>
                      ),
                  },
                  {
                    header: "Teléfono",
                    sortKey: "phone",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <span
                          className="block max-w-[150px] truncate font-medium text-slate-700"
                          title={row.phone}
                        >
                          {row.phone}
                        </span>
                      ),
                  },
                  {
                    header: "Mesa",
                    sortKey: "table",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        row.tableName ? (
                          <span className="font-medium text-slate-700">
                            {row.tableName}
                          </span>
                        ) : (
                          <span className="text-slate-400">Sin asignar</span>
                        )
                      ),
                  },
                  {
                    header: "Nota",
                    align: "center",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        row.note?.trim() ? (
                          <span
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                            onClick={(event) => {
                              event.stopPropagation();
                              setNoteModalReservation(row);
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label="Ver nota"
                            title="Ver nota"
                          >
                            <Eye size={16} />
                          </span>
                        ) : (
                          <span
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-400"
                            aria-label="Sin nota"
                            title="Sin nota"
                          >
                            <EyeOff size={16} />
                          </span>
                        )
                      ),
                  },
                  {
                    header: "Acciones",
                    align: "right",
                    cell: (row) => {
                      const isClosed =
                        row.status === "cancelled" ||
                        row.status === "completed" ||
                        row.status === "no_show";

                      return (
                        <div
                          className="flex justify-end gap-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {!isClosed ? (
                            <V2Button
                              size="sm"
                              variant="secondary"
                              icon={<Plus size={15} />}
                              onClick={() => openOrderPopup(row)}
                            >
                              Consumo
                            </V2Button>
                          ) : null}

                          <V2Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setOpenActionsReservationId(row.id)}
                          >
                            Acciones
                          </V2Button>
                        </div>
                      );
                    },
                    className: "text-right",
                  },
                ]}
                className="h-full"
              />
            </div>
          </div>

          <aside className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <V2Card className="flex max-h-[260px] shrink-0 flex-col overflow-hidden">
              <h2 className="shrink-0 text-base font-semibold text-slate-950">
                Próximas acciones
              </h2>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-3 text-sm">
                  {upcomingReservations.length > 0 ? (
                    upcomingReservations.map((item) => {
                      const needsTable = reservationNeedsTable(item);

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => openQuickAction(item)}
                          className={`group flex w-full items-start gap-3 rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                            item.status === "pending"
                              ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
                              : needsTable
                                ? "border-orange-200 bg-gradient-to-br from-orange-50 to-white"
                                : "border-slate-200 bg-gradient-to-br from-white to-slate-50"
                          }`}
                        >
                          <span
                            className={
                              item.status === "pending"
                                ? "min-w-[42px] font-semibold text-orange-600"
                                : "min-w-[42px] font-semibold text-emerald-600"
                            }
                          >
                            {dateFilterMode === "range" ? (
                              <span className="mb-0.5 block text-[10px] font-semibold text-slate-400">
                                {formatShortDate(item.date)}
                              </span>
                            ) : null}
                            {item.time}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-slate-950">
                                {item.status === "pending"
                                  ? `Confirmar reserva de ${item.client}`
                                  : needsTable
                                    ? `Asignar mesa a ${item.client}`
                                    : `Completar reserva de ${item.client}`}
                              </p>

                              {item.status === "pending" ? (
                                <span className="shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                  Pendiente
                                </span>
                              ) : needsTable ? (
                                <span className="shrink-0 rounded-full border border-orange-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                                  Sin mesa
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.people} personas · {formatReservationNote(item.note)}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                      No hay acciones requeridas por el momento.
                    </div>
                  )}
                </div>
              </div>
            </V2Card>

            <V2Card
              className={`flex min-h-[420px] flex-1 flex-col overflow-hidden shadow-sm ${
                selectedReservation
                  ? DETAIL_BORDER_TONES[selectedDetailToneIndex]
                  : ""
              } ${
                selectedReservation?.status === "pending"
                  ? "bg-amber-50/40"
                  : ""
              }`}
            >
              <div className="shrink-0 flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">
                  Detalle seleccionado
                </h2>

                {selectedReservation ? (
                  <V2ReservationStatusBadge status={selectedReservation.status} />
                ) : null}
              </div>

              {selectedReservation ? (
                <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 text-sm text-slate-600">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {getReservationCode(selectedReservation)}
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {selectedReservation.client}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateLabel(selectedReservation.date)} · {selectedReservation.time}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                      Tracking público
                    </p>
                    <p className="mt-1 break-all text-xs font-medium text-blue-700">
                      {getReservationTrackingPath(selectedReservation)}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <V2Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openReservationTracking(selectedReservation)}
                      >
                        Ver tracking
                      </V2Button>

                      <V2Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyReservationTrackingLink(selectedReservation)}
                      >
                        Copiar link
                      </V2Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Personas
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {selectedReservation.people}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Duración
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {selectedReservation.durationMinutes ?? 120} min
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Teléfono
                    </p>
                    <p className="mt-1 break-words text-slate-700">
                      {selectedReservation.phone}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Origen
                      </p>
                      <p className="mt-1 text-slate-700">
                        {ORIGIN_LABELS[selectedReservation.origin ?? "manual"]}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Mesa
                      </p>
                      <p className="mt-1 text-slate-700">
                        {selectedReservation.tableName || "Sin asignar"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Nota
                    </p>
                    <p className="mt-1 leading-6 text-slate-700">
                      {formatReservationNote(selectedReservation.note)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Pedido / consumo
                    </p>
                    <p className="mt-1 leading-6 text-slate-700">
                      {formatReservationOrderItems(selectedReservation)}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Total consumo
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {formatMoney(selectedReservation.orderTotal ?? 0)}
                    </p>

                    {selectedReservation.paymentMethod ? (
                      <>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Pago
                        </p>
                        <div className="mt-2 grid gap-2 text-xs text-slate-600">
                          <span className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">
                            {formatPaymentMethod(selectedReservation.paymentMethod)} · {formatMoney(selectedReservation.paidAmount ?? selectedReservation.orderTotal ?? 0)}
                          </span>
                          {selectedReservation.paymentBreakdown &&
                          selectedReservation.paymentMethod === "Mixto" ? (
                            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                              Efectivo {formatMoney(selectedReservation.paymentBreakdown.cash)} · Tarjeta {formatMoney(selectedReservation.paymentBreakdown.card)} · Mercado Pago {formatMoney(selectedReservation.paymentBreakdown.mercadoPago)} · Transferencia {formatMoney(selectedReservation.paymentBreakdown.transfer)}
                            </span>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Timeline
                    </p>
                    <div className="mt-3 space-y-2">
                      {[
                        ["Creada", selectedReservation.createdAt],
                        ["Confirmada", selectedReservation.confirmedAt],
                        ["Sentada / mesa", selectedReservation.seatedAt],
                        ["Consumo cargado", selectedReservation.consumptionStartedAt],
                        ["Completada", selectedReservation.completedAt],
                        ["Cancelada", selectedReservation.cancelledAt],
                        ["No-show", selectedReservation.noShowAt],
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

                  <div className="flex flex-wrap gap-2 pt-1">
                    <V2Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openReservationEditor(selectedReservation)}
                    >
                      Editar
                    </V2Button>

                    <V2Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyReservationTrackingLink(selectedReservation)}
                    >
                      Copiar link
                    </V2Button>

                    {selectedReservation.status !== "cancelled" &&
                    selectedReservation.status !== "completed" &&
                    selectedReservation.status !== "no_show" ? (
                      <V2Button
                        size="sm"
                        variant="secondary"
                        icon={<Plus size={15} />}
                        onClick={() => openOrderPopup(selectedReservation)}
                      >
                        Consumo
                      </V2Button>
                    ) : null}

                    {selectedReservation.status === "confirmed" &&
                    reservationNeedsTable(selectedReservation) ? (
                      <V2Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openReservationEditor(selectedReservation)}
                      >
                        Asignar mesa
                      </V2Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-slate-500">
                  Seleccioná una reserva para ver su información operativa.
                </div>
              )}
            </V2Card>
          </aside>
        </div>
      </div>

      {quickActionReservation ? (
        <div className="fixed inset-0 z-[45] flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">Próxima acción</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {quickActionReservation.status === "pending"
                    ? `Confirmar reserva de ${quickActionReservation.client}`
                    : reservationNeedsTable(quickActionReservation)
                      ? `Asignar mesa a ${quickActionReservation.client}`
                      : `Completar reserva de ${quickActionReservation.client}`}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeQuickAction}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="grid gap-3 sm:grid-cols-2">
                  <p>
                    <strong className="text-slate-950">Día:</strong>{" "}
                    {formatDateLabel(quickActionReservation.date)}
                  </p>
                  <p>
                    <strong className="text-slate-950">Hora:</strong>{" "}
                    {quickActionReservation.time}
                  </p>
                  <p>
                    <strong className="text-slate-950">Personas:</strong>{" "}
                    {quickActionReservation.people}
                  </p>
                  <p>
                    <strong className="text-slate-950">Mesa:</strong>{" "}
                    {quickActionReservation.tableName || "Sin asignar"}
                  </p>
                  <p>
                    <strong className="text-slate-950">Teléfono:</strong>{" "}
                    {quickActionReservation.phone}
                  </p>
                  <p>
                    <strong className="text-slate-950">Origen:</strong>{" "}
                    {ORIGIN_LABELS[quickActionReservation.origin ?? "manual"]}
                  </p>
                </div>

                {quickActionReservation.note && quickActionReservation.note !== "—" ? (
                  <p className="mt-3 border-t border-slate-200 pt-3">
                    <strong className="text-slate-950">Nota:</strong>{" "}
                    {quickActionReservation.note}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button variant="secondary" onClick={editQuickActionReservation}>
                Editar
              </V2Button>

              {quickActionReservation.status === "pending" ? (
                <>
                  <V2Button
                    variant="danger"
                    onClick={() => resolveQuickActionStatus("cancelled")}
                  >
                    Cancelar
                  </V2Button>
                  <V2Button
                    variant="success"
                    onClick={() => resolveQuickActionStatus("confirmed")}
                  >
                    Confirmar
                  </V2Button>
                </>
              ) : null}

              {quickActionReservation.status === "confirmed" &&
              reservationNeedsTable(quickActionReservation) ? (
                <>
                  <V2Button
                    variant="danger"
                    onClick={() => resolveQuickActionStatus("cancelled")}
                  >
                    Cancelar
                  </V2Button>
                  <V2Button variant="primary" onClick={assignTableFromQuickAction}>
                    Asignar mesa
                  </V2Button>
                </>
              ) : null}

              {quickActionReservation.status === "confirmed" &&
              !reservationNeedsTable(quickActionReservation) ? (
                <>
                  <V2Button
                    variant="danger"
                    onClick={() => resolveQuickActionStatus("no_show")}
                  >
                    No-show
                  </V2Button>
                  <V2Button
                    variant="success"
                    onClick={() => resolveQuickActionStatus("completed")}
                  >
                    Completar
                  </V2Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {paymentCloseReservation ? (
        <div
          className="fixed inset-0 z-[78] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={closePaymentCloseModal}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Cierre de mesa
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {paymentCloseReservation.client || "Reserva sin cliente"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Total a cobrar: <strong>{formatMoney(paymentCloseReservation.orderTotal ?? 0)}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={closePaymentCloseModal}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar cierre de mesa"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {paymentCloseError ? (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 shrink-0" size={17} />
                  <p>{paymentCloseError}</p>
                </div>
              ) : null}

              <V2Field label="Método de pago">
                <div className="grid grid-cols-5 gap-2">
                  {PAYMENT_METHOD_OPTIONS.map((option) => {
                    const isSelected = paymentCloseForm.method === option.method;

                    return (
                      <button
                        key={option.method}
                        type="button"
                        title={option.label}
                        aria-label={option.label}
                        aria-pressed={isSelected}
                        onClick={() => {
                          const total = String(Math.max(Number(paymentCloseReservation.orderTotal) || 0, 0));

                          setPaymentCloseError("");
                          setPaymentCloseForm({
                            method: option.method,
                            amount: total,
                            cash: option.method === "mixed" ? paymentCloseForm.cash : "0",
                            card: option.method === "mixed" ? paymentCloseForm.card : "0",
                            mercadoPago: option.method === "mixed" ? paymentCloseForm.mercadoPago : "0",
                            transfer: option.method === "mixed" ? paymentCloseForm.transfer : "0",
                          });
                        }}
                        className={`flex h-14 items-center justify-center rounded-2xl border text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                          isSelected
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-100"
                            : "border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:border-emerald-200 hover:text-emerald-700"
                        }`}
                      >
                        {renderPaymentMethodIcon(option.icon)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Seleccionado: {formatPaymentMethod(paymentCloseForm.method)}
                </p>
              </V2Field>

              {paymentCloseForm.method === "mixed" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <V2Field label="Efectivo">
                    <V2Input
                      type="number"
                      min="0"
                      value={paymentCloseForm.cash}
                      onChange={(event) =>
                        setPaymentCloseForm({ ...paymentCloseForm, cash: event.target.value })
                      }
                    />
                  </V2Field>
                  <V2Field label="Tarjeta">
                    <V2Input
                      type="number"
                      min="0"
                      value={paymentCloseForm.card}
                      onChange={(event) =>
                        setPaymentCloseForm({ ...paymentCloseForm, card: event.target.value })
                      }
                    />
                  </V2Field>
                  <V2Field label="Mercado Pago">
                    <V2Input
                      type="number"
                      min="0"
                      value={paymentCloseForm.mercadoPago}
                      onChange={(event) =>
                        setPaymentCloseForm({ ...paymentCloseForm, mercadoPago: event.target.value })
                      }
                    />
                  </V2Field>
                  <V2Field label="Transferencia">
                    <V2Input
                      type="number"
                      min="0"
                      value={paymentCloseForm.transfer}
                      onChange={(event) =>
                        setPaymentCloseForm({ ...paymentCloseForm, transfer: event.target.value })
                      }
                    />
                  </V2Field>
                </div>
              ) : (
                <V2Field label="Monto cobrado">
                  <V2Input
                    type="number"
                    min="0"
                    value={paymentCloseForm.amount}
                    onChange={(event) => {
                      setPaymentCloseError("");
                      setPaymentCloseForm({ ...paymentCloseForm, amount: event.target.value });
                    }}
                  />
                </V2Field>
              )}

              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
                  <Banknote className="text-emerald-700" size={17} />
                  <span className="font-semibold text-slate-700">
                    Total cargado {formatMoney(getPaymentBreakdownTotal(getPaymentBreakdownFromForm(paymentCloseForm)))}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
                  <CreditCard className="text-blue-700" size={17} />
                  <span className="font-semibold text-slate-700">
                    Consumo {formatMoney(paymentCloseReservation.orderTotal ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <V2Button type="button" variant="secondary" onClick={closePaymentCloseModal}>
                Volver
              </V2Button>
              <V2Button type="button" variant="success" onClick={completeReservationWithPayment}>
                Cerrar mesa
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}

      {stockDecisionReservation ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={() => setStockDecisionReservation(null)}
        >
          <div
            className="w-full max-w-[520px] rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 p-6">
              <p className="text-sm text-slate-500">Stock de la reserva</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                Esta reserva tiene consumo cargado
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Si el consumo ya fue preparado o servido, mantené el stock descontado.
                Si fue un error o no se consumió, devolvé el stock.
              </p>
            </div>

            <div className="p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">Movimientos afectados</p>
                <p className="mt-2 leading-6">
                  {formatStockMovementsSummary(
                    reservations.find(
                      (item) => item.id === stockDecisionReservation.reservationId
                    )?.stockMovements ?? []
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button
                type="button"
                variant="secondary"
                onClick={() => setStockDecisionReservation(null)}
              >
                Volver
              </V2Button>
              <V2Button
                type="button"
                variant="danger"
                onClick={() => resolveStockDecision(false)}
              >
                Descontar stock
              </V2Button>
              <V2Button
                type="button"
                variant="success"
                onClick={() => resolveStockDecision(true)}
              >
                Devolver stock
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}

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
                <p className="text-sm text-slate-500">WhatsApp de reserva</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {getReservationWhatsAppActionLabel(whatsAppDraft.action)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {getReservationCode(whatsAppDraft.reservation)} · {whatsAppDraft.reservation.time}
                </p>
                {USE_RESERVATION_WHATSAPP_TEST_PHONE ? (
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
                    ? `Hola ${whatsAppDraft.reservation.client}, tu reserva en Demuru está confirmada.`
                    : whatsAppDraft.action === "cancellation"
                      ? `Hola ${whatsAppDraft.reservation.client}, tu reserva en Demuru fue cancelada.`
                      : `Hola ${whatsAppDraft.reservation.client}, actualizamos tu reserva en Demuru.`}
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
                      : "Ej: Te esperamos unos minutos antes. Cualquier cambio, escribinos por WhatsApp."
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
                variant="success"
                onClick={() => {
                  openReservationWhatsApp(
                    whatsAppDraft.reservation,
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

      {openActionsReservationId ? (() => {
        const actionsReservation =
          filteredReservations.find(
            (reservation) => reservation.id === openActionsReservationId,
          ) ??
          reservations.find(
            (reservation) => reservation.id === openActionsReservationId,
          );

        if (!actionsReservation) return null;

        const isClosed =
          actionsReservation.status === "cancelled" ||
          actionsReservation.status === "completed" ||
          actionsReservation.status === "no_show";
        const hasReturnStockAction =
          (actionsReservation.status === "cancelled" ||
            actionsReservation.status === "no_show") &&
          reservationHasDiscountedStock(actionsReservation);

        return (
          <div
            className="fixed inset-0 z-[74] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
            onClick={() => setOpenActionsReservationId(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
                <div>
                  <p className="text-sm text-slate-500">Acciones de reserva</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {actionsReservation.client || "Reserva sin cliente"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {actionsReservation.reservationCode || actionsReservation.id} · {actionsReservation.time}
                  </p>
                  {USE_RESERVATION_WHATSAPP_TEST_PHONE ? (
                    <p className="mt-1 text-xs font-medium text-emerald-600">
                      Modo prueba: WhatsApp se abre hacia +54 221 614-5679
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setOpenActionsReservationId(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                  aria-label="Cerrar acciones"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 p-5">
                {actionsReservation.status === "confirmed" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionsReservationId(null);
                      setWhatsAppDraft({
                        reservation: actionsReservation,
                        action: "confirmation",
                        note: "",
                      });
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Enviar confirmación por WhatsApp
                  </button>
                ) : null}

                {!isClosed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionsReservationId(null);
                      setWhatsAppDraft({
                        reservation: actionsReservation,
                        action: "modification",
                        note: "",
                      });
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    Enviar modificación por WhatsApp
                  </button>
                ) : null}

                {!isClosed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionsReservationId(null);
                      setWhatsAppDraft({
                        reservation: actionsReservation,
                        action: "cancellation",
                        note: "",
                      });
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Enviar cancelación por WhatsApp
                  </button>
                ) : null}

                {reservationCanBeCompleted(actionsReservation) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionsReservationId(null);
                      openPaymentCloseModal(actionsReservation);
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Completar reserva
                  </button>
                ) : null}

                {!isClosed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionsReservationId(null);
                        updateReservationStatus(actionsReservation.id, "no_show");
                      }}
                      className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Marcar no-show
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionsReservationId(null);
                        updateReservationStatus(actionsReservation.id, "cancelled");
                      }}
                      className="flex w-full items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Cancelar reserva
                    </button>
                  </>
                ) : null}

                {hasReturnStockAction ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionsReservationId(null);
                      setStockDecisionReservation({
                        reservationId: actionsReservation.id,
                        status: actionsReservation.status,
                      });
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Devolver stock
                  </button>
                ) : null}

                {isClosed && !hasReturnStockAction ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Esta reserva no tiene acciones disponibles.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })() : null}

      {noteModalReservation ? (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => setNoteModalReservation(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-sm text-slate-500">Nota de reserva</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {noteModalReservation.client || "Reserva sin cliente"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setNoteModalReservation(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar nota"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {noteModalReservation.note?.trim() || "Sin nota cargada."}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {orderReservation ? (
        <div
          className="fixed inset-0 z-[48] flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={closeOrderPopup}
        >
          <div
            className="flex h-[min(850px,calc(100dvh-3rem))] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 via-white to-emerald-50 p-6">
              <div>
                <p className="text-sm font-semibold text-purple-700">Consumo de mesa</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {orderReservation.client}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                    {orderReservation.time}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                    {orderReservation.tableName || "Sin mesa"}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                    {formatMoney(orderReservation.orderTotal ?? 0)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeOrderPopup}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 overflow-hidden bg-slate-50/60 p-5 md:grid-cols-[128px_1fr_260px]">
              <aside className="min-h-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Categorías
                </h3>
                <div className="mt-3 grid gap-1.5">
                  {menuOrderCategories.map((category) => {
                    const isSelected = selectedMenuCategory === category.id;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setSelectedMenuCategory(category.id)}
                        className={`rounded-xl border px-3 py-1.5 text-left text-xs font-semibold transition ${
                          isSelected
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="flex min-h-0 flex-col">
                <h3 className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Agregar platos del menú
                </h3>
                <p className="mt-1 shrink-0 text-xs text-slate-500">
                  El stock se descuenta al cargar el consumo y se ajusta si cambiás cantidades.
                </p>
                <div className="mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-2">
                  {filteredMenuOrderItems.map((item) => {
                    const quantity = getMenuItemQuantity(
                      orderReservation.orderLineItems,
                      item
                    );

                    return (
                      <div
                        key={item.name}
                        className="grid grid-cols-[96px_1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-sm transition hover:border-[#BA68C8]/30 hover:bg-[#BA68C8]/10"
                      >
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => removeMenuItemFromReservation(item)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                            aria-label={`Quitar ${item.name}`}
                          >
                            -
                          </button>

                          <input
                            type="number"
                            min={0}
                            value={quantity}
                            onChange={(event) =>
                              setMenuItemQuantity(item, Number(event.target.value))
                            }
                            className="h-7 w-9 rounded-lg border border-slate-200 bg-white text-center text-xs font-semibold text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                            aria-label={`Cantidad de ${item.name}`}
                          />

                          <button
                            type="button"
                            onClick={() => addMenuItemToReservation(item)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                            aria-label={`Agregar ${item.name}`}
                          >
                            +
                          </button>
                        </div>

                        <span className="font-medium text-slate-950">{item.name}</span>
                        <span className="font-semibold text-slate-700">
                          {formatMoney(item.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 shadow-sm.5 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pedido actual
                </h3>

                <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 pr-2 text-sm leading-6 text-slate-600">
                  {orderReservation.orderItems ? (
                    <div className="space-y-1">
                      {getOrderItemGroups(orderReservation.orderItems).map(
                        ({ item, quantity }) => (
                          <div
                            key={item}
                            className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-2 py-1"
                          >
                            <span>{item}</span>
                            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-emerald-700">
                              {quantity}x
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500">Sin platos asignados</p>
                  )}
                </div>

                <div className="mt-3 rounded-xl bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Total gastado
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">
                    {formatMoney(orderReservation.orderTotal ?? 0)}
                  </p>
                  {orderReservation.stockDiscounted ? (
                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                      Stock descontado
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <V2Button variant="secondary" onClick={clearReservationOrder}>
                    Vaciar pedido
                  </V2Button>
                  <V2Button variant="primary" onClick={closeOrderPopup}>
                    Listo
                  </V2Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingReservation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-slate-50 p-6">
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  {editingMode === "create" ? "Nueva reserva" : "Editar reserva"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {editingReservation.client || "Reserva sin cliente"}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                    {formatCompactDate(editingReservation.date)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                    {editingReservation.time}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                    {editingReservation.people} personas
                  </span>
                  <V2ReservationStatusBadge status={editingReservation.status} />
                </div>
              </div>

              <button
                type="button"
                onClick={closeReservationEditor}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto bg-slate-50/60 p-6">
              <div className="grid gap-4">
                {reservationFormError ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="font-semibold">No se puede guardar todavía</p>
                      <p className="mt-1">{reservationFormError}</p>
                    </div>
                  </div>
                ) : null}

                {duplicateActiveReservation ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="font-semibold">
                        Este teléfono ya tiene una reserva activa ese día
                      </p>
                      <p className="mt-1">
                        {duplicateActiveReservation.client} · {duplicateActiveReservation.time} ·{" "}
                        {STATUS_PRIORITY[duplicateActiveReservation.status] === STATUS_PRIORITY.pending
                          ? "Pendiente"
                          : "Confirmada"}
                      </p>
                    </div>
                  </div>
                ) : null}

                {selectedEditingTableConflict ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="font-semibold">
                        Mesa no disponible en ese horario
                      </p>
                      <p className="mt-1">
                        Se cruza con la reserva de {selectedEditingTableConflict.client} a las{" "}
                        {selectedEditingTableConflict.time}. Elegí otra mesa o dejala sin asignar.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <V2Field label="Nombre y apellido">
                    <V2Input
                      value={editingReservation.client}
                      onChange={(event) => {
                        setReservationFormError("");
                        setEditingReservation({
                          ...editingReservation,
                          client: event.target.value,
                        });
                      }}
                    />
                  </V2Field>

                  <V2Field label="Teléfono">
                    <V2Input
                      value={editingReservation.phone}
                      onChange={(event) => {
                        setReservationFormError("");
                        setEditingReservation({
                          ...editingReservation,
                          phone: event.target.value,
                        });
                      }}
                    />
                  </V2Field>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <V2Field label="Día">
                    <div className="relative">
                      <V2Input
                        className="pr-11"
                        value={formatCompactDate(editingReservation.date)}
                        readOnly
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setEditorCalendarMonth(editingReservation.date);
                          setIsEditorCalendarOpen((current) => !current);
                        }}
                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Abrir calendario de la reserva"
                      >
                        <CalendarDays size={17} />
                      </button>

                      {isEditorCalendarOpen ? (
                        <div className="absolute left-0 top-11 z-[90] w-[340px] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                Seleccionar día
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Usá la misma ventana de reservas configurada.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setIsEditorCalendarOpen(false)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                              aria-label="Cerrar calendario"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => moveEditorCalendarMonth(-1)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                              aria-label="Mes anterior"
                            >
                              <ChevronLeft size={16} />
                            </button>

                            <p className="text-sm font-semibold capitalize text-slate-950">
                              {MONTH_NAMES[editorCalendarMonthData.month]} {editorCalendarMonthData.year}
                            </p>

                            <button
                              type="button"
                              onClick={() => moveEditorCalendarMonth(1)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                              aria-label="Mes siguiente"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day, index) => (
                              <span key={`editor-${day}-${index}`}>{day}</span>
                            ))}
                          </div>

                          <div className="mt-2 grid grid-cols-7 gap-1.5">
                            {Array.from({ length: editorCalendarMonthData.firstWeekday }).map((_, index) => (
                              <span key={`editor-empty-${index}`} />
                            ))}

                            {Array.from({ length: editorCalendarMonthData.daysInMonth }).map((_, index) => {
                              const day = index + 1;
                              const date = `${editorCalendarMonthData.year}-${String(editorCalendarMonthData.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                              const isSelected = date === editingReservation.date;
                              const isDisabled = !isDateInsideBookingWindow(localConfig, date);
                              const hasReservations = Boolean(reservationCountByDate[date]);

                              return (
                                <button
                                  key={date}
                                  type="button"
                                  onClick={() => selectEditorReservationDate(date)}
                                  disabled={isDisabled}
                                  className={`relative flex h-9 items-center justify-center rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                    isSelected
                                      ? "bg-emerald-700 text-white"
                                      : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                                  }`}
                                >
                                  {day}
                                  {hasReservations && !isSelected ? (
                                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      Ventana permitida hasta {formatCompactDate(maxBookingDate)}.
                    </p>
                  </V2Field>

                  <V2Field label="Hora de llegada">
                    <V2Input
                      type="time"
                      value={editingReservation.time}
                      onChange={(event) => {
                        setReservationFormError("");
                        setEditingReservation({
                          ...editingReservation,
                          time: event.target.value,
                        });
                      }}
                    />
                  </V2Field>

                  <V2Field label="Cantidad de personas">
                    <V2Input
                      type="number"
                      min={1}
                      value={editingReservation.people}
                      onChange={(event) => {
                        setReservationFormError("");
                        setEditingReservation({
                          ...editingReservation,
                          people: Number(event.target.value),
                        });
                      }}
                    />
                  </V2Field>

                  <V2Field label="Duración estimada">
                    <V2Input
                      type="number"
                      min={15}
                      step={15}
                      value={editingReservation.durationMinutes ?? localConfig.standardDurationMinutes}
                      onChange={(event) => {
                        setReservationFormError("");
                        setEditingReservation({
                          ...editingReservation,
                          durationMinutes: Number(event.target.value),
                        });
                      }}
                    />
                  </V2Field>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <V2Field label="Email">
                    <V2Input
                      type="email"
                      value={editingReservation.email ?? ""}
                      onChange={(event) => {
                        setReservationFormError("");
                        setEditingReservation({
                          ...editingReservation,
                          email: event.target.value,
                        });
                      }}
                    />
                  </V2Field>

                  <V2Field label="Mesa">
                    <V2Select
                      value={editingReservation.tableName ?? ""}
                      onChange={(event) => {
                        setReservationFormError("");
                        setEditingReservation({
                          ...editingReservation,
                          tableName: event.target.value,
                        });
                      }}
                    >
                      <option value="">Sin mesa asignada</option>

                      {availableTableOptionsForEditing.length > 0 ? (
                        <optgroup label="Mesas disponibles">
                          {availableTableOptionsForEditing.map((table) => (
                            <option key={table.id} value={table.name}>
                              {table.isCombined ? "Unir " : ""}
                              {table.name} · capacidad {table.capacity}p
                              {table.reason ? ` · ${table.reason}` : ""}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}

                      {unavailableTableOptionsForEditing.length > 0 ? (
                        <optgroup label="No disponibles para este horario">
                          {unavailableTableOptionsForEditing.map((table) => (
                            <option
                              key={table.id}
                              value={table.name}
                              disabled
                            >
                              {table.name} · capacidad {table.capacity}p
                              {table.reason ? ` · ${table.reason}` : ""}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </V2Select>

                    <div className="mt-1 space-y-1 text-xs text-slate-500">
                      <p>
                        {tableAvailabilitySummary.available} disponibles ·{" "}
                        {tableAvailabilitySummary.unavailable} no disponibles para este día y horario.
                      </p>

                      {selectedEditingTable ? (
                        <p>
                          {selectedEditingTable.count > 1 ? "Mesas combinadas" : "Mesa seleccionada"} · capacidad total: {selectedEditingTable.capacity} personas.
                        </p>
                      ) : (
                        <p>
                          Podés dejarla sin asignar y resolverla después desde /plano.
                        </p>
                      )}
                    </div>
                  </V2Field>

                  <V2Field label="Estado">
                    <V2Select
                      value={editingReservation.status}
                      onChange={(event) => {
                        setReservationFormError("");
                        setEditingReservation({
                          ...editingReservation,
                          status: event.target.value as V2ReservationStatus,
                        });
                      }}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="confirmed">Confirmada</option>
                      <option value="completed">Completada</option>
                      <option value="cancelled">Cancelada</option>
                      <option value="no_show">No-show</option>
                    </V2Select>
                  </V2Field>

                  <V2Field label="Origen">
                    <V2Select
                      value={editingReservation.origin ?? "manual"}
                      onChange={(event) => {
                        setReservationFormError("");
                        setEditingReservation({
                          ...editingReservation,
                          origin: event.target.value as V2ReservationOrigin,
                        });
                      }}
                    >
                      <option value="web">Web</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="phone">Teléfono</option>
                      <option value="instagram">Instagram</option>
                      <option value="manual">Manual</option>
                    </V2Select>
                  </V2Field>
                </div>

                <V2Field label="Notas, preferencias o alergias">
                  <V2Textarea
                    value={editingReservation.note}
                    onChange={(event) =>
                      setEditingReservation({
                        ...editingReservation,
                        note: event.target.value,
                      })
                    }
                  />
                </V2Field>

                {editingMode === "edit" ? (
                  <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          Consumo / pedido
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          El consumo se carga desde el popup <strong>+ Consumo</strong>. Desde esta ventana la reserva queda separada del pedido para evitar cambios accidentales de stock.
                        </p>
                      </div>

                      <div className="rounded-2xl bg-purple-50 px-4 py-2 text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-purple-500">
                          Total consumo
                        </p>
                        <p className="text-lg font-bold text-slate-950">
                          {formatMoney(editingReservation.orderTotal ?? 0)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      {editingReservation.orderItems ? (
                        <div className="flex flex-wrap gap-2">
                          {getOrderItemGroups(editingReservation.orderItems).map(({ item, quantity }) => (
                            <span
                              key={item}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                            >
                              {quantity}x {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p>Sin consumo cargado todavía.</p>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500">
                      <UserRound size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        Datos preparados para /plano
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        La mesa se toma del plano real. Las opciones bloqueadas,
                        ocupadas o sin capacidad quedan deshabilitadas para evitar
                        sobreasignaciones en el mismo día y horario.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button variant="secondary" onClick={closeReservationEditor}>
                Cancelar
              </V2Button>
              <V2Button variant="primary" onClick={saveReservation}>
                Guardar reserva
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}
    </V2AppShell>
  );
}
