"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dot,
  Image as ImageIcon,
  Layers,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Maximize2,
  Minimize2,
  Unlock,
  X,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Badge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card } from "@/components/v2/v2-card";
import { V2FilterBar } from "@/components/v2/v2-filter-bar";
import { V2Field, V2Input, V2Select, V2Textarea } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import {
  compressBrowserImage,
  writeLocalStorageSafely,
} from "@/lib/browser-image-storage";
import { V2_OPERATIONAL_EVENTS, V2_OPERATIONAL_STORAGE_KEYS } from "@/lib/v2-operational-storage";
import { v2Reservations } from "@/lib/v2/v2-mock-data";
import type { V2FloorPlanSnapshot } from "@/lib/floor-plan/v2-floor-plan-cutover";

type V2TableStatus = "available" | "reserved" | "occupied" | "blocked";
type V2TableShape = "round" | "square" | "rectangle";
type V2ZoneId = string;

type V2FloorTable = {
  id: string;
  name: string;
  capacity: number;
  status: V2TableStatus;
  shape: V2TableShape;
  zoneId: V2ZoneId;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  reservationId?: string;
  reservationClient?: string;
  reservationTime?: string;
  note?: string;
  locked?: boolean;
  mergedTables?: V2FloorTable[];
};

type V2PlanoReservation = (typeof v2Reservations)[number] & {
  seatedAt?: string;
  consumptionStartedAt?: string;
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
  bookingWindowDays: number;
};

type V2BackgroundFit = "cover" | "contain" | "stretch" | "custom";

type V2BackgroundSettings = {
  fit: V2BackgroundFit;
  scale: number;
  positionX: number;
  positionY: number;
  fade: number;
};

type V2PlanoPageProps = {
  initialTables?: V2FloorPlanSnapshot["initialTables"];
  initialReservations?: V2FloorPlanSnapshot["initialReservations"];
  initialLocalConfig?: V2FloorPlanSnapshot["initialLocalConfig"];
  initialBackgroundImageUrl?: string;
  initialBackgroundSettings?: V2FloorPlanSnapshot["initialBackgroundSettings"];
  floorPlanPersistence?: "local" | "supabase";
};

type V2TableInteraction =
  | {
      type: "move";
      tableId: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      canvasWidth: number;
      canvasHeight: number;
    }
  | {
      type: "resize";
      tableId: string;
      startClientX: number;
      startClientY: number;
      startWidth: number;
      startHeight: number;
    };

const FLOOR_TABLES_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.floorTables;
const FLOOR_BACKGROUND_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.floorBackground;
const FLOOR_BACKGROUND_SETTINGS_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.floorBackgroundSettings;
const RESERVATIONS_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.reservations;
const LOCAL_CONFIG_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.localConfig;
const RESERVATIONS_EVENT = V2_OPERATIONAL_EVENTS.reservations;
const FLOOR_TABLES_EVENT = V2_OPERATIONAL_EVENTS.floorTables;
const LOCAL_CONFIG_EVENT = V2_OPERATIONAL_EVENTS.localConfig;

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
  bookingWindowDays: 14,
};

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createMergedTableId() {
  return `merged-${Date.now()}`;
}

const TODAY_DATE = getTodayDateKey();
const DEFAULT_SLIDER_START = "00:00";
const DEFAULT_SLIDER_END = "00:00";
const SLIDER_STEP_MINUTES = 15;

const DEFAULT_BACKGROUND_SETTINGS: V2BackgroundSettings = {
  fit: "cover",
  scale: 100,
  positionX: 50,
  positionY: 50,
  fade: 72,
};

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

function parseLocalDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function formatDateLabel(date: string) {
  const parsedDate = parseLocalDate(date);

  return `${DAY_NAMES[parsedDate.getDay()]}, ${parsedDate.getDate()} de ${
    MONTH_NAMES[parsedDate.getMonth()]
  } de ${parsedDate.getFullYear()}`;
}

function formatShortDate(date: string) {
  const parsedDate = parseLocalDate(date);

  return `${String(parsedDate.getDate()).padStart(2, "0")}/${String(
    parsedDate.getMonth() + 1
  ).padStart(2, "0")}/${parsedDate.getFullYear()}`;
}

function formatMonthLabel(date: string) {
  const parsedDate = parseLocalDate(date);

  return `${MONTH_NAMES[parsedDate.getMonth()]} ${parsedDate.getFullYear()}`;
}

function getMonthGridDays(monthDate: string) {
  const parsedDate = parseLocalDate(monthDate);
  const year = parsedDate.getFullYear();
  const month = parsedDate.getMonth();
  const firstDay = new Date(year, month, 1, 12);
  const lastDay = new Date(year, month + 1, 0, 12);
  const leadingDays = firstDay.getDay();
  const days: Array<{ date: string; day: number; currentMonth: boolean }> = [];

  for (let index = 0; index < leadingDays; index += 1) {
    days.push({ date: "", day: 0, currentMonth: false });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const currentDate = new Date(year, month, day, 12);
    days.push({
      date: currentDate.toISOString().slice(0, 10),
      day,
      currentMonth: true,
    });
  }

  return days;
}

function moveMonth(date: string, offset: number) {
  const parsedDate = parseLocalDate(date);
  parsedDate.setMonth(parsedDate.getMonth() + offset);
  parsedDate.setDate(1);

  return parsedDate.toISOString().slice(0, 10);
}

function timeToMinutes(time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");

  return Number(hours) * 60 + Number(minutes);
}

function minutesToTime(totalMinutes: number) {
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getTimelineEndMinutes(startTime: string, endTime: string) {
  const startMinutes = timeToMinutes(startTime);
  const rawEndMinutes = timeToMinutes(endTime);

  return rawEndMinutes <= startMinutes ? rawEndMinutes + 24 * 60 : rawEndMinutes;
}

function getAbsoluteMinutesForTimeline(time: string, startTime: string) {
  const startMinutes = timeToMinutes(startTime);
  const rawMinutes = timeToMinutes(time);

  return rawMinutes < startMinutes ? rawMinutes + 24 * 60 : rawMinutes;
}

function timeToSliderValue(time: string, startTime: string) {
  const absoluteMinutes = getAbsoluteMinutesForTimeline(time, startTime);
  const startMinutes = timeToMinutes(startTime);

  return Math.max(0, (absoluteMinutes - startMinutes) / SLIDER_STEP_MINUTES);
}

function sliderValueToTime(value: number, startTime: string) {
  const totalMinutes = timeToMinutes(startTime) + value * SLIDER_STEP_MINUTES;

  return minutesToTime(totalMinutes);
}

function getSliderMaxValue(startTime: string, endTime: string) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = getTimelineEndMinutes(startTime, endTime);

  return Math.max(1, Math.round((endMinutes - startMinutes) / SLIDER_STEP_MINUTES));
}

function splitTableNames(tableName?: string) {
  return (tableName ?? "")
    .split("+")
    .map((name) => normalizeTableName(name))
    .filter(Boolean);
}

function normalizeTableName(tableName?: string) {
  const normalized = tableName?.trim().toLowerCase() ?? "";

  if (!normalized) return "";
  if (/^\d+$/.test(normalized)) return `mesa ${Number(normalized)}`;

  return normalized
    .replace(/mesa\s*0*(\d+)/, "mesa $1")
    .replace(/\s+/g, " ");
}

function isActiveReservationStatus(status: string) {
  return status === "pending" || status === "confirmed";
}

function isReservationOccupyingTable(reservation: V2PlanoReservation) {
  return Boolean(reservation.seatedAt || reservation.consumptionStartedAt);
}

