"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import {
  Bike,
  CalendarDays,
  ChevronRight,
  Clock,
  Leaf,
  MapPin,
  MessageCircle,
  Phone,
  Quote,
  Share2,
  ShoppingBag,
  Star,
  Utensils,
  Wine,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getDataSource } from "@/lib/data/dataSource";
import type {
  PublicShippingCreateResult,
  PublicShippingOrderingSnapshot,
} from "@/lib/public-shipping/public-shipping-contract";
import { V2_OPERATIONAL_EVENTS, V2_OPERATIONAL_STORAGE_KEYS } from "@/lib/v2-operational-storage";
import {
  V2_WEB_TEMPLATE_CONTENT_STORAGE_KEY,
  V2_WEB_TEMPLATE_STORAGE_KEY,
  V2WebTemplateContent,
  createDefaultV2WebTemplateContent,
  getV2WebTemplateById,
  mergeV2WebTemplateContent,
  v2WebTemplates,
} from "@/lib/v2/v2-web-templates";
import { v2MenuCategories, v2MenuItems, v2StockProducts, v2WebConfig } from "@/lib/v2/v2-mock-data";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function readTemplateContent(): Record<string, V2WebTemplateContent> {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = window.localStorage.getItem(V2_WEB_TEMPLATE_CONTENT_STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as Record<string, V2WebTemplateContent>) : {};
  } catch {
    return {};
  }
}

function getStorageTemplateId() {
  if (typeof window === "undefined") return v2WebTemplates[0].id;

  return window.localStorage.getItem(V2_WEB_TEMPLATE_STORAGE_KEY) ?? v2WebTemplates[0].id;
}


type PublicReservationStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no-show";

type PublicReservationDraft = {
  id: string;
  reservationCode?: string;
  date: string;
  time: string;
  client: string;
  people: number;
  phone: string;
  note: string;
  status: PublicReservationStatus;
  email?: string;
  durationMinutes?: number;
  tableName?: string;
  origin?: "web" | "whatsapp" | "phone" | "instagram" | "manual";
};

type PublicBusinessHourSlot = {
  open: string;
  close: string;
};

type PublicBusinessHourConfig = {
  day: string;
  open: string;
  close: string;
  enabled: boolean;
  slots?: PublicBusinessHourSlot[];
};

type PublicLocalConfigState = {
  businessHours: PublicBusinessHourConfig[];
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

type PublicFloorTable = {
  id: string;
  name: string;
  capacity: number;
  status?: "available" | "reserved" | "occupied" | "blocked";
  locked?: boolean;
};

type PublicReservationForm = {
  client: string;
  phone: string;
  email: string;
  people: number;
  date: string;
  time: string;
  note: string;
};

type PendingPublicReservation = PublicReservationForm & {
  normalizedPhone: string;
};

type CreatedPublicReservationSummary = {
  client: string;
  reservationCode: string;
  date: string;
  time: string;
  people: number;
  phone: string;
  status: PublicReservationStatus;
};

type PublicOrderDeliveryType = "delivery" | "pickup";

type PublicOrderForm = {
  client: string;
  phone: string;
  deliveryType: PublicOrderDeliveryType;
  address: string;
  payment: string;
  note: string;
};

type PublicMenuItemDraft = {
  id: string;
  imageUrl?: string;
  name: string;
  categoryId: string;
  description: string;
  price: number;
  status?: "available" | "paused";
  visible?: boolean;
  featured?: boolean;
};

type PublicMenuCategoryDraft = {
  id: string;
  name: string;
  description?: string;
  order: number;
  visible?: boolean;
  active?: boolean;
  isPromotion?: boolean;
  fixedPrice?: number;
  discountPercent?: number;
  products?: { productId: string; quantity: number }[];
};

type PublicStockProduct = {
  id: string;
  name: string;
  totalStock: number;
  consumedBySales: number;
  alertBelow: number;
};

type PublicStockStatus = "available" | "low_stock" | "out_of_stock";

type PublicOrderCartItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageSlot: string;
  imageUrl: string;
  stockStatus: PublicStockStatus;
  stockLabel: string;
  orderable: boolean;
};

type PublicDeliveryOrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type PublicMenuIconKey = string;

type PublicMenuSection = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  iconKey?: PublicMenuIconKey;
  productIds: string[];
  featuredProductIds?: string[];
};

type PublicWebConfigState = {
  businessName: string;
  publicUrl: string;
  status: "published" | "draft";
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryButtonLabel: string;
  secondaryButtonLabel: string;
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  showMenu: boolean;
  showReservations: boolean;
  showWhatsApp: boolean;
  showGallery: boolean;
  showMap: boolean;
  showDelivery: boolean;
};

type PublicDeliveryRecord = {
  id: string;
  date: string;
  time: string;
  client: string;
  phone: string;
  address: string;
  deliveryType: PublicOrderDeliveryType;
  order: string;
  orderItems: PublicDeliveryOrderItem[];
  total: number;
  payment: string;
  note: string;
  status: "confirmed" | "completed" | "cancelled";
  source?: "web" | "manual";
  needsAcceptance?: boolean;
};

type LucideMenuIconComponent = React.ElementType<{
  size?: number | string;
  className?: string;
  strokeWidth?: number | string;
}>;

const PUBLIC_MENU_ICON_ALIASES: Record<string, string> = {
  leaf: "Leaf",
  utensils: "Utensils",
  bag: "ShoppingBag",
  star: "Star",
  wine: "Wine",
  bike: "Bike",
  clock: "Clock",
  calendar: "CalendarDays",
};

function getPublicMenuIcon(iconKey?: PublicMenuIconKey) {
  const normalizedIconKey = iconKey ? PUBLIC_MENU_ICON_ALIASES[iconKey] ?? iconKey : "Leaf";
  const Icon = (LucideIcons as Record<string, unknown>)[normalizedIconKey];

  return typeof Icon === "function" || (typeof Icon === "object" && Icon !== null)
    ? (Icon as LucideMenuIconComponent)
    : Leaf;
}

function inferPublicMenuIconKey(name: string): PublicMenuIconKey {
  const normalizedName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    normalizedName.includes("bebida") ||
    normalizedName.includes("vino") ||
    normalizedName.includes("trago")
  ) {
    return "Wine";
  }

  if (
    normalizedName.includes("postre") ||
    normalizedName.includes("tortilla")
  ) {
    return "Star";
  }

  if (
    normalizedName.includes("sandwich") ||
    normalizedName.includes("pan") ||
    normalizedName.includes("burger")
  ) {
    return "ShoppingBag";
  }

  if (
    normalizedName.includes("ensalada") ||
    normalizedName.includes("vegetal") ||
    normalizedName.includes("clasico")
  ) {
    return "Leaf";
  }

  return "Utensils";
}


const DEFAULT_PUBLIC_ORDER_FORM: PublicOrderForm = {
  client: "",
  phone: "",
  deliveryType: "delivery",
  address: "",
  payment: "Efectivo",
  note: "",
};

const RESERVATIONS_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.reservations;
const RESERVATIONS_EVENT = V2_OPERATIONAL_EVENTS.reservations;
const DELIVERIES_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.deliveries;
const DELIVERIES_EVENT = V2_OPERATIONAL_EVENTS.deliveries;
const MENU_ITEMS_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.menuItems;
const MENU_CATEGORIES_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.menuCategories;
const LOCAL_CONFIG_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.localConfig;
const LOCAL_CONFIG_EVENT = V2_OPERATIONAL_EVENTS.localConfig;
const FLOOR_TABLES_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.floorTables;
const FLOOR_TABLES_EVENT = V2_OPERATIONAL_EVENTS.floorTables;
const WEB_CONFIG_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.webConfig;
const WEB_CONFIG_EVENT = V2_OPERATIONAL_EVENTS.webConfig;
const PUBLIC_MENU_SECTIONS_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.publicMenuSections;
const PUBLIC_MENU_SECTIONS_EVENT = V2_OPERATIONAL_EVENTS.publicMenuSections;

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const DEFAULT_PUBLIC_LOCAL_CONFIG: PublicLocalConfigState = {
  businessHours: [
    { day: "Domingo", open: "12:00", close: "00:00", enabled: true },
    { day: "Lunes", open: "12:00", close: "00:00", enabled: false },
    { day: "Martes", open: "12:00", close: "00:00", enabled: true },
    { day: "Miércoles", open: "12:00", close: "00:00", enabled: true },
    { day: "Jueves", open: "12:00", close: "00:00", enabled: true },
    { day: "Viernes", open: "12:00", close: "00:00", enabled: true },
    { day: "Sábado", open: "12:00", close: "00:00", enabled: true },
  ],
  reservationEnabled: true,
  standardDurationMinutes: 120,
  confirmationMode: "manual",
  defaultReservationStatus: "pending",
  minimumNoticeHours: 2,
  bookingWindowDays: 14,
  maxPeoplePerSlot: 40,
  allowReservationsWithoutTable: false,
  autoAssignReservationTables: true,
  allowTableCombinations: true,
};

const DEFAULT_PUBLIC_FLOOR_TABLES: PublicFloorTable[] = [
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

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createPublicDeliveryId() {
  return `web-env-${Date.now()}`;
}

function addDays(date: string, days: number) {
  const parsedDate = new Date(`${date}T00:00:00`);
  parsedDate.setDate(parsedDate.getDate() + days);

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatPublicDate(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);

  return parsedDate.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}

function formatTimeFromMinutes(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getBusinessHourForDate(config: PublicLocalConfigState, date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);
  const dayName = DAY_NAMES[parsedDate.getDay()];

  return config.businessHours.find((item) => item.day === dayName) ?? null;
}

function normalizePublicBusinessHourSlots(
  businessHour: PublicBusinessHourConfig
): PublicBusinessHourSlot[] {
  const rawSlots =
    businessHour.slots && businessHour.slots.length > 0
      ? businessHour.slots
      : [{ open: businessHour.open, close: businessHour.close }];

  return rawSlots
    .filter((slot) => slot.open && slot.close)
    .map((slot) => ({
      open: slot.open,
      close: slot.close,
    }));
}

function getBusinessWindowsForDate(config: PublicLocalConfigState, date: string) {
  const businessHour = getBusinessHourForDate(config, date);

  if (!businessHour?.enabled) return [];

  return normalizePublicBusinessHourSlots(businessHour).map((slot) => {
    const openMinutes = parseTimeToMinutes(slot.open);
    let closeMinutes = parseTimeToMinutes(slot.close);

    if (closeMinutes <= openMinutes) closeMinutes += 1440;

    return {
      ...businessHour,
      open: slot.open,
      close: slot.close,
      openMinutes,
      closeMinutes,
    };
  });
}

function getBusinessWindowForDate(config: PublicLocalConfigState, date: string) {
  return getBusinessWindowsForDate(config, date)[0] ?? null;
}

function getSlotAbsoluteMinutes(time: string, openMinutes: number) {
  let minutes = parseTimeToMinutes(time);

  if (minutes < openMinutes) minutes += 1440;

  return minutes;
}

function getPublicAvailableTimeSlots(config: PublicLocalConfigState, date: string) {
  const businessWindows = getBusinessWindowsForDate(config, date);

  if (businessWindows.length === 0) return [];

  const slots = new Set<string>();

  businessWindows.forEach((businessWindow) => {
    for (
      let current = businessWindow.openMinutes;
      current <= businessWindow.closeMinutes;
      current += 30
    ) {
      slots.add(formatTimeFromMinutes(current));
    }
  });

  return Array.from(slots).sort(
    (first, second) =>
      getSlotAbsoluteMinutes(first, businessWindows[0].openMinutes) -
      getSlotAbsoluteMinutes(second, businessWindows[0].openMinutes)
  );
}

function getPublicSlotGroupLabel(openTime: string, index: number) {
  const hour = Number(openTime.split(":")[0]) || 0;

  if (hour < 12) return "Mañana";
  if (hour < 18) return "Mediodía";
  if (hour < 24) return "Noche";

  return `Tramo ${index + 1}`;
}

function getPublicTimeSlotGroups(config: PublicLocalConfigState, date: string) {
  return getBusinessWindowsForDate(config, date).map((businessWindow, index) => {
    const slots: string[] = [];

    for (
      let current = businessWindow.openMinutes;
      current <= businessWindow.closeMinutes;
      current += 30
    ) {
      slots.push(formatTimeFromMinutes(current));
    }

    return {
      id: `${businessWindow.open}-${businessWindow.close}-${index}`,
      label: getPublicSlotGroupLabel(businessWindow.open, index),
      range: `${businessWindow.open}–${businessWindow.close}`,
      slots,
    };
  });
}

function formatPublicBusinessHoursForContact(config: PublicLocalConfigState) {
  const openDays = config.businessHours.filter((item) => item.enabled);

  if (openDays.length === 0) return "Sin horarios publicados";

  return openDays
    .map((item) => {
      const slots = normalizePublicBusinessHourSlots(item)
        .map((slot) => `${slot.open}–${slot.close}`)
        .join(" / ");

      return `${item.day}: ${slots}`;
    })
    .join("\n");
}

function readLocalStorageValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizePublicBooleanSetting(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "enabled", "activada", "activo", "permitido", "yes", "1"].includes(normalized)) {
      return true;
    }

    if (["false", "disabled", "desactivada", "inactivo", "bloquear", "bloqueado", "no", "0"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function normalizePublicWebConfig(value?: Partial<PublicWebConfigState> | null): PublicWebConfigState {
  return {
    businessName: value?.businessName ?? v2WebConfig.businessName,
    publicUrl: value?.publicUrl ?? v2WebConfig.publicUrl,
    status: value?.status === "draft" ? "draft" : "published",
    heroEyebrow: value?.heroEyebrow ?? v2WebConfig.heroEyebrow,
    heroTitle: value?.heroTitle ?? v2WebConfig.heroTitle,
    heroSubtitle: value?.heroSubtitle ?? v2WebConfig.heroSubtitle,
    primaryButtonLabel: value?.primaryButtonLabel ?? v2WebConfig.primaryButtonLabel,
    secondaryButtonLabel: value?.secondaryButtonLabel ?? v2WebConfig.secondaryButtonLabel,
    description: value?.description ?? v2WebConfig.description,
    address: value?.address ?? v2WebConfig.address,
    phone: value?.phone ?? v2WebConfig.phone,
    whatsapp: value?.whatsapp ?? v2WebConfig.whatsapp,
    instagram: value?.instagram ?? v2WebConfig.instagram,
    showMenu: value?.showMenu ?? Boolean(v2WebConfig.showMenu),
    showReservations: value?.showReservations ?? Boolean(v2WebConfig.showReservations),
    showWhatsApp: value?.showWhatsApp ?? Boolean(v2WebConfig.showWhatsApp),
    showGallery: value?.showGallery ?? Boolean(v2WebConfig.showGallery),
    showMap: value?.showMap ?? Boolean(v2WebConfig.showMap),
    showDelivery: value?.showDelivery ?? true,
  };
}

function readPublicWebConfig() {
  return normalizePublicWebConfig(
    readLocalStorageValue<Partial<PublicWebConfigState>>(WEB_CONFIG_STORAGE_KEY, {})
  );
}

function readPublicMenuSectionsConfig(): PublicMenuSection[] {
  const sections = readLocalStorageValue<PublicMenuSection[]>(
    PUBLIC_MENU_SECTIONS_STORAGE_KEY,
    []
  );

  return sections
    .filter((section) => section.active !== false)
    .map((section) => ({
      id: section.id,
      name: section.name || "Menú",
      description: section.description || "Platos del local.",
      active: section.active !== false,
      iconKey: section.iconKey ?? inferPublicMenuIconKey(section.name || ""),
      productIds: Array.isArray(section.productIds) ? section.productIds : [],
      featuredProductIds: Array.isArray(section.featuredProductIds)
        ? section.featuredProductIds.filter((productId) =>
            Array.isArray(section.productIds) ? section.productIds.includes(productId) : false
          )
        : [],
    }));
}

function normalizePublicConfig(rawConfig: Partial<PublicLocalConfigState>): PublicLocalConfigState {
  return {
    ...DEFAULT_PUBLIC_LOCAL_CONFIG,
    ...rawConfig,
    businessHours:
      rawConfig.businessHours?.map((item) => ({
        day: item.day,
        open: item.open,
        close: item.close,
        enabled: Boolean(item.enabled),
        slots:
          item.slots?.map((slot) => ({
            open: slot.open,
            close: slot.close,
          })) ?? [{ open: item.open, close: item.close }],
      })) ?? DEFAULT_PUBLIC_LOCAL_CONFIG.businessHours,
    standardDurationMinutes: Math.max(Number(rawConfig.standardDurationMinutes) || 120, 15),
    bookingWindowDays: Math.max(Number(rawConfig.bookingWindowDays) || 14, 1),
    maxPeoplePerSlot: Math.max(Number(rawConfig.maxPeoplePerSlot) || 40, 1),
    allowReservationsWithoutTable: normalizePublicBooleanSetting(
      rawConfig.allowReservationsWithoutTable,
      DEFAULT_PUBLIC_LOCAL_CONFIG.allowReservationsWithoutTable
    ),
    autoAssignReservationTables: normalizePublicBooleanSetting(
      rawConfig.autoAssignReservationTables,
      DEFAULT_PUBLIC_LOCAL_CONFIG.autoAssignReservationTables
    ),
    allowTableCombinations: normalizePublicBooleanSetting(
      rawConfig.allowTableCombinations,
      DEFAULT_PUBLIC_LOCAL_CONFIG.allowTableCombinations
    ),
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

function getPublicReservationCode(reservation: Pick<PublicReservationDraft, "id" | "reservationCode">) {
  return reservation.reservationCode || createPublicCode("RES", reservation.id);
}

function normalizePublicReservation(reservation: PublicReservationDraft): PublicReservationDraft {
  return {
    ...reservation,
    id: reservation.id || `res-${Date.now()}`,
    reservationCode: reservation.reservationCode || createPublicCode("RES", reservation.id),
    date: reservation.date || getTodayDateKey(),
    time: reservation.time || "20:00",
    client: reservation.client?.trim() || "Cliente sin nombre",
    phone: reservation.phone?.trim() || "",
    email: reservation.email?.trim() ?? "",
    note: reservation.note?.trim() || "—",
    people: Math.max(Number(reservation.people) || 1, 1),
    status: reservation.status ?? "pending",
    durationMinutes: Math.max(Number(reservation.durationMinutes) || 120, 15),
    tableName: reservation.tableName?.trim() ?? "",
    origin: reservation.origin ?? "web",
  };
}

function isActivePublicReservation(reservation: PublicReservationDraft) {
  return reservation.status === "pending" || reservation.status === "confirmed";
}

function doReservationsOverlap(
  firstTime: string,
  firstDuration: number,
  secondTime: string,
  secondDuration: number,
  openMinutes: number
) {
  const firstStart = getSlotAbsoluteMinutes(firstTime, openMinutes);
  const secondStart = getSlotAbsoluteMinutes(secondTime, openMinutes);

  return firstStart < secondStart + secondDuration && secondStart < firstStart + firstDuration;
}

function normalizePublicTableName(tableName?: string) {
  const normalized = tableName?.trim().toLowerCase() ?? "";

  if (!normalized) return "";
  if (/^\d+$/.test(normalized)) return `mesa ${Number(normalized)}`;

  return normalized
    .replace(/mesa\s*0*(\d+)/, "mesa $1")
    .replace(/\s+/g, " ");
}

function splitPublicTableNames(tableName?: string) {
  return (tableName ?? "")
    .split("+")
    .map((name) => normalizePublicTableName(name))
    .filter(Boolean);
}

function joinPublicTableNames(tables: Pick<PublicFloorTable, "name">[]) {
  return tables.map((table) => table.name).join(" + ");
}

function getBestAvailablePublicTableForReservation(
  reservation: PublicReservationDraft,
  currentReservations: PublicReservationDraft[],
  tables: PublicFloorTable[],
  config: PublicLocalConfigState
) {
  const businessWindows = getBusinessWindowsForDate(config, reservation.date);
  const matchingWindow =
    businessWindows.find((businessWindow) => {
      const reservationMinutes = getSlotAbsoluteMinutes(
        reservation.time,
        businessWindow.openMinutes
      );

      return (
        reservationMinutes >= businessWindow.openMinutes &&
        reservationMinutes <= businessWindow.closeMinutes
      );
    }) ?? businessWindows[0];

  const openMinutes = matchingWindow?.openMinutes ?? 0;
  const reservationDuration = Math.max(
    Number(reservation.durationMinutes) || Number(config.standardDurationMinutes) || 90,
    15
  );

  function tableConflict(tableName: string) {
    const normalizedTableName = normalizePublicTableName(tableName);

    return currentReservations.some((currentReservation) => {
      if (currentReservation.id === reservation.id) return false;
      if (currentReservation.date !== reservation.date) return false;
      if (!isActivePublicReservation(currentReservation)) return false;
      if (!splitPublicTableNames(currentReservation.tableName).includes(normalizedTableName)) {
        return false;
      }

      return doReservationsOverlap(
        currentReservation.time,
        Math.max(Number(currentReservation.durationMinutes) || reservationDuration, 15),
        reservation.time,
        reservationDuration,
        openMinutes
      );
    });
  }

  const availableSingleTables = tables
    .filter((table) => table.status !== "blocked" && !table.locked)
    .filter((table) => Number(table.capacity) >= Number(reservation.people))
    .filter((table) => !tableConflict(table.name))
    .sort(
      (first, second) =>
        Number(first.capacity) - Number(second.capacity) ||
        first.name.localeCompare(second.name, "es")
    );

  if (availableSingleTables[0]) return availableSingleTables[0].name;

  if (!config.allowTableCombinations) return "";

  const availableTables = tables
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
        return joinPublicTableNames(pair);
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
          return joinPublicTableNames(group);
        }
      }
    }
  }

  return "";
}

function getPeopleReservedInSlot(
  reservations: PublicReservationDraft[],
  config: PublicLocalConfigState,
  date: string,
  time: string
) {
  const businessWindows = getBusinessWindowsForDate(config, date);
  const duration = Math.max(Number(config.standardDurationMinutes) || 120, 15);

  if (businessWindows.length === 0) return 0;

  const matchingWindow =
    businessWindows.find((businessWindow) => {
      const slotMinutes = getSlotAbsoluteMinutes(time, businessWindow.openMinutes);

      return slotMinutes >= businessWindow.openMinutes && slotMinutes <= businessWindow.closeMinutes;
    }) ?? businessWindows[0];

  return reservations
    .filter((reservation) => reservation.date === date && isActivePublicReservation(reservation))
    .filter((reservation) =>
      doReservationsOverlap(
        reservation.time,
        Math.max(Number(reservation.durationMinutes) || duration, 15),
        time,
        duration,
        matchingWindow.openMinutes
      )
    )
    .reduce((total, reservation) => total + Number(reservation.people), 0);
}

function getPublicCapacity(config: PublicLocalConfigState, tables: PublicFloorTable[]) {
  const openTables = tables.filter((table) => table.status !== "blocked" && !table.locked);
  const tableCapacity = openTables.reduce(
    (total, table) => total + Math.max(Number(table.capacity) || 0, 0),
    0
  );

  if (tableCapacity <= 0) return config.maxPeoplePerSlot;

  return Math.min(config.maxPeoplePerSlot, tableCapacity);
}

function getAvailablePeopleForSlot(
  reservations: PublicReservationDraft[],
  tables: PublicFloorTable[],
  config: PublicLocalConfigState,
  date: string,
  time: string
) {
  const totalCapacity = getPublicCapacity(config, tables);
  const reservedPeople = getPeopleReservedInSlot(reservations, config, date, time);

  return Math.max(totalCapacity - reservedPeople, 0);
}

function getTodayTimeKey() {
  const now = new Date();

  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function getRemainingPublicStock(product: PublicStockProduct) {
  return Math.max(Number(product.totalStock) - Number(product.consumedBySales), 0);
}

function getPublicStockStatus(product: PublicStockProduct): PublicStockStatus {
  const remaining = getRemainingPublicStock(product);

  if (remaining <= 0) return "out_of_stock";
  if (remaining <= Number(product.alertBelow)) return "low_stock";

  return "available";
}

function summarizePublicOrderItems(items: Array<PublicDeliveryOrderItem>) {
  return items.map((item) => `${item.quantity}x ${item.name}`).join(", ");
}

function readPublicMenuItems() {
  return readLocalStorageValue<PublicMenuItemDraft[]>(
    MENU_ITEMS_STORAGE_KEY,
    v2MenuItems.map((item) => ({
      id: item.id,
      imageUrl: "",
      name: item.name,
      categoryId: item.categoryId,
      description: item.description,
      price: item.price,
      status: item.status,
      visible: item.visible,
      featured: item.featured,
    }))
  );
}

function readPublicMenuCategories() {
  return readLocalStorageValue<PublicMenuCategoryDraft[]>(
    MENU_CATEGORIES_STORAGE_KEY,
    v2MenuCategories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      order: category.order,
      visible: category.visible,
      active: category.active,
      products: [],
    }))
  );
}