const INITIAL_TABLES: V2FloorTable[] = [
  {
    id: "table-1",
    name: "Mesa 1",
    capacity: 4,
    status: "available",
    shape: "round",
    zoneId: "main",
    x: 15,
    y: 18,
    width: 84,
    height: 84,
    rotation: 0,
    note: "Cerca de ventana.",
  },
  {
    id: "table-2",
    name: "Mesa 2",
    capacity: 2,
    status: "available",
    shape: "round",
    zoneId: "main",
    x: 30,
    y: 16,
    width: 92,
    height: 92,
    rotation: 0,
  },
  {
    id: "table-3",
    name: "Mesa 3",
    capacity: 4,
    status: "occupied",
    shape: "square",
    zoneId: "main",
    x: 47,
    y: 18,
    width: 86,
    height: 86,
    rotation: 0,
    reservationId: "res-1",
    reservationClient: "María López",
    reservationTime: "19:00",
    note: "Mesa junto a la ventana.",
  },
  {
    id: "table-4",
    name: "Mesa 4",
    capacity: 4,
    status: "blocked",
    shape: "square",
    zoneId: "main",
    x: 61,
    y: 18,
    width: 86,
    height: 86,
    rotation: 0,
    note: "Fuera de servicio.",
    locked: true,
  },
  {
    id: "table-5",
    name: "Mesa 5",
    capacity: 2,
    status: "reserved",
    shape: "round",
    zoneId: "terrace",
    x: 83,
    y: 19,
    width: 90,
    height: 90,
    rotation: 0,
    reservationId: "res-2",
    reservationClient: "Carlos Gómez",
    reservationTime: "20:30",
  },
  {
    id: "table-6-7",
    name: "Mesa 6-7",
    capacity: 8,
    status: "available",
    shape: "rectangle",
    zoneId: "main",
    x: 30,
    y: 48,
    width: 170,
    height: 74,
    rotation: 0,
    note: "Mesas unidas.",
  },
  {
    id: "table-8",
    name: "Mesa 8",
    capacity: 4,
    status: "available",
    shape: "round",
    zoneId: "main",
    x: 52,
    y: 47,
    width: 90,
    height: 90,
    rotation: 0,
  },
  {
    id: "table-9",
    name: "Mesa 9",
    capacity: 4,
    status: "occupied",
    shape: "square",
    zoneId: "main",
    x: 63,
    y: 47,
    width: 88,
    height: 88,
    rotation: 0,
    reservationId: "res-3",
    reservationClient: "Lucía Fernández",
    reservationTime: "19:30",
  },
  {
    id: "table-10",
    name: "Mesa 10",
    capacity: 2,
    status: "blocked",
    shape: "round",
    zoneId: "main",
    x: 73,
    y: 49,
    width: 84,
    height: 84,
    rotation: 0,
    locked: true,
  },
  {
    id: "table-11",
    name: "Mesa 11",
    capacity: 4,
    status: "available",
    shape: "square",
    zoneId: "bar",
    x: 20,
    y: 78,
    width: 86,
    height: 86,
    rotation: 0,
  },
  {
    id: "table-12",
    name: "Mesa 12",
    capacity: 4,
    status: "reserved",
    shape: "round",
    zoneId: "bar",
    x: 35,
    y: 76,
    width: 94,
    height: 94,
    rotation: 0,
    reservationId: "res-4",
    reservationClient: "Juan Pérez",
    reservationTime: "21:00",
  },
  {
    id: "table-13",
    name: "Mesa 13",
    capacity: 4,
    status: "available",
    shape: "square",
    zoneId: "bar",
    x: 52,
    y: 78,
    width: 86,
    height: 86,
    rotation: 0,
  },
  {
    id: "table-14",
    name: "Mesa 14",
    capacity: 2,
    status: "available",
    shape: "round",
    zoneId: "terrace",
    x: 65,
    y: 78,
    width: 86,
    height: 86,
    rotation: 0,
  },
];

const STATUS_LABELS: Record<V2TableStatus, string> = {
  available: "Disponible",
  reserved: "Reservada",
  occupied: "Ocupada",
  blocked: "Bloqueada",
};

const STATUS_BADGE_TONES: Record<V2TableStatus, "green" | "orange" | "red" | "slate"> = {
  available: "green",
  reserved: "orange",
  occupied: "red",
  blocked: "slate",
};

const STATUS_STYLES: Record<V2TableStatus, string> = {
  available: "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-emerald-100",
  reserved: "border-amber-300 bg-amber-50 text-amber-950 shadow-amber-100",
  occupied: "border-red-300 bg-red-50 text-red-950 shadow-red-100",
  blocked: "border-slate-300 bg-slate-100 text-slate-500 shadow-slate-100",
};

function getShapeClass(shape: V2TableShape) {
  if (shape === "round") return "rounded-full";
  if (shape === "rectangle") return "rounded-2xl";
  return "rounded-xl";
}

function reservationUsesTable(reservationTableName: string | undefined, tableName: string) {
  return splitTableNames(reservationTableName).includes(normalizeTableName(tableName));
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
    reservationEnabled: Boolean(mergedConfig.reservationEnabled),
    standardDurationMinutes: Math.max(Number(mergedConfig.standardDurationMinutes) || 120, 15),
    bookingWindowDays: Math.max(Number(mergedConfig.bookingWindowDays) || 14, 1),
  };
}

function loadLocalConfigFromStorage() {
  if (typeof window === "undefined") return DEFAULT_LOCAL_CONFIG;

  try {
    const storedConfig = window.localStorage.getItem(LOCAL_CONFIG_STORAGE_KEY);

    if (!storedConfig) return DEFAULT_LOCAL_CONFIG;

    return normalizeLocalConfig(JSON.parse(storedConfig) as Partial<V2LocalConfigState>);
  } catch {
    return DEFAULT_LOCAL_CONFIG;
  }
}

function getBusinessHourForDate(config: V2LocalConfigState, date: string) {
  const parsedDate = parseLocalDate(date);
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

function formatBusinessHourSlots(slots: V2BusinessHourSlot[]) {
  if (slots.length === 0) return "Cerrado";

  return slots.map((slot) => `${slot.open} — ${slot.close}`).join(" / ");
}

function addDaysToDate(date: string, days: number) {
  const parsedDate = parseLocalDate(date);
  parsedDate.setDate(parsedDate.getDate() + days);

  return parsedDate.toISOString().slice(0, 10);
}

function renderStatusBadge(status: V2TableStatus) {
  return <V2Badge tone={STATUS_BADGE_TONES[status]}>{STATUS_LABELS[status]}</V2Badge>;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeBackgroundSettings(
  value: Partial<V2BackgroundSettings> | null | undefined
): V2BackgroundSettings {
  return {
    fit:
      value?.fit === "contain" ||
      value?.fit === "stretch" ||
      value?.fit === "custom" ||
      value?.fit === "cover"
        ? value.fit
        : DEFAULT_BACKGROUND_SETTINGS.fit,
    scale: Math.min(Math.max(Number(value?.scale) || 100, 25), 250),
    positionX: Math.min(Math.max(Number(value?.positionX) || 50, 0), 100),
    positionY: Math.min(Math.max(Number(value?.positionY) || 50, 0), 100),
    fade: Math.min(Math.max(Number(value?.fade) || 72, 0), 95),
  };
}

function getBackgroundSize(settings: V2BackgroundSettings) {
  if (settings.fit === "contain") return "contain";
  if (settings.fit === "stretch") return "100% 100%";
  if (settings.fit === "custom") return `${settings.scale}% auto`;

  return "cover";
}

function persistBackgroundSettings(settings: V2BackgroundSettings) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    FLOOR_BACKGROUND_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings)
  );
}