function readPublicDeliveries() {
  return readLocalStorageValue<PublicDeliveryRecord[]>(DELIVERIES_STORAGE_KEY, []);
}

function writePublicDeliveries(deliveries: PublicDeliveryRecord[]) {
  window.localStorage.setItem(DELIVERIES_STORAGE_KEY, JSON.stringify(deliveries));
  window.dispatchEvent(new Event(DELIVERIES_EVENT));
}

function normalizePublicPhone(phone: string) {
  return phone.replace(/\D/g, "");
}


const fallbackFeaturedItems = [
  {
    id: "template-menu-1",
    name: "Burrata de estación",
    description: "Tomates asados, hierbas frescas y aceite de oliva.",
    price: 12500,
    imageSlot: "menu1",
  },
  {
    id: "template-menu-2",
    name: "Ravioles de osobuco",
    description: "Salsa de hongos, crema y parmesano.",
    price: 14800,
    imageSlot: "menu2",
  },
  {
    id: "template-menu-3",
    name: "Pesca del día",
    description: "Vegetales grillados y emulsión cítrica.",
    price: 18900,
    imageSlot: "menu3",
  },
  {
    id: "template-menu-4",
    name: "Postre de la casa",
    description: "Texturas dulces, crema y crocante de estación.",
    price: 9800,
    imageSlot: "menu4",
  },
];

const menuCategories = [
  {
    title: "Entradas",
    description: "Comienzos que despiertan.",
    icon: Leaf,
  },
  {
    title: "Principales",
    description: "Platos intensos y sabrosos.",
    icon: Utensils,
  },
  {
    title: "Pastas",
    description: "Hechas en casa, como siempre.",
    icon: ShoppingBag,
  },
  {
    title: "Postres",
    description: "El final perfecto para tu comida.",
    icon: Star,
  },
  {
    title: "Bebidas",
    description: "Vinos, tragos y sin alcohol.",
    icon: Wine,
  },
];

const testimonials = [
  {
    name: "Martina L.",
    quote: "Una experiencia increíble de principio a fin. Los sabores, la atención y el ambiente son de primer nivel.",
  },
  {
    name: "Ignacio R.",
    quote: "La cocina es espectacular y los postres una locura. Volvemos siempre.",
  },
  {
    name: "Sofía G.",
    quote: "Demuru es sinónimo de calidez y calidad. Ideal para una cena especial.",
  },
];

function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="text-center">
      {eyebrow ? (
        <p className="font-serif text-[12px] font-bold uppercase tracking-[0.42em] text-[#c9a86a]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 font-serif text-3xl font-bold uppercase tracking-[0.32em] text-[#f5ead6]">
        {title}
      </h2>
      <div className="mx-auto mt-3 flex w-56 items-center justify-center gap-3 text-[#9fa875]">
        <span className="h-px flex-1 bg-[#715943]" />
        <Leaf size={18} />
        <span className="h-px flex-1 bg-[#715943]" />
      </div>
    </div>
  );
}

export default function PublicTemplatePage() {
  const routeParams =
    useParams<{
      slug: string;
    }>();
  const publicSlug =
    decodeURIComponent(
      routeParams.slug,
    )
      .trim()
      .toLowerCase();
  const isSupabasePersistence =
    getDataSource()
      === "supabase";
  const [activeTemplateId, setActiveTemplateId] = useState(v2WebTemplates[0].id);
  const [isTemplateHydrated, setIsTemplateHydrated] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(menuCategories[0].title);
  const activeTemplate = useMemo(
    () => getV2WebTemplateById(activeTemplateId),
    [activeTemplateId]
  );
  const [content, setContent] = useState(() =>
    createDefaultV2WebTemplateContent(v2WebTemplates[0])
  );
  const [publicWebConfig, setPublicWebConfig] = useState<PublicWebConfigState>(() =>
    normalizePublicWebConfig()
  );
  const [publicMenuSectionsConfig, setPublicMenuSectionsConfig] = useState<PublicMenuSection[]>([]);
  const [localConfig, setLocalConfig] = useState<PublicLocalConfigState>(
    DEFAULT_PUBLIC_LOCAL_CONFIG
  );
  const [reservations, setReservations] = useState<PublicReservationDraft[]>([]);
  const [floorTables, setFloorTables] = useState<PublicFloorTable[]>(
    DEFAULT_PUBLIC_FLOOR_TABLES
  );
  const [storedMenuItems, setStoredMenuItems] = useState<PublicMenuItemDraft[]>([]);
  const [storedMenuCategories, setStoredMenuCategories] = useState<PublicMenuCategoryDraft[]>([]);
  const [stockProducts, setStockProducts] = useState<PublicStockProduct[]>([]);
  const [reservationForm, setReservationForm] = useState<PublicReservationForm>(() => ({
    client: "",
    phone: "",
    email: "",
    people: 2,
    date: getTodayDateKey(),
    time: "",
    note: "",
  }));
  const [reservationError, setReservationError] = useState("");
  const [isTimePopupOpen, setIsTimePopupOpen] = useState(false);
  const [pendingReservation, setPendingReservation] =
    useState<PendingPublicReservation | null>(null);
  const [createdReservationSummary, setCreatedReservationSummary] =
    useState<CreatedPublicReservationSummary | null>(null);
  const [isOrderPopupOpen, setIsOrderPopupOpen] = useState(false);
  const [activeOrderCategory, setActiveOrderCategory] = useState(menuCategories[0].title);
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [orderForm, setOrderForm] = useState<PublicOrderForm>(DEFAULT_PUBLIC_ORDER_FORM);
  const [orderError, setOrderError] = useState("");
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);
  const orderRequestKeyRef =
    useRef<string | null>(
      null,
    );

  useEffect(() => {
    function loadPublicTemplate() {
      const templateId = getStorageTemplateId();
      const template = getV2WebTemplateById(templateId);
      const storedContent = readTemplateContent()[template.id];

      setActiveTemplateId(template.id);
      setContent(mergeV2WebTemplateContent(template, storedContent));
      setIsTemplateHydrated(true);
    }

    loadPublicTemplate();

    window.addEventListener("storage", loadPublicTemplate);
    window.addEventListener("tango-v2-web-template-updated", loadPublicTemplate);
    window.addEventListener("tango-v2-web-template-content-updated", loadPublicTemplate);

    return () => {
      window.removeEventListener("storage", loadPublicTemplate);
      window.removeEventListener("tango-v2-web-template-updated", loadPublicTemplate);
      window.removeEventListener("tango-v2-web-template-content-updated", loadPublicTemplate);
    };
  }, []);

  useEffect(() => {
    if (isSupabasePersistence) {
      return;
    }

    function loadPublicWebConfig() {
      setPublicWebConfig(readPublicWebConfig());
      setPublicMenuSectionsConfig(readPublicMenuSectionsConfig());
    }

    loadPublicWebConfig();

    window.addEventListener("storage", loadPublicWebConfig);
    window.addEventListener(WEB_CONFIG_EVENT, loadPublicWebConfig);
    window.addEventListener(PUBLIC_MENU_SECTIONS_EVENT, loadPublicWebConfig);

    return () => {
      window.removeEventListener("storage", loadPublicWebConfig);
      window.removeEventListener(WEB_CONFIG_EVENT, loadPublicWebConfig);
      window.removeEventListener(PUBLIC_MENU_SECTIONS_EVENT, loadPublicWebConfig);
    };
  }, [isSupabasePersistence]);

  useEffect(() => {
    if (!isSupabasePersistence) {
      function loadPublicMenuData() {
        setStoredMenuItems(readPublicMenuItems());
        setStoredMenuCategories(readPublicMenuCategories());
        setStockProducts(
          v2StockProducts.map((product) => ({
            id: product.id,
            name: product.name,
            totalStock: product.totalStock,
            consumedBySales: product.consumedBySales,
            alertBelow: product.alertBelow,
          }))
        );
      }

      loadPublicMenuData();

      window.addEventListener("storage", loadPublicMenuData);
      window.addEventListener("focus", loadPublicMenuData);

      return () => {
        window.removeEventListener("storage", loadPublicMenuData);
        window.removeEventListener("focus", loadPublicMenuData);
      };
    }

    if (!publicSlug) {
      return;
    }

    let cancelled = false;

    async function loadPersistentOrdering() {
      try {
        const response =
          await fetch(
            `/api/public/${encodeURIComponent(publicSlug)}/ordering`,
            {
              cache: "no-store",
            },
          );
        const payload =
          await response.json() as {
            snapshot?: PublicShippingOrderingSnapshot;
            error?: string;
          };

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.snapshot) {
          setOrderError(
            payload.error
            ?? "No se pudo cargar el menú público.",
          );
          setStoredMenuItems([]);
          setStoredMenuCategories([]);
          return;
        }

        const snapshot =
          payload.snapshot;

        setStoredMenuItems(
          snapshot.items,
        );
        setStoredMenuCategories(
          snapshot.categories.map(
            (category) => ({
              ...category,
              fixedPrice:
                category.fixedPrice
                ?? undefined,
              discountPercent:
                category.discountPercent
                ?? undefined,
            }),
          ),
        );
        setStockProducts([]);
        setPublicWebConfig(
          (current) => ({
            ...current,
            businessName:
              snapshot.business.name,
            address:
              snapshot.business.address,
            phone:
              snapshot.business.phone,
            whatsapp:
              snapshot.business.whatsapp,
            status:
              "published",
            showDelivery:
              true,
          }),
        );
        setOrderError("");
      } catch {
        if (!cancelled) {
          setOrderError(
            "No se pudo cargar el menú público.",
          );
          setStoredMenuItems([]);
          setStoredMenuCategories([]);
        }
      }
    }

    void loadPersistentOrdering();

    return () => {
      cancelled = true;
    };
  }, [
    isSupabasePersistence,
    publicSlug,
  ]);

  useEffect(() => {
    function loadPublicReservationData() {
      const nextConfig = normalizePublicConfig(
        readLocalStorageValue<Partial<PublicLocalConfigState>>(
          LOCAL_CONFIG_STORAGE_KEY,
          DEFAULT_PUBLIC_LOCAL_CONFIG
        )
      );
      const nextReservations = readLocalStorageValue<PublicReservationDraft[]>(
        RESERVATIONS_STORAGE_KEY,
        []
      ).map((reservation) => normalizePublicReservation(reservation));
      const nextTables = readLocalStorageValue<PublicFloorTable[]>(
        FLOOR_TABLES_STORAGE_KEY,
        DEFAULT_PUBLIC_FLOOR_TABLES
      );

      setLocalConfig(nextConfig);
      setReservations(nextReservations);
      setFloorTables(nextTables);
      setReservationForm((current) => {
        const availableDates = Array.from({ length: nextConfig.bookingWindowDays })
          .map((_, index) => addDays(getTodayDateKey(), index))
          .filter((date) => Boolean(getBusinessWindowForDate(nextConfig, date)));
        const nextDate = availableDates.includes(current.date)
          ? current.date
          : availableDates[0] ?? current.date;
        const nextSlots = getPublicAvailableTimeSlots(nextConfig, nextDate);

        return {
          ...current,
          date: nextDate,
          time: current.time && nextSlots.includes(current.time) ? current.time : "",
        };
      });
    }

    loadPublicReservationData();

    window.addEventListener("storage", loadPublicReservationData);
    window.addEventListener(LOCAL_CONFIG_EVENT, loadPublicReservationData);
    window.addEventListener(RESERVATIONS_EVENT, loadPublicReservationData);
    window.addEventListener(FLOOR_TABLES_EVENT, loadPublicReservationData);

    return () => {
      window.removeEventListener("storage", loadPublicReservationData);
      window.removeEventListener(LOCAL_CONFIG_EVENT, loadPublicReservationData);
      window.removeEventListener(RESERVATIONS_EVENT, loadPublicReservationData);
      window.removeEventListener(FLOOR_TABLES_EVENT, loadPublicReservationData);
    };
  }, []);

  const fallbackCategoryItems = menuCategories.map((category, categoryIndex) => {
    const baseItems = fallbackFeaturedItems.map((item, itemIndex) => ({
      ...item,
      id: `${category.title}-${itemIndex}`,
      name:
        category.title === "Entradas"
          ? ["Burrata de estación", "Remolacha asada", "Croquetas de hongos", "Tostón ahumado"][itemIndex]
          : category.title === "Principales"
            ? ["Ojo de bife", "Pulpo grillado", "Pesca del día", "Pollo braseado"][itemIndex]
            : category.title === "Pastas"
              ? ["Ravioles de osobuco", "Sorrentinos de calabaza", "Pappardelle", "Ñoquis de papa"][itemIndex]
              : category.title === "Postres"
                ? ["Postre Demuru", "Chocolate y crema", "Flan de autor", "Frutas asadas"][itemIndex]
                : ["Vino de la casa", "Aperitivo cítrico", "Copa especial", "Agua saborizada"][itemIndex],
      description: category.description,
      price: item.price + categoryIndex * 900,
      imageSlot: `menu${itemIndex + 1}`,
      imageUrl: "",
    }));

    return {
      category: category.title,
      items: baseItems,
    };
  });

  const realMenuCategories = useMemo(
    () =>
      storedMenuCategories
        .filter((category) => category.visible !== false && category.active !== false)
        .sort((first, second) => first.order - second.order),
    [storedMenuCategories]
  );

  const publicOrderItems: PublicOrderCartItem[] = useMemo(() => {
    const categoriesById = Object.fromEntries(
      realMenuCategories.map((category) => [category.id, category])
    );
    const visibleMenuItems = storedMenuItems.filter(
      (item) => item.visible !== false && item.status !== "paused"
    );
    const menuItemsById = Object.fromEntries(visibleMenuItems.map((item) => [item.id, item]));
    const stockById = Object.fromEntries(stockProducts.map((product) => [product.id, product]));

    function resolveStockStatus(productIds: string[]): PublicStockStatus {
      const stockStatuses = productIds
        .map((productId) => stockById[productId])
        .filter(Boolean)
        .map((product) => getPublicStockStatus(product));

      if (stockStatuses.includes("out_of_stock")) return "out_of_stock";
      if (stockStatuses.includes("low_stock")) return "low_stock";

      return "available";
    }

    function buildStockLabel(stockStatus: PublicStockStatus) {
      if (stockStatus === "out_of_stock") return "Sin stock";
      if (stockStatus === "low_stock") return "Stock bajo";

      return "Disponible";
    }

    const productItems: PublicOrderCartItem[] = visibleMenuItems.map((item, index) => {
      const category = categoriesById[item.categoryId];
      const stockStatus = resolveStockStatus([item.id]);

      return {
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price) || 0,
        category: category?.name ?? "Sin categoría",
        imageSlot: `menu${(index % 4) + 1}`,
        imageUrl: item.imageUrl ?? "",
        stockStatus,
        stockLabel: buildStockLabel(stockStatus),
        orderable: stockStatus !== "out_of_stock",
      };
    });

    const promotionItems: PublicOrderCartItem[] = realMenuCategories
      .filter((category) => category.isPromotion || (category.products?.length ?? 0) > 0)
      .map((category, index) => {
        const includedProducts = (category.products ?? [])
          .map((categoryProduct) => {
            const product = menuItemsById[categoryProduct.productId];

            if (!product) return null;

            return {
              product,
              quantity: Math.max(Number(categoryProduct.quantity) || 1, 1),
            };
          })
          .filter(Boolean) as Array<{ product: PublicMenuItemDraft; quantity: number }>;

        const regularPrice = includedProducts.reduce(
          (total, item) => total + (Number(item.product.price) || 0) * item.quantity,
          0
        );
        const discountPercent = Math.max(Number(category.discountPercent) || 0, 0);
        const discountedPrice =
          discountPercent > 0
            ? Math.round(regularPrice * (1 - discountPercent / 100))
            : regularPrice;
        const price = Number(category.fixedPrice) || discountedPrice || regularPrice;
        const stockStatus = resolveStockStatus(
          includedProducts.map((item) => item.product.id)
        );

        return {
          id: `promo-${category.id}`,
          name: category.name,
          description:
            category.description ||
            includedProducts
              .map((item) => `${item.quantity}× ${item.product.name}`)
              .join(" + ") ||
            "Promoción del local.",
          price,
          category: "Promociones",
          imageSlot: `menu${((index + productItems.length) % 4) + 1}`,
          imageUrl: includedProducts[0]?.product.imageUrl ?? "",
          stockStatus,
          stockLabel: buildStockLabel(stockStatus),
          orderable:
            !isSupabasePersistence
            && stockStatus !== "out_of_stock"
            && price > 0,
        };
      })
      .filter((item) => item.price > 0);

    return [...promotionItems, ...productItems];
  }, [isSupabasePersistence, realMenuCategories, stockProducts, storedMenuItems]);

  const publicMenuItems = publicOrderItems.filter(
    (item) => item.category !== "Promociones"
  );

  const publicMenuItemsById = Object.fromEntries(
    publicMenuItems.map((item) => [item.id, item])
  );

  const configuredPublicSections = publicMenuSectionsConfig
    .map((section, index) => {
      const fallbackCategory = menuCategories[index % menuCategories.length];
      const items = section.productIds
        .map((productId) => publicMenuItemsById[productId])
        .filter(Boolean);

      const featuredItems = (section.featuredProductIds ?? [])
        .map((productId) => publicMenuItemsById[productId])
        .filter(Boolean);

      return {
        title: section.name,
        description: section.description || fallbackCategory?.description || "Platos del local.",
        icon: getPublicMenuIcon(section.iconKey),
        items,
        featuredItems,
      };
    })
    .filter((section) => section.items.length > 0);

  const publicFeaturedMenuItems =
    configuredPublicSections.length > 0
      ? [
          ...configuredPublicSections.flatMap((section) => section.featuredItems),
          ...configuredPublicSections.flatMap((section) => section.items),
        ]
          .filter(
            (item, index, items) =>
              items.findIndex((currentItem) => currentItem.id === item.id) === index
          )
          .slice(0, 4)
      : publicMenuItems.length > 0
        ? publicMenuItems.slice(0, 4)
        : fallbackFeaturedItems.map((item) => ({ ...item, imageUrl: "" }));

  const publicMenuCategoryCards =
    configuredPublicSections.length > 0
      ? configuredPublicSections
      : publicMenuItems.length > 0
        ? Array.from(new Set(publicMenuItems.map((item) => item.category))).map(
            (categoryName, index) => {
              const fallbackCategory = menuCategories[index % menuCategories.length];

              return {
                title: categoryName,
                description: fallbackCategory?.description ?? "Platos del local.",
                icon: getPublicMenuIcon(inferPublicMenuIconKey(categoryName)) ?? fallbackCategory?.icon ?? Utensils,
                items: publicMenuItems.filter((item) => item.category === categoryName),
              };
            }
          )
        : menuCategories.map((category) => ({
            ...category,
            items:
              fallbackCategoryItems.find((item) => item.category === category.title)?.items ??
              fallbackCategoryItems[0].items,
          }));

  const resolvedExpandedCategory = publicMenuCategoryCards.some(
    (category) => category.title === expandedCategory,
  )
    ? expandedCategory
    : publicMenuCategoryCards[0]?.title ?? "Entradas";
  const publicActiveCategoryItems =
    publicMenuCategoryCards.find((item) => item.title === resolvedExpandedCategory)?.items ??
    publicMenuCategoryCards[0]?.items ??
    [];
  const shouldCenterActiveCategoryItems =
    publicActiveCategoryItems.length > 0 && publicActiveCategoryItems.length <= 5;

  const selectedOrderItems = publicOrderItems
    .map((item) => ({
      ...item,
      quantity: orderQuantities[item.id] ?? 0,
    }))
    .filter((item) => item.quantity > 0 && item.orderable);

  const orderTotal = selectedOrderItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const orderCategories = [
    "Todos",
    ...(publicOrderItems.some((item) => item.category === "Promociones")
      ? ["Promociones"]
      : []),
    ...Array.from(
      new Set(
        publicOrderItems
          .map((item) => item.category)
          .filter((category) => category !== "Promociones")
      )
    ),
  ];
  const resolvedActiveOrderCategory = orderCategories.includes(activeOrderCategory)
    ? activeOrderCategory
    : orderCategories[0] ?? "Todos";
  const filteredOrderItems =
    resolvedActiveOrderCategory === "Todos"
      ? publicOrderItems
      : publicOrderItems.filter((item) => item.category === resolvedActiveOrderCategory);

  const galleryImages = [
    { id: "espacio2", label: "Fachada" },
    { id: "espacio1", label: "Salón" },
    { id: "espacio3", label: "Mesa" },
    { id: "espacio6", label: "Cocina" },
    { id: "espacio5", label: "Experiencia" },
    { id: "hero", label: "Detalle" },
  ];

  const publicAvailableDates = useMemo(
    () =>
      Array.from({ length: localConfig.bookingWindowDays })
        .map((_, index) => {
          const date = addDays(getTodayDateKey(), index);
          const isOpen = Boolean(getBusinessWindowForDate(localConfig, date));

          return {
            date,
            label: formatPublicDate(date),
            isOpen,
          };
        })
        .filter((item) => item.isOpen),
    [localConfig]
  );

  const publicAvailableTimeSlots = useMemo(
    () => getPublicAvailableTimeSlots(localConfig, reservationForm.date),
    [localConfig, reservationForm.date]
  );

  const publicTimeSlotGroups = useMemo(
    () => getPublicTimeSlotGroups(localConfig, reservationForm.date),
    [localConfig, reservationForm.date]
  );

  const selectedSlotAvailablePeople = reservationForm.time
    ? getAvailablePeopleForSlot(
        reservations,
        floorTables,
        localConfig,
        reservationForm.date,
        reservationForm.time
      )
    : 0;

  const isSelectedDateOpen = Boolean(getBusinessWindowForDate(localConfig, reservationForm.date));
  const publicCapacity = getPublicCapacity(localConfig, floorTables);

  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      setIsTimePopupOpen(false);
      setPendingReservation(null);
      setCreatedReservationSummary(null);
      setIsOrderPopupOpen(false);
    }

    if (isTimePopupOpen || pendingReservation || createdReservationSummary || isOrderPopupOpen) {
      window.addEventListener("keydown", handleEscapeKey);
    }

    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [isTimePopupOpen, pendingReservation, createdReservationSummary, isOrderPopupOpen]);

  function updateReservationForm<K extends keyof PublicReservationForm>(
    key: K,
    value: PublicReservationForm[K]
  ) {
    setReservationError("");
    setReservationForm((current) => {
      if (key === "date") {
        const nextDate = String(value);
        setIsTimePopupOpen(false);

        return {
          ...current,
          date: nextDate,
          time: "",
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  function handlePublicReservationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = reservationForm.client.trim();
    const phone = normalizePublicPhone(reservationForm.phone);
    const email = reservationForm.email.trim();
    const people = Math.max(Number(reservationForm.people) || 1, 1);

    if (!localConfig.reservationEnabled) {
      setReservationError("El local no está aceptando reservas online en este momento.");
      return;
    }

    if (!client) {
      setReservationError("Ingresá tu nombre para reservar.");
      return;
    }

    if (phone.length < 8) {
      setReservationError("Ingresá un teléfono válido.");
      return;
    }

    if (!reservationForm.date || !isSelectedDateOpen) {
      setReservationError("Elegí una fecha disponible.");
      return;
    }

    if (!reservationForm.time || !publicAvailableTimeSlots.includes(reservationForm.time)) {
      setReservationError("Elegí un horario disponible.");
      return;
    }

    if (people > selectedSlotAvailablePeople) {
      setReservationError(
        `Para ese horario quedan ${selectedSlotAvailablePeople} lugares disponibles.`
      );
      return;
    }

    const duplicatedPhone = reservations.some(
      (reservation) =>
        reservation.date === reservationForm.date &&
        isActivePublicReservation(reservation) &&
        normalizePublicPhone(reservation.phone) === phone
    );

    if (duplicatedPhone) {
      setReservationError("Ya existe una reserva activa con ese teléfono para ese día.");
      return;
    }

    setPendingReservation({
      ...reservationForm,
      client,
      phone: reservationForm.phone.trim(),
      email,
      people,
      normalizedPhone: phone,
      note: reservationForm.note.trim(),
    });
    setReservationError("");
  }

  function readLivePublicConfig() {
    return normalizePublicConfig(
      readLocalStorageValue<Partial<PublicLocalConfigState>>(
        LOCAL_CONFIG_STORAGE_KEY,
        DEFAULT_PUBLIC_LOCAL_CONFIG
      )
    );
  }

  function readLivePublicReservations() {
    return readLocalStorageValue<PublicReservationDraft[]>(
      RESERVATIONS_STORAGE_KEY,
      []
    ).map((reservation) => normalizePublicReservation(reservation));
  }

  function readLivePublicFloorTables() {
    const storedTables = readLocalStorageValue<PublicFloorTable[]>(
      FLOOR_TABLES_STORAGE_KEY,
      DEFAULT_PUBLIC_FLOOR_TABLES
    );

    const normalizedTables = storedTables
      .map((table) => ({
        ...table,
        name: table.name?.trim() || "Mesa",
        capacity: Math.max(Number(table.capacity) || 0, 0),
        status: table.status ?? "available",
        locked: Boolean(table.locked),
      }))
      .filter((table) => table.name && table.capacity > 0);

    return normalizedTables.length > 0 ? normalizedTables : DEFAULT_PUBLIC_FLOOR_TABLES;
  }

  function confirmPublicReservation() {
    if (!pendingReservation) return;

    const configForReservation = readLivePublicConfig();
    const reservationsForReservation = readLivePublicReservations();
    const tablesForReservation = readLivePublicFloorTables();
    const reservationId = `web-${Date.now()}`;

    const baseReservation: PublicReservationDraft = normalizePublicReservation({
      id: reservationId,
      reservationCode: createPublicCode("RES", reservationId),
      date: pendingReservation.date,
      time: pendingReservation.time,
      client: pendingReservation.client,
      people: pendingReservation.people,
      phone: pendingReservation.phone,
      email: pendingReservation.email,
      note: pendingReservation.note || "Reserva creada desde la web pública.",
      status: configForReservation.defaultReservationStatus,
      durationMinutes: configForReservation.standardDurationMinutes,
      tableName: "",
      origin: "web",
    });

    const shouldAutoAssignTable =
      configForReservation.autoAssignReservationTables !== false ||
      configForReservation.allowReservationsWithoutTable === false;

    let assignedTableName = shouldAutoAssignTable
      ? getBestAvailablePublicTableForReservation(
          baseReservation,
          reservationsForReservation,
          tablesForReservation,
          configForReservation
        )
      : "";

    if (!assignedTableName && shouldAutoAssignTable) {
      assignedTableName = getBestAvailablePublicTableForReservation(
        baseReservation,
        reservationsForReservation,
        DEFAULT_PUBLIC_FLOOR_TABLES,
        {
          ...configForReservation,
          allowTableCombinations: true,
        }
      );
    }

    const nextReservation: PublicReservationDraft = {
      ...baseReservation,
      tableName: assignedTableName,
    };

    const nextReservations = [...reservationsForReservation, nextReservation];

    window.localStorage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(nextReservations));
    window.dispatchEvent(new CustomEvent(RESERVATIONS_EVENT));

    setLocalConfig(configForReservation);
    setFloorTables(tablesForReservation);
    setReservations(nextReservations);
    setCreatedReservationSummary({
      client: nextReservation.client,
      reservationCode: getPublicReservationCode(nextReservation),
      date: nextReservation.date,
      time: nextReservation.time,
      people: nextReservation.people,
      phone: nextReservation.phone,
      status: nextReservation.status,
    });
    setPendingReservation(null);
    setReservationError("");
    setReservationForm((current) => ({
      ...current,
      client: "",
      phone: "",
      email: "",
      people: 2,
      time: "",
      note: "",
    }));
  }

  function updateOrderQuantity(itemId: string, delta: number) {
    const targetItem = publicOrderItems.find((item) => item.id === itemId);

    if (!targetItem?.orderable && delta > 0) {
      setOrderError("Ese producto no está disponible por stock.");
      return;
    }

    setOrderError("");
    setOrderQuantities((current) => {
      const nextQuantity = Math.max((current[itemId] ?? 0) + delta, 0);
      const nextQuantities = {
        ...current,
        [itemId]: nextQuantity,
      };

      if (nextQuantity === 0) {
        delete nextQuantities[itemId];
      }

      return nextQuantities;
    });
  }

  function updateOrderForm<K extends keyof PublicOrderForm>(key: K, value: PublicOrderForm[K]) {
    setOrderError("");
    setOrderForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetPublicOrder() {
    setOrderQuantities({});
    setOrderForm(DEFAULT_PUBLIC_ORDER_FORM);
    setOrderError("");
    setActiveOrderCategory(realMenuCategories[0]?.name ?? "Todos");
  }

  async function handlePublicOrderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = orderForm.client.trim();
    const phone = normalizePublicPhone(orderForm.phone);
    const address = orderForm.address.trim();

    if (selectedOrderItems.length === 0) {
      setOrderError("Agregá al menos un producto al pedido.");
      return;
    }

    if (!client) {
      setOrderError("Ingresá tu nombre para enviar el pedido.");
      return;
    }

    if (phone.length < 8) {
      setOrderError("Ingresá un teléfono válido.");
      return;
    }

    if (orderForm.deliveryType === "delivery" && !address) {
      setOrderError("Ingresá la dirección de entrega.");
      return;
    }

    if (isSupabasePersistence) {
      const requestKey =
        orderRequestKeyRef.current
        ?? `web:${crypto.randomUUID()}`;

      orderRequestKeyRef.current =
        requestKey;
      setIsOrderSubmitting(true);
      setOrderError("");

      try {
        const response =
          await fetch(
            `/api/public/${encodeURIComponent(publicSlug)}/shipping`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                client,
                phone:
                  orderForm.phone.trim(),
                deliveryType:
                  orderForm.deliveryType,
                address:
                  orderForm.deliveryType === "pickup"
                    ? ""
                    : address,
                payment:
                  orderForm.payment,
                note:
                  orderForm.note.trim(),
                requestKey,
                items:
                  selectedOrderItems.map(
                    (item) => ({
                      menuItemId:
                        item.id,
                      quantity:
                        item.quantity,
                    }),
                  ),
              }),
            },
          );

        const payload =
          await response.json() as {
            order?: PublicShippingCreateResult;
            error?: string;
          };

        if (!response.ok || !payload.order) {
          setOrderError(
            payload.error
            ?? "No se pudo crear el pedido.",
          );
          return;
        }

        const createdOrder =
          payload.order;
        const trackingUrl =
          `${window.location.origin}/${encodeURIComponent(publicSlug)}/pedido/${encodeURIComponent(createdOrder.trackingId)}`;
        const whatsappNumber =
          publicWebConfig.whatsapp.replace(
            /\D/g,
            "",
          );
        const orderLines =
          createdOrder.items.map(
            (item) =>
              `• ${item.quantity}x ${item.name} — ${formatCurrency(item.price * item.quantity)}`,
          );
        const message = [
          `Hola ${publicWebConfig.businessName}, envié este pedido desde la web:`,
          "",
          ...orderLines,
          "",
          `Total: ${formatCurrency(createdOrder.total)}`,
          `Tipo: ${createdOrder.deliveryType === "delivery" ? "Delivery" : "Retiro"}`,
          `Código: ${createdOrder.trackingId}`,
          "",
          "El pedido quedó pendiente de aceptación.",
          "Seguimiento:",
          trackingUrl,
        ].join("\n");

        if (whatsappNumber) {
          window.open(
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
            "_blank",
            "noopener,noreferrer",
          );
        }

        orderRequestKeyRef.current =
          null;
        setIsOrderPopupOpen(false);
        resetPublicOrder();
        window.location.assign(
          trackingUrl,
        );
      } catch {
        setOrderError(
          "No se pudo crear el pedido. Podés reintentar sin duplicarlo.",
        );
      } finally {
        setIsOrderSubmitting(false);
      }

      return;
    }

    const deliveryOrderItems: PublicDeliveryOrderItem[] = selectedOrderItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));
    const publicDelivery: PublicDeliveryRecord = {
      id: createPublicDeliveryId(),
      date: getTodayDateKey(),
      time: getTodayTimeKey(),
      client,
      phone: orderForm.phone.trim(),
      address: orderForm.deliveryType === "pickup" ? "Retira en local" : address,
      deliveryType: orderForm.deliveryType,
      order: summarizePublicOrderItems(deliveryOrderItems),
      orderItems: deliveryOrderItems,
      total: orderTotal,
      payment: orderForm.payment,
      note: orderForm.note.trim() || "Pedido creado desde la web pública. Pendiente de aceptación por WhatsApp.",
      status: "confirmed",
      source: "web",
      needsAcceptance: true,
    };

    writePublicDeliveries([publicDelivery, ...readPublicDeliveries()]);

    const whatsappNumber = publicWebConfig.whatsapp.replace(/\D/g, "");
    const orderLines = selectedOrderItems.map(
      (item) => `• ${item.quantity}x ${item.name} — ${formatCurrency(item.price * item.quantity)}`
    );

    const message = [
      `Hola ${publicWebConfig.businessName}, quiero hacer este pedido:`,
      "",
      ...orderLines,
      "",
      `Total estimado: ${formatCurrency(orderTotal)}`,
      `Tipo: ${orderForm.deliveryType === "delivery" ? "Delivery" : "Retiro"}`,
      orderForm.deliveryType === "delivery" ? `Dirección: ${address}` : "Retira en local",
      `Pago: ${orderForm.payment}`,
      `Cliente: ${client}`,
      `Teléfono: ${orderForm.phone.trim()}`,
      orderForm.note.trim() ? `Nota: ${orderForm.note.trim()}` : "",
      "",
      "¿Me confirmás si está disponible y el tiempo estimado?",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );

    setIsOrderPopupOpen(false);
    resetPublicOrder();
  }

  const publicContactHours = useMemo(
    () => formatPublicBusinessHoursForContact(localConfig),
    [localConfig]
  );

  const publicMapQuery = `${publicWebConfig.businessName} ${publicWebConfig.address}`;

  return (
    <main className="min-h-screen bg-[#15110d] text-[#f4ead8]">
        {pendingReservation ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/74 px-4 backdrop-blur-sm"
            onClick={() => setPendingReservation(null)}
          >
            <div
              className="w-full max-w-xl rounded-[2rem] border border-[#c9a86a]/28 bg-[#15110d] p-6 text-[#fff2dd] shadow-2xl shadow-black/50"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#c9a86a]/18 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c9a86a]">
                    Confirmar reserva
                  </p>
                  <h3 className="demuru-serif mt-2 text-3xl text-[#fff2dd]">
                    Revisá los datos
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingReservation(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c9a86a]/24 bg-black/20 text-[#f4ead8] transition hover:border-[#d88757] hover:text-white"
                  aria-label="Cerrar confirmación de reserva"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 space-y-3 rounded-2xl border border-[#c9a86a]/18 bg-black/20 p-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#f4ead8]/55">Nombre</span>
                  <strong>{pendingReservation.client}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#f4ead8]/55">Fecha</span>
                  <strong>{formatPublicDate(pendingReservation.date)}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#f4ead8]/55">Horario</span>
                  <strong>{pendingReservation.time}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#f4ead8]/55">Personas</span>
                  <strong>{pendingReservation.people}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#f4ead8]/55">Teléfono</span>
                  <strong>{pendingReservation.phone}</strong>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-[#f4ead8]/62">
                La reserva quedará registrada en el panel del local para que el equipo pueda
                confirmarla.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPendingReservation(null)}
                  className="h-12 rounded-xl border border-[#c9a86a]/24 bg-black/20 text-sm font-black uppercase tracking-[0.12em] text-[#fff2dd] transition hover:border-[#d88757]"
                >
                  Revisar datos
                </button>
                <button
                  type="button"
                  onClick={confirmPublicReservation}
                  className="h-12 rounded-xl bg-[#c97048] text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#db8257]"
                >
                  Confirmar reserva
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {createdReservationSummary ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/74 px-4 backdrop-blur-sm"
            onClick={() => setCreatedReservationSummary(null)}
          >
            <div
              className="w-full max-w-xl rounded-[2rem] border border-emerald-400/28 bg-[#11160f] p-6 text-emerald-50 shadow-2xl shadow-black/50"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-emerald-300/18 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
                    Reserva enviada
                  </p>
                  <h3 className="demuru-serif mt-2 text-3xl text-white">
                    Recibimos tu solicitud
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatedReservationSummary(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-300/24 bg-black/20 text-emerald-50 transition hover:border-emerald-200"
                  aria-label="Cerrar reserva enviada"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 space-y-3 rounded-2xl border border-emerald-300/18 bg-black/20 p-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-emerald-50/55">Nombre</span>
                  <strong>{createdReservationSummary.client}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-emerald-50/55">Fecha</span>
                  <strong>{formatPublicDate(createdReservationSummary.date)}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-emerald-50/55">Horario</span>
                  <strong>{createdReservationSummary.time}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-emerald-50/55">Personas</span>
                  <strong>{createdReservationSummary.people}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-emerald-50/55">Estado</span>
                  <strong>
                    {createdReservationSummary.status === "confirmed"
                      ? "Confirmada"
                      : "Pendiente de confirmación"}
                  </strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-emerald-50/55">Código</span>
                  <strong>{createdReservationSummary.reservationCode}</strong>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-emerald-50/68">
                Te contactaremos por WhatsApp si necesitamos confirmar algún dato.
              </p>

              <a
                href={`/demuru/reserva/${createdReservationSummary.reservationCode}`}
                className="mt-4 flex min-h-12 items-center justify-center rounded-xl border border-emerald-300/24 bg-emerald-300/10 px-4 text-center text-sm font-black uppercase tracking-[0.12em] text-emerald-50 transition hover:bg-emerald-300/18"
              >
                Ver estado de la reserva
              </a>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a
                  href={`https://wa.me/${publicWebConfig.whatsapp.replace(/\\D/g, "")}`}
                  className="flex h-12 items-center justify-center rounded-xl border border-emerald-300/24 bg-emerald-300/10 text-sm font-black uppercase tracking-[0.12em] text-emerald-50 transition hover:bg-emerald-300/18"
                >
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setCreatedReservationSummary(null)}
                  className="h-12 rounded-xl bg-[#c97048] text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#db8257]"
                >
                  Hacer otra reserva
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isOrderPopupOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/74 px-4 backdrop-blur-sm"
            onClick={() => setIsOrderPopupOpen(false)}
          >
            <form
              onSubmit={handlePublicOrderSubmit}
              className="grid h-[88vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[#c9a86a]/28 bg-[#15110d] text-[#fff2dd] shadow-2xl shadow-black/50 lg:grid-cols-[1.25fr_0.75fr]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex min-h-0 min-w-0 flex-col border-b border-[#c9a86a]/18 lg:border-b-0 lg:border-r">
                <div className="flex items-start justify-between gap-4 border-b border-[#c9a86a]/18 p-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c9a86a]">
                      Pedido online
                    </p>
                    <h3 className="demuru-serif mt-2 text-3xl text-[#fff2dd]">
                      Pedí por WhatsApp
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#f4ead8]/62">
                      Armá tu pedido y lo enviamos por WhatsApp para que el local confirme stock,
                      preparación y tiempo estimado.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOrderPopupOpen(false)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c9a86a]/24 bg-black/20 text-[#f4ead8] transition hover:border-[#d88757] hover:text-white"
                    aria-label="Cerrar pedido"
                  >
                    ×
                  </button>
                </div>

                <div className="border-b border-[#c9a86a]/18 px-6 py-4">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {orderCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setActiveOrderCategory(category)}
                        className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                          resolvedActiveOrderCategory === category
                            ? "border-[#d88757] bg-[#c97048] text-white"
                            : "border-[#c9a86a]/20 bg-black/20 text-[#f4ead8]/70 hover:border-[#d88757]"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  {filteredOrderItems.length === 0 ? (
                    <div className="rounded-2xl border border-[#c9a86a]/18 bg-black/18 p-6 text-sm text-[#f4ead8]/58">
                      No hay productos disponibles en esta categoría. Revisá visibilidad, estado, promociones o stock en /local/menu.
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredOrderItems.map((item) => {
                      const quantity = orderQuantities[item.id] ?? 0;

                      return (
                        <article
                          key={item.id}
                          className="grid grid-cols-[96px_1fr] overflow-hidden rounded-2xl border border-[#c9a86a]/18 bg-black/18"
                        >
                          <div className="relative h-full min-h-[132px] w-24 shrink-0 overflow-hidden">
                            <Image
                              src={item.imageUrl || content.imageValues[item.imageSlot] || activeTemplate.previewImage}
                              alt={item.name}
                              fill
                              sizes="96px"
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#c9a86a]">
                                    {item.category}
                                  </p>
                                  {item.stockStatus !== "available" ? (
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                                        item.stockStatus === "out_of_stock"
                                          ? "border-red-400/35 bg-red-500/12 text-red-100"
                                          : "border-amber-300/35 bg-amber-400/12 text-amber-100"
                                      }`}
                                    >
                                      {item.stockLabel}
                                    </span>
                                  ) : null}
                                </div>
                                <h4 className="demuru-serif mt-1 text-lg font-bold text-[#fff2dd]">
                                  {item.name}
                                </h4>
                              </div>
                              <p className="shrink-0 text-sm font-black text-[#d77f52]">
                                {formatCurrency(item.price)}
                              </p>
                            </div>

                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#f4ead8]/58">
                              {item.description}
                            </p>

                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex items-center overflow-hidden rounded-full border border-[#c9a86a]/24 bg-black/24">
                                <button
                                  type="button"
                                  onClick={() => updateOrderQuantity(item.id, -1)}
                                  className="h-9 w-9 text-lg font-black text-[#f4ead8]/80 transition hover:bg-white/8"
                                >
                                  −
                                </button>
                                <span className="flex h-9 min-w-10 items-center justify-center text-sm font-black text-white">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateOrderQuantity(item.id, 1)}
                                  disabled={!item.orderable}
                                  className="h-9 w-9 text-lg font-black text-[#f4ead8]/80 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  +
                                </button>
                              </div>

                              {quantity > 0 ? (
                                <p className="text-xs font-black uppercase tracking-[0.08em] text-[#c9a86a]">
                                  {formatCurrency(item.price * quantity)}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>

              <aside className="flex min-h-0 min-w-0 flex-col">
                <div className="border-b border-[#c9a86a]/18 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c9a86a]">
                    Resumen
                  </p>
                  <h4 className="demuru-serif mt-2 text-2xl text-[#fff2dd]">
                    Tu pedido
                  </h4>

                  <div className="mt-5 max-h-[190px] space-y-3 overflow-y-auto pr-1">
                    {selectedOrderItems.length > 0 ? (
                      selectedOrderItems.map((item) => (
                        <div key={item.id} className="flex justify-between gap-4 text-sm">
                          <span className="text-[#f4ead8]/68">
                            {item.quantity}x {item.name}
                          </span>
                          <strong className="text-[#fff2dd]">
                            {formatCurrency(item.price * item.quantity)}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-[#c9a86a]/14 bg-black/18 p-4 text-sm text-[#f4ead8]/50">
                        Todavía no agregaste productos.
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#c9a86a]/18 pt-5">
                    <span className="text-sm font-black uppercase tracking-[0.12em] text-[#f4ead8]/62">
                      Total estimado
                    </span>
                    <strong className="text-2xl text-[#c9a86a]">
                      {formatCurrency(orderTotal)}
                    </strong>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  <div className="grid gap-4">
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                        Nombre
                      </span>
                      <input
                        value={orderForm.client}
                        onChange={(event) => updateOrderForm("client", event.target.value)}
                        placeholder="Tu nombre"
                        className="mt-2 h-12 w-full rounded-xl border border-[#c9a86a]/24 bg-black/24 px-4 text-sm text-[#fff2dd] outline-none placeholder:text-[#f4ead8]/35 focus:border-[#d88757]"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                        Teléfono
                      </span>
                      <input
                        value={orderForm.phone}
                        onChange={(event) => updateOrderForm("phone", event.target.value)}
                        placeholder="11 2345 6789"
                        className="mt-2 h-12 w-full rounded-xl border border-[#c9a86a]/24 bg-black/24 px-4 text-sm text-[#fff2dd] outline-none placeholder:text-[#f4ead8]/35 focus:border-[#d88757]"
                      />
                    </label>

                    <div>
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                        Tipo
                      </span>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[
                          { id: "delivery", label: "Delivery" },
                          { id: "pickup", label: "Retiro" },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              updateOrderForm("deliveryType", item.id as PublicOrderDeliveryType)
                            }
                            className={`h-11 rounded-xl border text-sm font-black uppercase tracking-[0.12em] transition ${
                              orderForm.deliveryType === item.id
                                ? "border-[#d88757] bg-[#c97048] text-white"
                                : "border-[#c9a86a]/24 bg-black/20 text-[#f4ead8]/62 hover:border-[#d88757]"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {orderForm.deliveryType === "delivery" ? (
                      <label className="block">
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                          Dirección
                        </span>
                        <input
                          value={orderForm.address}
                          onChange={(event) => updateOrderForm("address", event.target.value)}
                          placeholder="Dirección de entrega"
                          className="mt-2 h-12 w-full rounded-xl border border-[#c9a86a]/24 bg-black/24 px-4 text-sm text-[#fff2dd] outline-none placeholder:text-[#f4ead8]/35 focus:border-[#d88757]"
                        />
                      </label>
                    ) : null}

                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                        Pago
                      </span>
                      <select
                        value={orderForm.payment}
                        onChange={(event) => updateOrderForm("payment", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#c9a86a]/24 bg-black/24 px-4 text-sm text-[#fff2dd] outline-none focus:border-[#d88757]"
                      >
                        <option className="bg-[#15110d] text-[#fff2dd]">Efectivo</option>
                        <option className="bg-[#15110d] text-[#fff2dd]">Transferencia</option>
                        <option className="bg-[#15110d] text-[#fff2dd]">Mercado Pago</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                        Nota opcional
                      </span>
                      <textarea
                        value={orderForm.note}
                        onChange={(event) => updateOrderForm("note", event.target.value)}
                        placeholder="Comentarios, piso, referencia o aclaraciones."
                        className="mt-2 min-h-[82px] w-full resize-none rounded-xl border border-[#c9a86a]/24 bg-black/24 px-4 py-3 text-sm text-[#fff2dd] outline-none placeholder:text-[#f4ead8]/35 focus:border-[#d88757]"
                      />
                    </label>

                    {orderError ? (
                      <div className="rounded-2xl border border-red-400/35 bg-red-500/12 p-4 text-sm font-bold text-red-100">
                        {orderError}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-[#c9a86a]/18 p-6">
                  <button
                    type="submit"
                    disabled={isOrderSubmitting}
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#c97048] text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#db8257] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <MessageCircle size={18} />
                    {isOrderSubmitting ? "Enviando…" : "Enviar por WhatsApp"}
                  </button>
                  <p className="mt-3 text-center text-xs leading-5 text-[#f4ead8]/45">
                    El pedido queda guardado en Envíos como pendiente de aceptación y también se envía por WhatsApp.
                  </p>
                </div>
              </aside>
            </form>
          </div>
        ) : null}

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        .demuru-serif {
          font-family: Georgia, "Times New Roman", serif;
        }

        .demuru-bg {
          background:
            radial-gradient(circle at 50% 0%, rgba(185, 112, 62, 0.18), transparent 32%),
            radial-gradient(circle at 15% 50%, rgba(155, 96, 46, 0.12), transparent 24%),
            linear-gradient(180deg, #14100d 0%, #211a14 45%, #120f0c 100%);
        }

        .demuru-card {
          background: linear-gradient(180deg, rgba(36, 31, 25, 0.92), rgba(20, 17, 13, 0.94));
          box-shadow: inset 0 0 0 1px rgba(207, 160, 111, 0.2), 0 18px 70px rgba(0, 0, 0, 0.32);
        }

        .demuru-border {
          border-color: rgba(201, 168, 106, 0.28);
        }

        html {
          scrollbar-width: thin;
          scrollbar-color: #c97048 #120d09;
        }

        body::-webkit-scrollbar,
        .demuru-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        body::-webkit-scrollbar-track,
        .demuru-scrollbar::-webkit-scrollbar-track {
          background: #120d09;
          border-radius: 999px;
        }

        body::-webkit-scrollbar-thumb,
        .demuru-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #d88757, #8f5436);
          border: 2px solid #120d09;
          border-radius: 999px;
        }

        body::-webkit-scrollbar-thumb:hover,
        .demuru-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #f09b67, #c97048);
        }

        body::-webkit-scrollbar-corner,
        .demuru-scrollbar::-webkit-scrollbar-corner {
          background: #120d09;
        }

        .demuru-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #c97048 #120d09;
        }
      `}</style>

      {content.visibleSections.hero ? (
        <section id="inicio" className="relative min-h-[760px] overflow-hidden bg-[#110e0b]">
          {isTemplateHydrated ? (
            <Image
              src={content.imageValues.hero ?? activeTemplate.previewImage}
              alt={publicWebConfig.heroTitle || content.textValues.heroTitle}
              fill
              priority
              sizes="100vw"
              unoptimized
              className="object-cover opacity-70"
            />
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_34%,rgba(0,0,0,0.12),transparent_24%),linear-gradient(90deg,rgba(13,10,8,0.98),rgba(13,10,8,0.82)_35%,rgba(13,10,8,0.22)_72%,rgba(13,10,8,0.72))]" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#15110d] to-transparent" />

          <header className="relative z-20 border-b border-white/10 bg-black/42 backdrop-blur-md">
            <div className="mx-auto flex max-w-none items-center justify-between px-8 py-5 xl:px-16">
              <a href="#inicio" className="leading-none">
                <p className="demuru-serif text-4xl font-bold uppercase tracking-[0.12em] text-[#c9784a]">
                  {publicWebConfig.businessName}
                </p>
                <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-[0.36em] text-[#d6b489]">
                  Cocina de autor
                </p>
              </a>

              <nav className="hidden items-center gap-9 text-xs font-black uppercase tracking-[0.12em] text-[#f7ead7]/82 lg:flex">
                <a href="#inicio" className="hover:text-[#d88757]">Inicio</a>
                {publicWebConfig.showMenu ? <a href="#menu" className="hover:text-[#d88757]">Menú</a> : null}
                <a href="#nosotros" className="hover:text-[#d88757]">Nosotros</a>
                {publicWebConfig.showGallery ? <a href="#galeria" className="hover:text-[#d88757]">Galería</a> : null}
                {publicWebConfig.showReservations ? <a href="#reservas" className="hover:text-[#d88757]">Eventos</a> : null}
                <a href="#contacto" className="hover:text-[#d88757]">Contacto</a>
              </nav>

              <div className="hidden items-center gap-3 md:flex">
                {publicWebConfig.showReservations ? (
                  <a
                    href="#reservas"
                    className="inline-flex h-11 items-center justify-center rounded border border-[#b96f47] px-8 text-xs font-black uppercase tracking-[0.14em] text-[#e8b085] transition hover:bg-[#b96f47]/15"
                  >
                    Reservar
                  </a>
                ) : null}
                {publicWebConfig.showDelivery ? (
                  <button
                    type="button"
                    onClick={() => setIsOrderPopupOpen(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded bg-[#c97048] px-8 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-black/30 transition hover:bg-[#db8257]"
                  >
                    Pedir ahora
                    <Bike size={18} />
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          <div className="relative z-10 mx-auto grid max-w-none px-8 pb-10 pt-20 xl:px-16">
            <div className="max-w-[620px]">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#d79a6c]">
                {publicWebConfig.heroEyebrow || content.textValues.heroEyebrow}
              </p>
              <h1 className="demuru-serif mt-5 text-[58px] font-normal leading-[0.98] tracking-[-0.035em] text-[#fff2dd] md:text-[76px]">
                {publicWebConfig.heroTitle || content.textValues.heroTitle}
              </h1>

              <div className="mt-6 flex max-w-sm items-center gap-3 text-[#9fa875]">
                <span className="h-px flex-1 bg-[#9c7656]" />
                <Leaf size={20} />
                <span className="h-px flex-1 bg-[#9c7656]" />
              </div>

              <p className="mt-6 max-w-[470px] text-lg leading-8 text-[#f4ead8]/82">
                {publicWebConfig.heroSubtitle || content.textValues.heroSubtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                {publicWebConfig.showReservations ? (
                  <a
                    href="#reservas"
                    className="inline-flex h-12 items-center gap-3 rounded bg-[#c97048] px-8 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#db8257]"
                  >
                    <CalendarDays size={18} />
                    {publicWebConfig.primaryButtonLabel || content.textValues.primaryButton}
                  </a>
                ) : null}
                {publicWebConfig.showMenu ? (
                  <a
                    href="#menu"
                    className="inline-flex h-12 items-center gap-3 rounded border border-[#a96a4b] bg-black/25 px-8 text-sm font-black uppercase tracking-[0.12em] text-[#f7ead7] transition hover:bg-white/8"
                  >
                    <Utensils size={18} />
                    Ver menú
                  </a>
                ) : null}
              </div>
            </div>

            <div className="demuru-card demuru-border mt-10 grid overflow-hidden rounded-2xl border backdrop-blur-md md:grid-cols-4">
              {[
                publicWebConfig.showReservations
                  ? {
                      icon: CalendarDays,
                      title: "Reservas online",
                      text: "Reservá tu mesa fácil y rápido en segundos.",
                    }
                  : null,
                publicWebConfig.showDelivery
                  ? {
                      icon: Bike,
                      title: "Delivery & retiro",
                      text: "Pedí por delivery o retiro y disfrutá donde estés.",
                    }
                  : null,
                publicWebConfig.showMenu
                  ? {
                      icon: Leaf,
                      title: "Menú actualizado",
                      text: "Platos de estación con ingredientes frescos.",
                    }
                  : null,
                {
                  icon: Clock,
                  title: "Abierto hoy",
                  text: "Lun a Dom · 12:00 — 00:00 hs",
                },
              ].filter((item) => item !== null).map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-4 border-b border-[#c9a86a]/16 p-6 md:border-b-0 md:border-r last:md:border-r-0"
                  >
                    <Icon className="mt-1 text-[#c9a86a]" size={30} />
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#fff5e6]">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-5 text-[#f4ead8]/62">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <div className="demuru-bg">
        {content.visibleSections.menu && publicWebConfig.showMenu ? (
          <section id="menu" className="mx-auto max-w-none px-8 py-10 xl:px-16">
            <SectionTitle title={content.textValues.menuTitle} />

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {publicFeaturedMenuItems.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-xl border demuru-border bg-[#161410]/88 shadow-2xl shadow-black/30 transition hover:-translate-y-1 hover:border-[#c97048]/70"
                >
                  <div className="relative h-44 w-full overflow-hidden">
                    <Image
                      src={item.imageUrl || content.imageValues[item.imageSlot] || activeTemplate.previewImage}
                      alt={item.name}
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="p-5 text-center">
                    <h3 className="demuru-serif text-xl font-bold text-[#fff2dd]">
                      {item.name}
                    </h3>
                    <p className="mx-auto mt-2 line-clamp-3 max-w-[230px] text-sm leading-6 text-[#f4ead8]/66">
                      {item.description}
                    </p>
                    <p className="mt-4 text-lg font-black uppercase tracking-[0.08em] text-[#d77f52]">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="pt-16">
              <SectionTitle title="Explorá nuestro menú" />
            </div>

            <div className="mt-9 grid gap-5 md:grid-cols-3 xl:grid-cols-5">
              {publicMenuCategoryCards.map((category) => {
                const Icon = category.icon;

                return (
                  <button
                    key={category.title}
                    type="button"
                    onClick={() => setExpandedCategory(category.title)}
                    className={`group rounded-xl border p-7 text-center transition hover:-translate-y-1 hover:bg-[#211a14] ${
                      resolvedExpandedCategory === category.title
                        ? "border-[#c97048] bg-[#211a14]"
                        : "demuru-border bg-[#151410]/82"
                    }`}
                  >
                    <Icon className="mx-auto text-[#9fa875] transition group-hover:text-[#c9a86a]" size={42} />
                    <h3 className="mt-5 text-lg font-black uppercase tracking-[0.08em] text-[#fff2dd]">
                      {category.title}
                    </h3>
                    <p className="mt-2 text-sm leading-5 text-[#f4ead8]/62">
                      {category.description}
                    </p>
                    <p className="mt-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-[#b7c58a]">
                      Ver opciones <ChevronRight size={15} />
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="mt-8 overflow-hidden rounded-2xl border demuru-border bg-[#151410]/78 p-5">
              <div className="flex items-end justify-center gap-4 text-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c9a86a]">
                    {resolvedExpandedCategory}
                  </p>
                  <h3 className="demuru-serif mt-1 text-2xl text-[#fff2dd]">
                    Platos de la categoría
                  </h3>
                </div>
              </div>

              <div
                className={`demuru-scrollbar mt-5 flex gap-4 overflow-x-auto pb-2 ${
                  shouldCenterActiveCategoryItems ? "justify-center" : "justify-start"
                }`}
              >
                {publicActiveCategoryItems.map((item) => (
                  <article
                    key={item.id}
                    className="w-[260px] min-w-[260px] shrink-0 overflow-hidden rounded-xl border demuru-border bg-[#0f0d0a]"
                  >
                    <div className="relative h-36 w-full overflow-hidden">
                      <Image
                        src={item.imageUrl || content.imageValues[item.imageSlot] || activeTemplate.previewImage}
                        alt={item.name}
                        fill
                        sizes="260px"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h4 className="demuru-serif text-lg font-bold text-[#fff2dd]">
                        {item.name}
                      </h4>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#f4ead8]/60">
                        {item.description}
                      </p>
                      <p className="mt-3 text-sm font-black uppercase tracking-[0.08em] text-[#d77f52]">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {content.visibleSections.gallery && publicWebConfig.showGallery ? (
          <section id="galeria" className="mx-auto max-w-none px-8 py-8 xl:px-16">
            <SectionTitle title="Nuestro espacio" />

            <div className="mt-9 grid gap-5 md:grid-cols-3 xl:grid-cols-6">
              {galleryImages.map((image) => (
                <div
                  key={image.id}
                  className="group relative h-56 overflow-hidden rounded-xl border demuru-border bg-black"
                >
                  <Image
                    src={content.imageValues[image.id] || activeTemplate.previewImage}
                    alt={image.label}
                    fill
                    sizes="(min-width: 1280px) 16vw, (min-width: 768px) 33vw, 100vw"
                    unoptimized
                    className="object-cover opacity-84 transition duration-500 group-hover:scale-105"
                  />

                </div>
              ))}
            </div>

            <div className="mt-7 text-center">
              <a
                href="#galeria"
                className="inline-flex rounded border border-[#a96a4b] px-8 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#d79a6c] transition hover:bg-[#a96a4b]/14"
              >
                Ver más fotos
              </a>
            </div>
          </section>
        ) : null}

        {publicWebConfig.showReservations ? (
          <section id="reservas" className="mt-4 border-y border-[#c9a86a]/16 bg-[#3a3027]/72">
          <div className="mx-auto grid max-w-none gap-8 px-8 py-12 xl:grid-cols-[0.9fr_1.1fr] xl:px-16">
            <div className="flex items-start gap-8">
              <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-full border border-[#c9a86a]/30 bg-white/8 text-[#e3c18c] md:flex">
                <CalendarDays size={52} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-[#c9a86a]">
                  Reservas online
                </p>
                <h2 className="demuru-serif mt-3 text-5xl leading-tight text-[#fff2dd]">
                  Reservá tu mesa
                </h2>
                <p className="mt-4 max-w-xl text-base leading-8 text-[#f4ead8]/68">
                  Elegí fecha, horario y cantidad de personas. El sistema valida disponibilidad
                  según horarios configurados, horarios partidos, reservas activas y capacidad real del plano.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#c9a86a]/20 bg-black/18 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#c9a86a]">
                      Ventana
                    </p>
                    <p className="mt-1 text-lg font-black text-[#fff2dd]">
                      {localConfig.bookingWindowDays} días
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#c9a86a]/20 bg-black/18 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#c9a86a]">
                      Duración
                    </p>
                    <p className="mt-1 text-lg font-black text-[#fff2dd]">
                      {localConfig.standardDurationMinutes} min
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#c9a86a]/20 bg-black/18 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#c9a86a]">
                      Capacidad
                    </p>
                    <p className="mt-1 text-lg font-black text-[#fff2dd]">
                      {publicCapacity} personas
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form
              onSubmit={handlePublicReservationSubmit}
              className="rounded-[2rem] border border-[#c9a86a]/24 bg-[#15110d]/86 p-6 shadow-2xl shadow-black/30 backdrop-blur"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                    Nombre
                  </span>
                  <input
                    value={reservationForm.client}
                    onChange={(event) => updateReservationForm("client", event.target.value)}
                    placeholder="Tu nombre"
                    className="mt-2 h-12 w-full rounded-xl border border-[#c9a86a]/24 bg-black/24 px-4 text-sm text-[#fff2dd] outline-none placeholder:text-[#f4ead8]/35 focus:border-[#d88757]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                    Teléfono
                  </span>
                  <input
                    value={reservationForm.phone}
                    onChange={(event) => updateReservationForm("phone", event.target.value)}
                    placeholder="11 2345 6789"
                    className="mt-2 h-12 w-full rounded-xl border border-[#c9a86a]/24 bg-black/24 px-4 text-sm text-[#fff2dd] outline-none placeholder:text-[#f4ead8]/35 focus:border-[#d88757]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                    Email
                  </span>
                  <input
                    value={reservationForm.email}
                    onChange={(event) => updateReservationForm("email", event.target.value)}
                    placeholder="tu@email.com"
                    className="mt-2 h-12 w-full rounded-xl border border-[#c9a86a]/24 bg-black/24 px-4 text-sm text-[#fff2dd] outline-none placeholder:text-[#f4ead8]/35 focus:border-[#d88757]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                    Personas
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={publicCapacity}
                    value={reservationForm.people}
                    onChange={(event) =>
                      updateReservationForm("people", Math.max(Number(event.target.value) || 1, 1))
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-[#c9a86a]/24 bg-black/24 px-4 text-sm text-[#fff2dd] outline-none focus:border-[#d88757]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                    Fecha
                  </span>
                  <select
                    value={reservationForm.date}
                    onChange={(event) => updateReservationForm("date", event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border border-[#c9a86a]/24 bg-black/24 px-4 text-sm text-[#fff2dd] outline-none focus:border-[#d88757]"
                  >
                    {publicAvailableDates.length > 0 ? (
                      publicAvailableDates.map((item) => (
                        <option
                          key={item.date}
                          value={item.date}
                          className="bg-[#15110d] text-[#fff2dd]"
                        >
                          {item.label}
                        </option>
                      ))
                    ) : (
                      <option className="bg-[#15110d] text-[#fff2dd]">
                        Sin fechas disponibles
                      </option>
                    )}
                  </select>
                </label>

                <div className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                    Horario
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsTimePopupOpen(true)}
                    disabled={publicAvailableTimeSlots.length === 0}
                    className="mt-2 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#c9a86a]/24 bg-[#c97048] px-4 text-center text-sm font-black uppercase tracking-[0.14em] text-white outline-none transition hover:border-[#d88757] hover:bg-[#db8257] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Clock size={18} />
                    Seleccionar horario
                  </button>

                  {reservationForm.time ? (
                    <div className="mt-2 rounded-xl border border-[#c9a86a]/18 bg-black/22 px-4 py-3 text-sm text-[#f4ead8]/72">
                      Horario seleccionado:{" "}
                      <strong className="text-[#fff2dd]">{reservationForm.time}</strong>{" "}
                      · <strong className="text-[#c9a86a]">{selectedSlotAvailablePeople}</strong>{" "}
                      lugares disponibles
                    </div>
                  ) : null}
                </div>

                <label className="block md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">
                    Nota opcional
                  </span>
                  <textarea
                    value={reservationForm.note}
                    onChange={(event) => updateReservationForm("note", event.target.value)}
                    placeholder="Alergias, preferencias o comentarios."
                    className="mt-2 min-h-[92px] w-full resize-none rounded-xl border border-[#c9a86a]/24 bg-black/24 px-4 py-3 text-sm text-[#fff2dd] outline-none placeholder:text-[#f4ead8]/35 focus:border-[#d88757]"
                  />
                </label>
              </div>

              <div className="mt-5 rounded-2xl border border-[#c9a86a]/18 bg-black/22 p-4 text-sm text-[#f4ead8]/72">
                {reservationForm.time && isSelectedDateOpen ? (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      Horario seleccionado:{" "}
                      <strong className="text-[#fff2dd]">{reservationForm.time}</strong>
                    </p>
                    <p className="font-bold text-[#c9a86a]">
                      {selectedSlotAvailablePeople} lugares disponibles
                    </p>
                  </div>
                ) : (
                  <p>Elegí una fecha abierta para ver horarios disponibles.</p>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-[#c9a86a]/18 bg-black/18 p-4 text-sm text-[#f4ead8]/72">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c9a86a]">
                  Resumen de tu reserva
                </p>
                {reservationForm.date && reservationForm.time ? (
                  <p className="mt-2">
                    {formatPublicDate(reservationForm.date)} ·{" "}
                    <strong className="text-[#fff2dd]">{reservationForm.time}</strong> ·{" "}
                    <strong className="text-[#fff2dd]">{reservationForm.people}</strong>{" "}
                    personas
                  </p>
                ) : (
                  <p className="mt-2">Elegí un horario para completar el resumen.</p>
                )}
              </div>

              {reservationError ? (
                <div className="mt-4 rounded-2xl border border-red-400/35 bg-red-500/12 p-4 text-sm font-bold text-red-100">
                  {reservationError}
                </div>
              ) : null}

              <button
                type="submit"
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-3 rounded bg-[#c97048] px-8 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#db8257]"
              >
                <CalendarDays size={18} />
                Enviar reserva
              </button>

              {isTimePopupOpen ? (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
                  onClick={() => setIsTimePopupOpen(false)}
                >
                  <div
                    className="w-full max-w-3xl rounded-[2rem] border border-[#c9a86a]/28 bg-[#15110d] p-6 text-[#fff2dd] shadow-2xl shadow-black/50"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-[#c9a86a]/18 pb-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c9a86a]">
                          Seleccionar horario
                        </p>
                        <h3 className="demuru-serif mt-2 text-3xl text-[#fff2dd]">
                          {formatPublicDate(reservationForm.date)}
                        </h3>
                        <p className="mt-2 text-sm text-[#f4ead8]/62">
                          Elegí uno de los horarios disponibles para tu reserva.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsTimePopupOpen(false)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c9a86a]/24 bg-black/20 text-[#f4ead8] transition hover:border-[#d88757] hover:text-white"
                        aria-label="Cerrar selector de horario"
                      >
                        ×
                      </button>
                    </div>

                    <div className="mt-5 max-h-[430px] space-y-6 overflow-y-auto pr-1">
                      {publicTimeSlotGroups.length > 0 ? (
                        publicTimeSlotGroups.map((group) => (
                          <div key={group.id}>
                            <div className="mb-3 flex items-center justify-between gap-4">
                              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c9a86a]">
                                {group.label}
                              </p>
                              <p className="text-xs font-bold text-[#f4ead8]/45">
                                {group.range}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                              {group.slots.map((time) => {
                                const availablePeople = getAvailablePeopleForSlot(
                                  reservations,
                                  floorTables,
                                  localConfig,
                                  reservationForm.date,
                                  time
                                );
                                const isUnavailable = availablePeople <= 0;
                                const isSelected = reservationForm.time === time;

                                return (
                                  <button
                                    key={`${group.id}-${time}`}
                                    type="button"
                                    disabled={isUnavailable}
                                    onClick={() => {
                                      updateReservationForm("time", time);
                                      setIsTimePopupOpen(false);
                                    }}
                                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                                      isSelected
                                        ? "border-[#d88757] bg-[#c97048] text-white shadow-lg shadow-black/20"
                                        : isUnavailable
                                          ? "cursor-not-allowed border-[#c9a86a]/10 bg-black/16 text-[#f4ead8]/28"
                                          : "border-[#c9a86a]/18 bg-black/22 text-[#f4ead8] hover:border-[#d88757] hover:bg-[#c97048]/18"
                                    }`}
                                  >
                                    <span className="block text-lg font-black">{time}</span>
                                    <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.08em] opacity-75">
                                      {isUnavailable ? "Completo" : `${availablePeople} lugares`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-[#c9a86a]/14 bg-black/20 p-5 text-sm font-bold text-[#f4ead8]/60">
                          Sin horarios disponibles para esta fecha.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </form>
          </div>
          </section>
        ) : null}

        {content.visibleSections.experience ? (
          <section id="nosotros" className="mx-auto max-w-none px-8 py-14 xl:px-16">
            <SectionTitle title="Lo que dicen nuestros comensales" />

            <div className="mt-9 grid gap-5 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <article
                  key={testimonial.name}
                  className="rounded-xl border demuru-border bg-[#151410]/84 p-7"
                >
                  <Quote className="text-[#c9a86a]" size={30} />
                  <p className="mt-4 min-h-[96px] text-sm leading-7 text-[#f4ead8]/72">
                    {testimonial.quote}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <p className="text-sm font-bold text-[#fff2dd]">— {testimonial.name}</p>
                    <div className="flex gap-1 text-[#d9a45f]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} size={16} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {content.visibleSections.contact ? (
          <footer id="contacto" className="border-t border-[#c9a86a]/16 bg-[#11100d]">
            <div className="mx-auto max-w-none px-8 py-12 xl:px-16">
              <SectionTitle title={content.textValues.contactTitle} />

              <div className="mt-10 grid items-stretch gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[2rem] border demuru-border bg-[#151410]/84 p-7">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c9a86a]">
                    Visitá Demuru
                  </p>
                  <h3 className="demuru-serif mt-3 text-4xl text-[#fff2dd]">
                    Estamos en Pinamar
                  </h3>

                  <div className="mt-7 grid gap-5">
                    {[
                      { icon: Phone, label: "Teléfono", value: publicWebConfig.phone, href: `tel:${publicWebConfig.phone.replace(/\\D/g, "")}` },
                      { icon: MessageCircle, label: "WhatsApp", value: publicWebConfig.whatsapp, href: `https://wa.me/${publicWebConfig.whatsapp.replace(/\\D/g, "")}` },
                      { icon: Share2, label: "Instagram", value: publicWebConfig.instagram, href: `https://instagram.com/${publicWebConfig.instagram.replace("@", "")}` },
                      { icon: MapPin, label: "Dirección", value: publicWebConfig.address, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(publicMapQuery)}` },
                      { icon: Clock, label: "Horarios", value: publicContactHours },
                    ].map((item) => {
                      const Icon = item.icon;
                      const content = (
                        <>
                          <Icon className="mt-1 shrink-0 text-[#c9a86a]" size={24} />
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fff2dd]">
                              {item.label}
                            </p>
                            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#f4ead8]/68">
                              {item.value}
                            </p>
                          </div>
                        </>
                      );

                      return item.href ? (
                        <a
                          key={item.label}
                          href={item.href}
                          target={item.href.startsWith("http") ? "_blank" : undefined}
                          rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                          className="flex items-start gap-4 rounded-2xl border border-[#c9a86a]/14 bg-black/16 p-4 transition hover:border-[#d88757] hover:bg-black/24"
                        >
                          {content}
                        </a>
                      ) : (
                        <div
                          key={item.label}
                          className="flex items-start gap-4 rounded-2xl border border-[#c9a86a]/14 bg-black/16 p-4"
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {publicWebConfig.showMap ? (
                  <div className="relative min-h-[620px] overflow-hidden rounded-[2rem] border demuru-border bg-[#151410]/84 shadow-2xl shadow-black/25">
                    <iframe
                    title="Mapa de ubicación de Demuru"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(publicMapQuery)}&output=embed`}
                    className="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0f0d0a]/34 via-transparent to-[#c97048]/12" />

                  <div className="absolute left-5 top-5 z-10 max-w-sm rounded-3xl border border-[#c9a86a]/24 bg-[#11100d]/88 p-5 shadow-2xl shadow-black/100 backdrop-blur-md">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#c9a86a]/28 bg-black/24 text-[#c9a86a]">
                        <MapPin size={23} />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c9a86a]">
                          Ubicación
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#f4ead8]/72">
                          {publicWebConfig.address}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(publicMapQuery)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="pointer-events-auto mt-3 inline-flex rounded-full border border-[#c9a86a]/28 bg-black/22 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#fff2dd] transition hover:border-[#d88757] hover:bg-[#c97048]/18"
                        >
                          Abrir en Maps
                        </a>
                      </div>
                    </div>
                  </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-12 grid gap-8 border-t border-[#c9a86a]/14 pt-8 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
                <div>
                  <p className="demuru-serif text-4xl font-bold uppercase tracking-[0.12em] text-[#c9784a]">
                    {publicWebConfig.businessName}
                  </p>
                  <p className="mt-3 max-w-xs text-sm leading-6 text-[#f4ead8]/58">
                    {publicWebConfig.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#fff2dd]">
                    Enlaces
                  </h3>
                  <div className="mt-4 grid gap-2 text-sm text-[#f4ead8]/62">
                    <a href="#inicio">Inicio</a>
                    <a href="#menu">Menú</a>
                    <a href="#galeria">Galería</a>
                    <a href="#contacto">Contacto</a>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#fff2dd]">
                    Síguenos
                  </h3>
                  <div className="mt-4 flex gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c9a86a]/28 text-[#c9a86a]">
                      <Share2 size={18} />
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c9a86a]/28 text-[#c9a86a]">
                      <MessageCircle size={18} />
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#fff2dd]">
                    Newsletter
                  </h3>
                  <p className="mt-3 text-sm text-[#f4ead8]/58">Recibí novedades y promociones.</p>
                  <div className="mt-4 flex overflow-hidden rounded border border-[#c9a86a]/28">
                    <input
                      placeholder="Tu email"
                      className="h-11 min-w-0 flex-1 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
                    <button className="h-11 bg-[#c97048] px-4 font-black text-white">→</button>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-[#c9a86a]/14 pt-5 text-xs text-[#f4ead8]/42">
                © 2026 {publicWebConfig.businessName}. Todos los derechos reservados.
              </div>
            </div>
          </footer>
        ) : null}
      </div>
    </main>
  );
}