export function V2PlanoPage({
  initialTables,
  initialReservations,
  initialLocalConfig,
  initialBackgroundImageUrl,
  initialBackgroundSettings,
  floorPlanPersistence = "local",
}: V2PlanoPageProps = {}) {
  const isSupabasePersistence =
    floorPlanPersistence === "supabase";
  const resolvedInitialTables =
    initialTables ?? INITIAL_TABLES;
  const [tables, setTables] = useState<V2FloorTable[]>(
    resolvedInitialTables,
  );
  const [selectedTableId, setSelectedTableId] = useState(
    resolvedInitialTables[0]?.id ?? "",
  );
  const [selectedDate, setSelectedDate] = useState(TODAY_DATE);
  const [selectedTime, setSelectedTime] = useState("19:00");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(TODAY_DATE);
  const [activeBusinessSlotIndex, setActiveBusinessSlotIndex] = useState(0);
  const [localConfig, setLocalConfig] =
    useState<V2LocalConfigState>(
      () => initialLocalConfig ?? DEFAULT_LOCAL_CONFIG,
    );
  const [planoReservations, setPlanoReservations] =
    useState<V2PlanoReservation[]>(
      initialReservations ?? v2Reservations,
    );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(
    initialBackgroundImageUrl ?? "",
  );
  const [backgroundSettings, setBackgroundSettings] =
    useState<V2BackgroundSettings>(
      initialBackgroundSettings
      ?? DEFAULT_BACKGROUND_SETTINGS,
    );
  const [isBackgroundDialogOpen, setIsBackgroundDialogOpen] = useState(false);
  const [backgroundStorageError, setBackgroundStorageError] = useState("");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [mergeSelectionIds, setMergeSelectionIds] = useState<string[]>([]);
  const [assignReservationError, setAssignReservationError] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLayoutUnlocked, setIsLayoutUnlocked] = useState(false);
  const [editingTable, setEditingTable] = useState<V2FloorTable | null>(null);
  const [activeTableInteraction, setActiveTableInteraction] =
    useState<V2TableInteraction | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const selectedDateBusinessSlots = useMemo(
    () => getBusinessHourSlots(getBusinessHourForDate(localConfig, selectedDate)),
    [localConfig, selectedDate]
  );
  const resolvedBusinessSlotIndex = Math.min(
    activeBusinessSlotIndex,
    Math.max(selectedDateBusinessSlots.length - 1, 0),
  );
  const selectedDateBusinessHour =
    selectedDateBusinessSlots[resolvedBusinessSlotIndex] ?? null;
  const isSelectedDateOpen = selectedDateBusinessSlots.length > 0;
  const sliderStartTime =
    isSelectedDateOpen && selectedDateBusinessHour ? selectedDateBusinessHour.open : DEFAULT_SLIDER_START;
  const sliderEndTime =
    isSelectedDateOpen && selectedDateBusinessHour ? selectedDateBusinessHour.close : DEFAULT_SLIDER_END;
  const sliderMaxValue = getSliderMaxValue(sliderStartTime, sliderEndTime);
  const rawSelectedTimeSliderValue = timeToSliderValue(selectedTime, sliderStartTime);
  const resolvedSelectedTime =
    isSelectedDateOpen &&
    (rawSelectedTimeSliderValue < 0 || rawSelectedTimeSliderValue > sliderMaxValue)
      ? sliderStartTime
      : sliderValueToTime(
          Math.round(Math.max(0, Math.min(rawSelectedTimeSliderValue, sliderMaxValue))),
          sliderStartTime,
        );
  const selectedTimeSliderValue = Math.min(
    sliderMaxValue,
    timeToSliderValue(resolvedSelectedTime, sliderStartTime)
  );
  const selectedTimeMinutes = getAbsoluteMinutesForTimeline(resolvedSelectedTime, sliderStartTime);
  const maxBookingDate = addDaysToDate(TODAY_DATE, localConfig.bookingWindowDays - 1);
  const calendarMonthDays = useMemo(() => getMonthGridDays(calendarMonth), [calendarMonth]);
  const reservationDatesInMonth = useMemo(
    () =>
      new Set(
        planoReservations
          .filter((reservation) => reservation.date.startsWith(calendarMonth.slice(0, 7)))
          .map((reservation) => reservation.date)
      ),
    [calendarMonth, planoReservations]
  );

  const reservationsForSelectedSlot = planoReservations.filter((reservation) => {
    if (reservation.date !== selectedDate) return false;
    if (!reservation.tableName) return false;
    if (!isActiveReservationStatus(reservation.status)) return false;

    const startsAt = getAbsoluteMinutesForTimeline(reservation.time, sliderStartTime);
    const endsAt = startsAt + (reservation.durationMinutes ?? localConfig.standardDurationMinutes);

    return selectedTimeMinutes >= startsAt && selectedTimeMinutes < endsAt;
  });

  const displayTables = tables.map((table) => {
    const baseTable: V2FloorTable = {
      ...table,
      status: table.status === "blocked" ? "blocked" : "available",
      reservationId: undefined,
      reservationClient: undefined,
      reservationTime: undefined,
    };

    const reservationForTable = reservationsForSelectedSlot.find(
      (reservation) =>
        reservationUsesTable(reservation.tableName, table.name)
    );

    if (!reservationForTable) return baseTable;

    return {
      ...baseTable,
      status: isReservationOccupyingTable(reservationForTable)
        ? ("occupied" as V2TableStatus)
        : ("reserved" as V2TableStatus),
      reservationId: reservationForTable.id,
      reservationClient: reservationForTable.client,
      reservationTime: reservationForTable.time,
      note: reservationForTable.note,
    };
  });

  const selectedTable =
    displayTables.find((table) => table.id === selectedTableId) ??
    displayTables[0] ??
    null;

  const unassignedReservationsForSelectedDate = planoReservations
    .filter((reservation) => {
      if (reservation.date !== selectedDate) return false;
      if (!isActiveReservationStatus(reservation.status)) return false;
      if (reservation.tableName) return false;

      const startsAt = getAbsoluteMinutesForTimeline(reservation.time, sliderStartTime);
      const endsAt = startsAt + (reservation.durationMinutes ?? localConfig.standardDurationMinutes);

      return selectedTimeMinutes >= startsAt && selectedTimeMinutes < endsAt;
    })
    .map((reservation) => ({
      id: reservation.id,
      client: reservation.client,
      time: reservation.time,
      people: reservation.people,
      note: reservation.note || "Sin mesa asignada",
      status: reservation.status === "pending" ? "pending" : "confirmed",
    }));

  function getReservationTimeRange(reservation: V2PlanoReservation) {
    const startsAt = getAbsoluteMinutesForTimeline(reservation.time, sliderStartTime);
    const endsAt = startsAt + (reservation.durationMinutes ?? localConfig.standardDurationMinutes);

    return { startsAt, endsAt };
  }

  function reservationOverlaps(
    firstReservation: V2PlanoReservation,
    secondReservation: V2PlanoReservation
  ) {
    const firstRange = getReservationTimeRange(firstReservation);
    const secondRange = getReservationTimeRange(secondReservation);

    return (
      firstRange.startsAt < secondRange.endsAt &&
      secondRange.startsAt < firstRange.endsAt
    );
  }

  function findTableConflict(
    reservationToAssign: V2PlanoReservation,
    targetTableName: string
  ) {
    return (
      planoReservations.find((reservation) => {
        if (reservation.id === reservationToAssign.id) return false;
        if (reservation.date !== reservationToAssign.date) return false;
        if (!isActiveReservationStatus(reservation.status)) return false;
        if (!splitTableNames(reservation.tableName).includes(normalizeTableName(targetTableName))) {
          return false;
        }

        return reservationOverlaps(reservation, reservationToAssign);
      }) ?? null
    );
  }

  function persistReservations(nextReservations: V2PlanoReservation[]) {
    if (isSupabasePersistence) return;
    setPlanoReservations(nextReservations);
    window.localStorage.setItem(
      RESERVATIONS_STORAGE_KEY,
      JSON.stringify(nextReservations)
    );
    window.dispatchEvent(new Event(RESERVATIONS_EVENT));
  }

  function loadReservationsFromStorage() {
    try {
      const storedReservations = window.localStorage.getItem(RESERVATIONS_STORAGE_KEY);

      if (!storedReservations) {
        setPlanoReservations(v2Reservations);
        return;
      }

      const parsedReservations = JSON.parse(storedReservations) as V2PlanoReservation[];

      if (!Array.isArray(parsedReservations)) {
        setPlanoReservations(v2Reservations);
        return;
      }

      setPlanoReservations(parsedReservations);
    } catch {
      setPlanoReservations(v2Reservations);
    }
  }

  useEffect(() => {
    if (isSupabasePersistence) return;

    function loadConfigFromStorage() {
      setLocalConfig(loadLocalConfigFromStorage());
    }

    loadReservationsFromStorage();
    loadConfigFromStorage();

    function handleFocus() {
      loadReservationsFromStorage();
      loadConfigFromStorage();
      loadTablesFromStorage();
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === RESERVATIONS_STORAGE_KEY) {
        loadReservationsFromStorage();
      }

      if (event.key === LOCAL_CONFIG_STORAGE_KEY) {
        loadConfigFromStorage();
      }

      if (event.key === FLOOR_TABLES_STORAGE_KEY) {
        loadTablesFromStorage();
      }
    }

    function loadTablesFromStorage() {
      try {
        const storedTables = window.localStorage.getItem(FLOOR_TABLES_STORAGE_KEY);

        if (!storedTables) {
          setTables(INITIAL_TABLES);
          setSelectedTableId((currentId) =>
            INITIAL_TABLES.some((table) => table.id === currentId)
              ? currentId
              : INITIAL_TABLES[0]?.id ?? ""
          );
          return;
        }

        const parsedTables = JSON.parse(storedTables) as V2FloorTable[];

        if (!Array.isArray(parsedTables) || parsedTables.length === 0) return;

        setTables(parsedTables);
        setSelectedTableId((currentId) =>
          parsedTables.some((table) => table.id === currentId)
            ? currentId
            : parsedTables[0]?.id ?? ""
        );
      } catch {
        // Si el plano guardado queda inválido, mantenemos las mesas actuales.
      }
    }

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(RESERVATIONS_EVENT, loadReservationsFromStorage);
    window.addEventListener(FLOOR_TABLES_EVENT, loadTablesFromStorage);
    window.addEventListener(LOCAL_CONFIG_EVENT, loadConfigFromStorage);

    try {
      const storedBackground = window.localStorage.getItem(FLOOR_BACKGROUND_STORAGE_KEY);
      const storedBackgroundSettings = window.localStorage.getItem(
        FLOOR_BACKGROUND_SETTINGS_STORAGE_KEY
      );

      if (storedBackground) {
        setBackgroundImageUrl(storedBackground);
      }

      if (storedBackgroundSettings) {
        setBackgroundSettings(
          normalizeBackgroundSettings(
            JSON.parse(storedBackgroundSettings) as Partial<V2BackgroundSettings>
          )
        );
      }

    } catch {
      // Si el mock guardado queda inválido, mantenemos las mesas iniciales.
    }
    loadTablesFromStorage();

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(RESERVATIONS_EVENT, loadReservationsFromStorage);
      window.removeEventListener(FLOOR_TABLES_EVENT, loadTablesFromStorage);
      window.removeEventListener(LOCAL_CONFIG_EVENT, loadConfigFromStorage);
    };
  }, [isSupabasePersistence]);

  useEffect(() => {
    function handleDocumentMouseDown(event: globalThis.MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (!target?.closest("[data-plano-date-picker]")) {
        setIsDatePickerOpen(false);
      }
    }

    if (isDatePickerOpen) {
      document.addEventListener("mousedown", handleDocumentMouseDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [isDatePickerOpen]);

  useEffect(() => {
    if (!activeTableInteraction) return;
    const interaction = activeTableInteraction;

    function handleMouseMove(event: globalThis.MouseEvent) {
      setTables((currentTables) =>
        currentTables.map((table) => {
          if (table.id !== interaction.tableId) return table;

          if (interaction.type === "move") {
            const deltaX =
              ((event.clientX - interaction.startClientX) /
                interaction.canvasWidth) *
              100;
            const deltaY =
              ((event.clientY - interaction.startClientY) /
                interaction.canvasHeight) *
              100;

            return {
              ...table,
              x: Math.min(Math.max(interaction.startX + deltaX, 1), 92),
              y: Math.min(Math.max(interaction.startY + deltaY, 1), 88),
            };
          }

          const deltaWidth = event.clientX - interaction.startClientX;
          const deltaHeight = event.clientY - interaction.startClientY;

          return {
            ...table,
            width: Math.min(
              Math.max(interaction.startWidth + deltaWidth / 0.82, 48),
              260
            ),
            height: Math.min(
              Math.max(interaction.startHeight + deltaHeight / 0.82, 42),
              220
            ),
          };
        })
      );
      setHasUnsavedChanges(true);
    }

    function handleMouseUp() {
      setActiveTableInteraction(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeTableInteraction]);

  function canSelectTableForMerge(table: V2FloorTable) {
    return (
      table.status === "available" &&
      !table.locked &&
      !table.reservationClient &&
      !table.mergedTables
    );
  }

  function selectTable(tableId: string) {
    const table = displayTables.find((item) => item.id === tableId);

    if (isMergeMode) {
      if (!table || !canSelectTableForMerge(table)) return;

      setSelectedTableId(tableId);
      setMergeSelectionIds((current) =>
        current.includes(tableId)
          ? current.filter((id) => id !== tableId)
          : [...current, tableId]
      );
      return;
    }

    setSelectedTableId(tableId);
  }

  function moveSelectedDate(days: number) {
    const currentDate = parseLocalDate(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const nextDate = currentDate.toISOString().slice(0, 10);

    if (nextDate < TODAY_DATE || nextDate > maxBookingDate) return;

    setSelectedDate(nextDate);
    setCalendarMonth(nextDate);
  }

  function selectCalendarDate(date: string) {
    if (!date || date < TODAY_DATE || date > maxBookingDate) return;

    setSelectedDate(date);
    setCalendarMonth(date);
  }

  function applyCalendarDate() {
    setIsDatePickerOpen(false);
  }

  function startMoveTable(event: MouseEvent<HTMLButtonElement>, table: V2FloorTable) {
    if (isSupabasePersistence) return;
    event.preventDefault();

    if (isMergeMode) return;
    if (!isLayoutUnlocked) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();

    if (!canvasRect) return;

    setSelectedTableId(table.id);
    setActiveTableInteraction({
      type: "move",
      tableId: table.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: table.x,
      startY: table.y,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
    });
  }

  function startResizeTable(event: MouseEvent<HTMLSpanElement>, table: V2FloorTable) {
    if (isSupabasePersistence) return;
    event.preventDefault();
    event.stopPropagation();

    if (isMergeMode) return;
    if (!isLayoutUnlocked) return;

    setSelectedTableId(table.id);
    setActiveTableInteraction({
      type: "resize",
      tableId: table.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: table.width,
      startHeight: table.height,
    });
  }

  function updateSelectedTableStatus(status: V2TableStatus) {
    if (isSupabasePersistence) return;
    if (!selectedTable) return;

    setTables((current) =>
      current.map((table) =>
        table.id === selectedTable.id
          ? {
              ...table,
              status,
              locked: status === "blocked",
              reservationId: status === "blocked" ? undefined : table.reservationId,
              reservationClient: status === "blocked" ? undefined : table.reservationClient,
              reservationTime: status === "blocked" ? undefined : table.reservationTime,
            }
          : table
      )
    );
    setHasUnsavedChanges(true);
  }

  function addMockTable() {
    if (isSupabasePersistence) return;
    const nextNumber = tables.length + 1;
    const nextTable: V2FloorTable = {
      id: `table-${Date.now()}`,
      name: `Mesa ${nextNumber}`,
      capacity: 2,
      status: "available",
      shape: "round",
      zoneId: "main",
      x: 18 + (nextNumber % 6) * 9,
      y: 24 + (nextNumber % 4) * 12,
      width: 84,
      height: 84,
      rotation: 0,
    };

    setTables((current) => [...current, nextTable]);
    setSelectedTableId(nextTable.id);
    setHasUnsavedChanges(true);
  }

  function deleteSelectedTable() {
    if (isSupabasePersistence) return;
    if (!selectedTable) return;

    const nextReservations = planoReservations.map((reservation) =>
      normalizeTableName(reservation.tableName) === normalizeTableName(selectedTable.name)
        ? {
            ...reservation,
            tableName: "",
          }
        : reservation
    );

    persistReservations(nextReservations);

    setTables((current) => {
      const nextTables = current.filter((table) => table.id !== selectedTable.id);
      setSelectedTableId(nextTables[0]?.id ?? "");

      return nextTables;
    });

    setHasUnsavedChanges(true);
  }

  function deleteEditingTable() {
    if (isSupabasePersistence) return;
    if (!editingTable) return;

    const tableToDelete = editingTable;
    const nextReservations = planoReservations.map((reservation) =>
      normalizeTableName(reservation.tableName) === normalizeTableName(tableToDelete.name)
        ? {
            ...reservation,
            tableName: "",
          }
        : reservation
    );

    persistReservations(nextReservations);

    setTables((current) => {
      const nextTables = current.filter((table) => table.id !== tableToDelete.id);
      setSelectedTableId((currentSelectedId) =>
        currentSelectedId === tableToDelete.id ? nextTables[0]?.id ?? "" : currentSelectedId
      );

      return nextTables;
    });

    setHasUnsavedChanges(true);
    closeTableEditor();
  }

  function startMergeMode() {
    if (isSupabasePersistence) return;
    if (!selectedTable) return;

    const initialSelection =
      canSelectTableForMerge(selectedTable) ? [selectedTable.id] : [];

    setMergeSelectionIds(initialSelection);
    setIsMergeMode(true);
  }

  function cancelMergeMode() {
    setIsMergeMode(false);
    setMergeSelectionIds([]);
  }

  function mergeSelectedTables() {
    if (isSupabasePersistence) return;
    if (mergeSelectionIds.length < 2) return;

    const rawTablesToMerge = tables.filter((table) =>
      mergeSelectionIds.includes(table.id)
    );

    if (rawTablesToMerge.length < 2) return;

    const invalidTable = displayTables.find(
      (table) => mergeSelectionIds.includes(table.id) && !canSelectTableForMerge(table)
    );

    if (invalidTable) return;

    const minX = Math.min(...rawTablesToMerge.map((table) => table.x));
    const minY = Math.min(...rawTablesToMerge.map((table) => table.y));
    const maxX = Math.max(
      ...rawTablesToMerge.map((table) => table.x + table.width / 8)
    );
    const maxY = Math.max(
      ...rawTablesToMerge.map((table) => table.y + table.height / 8)
    );

    const mergedTable: V2FloorTable = {
      ...rawTablesToMerge[0],
      id: createMergedTableId(),
      name: rawTablesToMerge.map((table) => table.name).join(" + "),
      capacity: rawTablesToMerge.reduce((total, table) => total + table.capacity, 0),
      status: "available",
      shape: "rectangle",
      width: Math.max((maxX - minX) * 8, 150),
      height: Math.max((maxY - minY) * 8, 76),
      x: minX,
      y: minY,
      rotation: 0,
      reservationId: undefined,
      reservationClient: undefined,
      reservationTime: undefined,
      note: "Mesas unidas temporalmente.",
      locked: false,
      mergedTables: rawTablesToMerge,
    };

    setTables((current) => [
      ...current.filter((table) => !mergeSelectionIds.includes(table.id)),
      mergedTable,
    ]);
    setSelectedTableId(mergedTable.id);
    setIsMergeMode(false);
    setMergeSelectionIds([]);
    setHasUnsavedChanges(true);
  }

  function separateSelectedTable() {
    if (isSupabasePersistence) return;
    if (!selectedTable?.mergedTables?.length) return;

    setTables((current) => [
      ...current.filter((table) => table.id !== selectedTable.id),
      ...selectedTable.mergedTables!.map((table, index) => ({
        ...table,
        x: Math.min(Math.max(selectedTable.x + index * 8, 1), 92),
        y: Math.min(Math.max(selectedTable.y + index * 6, 1), 88),
        status: table.status === "blocked" ? ("blocked" as const) : ("available" as const),
        reservationId: undefined,
        reservationClient: undefined,
        reservationTime: undefined,
        mergedTables: undefined,
      })),
    ]);
    setSelectedTableId(selectedTable.mergedTables[0]?.id ?? "");
    setHasUnsavedChanges(true);
  }

  function openBackgroundDialog() {
    setIsBackgroundDialogOpen(true);
  }

  function closeBackgroundDialog() {
    setIsBackgroundDialogOpen(false);
  }

  function triggerBackgroundImageUpload() {
    if (isSupabasePersistence) return;
    backgroundInputRef.current?.click();
  }

  async function handleBackgroundImageChange(event: ChangeEvent<HTMLInputElement>) {
    if (isSupabasePersistence) return;
    const file = event.target.files?.[0];

    if (!file) return;
    event.target.value = "";
    setBackgroundStorageError("");

    try {
      const imageDataUrl = await compressBrowserImage(file, {
        maxWidth: 1600,
        maxHeight: 1100,
        quality: 0.75,
      });
      const result = writeLocalStorageSafely(FLOOR_BACKGROUND_STORAGE_KEY, imageDataUrl);

      if (!result.ok) {
        setBackgroundStorageError(
          "No se pudo guardar la imagen porque el almacenamiento del navegador está lleno."
        );
        return;
      }

      setBackgroundImageUrl(imageDataUrl);
      persistBackgroundSettings(backgroundSettings);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("[plano] No se pudo procesar la imagen de fondo.", error);
      setBackgroundStorageError(
        "No se pudo procesar la imagen. Probá con un archivo JPG, PNG o WebP."
      );
    }
  }

  function updateBackgroundSettings(nextSettings: V2BackgroundSettings) {
    if (isSupabasePersistence) return;
    const normalizedSettings = normalizeBackgroundSettings(nextSettings);

    setBackgroundSettings(normalizedSettings);
    persistBackgroundSettings(normalizedSettings);
    setHasUnsavedChanges(true);
  }

  function removeBackgroundImage() {
    if (isSupabasePersistence) return;
    setBackgroundImageUrl("");
    setBackgroundStorageError("");
    window.localStorage.removeItem(FLOOR_BACKGROUND_STORAGE_KEY);
    setHasUnsavedChanges(true);
  }

  function zoomIn() {
    setZoomLevel((current) => Math.min(Number((current + 0.1).toFixed(2)), 1.5));
  }

  function zoomOut() {
    setZoomLevel((current) => Math.max(Number((current - 0.1).toFixed(2)), 0.7));
  }

  function toggleLayoutLock() {
    if (isSupabasePersistence) return;
    setIsLayoutUnlocked((current) => !current);
    setActiveTableInteraction(null);
  }

  function openSelectedTableEditor() {
    if (isSupabasePersistence) return;
    if (!selectedTable) return;

    setEditingTable({ ...selectedTable });
  }

  function closeTableEditor() {
    setEditingTable(null);
  }

  function saveTableEditor() {
    if (isSupabasePersistence) return;
    if (!editingTable) return;

    const previousTable = tables.find((table) => table.id === editingTable.id);

    const sanitizedTable: V2FloorTable = {
      ...editingTable,
      name: editingTable.name.trim() || "Mesa sin nombre",
      capacity: Math.max(Number(editingTable.capacity) || 1, 1),
      note: editingTable.note?.trim() ?? "",
      locked: editingTable.status === "blocked",
    };

    setTables((current) =>
      current.map((table) =>
        table.id === sanitizedTable.id ? sanitizedTable : table
      )
    );

    if (
      previousTable &&
      normalizeTableName(previousTable.name) !== normalizeTableName(sanitizedTable.name)
    ) {
      const nextReservations = planoReservations.map((reservation) =>
        normalizeTableName(reservation.tableName) === normalizeTableName(previousTable.name)
          ? {
              ...reservation,
              tableName: sanitizedTable.name,
            }
          : reservation
      );

      persistReservations(nextReservations);
    }

    setSelectedTableId(sanitizedTable.id);
    setHasUnsavedChanges(true);
    closeTableEditor();
  }

  function openAssignDialog() {
    if (isSupabasePersistence) return;
    setAssignReservationError("");
    setIsAssignDialogOpen(true);
  }

  function closeAssignDialog() {
    setAssignReservationError("");
    setIsAssignDialogOpen(false);
  }

  function assignReservationToSelectedTable(reservationId: string) {
    if (isSupabasePersistence) return;
    if (!selectedTable) return;

    if (selectedTable.status === "blocked" || selectedTable.locked) {
      setAssignReservationError("No se puede asignar una reserva a una mesa bloqueada.");
      return;
    }

    const reservationToAssign = planoReservations.find(
      (reservation) => reservation.id === reservationId
    );

    if (!reservationToAssign) {
      setAssignReservationError("No se encontró la reserva seleccionada.");
      return;
    }

    if (reservationToAssign.people > selectedTable.capacity) {
      setAssignReservationError(
        `La reserva es para ${reservationToAssign.people} personas y ${selectedTable.name} tiene capacidad para ${selectedTable.capacity}.`
      );
      return;
    }

    const conflictingReservation = findTableConflict(
      reservationToAssign,
      selectedTable.name
    );

    if (conflictingReservation) {
      setAssignReservationError(
        `${selectedTable.name} ya tiene una reserva activa de ${conflictingReservation.client} a las ${conflictingReservation.time}.`
      );
      return;
    }

    const nextReservations = planoReservations.map((reservation) =>
      reservation.id === reservationId
        ? {
            ...reservation,
            tableName: selectedTable.name,
          }
        : reservation
    );

    persistReservations(nextReservations);
    setAssignReservationError("");
    setIsAssignDialogOpen(false);
  }

  function openReleaseDialog() {
    if (isSupabasePersistence) return;
    if (!selectedTable?.reservationId) return;

    setIsReleaseDialogOpen(true);
  }

  function closeReleaseDialog() {
    setIsReleaseDialogOpen(false);
  }

  function clearSelectedReservation() {
    if (isSupabasePersistence) return;
    if (!selectedTable?.reservationId) return;

    const nextReservations = planoReservations.map((reservation) =>
      reservation.id === selectedTable.reservationId
        ? {
            ...reservation,
            tableName: "",
          }
        : reservation
    );

    persistReservations(nextReservations);
    setIsReleaseDialogOpen(false);
  }

  function restoreInitialLayout() {
    if (isSupabasePersistence) return;
    setTables(INITIAL_TABLES);
    setSelectedTableId(INITIAL_TABLES[0]?.id ?? "");
    window.localStorage.removeItem(FLOOR_TABLES_STORAGE_KEY);
    window.dispatchEvent(new Event(FLOOR_TABLES_EVENT));
    setHasUnsavedChanges(false);
  }

  function saveChanges() {
    if (isSupabasePersistence) return;
    window.localStorage.setItem(FLOOR_TABLES_STORAGE_KEY, JSON.stringify(tables));
    window.dispatchEvent(new Event(FLOOR_TABLES_EVENT));

    if (backgroundImageUrl) {
      const result = writeLocalStorageSafely(
        FLOOR_BACKGROUND_STORAGE_KEY,
        backgroundImageUrl
      );

      if (!result.ok) {
        setBackgroundStorageError(
          "No se pudo guardar la imagen porque el almacenamiento del navegador está lleno."
        );
        setIsBackgroundDialogOpen(true);
        return;
      }
    } else {
      window.localStorage.removeItem(FLOOR_BACKGROUND_STORAGE_KEY);
    }

    persistBackgroundSettings(backgroundSettings);

    setHasUnsavedChanges(false);
  }

  function closeActivePopup() {
    if (isReleaseDialogOpen) {
      setIsReleaseDialogOpen(false);
      return;
    }

    if (isAssignDialogOpen) {
      setIsAssignDialogOpen(false);
      return;
    }

    if (isBackgroundDialogOpen) {
      setIsBackgroundDialogOpen(false);
      return;
    }

    if (editingTable) {
      setEditingTable(null);
    }
  }

  useEffect(() => {
    if (!isReleaseDialogOpen && !isAssignDialogOpen && !isBackgroundDialogOpen && !editingTable) {
      return;
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isReleaseDialogOpen) {
          setIsReleaseDialogOpen(false);
        } else if (isAssignDialogOpen) {
          setIsAssignDialogOpen(false);
        } else if (isBackgroundDialogOpen) {
          setIsBackgroundDialogOpen(false);
        } else if (editingTable) {
          setEditingTable(null);
        }
      }
    }

    window.addEventListener("keydown", handleEscapeKey);

    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [isReleaseDialogOpen, isAssignDialogOpen, isBackgroundDialogOpen, editingTable]);

  return (
    <V2AppShell>
      <style>
        {`
          .plano-time-range::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 9999px;
            background: #059669;
            border: 3px solid #ffffff;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
            margin-top: -6px;
          }

          .plano-time-range::-webkit-slider-runnable-track {
            height: 4px;
            border-radius: 9999px;
            background: transparent;
          }

          .plano-time-range::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 9999px;
            background: #059669;
            border: 3px solid #ffffff;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
          }

          .plano-time-range::-moz-range-track {
            height: 4px;
            border-radius: 9999px;
            background: transparent;
          }
        `}
      </style>

      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Plano"
          description="Gestioná tus mesas y visualizá la ocupación en tiempo real."
          actions={
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap justify-end gap-2">

                {hasUnsavedChanges ? (
                  <V2Button variant="secondary">
                    <span className="mr-2 h-2 w-2 rounded-full bg-orange-400" />
                    Cambios sin guardar
                  </V2Button>
                ) : null}

                <V2Button variant="primary" onClick={saveChanges} disabled={isSupabasePersistence}>
                  Guardar cambios
                </V2Button>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <V2Button
                  variant="danger"
                  icon={<Trash2 size={17} />}
                  onClick={deleteSelectedTable}
                  disabled={!selectedTable || isSupabasePersistence}
                >
                  Eliminar mesa
                </V2Button>

                <V2Button
                  variant="secondary"
                  icon={<RotateCcw size={17} />}
                  onClick={restoreInitialLayout}
                  disabled={isSupabasePersistence}
                >
                  Restaurar layout
                </V2Button>

                <V2Button
                  variant="primary"
                  icon={<Plus size={17} />}
                  onClick={addMockTable}
                  disabled={isSupabasePersistence}
                >
                  Agregar mesa
                </V2Button>

                <V2Button
                  variant="secondary"
                  icon={<Layers size={17} />}
                  onClick={openBackgroundDialog}
                  disabled={isSupabasePersistence}
                >
                  Imagen de fondo
                </V2Button>
              </div>
            </div>
          }
        />

        {isSupabasePersistence ? (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <strong>Plano conectado a Supabase en modo lectura.</strong>{" "}
            Mesas, reservas, horarios y asignaciones provienen del negocio activo.
            La edición visual se habilitará en la próxima entrega.
          </div>
        ) : null}

        <input
          ref={backgroundInputRef}
          type="file"
          accept="image/*"
          onChange={handleBackgroundImageChange}
          className="hidden"
        />

        <div className="mt-3 rounded-3xl border border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-slate-50 px-4 py-3 shadow-sm">
          <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Mesas visibles
              </p>
              <p className="mt-1 font-semibold text-slate-950">
                {displayTables.length} mesas
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Ocupadas / reservadas
              </p>
              <p className="mt-1 font-semibold text-slate-950">
                {
                  displayTables.filter(
                    (table) => table.status === "occupied" || table.status === "reserved"
                  ).length
                }{" "}
                activas
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Horario visible
              </p>
              <p className="mt-1 font-semibold text-slate-950">
                {formatBusinessHourSlots(selectedDateBusinessSlots)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Edición de layout
              </p>
              <p className="mt-1 font-semibold text-slate-950">
                {isLayoutUnlocked ? "Desbloqueada" : "Bloqueada"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid min-h-0 flex-1 items-stretch gap-4 xl:grid-cols-[1fr_320px]">
          <div className="flex min-h-0 flex-col gap-3">
            <div className="-mt-1 shrink-0 [&_input]:h-9 [&_select]:h-9 [&_input]:text-xs [&_select]:text-xs">
              <V2FilterBar>
                <button
                  type="button"
                  onClick={() => moveSelectedDate(-1)}
                  disabled={selectedDate <= TODAY_DATE}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Día anterior"
                >
                  <ChevronLeft size={17} />
                </button>

                <div className="relative min-w-[255px]" data-plano-date-picker>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarMonth(selectedDate);
                      setIsDatePickerOpen((current) => !current);
                    }}
                    className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm font-semibold text-slate-950 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    <span className="truncate">{formatDateLabel(selectedDate)}</span>
                    <CalendarDays size={17} className="ml-3 shrink-0 text-slate-400" />
                  </button>

                  {isDatePickerOpen ? (
                    <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setCalendarMonth(moveMonth(calendarMonth, -1))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                          aria-label="Mes anterior"
                        >
                          <ChevronLeft size={17} />
                        </button>

                        <div className="text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Seleccionar día
                          </p>
                          <p className="mt-0.5 text-sm font-semibold capitalize text-slate-950">
                            {formatMonthLabel(calendarMonth)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCalendarMonth(moveMonth(calendarMonth, 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                          aria-label="Mes siguiente"
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day, index) => (
                          <div key={`weekday-${day}-${index}`} className="py-1">{day}</div>
                        ))}
                      </div>

                      <div className="mt-2 grid grid-cols-7 gap-1.5">
                        {calendarMonthDays.map((day, index) => {
                          const isDisabled = !day.date || day.date < TODAY_DATE || day.date > maxBookingDate;
                          const isSelected = day.date === selectedDate;
                          const hasReservations = day.date ? reservationDatesInMonth.has(day.date) : false;
                          const isToday = day.date === TODAY_DATE;

                          return (
                            <button
                              key={`${day.date || "empty"}-${index}`}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => selectCalendarDate(day.date)}
                              className={cn(
                                "relative flex h-9 items-center justify-center rounded-xl border text-xs font-semibold transition",
                                day.currentMonth ? "text-slate-700" : "text-transparent",
                                isSelected
                                  ? "border-emerald-700 bg-emerald-600 text-white shadow-sm"
                                  : isToday
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                    : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800",
                                isDisabled ? "cursor-not-allowed opacity-30 hover:bg-transparent" : ""
                              )}
                            >
                              {day.day || ""}
                              {hasReservations && !isSelected ? (
                                <Dot size={22} className="absolute -bottom-1 text-emerald-500" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                          <p className="font-semibold">Filtra la ocupación del plano por día.</p>
                          <p className="mt-1 text-emerald-800">
                            Día: {formatShortDate(selectedDate)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => selectCalendarDate(TODAY_DATE)}
                            className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            Hoy
                          </button>
                          <span className="h-9 rounded-xl border border-emerald-100 bg-emerald-50 px-3 pt-2 text-xs font-semibold text-emerald-800">
                            {localConfig.bookingWindowDays} días
                          </span>
                          <button
                            type="button"
                            onClick={applyCalendarDate}
                            className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => moveSelectedDate(1)}
                  disabled={selectedDate >= maxBookingDate}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Día siguiente"
                >
                  <ChevronRight size={17} />
                </button>

                {selectedDateBusinessSlots.length > 1 ? (
                  <div className="flex items-center gap-2">
                    {selectedDateBusinessSlots.map((slot, index) => (
                      <button
                        key={`${slot.open}-${slot.close}-${index}`}
                        type="button"
                        onClick={() => {
                          setActiveBusinessSlotIndex(index);
                          setSelectedTime(slot.open);
                        }}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-xs font-bold transition",
                          index === resolvedBusinessSlotIndex
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                        )}
                      >
                        Tramo {index + 1}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="flex min-w-[520px] flex-1 items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500">{sliderStartTime}</span>

                  <div className="relative flex-1 py-3">
                    <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-slate-200" />
                    <div
                      className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-emerald-500"
                      style={{
                        width: `${(selectedTimeSliderValue / sliderMaxValue) * 100}%`,
                      }}
                    />

                    <input
                      type="range"
                      min={0}
                      max={sliderMaxValue}
                      step={1}
                      value={selectedTimeSliderValue}
                      onChange={(event) =>
                        setSelectedTime(sliderValueToTime(Number(event.target.value), sliderStartTime))
                      }
                      disabled={!isSelectedDateOpen || !localConfig.reservationEnabled}
                      className="plano-time-range relative z-10 h-1 w-full cursor-pointer appearance-none rounded-full bg-transparent disabled:cursor-not-allowed"
                      aria-label="Horario del plano"
                    />

                    <div
                      className="pointer-events-none absolute top-[-20px] rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white shadow"
                      style={{
                        left: `calc(${(selectedTimeSliderValue / sliderMaxValue) * 100}% - 20px)`,
                      }}
                    >
                      {resolvedSelectedTime}
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-slate-500">{sliderEndTime}</span>
                </div>
              </V2FilterBar>
            </div>

            {(!localConfig.reservationEnabled || !isSelectedDateOpen) ? (
              <div className="-mt-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
                {!localConfig.reservationEnabled
                  ? "Las reservas están desactivadas desde Configuración."
                  : "El local figura cerrado para esta fecha según Configuración."}
              </div>
            ) : (
              <div className="-mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                Horario configurado:{" "}
                <strong className="text-slate-950">{formatBusinessHourSlots(selectedDateBusinessSlots)}</strong>
                {" "}· Duración estándar:{" "}
                <strong className="text-slate-950">{localConfig.standardDurationMinutes} min</strong>
                {" "}· Ventana:{" "}
                <strong className="text-slate-950">{localConfig.bookingWindowDays} días</strong>
              </div>
            )}

            <V2Card className="-mt-2 flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <div className="min-h-0 flex-1 overflow-hidden bg-slate-50 p-2">
                <div
                  ref={canvasRef}
                  className="relative mx-auto h-full min-h-0 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner [background-image:linear-gradient(rgba(226,232,240,0.24)_1px,transparent_1px),linear-gradient(90deg,rgba(226,232,240,0.24)_1px,transparent_1px)] [background-size:20px_20px]"
                  style={
                    backgroundImageUrl
                      ? {
                          backgroundImage: `linear-gradient(rgba(255,255,255,${backgroundSettings.fade / 100}), rgba(255,255,255,${backgroundSettings.fade / 100})), url(${backgroundImageUrl}), linear-gradient(rgba(226,232,240,0.24) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,240,0.24) 1px, transparent 1px)`,
                          backgroundPosition: `center, ${backgroundSettings.positionX}% ${backgroundSettings.positionY}%, 0 0, 0 0`,
                          backgroundSize: `cover, ${getBackgroundSize(backgroundSettings)}, 20px 20px, 20px 20px`,
                          backgroundRepeat: "no-repeat, no-repeat, repeat, repeat",
                        }
                      : undefined
                  }
                >
                  <div
                    className="absolute inset-0 origin-center transition-transform"
                    style={{ transform: `scale(${zoomLevel})` }}
                  >

                  {displayTables.map((table) => {
                    const isSelected = selectedTable?.id === table.id;
                    const isMarkedForMerge = mergeSelectionIds.includes(table.id);

                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => selectTable(table.id)}
                        onMouseDown={(event) => startMoveTable(event, table)}
                        className={`absolute flex flex-col items-center justify-center border-2 text-center text-[11px] font-semibold shadow-sm transition ${
                          activeTableInteraction?.tableId === table.id
                            ? "z-30"
                            : isSelected
                              ? "z-20"
                              : "z-10"
                        } ${
                          isLayoutUnlocked
                            ? "cursor-move hover:-translate-y-0.5 hover:shadow-md"
                            : "cursor-default"
                        } ${
                          STATUS_STYLES[table.status]
                        } ${getShapeClass(table.shape)} ${
                          isMarkedForMerge
                            ? "ring-4 ring-red-400"
                            : isSelected
                              ? "ring-4 ring-emerald-200"
                              : ""
                        }`}
                        style={{
                          left: `${table.x}%`,
                          top: `${table.y}%`,
                          width: table.width * 0.82,
                          height: table.height * 0.82,
                          transform: `rotate(${table.rotation}deg)`,
                        }}
                      >
                        <span className="max-w-[90%] truncate text-[clamp(9px,1.05vw,12px)] font-bold leading-tight text-slate-950">
                          {table.name}
                        </span>
                        <span className="mt-0.5 text-[clamp(8px,0.85vw,10px)] leading-tight text-slate-700">
                          {table.capacity}p
                        </span>

                        {table.reservationClient ? (
                          <span className="mt-1 flex w-[88%] min-w-0 flex-col items-center rounded-md bg-white/80 px-1 py-0.5 text-[9px] leading-tight shadow-sm">
                            <span className="block max-w-full truncate font-bold text-red-500">
                              {table.reservationTime}
                            </span>
                            <span className="block max-w-full truncate text-slate-700">
                              {table.reservationClient}
                            </span>
                          </span>
                        ) : null}

                        {table.locked ? (
                          <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-white shadow">
                            <Lock size={13} />
                          </span>
                        ) : null}

                        {isSelected && isLayoutUnlocked ? (
                          <span
                            onMouseDown={(event) => startResizeTable(event, table)}
                            className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded border border-emerald-400 bg-white shadow"
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                  </div>

                  {isMergeMode ? (
                    <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-red-200 bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-xl">
                      <span>Uniendo mesas</span>
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                        {mergeSelectionIds.length} seleccionadas
                      </span>
                      <button
                        type="button"
                        onClick={mergeSelectedTables}
                        disabled={mergeSelectionIds.length < 2}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Unir
                      </button>
                      <button
                        type="button"
                        onClick={cancelMergeMode}
                        className="rounded-xl bg-red-700 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={toggleLayoutLock}
                    disabled={isSupabasePersistence}
                    className={`absolute bottom-3 left-3 z-20 flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold shadow-sm backdrop-blur transition ${
                      isLayoutUnlocked
                        ? "border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border-slate-200 bg-white/95 text-slate-600 hover:bg-slate-100"
                    }`}
                    aria-label={isLayoutUnlocked ? "Bloquear movimiento de mesas" : "Desbloquear movimiento de mesas"}
                    title={isLayoutUnlocked ? "Mesas desbloqueadas" : "Mesas bloqueadas"}
                  >
                    {isLayoutUnlocked ? <Unlock size={18} /> : <Lock size={18} />}
                    <span>{isLayoutUnlocked ? "Bloquear mesas" : "Mover mesas"}</span>
                  </button>

                  <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
                    <button
                      type="button"
                      onClick={openBackgroundDialog}
                      disabled={isSupabasePersistence}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
                      aria-label="Configurar imagen de fondo"
                      title="Configurar imagen de fondo"
                    >
                      <ImageIcon size={16} />
                    </button>

                    <span className="h-5 w-px bg-slate-200" />

                    <button
                      type="button"
                      onClick={zoomOut}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                      aria-label="Alejar"
                    >
                      −
                    </button>
                    <span className="min-w-[52px] text-center text-xs font-semibold text-slate-600">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={zoomIn}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                      aria-label="Acercar"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </V2Card>
          </div>

          <aside className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <V2Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <h2 className="shrink-0 text-base font-semibold text-slate-950">
                Reserva sin mesa
              </h2>

              <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {unassignedReservationsForSelectedDate.map((reservation) => (
                  <button
                    key={reservation.id}
                    type="button"
                    onClick={openAssignDialog}
                    disabled={isSupabasePersistence}
                    className="flex w-full items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/40 p-2.5 text-left text-xs transition hover:bg-amber-50"
                  >
                    <span className="min-w-[42px] font-semibold text-orange-600">
                      {reservation.time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-950">
                        {reservation.client}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {reservation.people} personas · {reservation.note}
                      </p>
                    </div>
                    <V2Badge tone={reservation.status === "pending" ? "orange" : "green"}>
                      {reservation.status === "pending" ? "Pendiente" : "Confirmada"}
                    </V2Badge>
                  </button>
                ))}

                {unassignedReservationsForSelectedDate.length === 0 ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                    No hay reservas sin mesa en este horario.
                  </div>
                ) : null}
              </div>
            </V2Card>

            <V2Card className="flex h-[325px] shrink-0 flex-col overflow-hidden bg-gradient-to-b from-white to-slate-50/70">
              <div className="flex shrink-0 items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">
                  Propiedades
                </h2>
                {selectedTable ? renderStatusBadge(selectedTable.status) : null}
              </div>

              {selectedTable ? (
                <div className="mt-1.5 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 text-sm text-slate-600">
                  <p>
                    <strong className="text-slate-950">Mesa seleccionada:</strong>{" "}
                    {selectedTable.name}
                  </p>
                  <p>
                    <strong className="text-slate-950">Capacidad:</strong>{" "}
                    {selectedTable.capacity} personas
                  </p>
                  <p>
                    <strong className="text-slate-950">Forma:</strong>{" "}
                    {selectedTable.shape === "round"
                      ? "Redonda"
                      : selectedTable.shape === "rectangle"
                        ? "Rectangular"
                        : "Cuadrada"}
                  </p>
                  {selectedTable.mergedTables?.length ? (
                    <p>
                      <strong className="text-slate-950">Unión:</strong>{" "}
                      {selectedTable.mergedTables.map((table) => table.name).join(" + ")}
                    </p>
                  ) : null}
                  <p>
                    <strong className="text-slate-950">Reserva:</strong>{" "}
                    {selectedTable.reservationClient
                      ? `${selectedTable.reservationClient} (${selectedTable.reservationTime})`
                      : "Sin reserva asignada"}
                  </p>
                  <p>
                    <strong className="text-slate-950">Estado:</strong>{" "}
                    {selectedTable.status === "available"
                      ? "Disponible: sin reserva activa en este horario."
                      : selectedTable.status === "reserved"
                        ? "Reservada: reserva pendiente en este horario."
                        : selectedTable.status === "occupied"
                          ? "Ocupada: reserva confirmada en este horario."
                          : "Bloqueada: no admite reservas."}
                  </p>
                  <p>
                    <strong className="text-slate-950">Notas:</strong>{" "}
                    {selectedTable.note || "—"}
                  </p>

                  <div className="grid gap-1 pt-0.5">
                    <div className="grid grid-cols-3 gap-1.5">
                      <V2Button
                        variant="secondary"
                        icon={<Pencil size={16} />}
                        onClick={openSelectedTableEditor}
                        disabled={isSupabasePersistence}
                        title="Editar mesa"
                      >
                        <span className="sr-only">Editar mesa</span>
                      </V2Button>

                      {selectedTable.status === "blocked" ? (
                        <V2Button
                          variant="success"
                          icon={<Unlock size={16} />}
                          onClick={() => updateSelectedTableStatus("available")}
                          disabled={isSupabasePersistence}
                          title="Activar mesa"
                        >
                          <span className="sr-only">Activar mesa</span>
                        </V2Button>
                      ) : (
                        <V2Button
                          variant="secondary"
                          icon={<Lock size={16} />}
                          onClick={() => updateSelectedTableStatus("blocked")}
                          disabled={isSupabasePersistence}
                          title="Bloquear mesa"
                        >
                          <span className="sr-only">Bloquear mesa</span>
                        </V2Button>
                      )}

                      {selectedTable.mergedTables?.length ? (
                        <V2Button
                          variant="secondary"
                          icon={<Maximize2 size={16} />}
                          onClick={separateSelectedTable}
                          disabled={isSupabasePersistence || Boolean(selectedTable.reservationClient)}
                          title="Separar mesas"
                        >
                          <span className="sr-only">Separar mesas</span>
                        </V2Button>
                      ) : (
                        <V2Button
                          variant="secondary"
                          icon={<Minimize2 size={16} />}
                          onClick={startMergeMode}
                          disabled={
                            isSupabasePersistence ||
                            selectedTable.status !== "available" ||
                            Boolean(selectedTable.locked) ||
                            Boolean(selectedTable.reservationClient)
                          }
                          title="Unir mesas"
                        >
                          <span className="sr-only">Unir mesas</span>
                        </V2Button>
                      )}
                    </div>

                    {selectedTable.reservationClient ? (
                      <V2Button
                        variant="secondary"
                        icon={<X size={16} />}
                        onClick={openReleaseDialog}
                        disabled={isSupabasePersistence}
                      >
                        Quitar reserva
                      </V2Button>
                    ) : (
                      <V2Button
                        variant="primary"
                        icon={<CheckCircle2 size={16} />}
                        onClick={openAssignDialog}
                        disabled={isSupabasePersistence || !selectedTable || selectedTable.status === "blocked" || selectedTable.locked}
                      >
                        Asignar reserva
                      </V2Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Seleccioná una mesa para ver y editar sus propiedades.
                </p>
              )}
            </V2Card>

          </aside>
        </div>
      </div>

      {isReleaseDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={closeActivePopup}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">Liberar mesa</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {selectedTable ? `Quitar reserva de ${selectedTable.name}` : "Quitar reserva"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeReleaseDialog}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p>
                  Vas a quitar la reserva activa de esta mesa. La reserva seguirá
                  existiendo en <strong className="text-slate-950">/reservas</strong>,
                  pero quedará sin mesa asignada.
                </p>

                {selectedTable?.reservationClient ? (
                  <p className="mt-3 font-semibold text-slate-950">
                    {selectedTable.reservationClient} · {selectedTable.reservationTime}
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end gap-2">
                <V2Button variant="secondary" onClick={closeReleaseDialog}>
                  Cancelar
                </V2Button>
                <V2Button variant="danger" onClick={clearSelectedReservation}>
                  Liberar mesa
                </V2Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isAssignDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={closeActivePopup}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">Asignar reserva</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {selectedTable ? `Asignar a ${selectedTable.name}` : "Seleccioná una mesa"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDateLabel(selectedDate)} · {resolvedSelectedTime}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAssignDialog}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-6">
              {assignReservationError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {assignReservationError}
                </div>
              ) : null}

              {selectedTable?.status === "blocked" || selectedTable?.locked ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Esta mesa está bloqueada. Activala antes de asignarle una reserva.
                </div>
              ) : null}

              {unassignedReservationsForSelectedDate.length > 0 ? (
                <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
                  {unassignedReservationsForSelectedDate.map((reservation) => {
                    const fullReservation = planoReservations.find(
                      (item) => item.id === reservation.id
                    );
                    const capacityWarning =
                      selectedTable && reservation.people > selectedTable.capacity;

                    return (
                      <div
                        key={reservation.id}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="min-w-[54px] text-sm font-bold text-emerald-600">
                          {reservation.time}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-950">
                            {reservation.client}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {reservation.people} personas · {reservation.note}
                          </p>

                          {capacityWarning ? (
                            <p className="mt-2 text-xs font-semibold text-red-600">
                              Supera la capacidad de {selectedTable.name}.
                            </p>
                          ) : null}

                          {fullReservation ? (
                            <p className="mt-1 text-xs text-slate-400">
                              Duración: {fullReservation.durationMinutes ?? 120} min
                            </p>
                          ) : null}
                        </div>

                        <V2Badge tone={reservation.status === "pending" ? "orange" : "green"}>
                          {reservation.status === "pending" ? "Pendiente" : "Confirmada"}
                        </V2Badge>

                        <V2Button
                          variant="primary"
                          onClick={() => assignReservationToSelectedTable(reservation.id)}
                          disabled={!selectedTable || selectedTable.status === "blocked" || selectedTable.locked || capacityWarning}
                        >
                          Asignar
                        </V2Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  No hay reservas sin mesa para esta fecha y horario.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isBackgroundDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={closeActivePopup}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">Plano</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Imagen de fondo
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cargá una imagen y ajustá cómo se adapta al contenedor del plano.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBackgroundDialog}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-[1fr_240px]">
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <V2Button
                    variant="secondary"
                    icon={<ImageIcon size={17} />}
                    onClick={triggerBackgroundImageUpload}
                  >
                    Cargar imagen
                  </V2Button>

                  <V2Button
                    variant="danger"
                    onClick={removeBackgroundImage}
                    disabled={!backgroundImageUrl}
                  >
                    Eliminar imagen
                  </V2Button>
                </div>

                {backgroundStorageError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    {backgroundStorageError}
                  </div>
                ) : null}

                <V2Field label="Ajuste de imagen">
                  <V2Select
                    value={backgroundSettings.fit}
                    onChange={(event) =>
                      updateBackgroundSettings({
                        ...backgroundSettings,
                        fit: event.target.value as V2BackgroundFit,
                      })
                    }
                  >
                    <option value="cover">Fill / cubrir contenedor</option>
                    <option value="contain">Contain / mostrar completa</option>
                    <option value="stretch">Stretch / estirar</option>
                    <option value="custom">Tamaño manual</option>
                  </V2Select>
                </V2Field>

                {backgroundSettings.fit === "custom" ? (
                  <V2Field label={`Tamaño manual: ${backgroundSettings.scale}%`}>
                    <input
                      type="range"
                      min={25}
                      max={250}
                      step={5}
                      value={backgroundSettings.scale}
                      onChange={(event) =>
                        updateBackgroundSettings({
                          ...backgroundSettings,
                          scale: Number(event.target.value),
                        })
                      }
                      className="w-full accent-emerald-600"
                    />
                  </V2Field>
                ) : null}

                {backgroundSettings.fit !== "stretch" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <V2Field label={`Posición X: ${backgroundSettings.positionX}%`}>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={backgroundSettings.positionX}
                        onChange={(event) =>
                          updateBackgroundSettings({
                            ...backgroundSettings,
                            positionX: Number(event.target.value),
                          })
                        }
                        className="w-full accent-emerald-600"
                      />
                    </V2Field>

                    <V2Field label={`Posición Y: ${backgroundSettings.positionY}%`}>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={backgroundSettings.positionY}
                        onChange={(event) =>
                          updateBackgroundSettings({
                            ...backgroundSettings,
                            positionY: Number(event.target.value),
                          })
                        }
                        className="w-full accent-emerald-600"
                      />
                    </V2Field>
                  </div>
                ) : null}

                <V2Field label={`Opacidad visual: ${100 - backgroundSettings.fade}%`}>
                  <input
                    type="range"
                    min={0}
                    max={95}
                    step={5}
                    value={100 - backgroundSettings.fade}
                    onChange={(event) =>
                      updateBackgroundSettings({
                        ...backgroundSettings,
                        fade: 100 - Number(event.target.value),
                      })
                    }
                    className="w-full accent-emerald-600"
                  />
                </V2Field>

                <p className="text-xs leading-5 text-slate-500">
                  La imagen y sus ajustes se guardan en este navegador. Usá Stretch si querés deformarla para que ocupe exactamente todo el plano.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Vista previa
                </p>

                <div
                  className="mt-3 h-40 overflow-hidden rounded-xl border border-slate-200 bg-white"
                  style={
                    backgroundImageUrl
                      ? {
                          backgroundImage: `linear-gradient(rgba(255,255,255,${backgroundSettings.fade / 100}), rgba(255,255,255,${backgroundSettings.fade / 100})), url(${backgroundImageUrl})`,
                          backgroundPosition: `center, ${backgroundSettings.positionX}% ${backgroundSettings.positionY}%`,
                          backgroundSize: `cover, ${getBackgroundSize(backgroundSettings)}`,
                          backgroundRepeat: "no-repeat, no-repeat",
                        }
                      : undefined
                  }
                >
                  {!backgroundImageUrl ? (
                    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-500">
                      Sin imagen cargada
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
                  <strong className="text-slate-950">Modo actual:</strong>{" "}
                  {backgroundSettings.fit === "cover"
                    ? "Fill / cubrir"
                    : backgroundSettings.fit === "contain"
                      ? "Contain / completa"
                      : backgroundSettings.fit === "stretch"
                        ? "Stretch / estirada"
                        : "Manual"}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <V2Button variant="primary" onClick={closeBackgroundDialog}>
                Listo
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}

      {editingTable ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={closeActivePopup}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">Editar mesa</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {editingTable.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeTableEditor}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <V2Field label="Nombre">
                  <V2Input
                    value={editingTable.name}
                    onChange={(event) =>
                      setEditingTable({ ...editingTable, name: event.target.value })
                    }
                  />
                </V2Field>

                <V2Field label="Capacidad">
                  <V2Input
                    type="number"
                    min={1}
                    value={editingTable.capacity}
                    onChange={(event) =>
                      setEditingTable({
                        ...editingTable,
                        capacity: Number(event.target.value),
                      })
                    }
                  />
                </V2Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <V2Field label="Forma">
                  <V2Select
                    value={editingTable.shape}
                    onChange={(event) =>
                      setEditingTable({
                        ...editingTable,
                        shape: event.target.value as V2TableShape,
                      })
                    }
                  >
                    <option value="round">Redonda</option>
                    <option value="square">Cuadrada</option>
                    <option value="rectangle">Rectangular</option>
                  </V2Select>
                </V2Field>

                <V2Field label="Estado">
                  <V2Select
                    value={editingTable.status}
                    onChange={(event) =>
                      setEditingTable({
                        ...editingTable,
                        status: event.target.value as V2TableStatus,
                        locked: event.target.value === "blocked",
                      })
                    }
                  >
                    <option value="available">Disponible</option>
                    <option value="reserved">Reservada</option>
                    <option value="occupied">Ocupada</option>
                    <option value="blocked">Bloqueada</option>
                  </V2Select>
                </V2Field>
              </div>

              <V2Field label="Notas">
                <V2Textarea
                  value={editingTable.note ?? ""}
                  onChange={(event) =>
                    setEditingTable({ ...editingTable, note: event.target.value })
                  }
                />
              </V2Field>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
              <V2Button
                variant="danger"
                icon={<Trash2 size={16} />}
                onClick={deleteEditingTable}
                disabled={Boolean(editingTable.reservationClient)}
                title={
                  editingTable.reservationClient
                    ? "No se puede eliminar una mesa con reserva activa en este horario"
                    : "Eliminar mesa"
                }
              >
                Eliminar mesa
              </V2Button>

              <div className="flex justify-end gap-2">
                <V2Button variant="secondary" onClick={closeTableEditor}>
                  Cancelar
                </V2Button>
                <V2Button variant="primary" onClick={saveTableEditor}>
                  Guardar mesa
                </V2Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </V2AppShell>
  );
}
