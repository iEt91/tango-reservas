import type { FloorTable, FloorTableShape, FloorTableStatus } from "@/data/types";
import { initialFloorTables, defaultTablePositions } from "@/mocks/floor-plan";
import {
  clampTableCornerRadius,
  normalizeTableDimensions,
  TABLE_DEFAULT_CORNER_RADIUS,
} from "@/components/local-floor-plan/table-geometry";
import { LOCAL_STORE_EVENTS, LOCAL_STORE_KEYS } from "@/lib/data/localStore";

const STORAGE_KEY = LOCAL_STORE_KEYS.floorPlan;
const CHANGE_EVENT = LOCAL_STORE_EVENTS.floorPlan;

let floorTablesStore: FloorTable[] = initialFloorTables.map((table) => ({ ...table }));
let hasHydratedFromStorage = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function cloneTable(table: FloorTable) {
  return { ...table };
}

function cloneTables(tables: FloorTable[]) {
  return tables.map(cloneTable);
}

function normalizeStoredTable(
  table: Partial<FloorTable> & Pick<FloorTable, "id" | "businessId" | "createdAt" | "updatedAt">,
): FloorTable {
  const shape = table.shape ?? "square";
  const dimensions = normalizeTableDimensions(shape, table.width ?? 130, table.height ?? 90);

  return {
    id: table.id,
    businessId: table.businessId,
    label: table.label ?? "Mesa",
    seats: table.seats ?? 4,
    x: table.x ?? 80,
    y: table.y ?? 80,
    width: dimensions.width,
    height: dimensions.height,
    rotation: table.rotation ?? 0,
    status: table.status ?? "available",
    shape,
    cornerRadius: clampTableCornerRadius(table.cornerRadius ?? TABLE_DEFAULT_CORNER_RADIUS),
    isJoinable: table.isJoinable ?? true,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
  };
}

function readTablesFromStorage() {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as FloorTable[];
    return Array.isArray(parsed) ? parsed.map(normalizeStoredTable) : null;
  } catch {
    return null;
  }
}

function loadStoreIfNeeded() {
  if (!isBrowser() || hasHydratedFromStorage) {
    return;
  }

  hasHydratedFromStorage = true;
  const storedTables = readTablesFromStorage();
  if (storedTables) {
    floorTablesStore = storedTables;
  }
}

function persistStore() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(floorTablesStore));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function updateStore(nextTables: FloorTable[]) {
  floorTablesStore = nextTables;
  hasHydratedFromStorage = true;
  persistStore();
}

function getFallbackTables(businessId: string) {
  const fallback = defaultTablePositions[businessId as keyof typeof defaultTablePositions];
  return fallback ? fallback.map((table) => normalizeStoredTable(table)) : [];
}

function getStoreIndex(tableId: string) {
  return floorTablesStore.findIndex((table) => table.id === tableId);
}

function normalizeTable(
  businessId: string,
  data: Partial<
    Pick<
      FloorTable,
      | "label"
      | "seats"
      | "x"
      | "y"
      | "width"
      | "height"
      | "rotation"
      | "status"
      | "shape"
      | "cornerRadius"
      | "isJoinable"
    >
  >,
  id?: string,
): FloorTable {
  const timestamp = nowIso();
  const shape = data.shape ?? "square";
  const dimensions = normalizeTableDimensions(shape, data.width ?? 130, data.height ?? 90);
  return {
    id:
      id ??
      (globalThis.crypto?.randomUUID?.() ??
        `table-${businessId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    businessId,
    label: data.label ?? "Nueva mesa",
    seats: data.seats ?? 4,
    x: data.x ?? 80,
    y: data.y ?? 80,
    width: dimensions.width,
    height: dimensions.height,
    rotation: data.rotation ?? 0,
    status: data.status ?? "available",
    shape,
    cornerRadius: clampTableCornerRadius(data.cornerRadius ?? TABLE_DEFAULT_CORNER_RADIUS),
    isJoinable: data.isJoinable ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getFloorTablesByBusinessId(businessId: string) {
  loadStoreIfNeeded();
  const tables = floorTablesStore.filter((table) => table.businessId === businessId);
  return cloneTables(
    tables.length > 0 ? tables.map(normalizeStoredTable) : getFallbackTables(businessId),
  );
}

export function createFloorTable(
  businessId: string,
  data: Partial<
    Pick<
      FloorTable,
      | "label"
      | "seats"
      | "x"
      | "y"
      | "width"
      | "height"
      | "rotation"
      | "status"
      | "shape"
      | "cornerRadius"
      | "isJoinable"
    >
  >,
) {
  loadStoreIfNeeded();
  const nextTable = normalizeTable(businessId, data);
  updateStore([nextTable, ...floorTablesStore]);
  return cloneTable(nextTable);
}

export function updateFloorTable(
  tableId: string,
  data: Partial<
    Pick<
      FloorTable,
      | "label"
      | "seats"
      | "x"
      | "y"
      | "width"
      | "height"
      | "rotation"
      | "status"
      | "shape"
      | "cornerRadius"
      | "isJoinable"
    >
  >,
) {
  loadStoreIfNeeded();
  const index = getStoreIndex(tableId);
  if (index === -1) {
    return null;
  }

  const timestamp = nowIso();
  const updatedTable: FloorTable = {
    ...floorTablesStore[index],
    ...data,
    updatedAt: timestamp,
  };

  updateStore(
    floorTablesStore.map((table, tableIndex) =>
      tableIndex === index ? updatedTable : table,
    ),
  );

  return cloneTable(updatedTable);
}

export function updateFloorTablePosition(tableId: string, x: number, y: number) {
  loadStoreIfNeeded();
  const index = getStoreIndex(tableId);
  if (index === -1) {
    return null;
  }

  const timestamp = nowIso();
  const updatedTable: FloorTable = {
    ...floorTablesStore[index],
    x,
    y,
    updatedAt: timestamp,
  };

  updateStore(
    floorTablesStore.map((table, tableIndex) =>
      tableIndex === index ? updatedTable : table,
    ),
  );

  return cloneTable(updatedTable);
}

export function deleteFloorTable(tableId: string) {
  loadStoreIfNeeded();
  const index = getStoreIndex(tableId);
  if (index === -1) {
    return false;
  }

  updateStore(floorTablesStore.filter((table) => table.id !== tableId));
  return true;
}

export function deleteFloorPlanForBusiness(businessId: string) {
  loadStoreIfNeeded();
  updateStore(floorTablesStore.filter((table) => table.businessId !== businessId));
}

export function duplicateFloorPlanForBusiness(sourceBusinessId: string, targetBusinessId: string) {
  loadStoreIfNeeded();
  const sourceTables = floorTablesStore.filter((table) => table.businessId === sourceBusinessId);
  const duplicatedTables = sourceTables.map((table) => ({
    ...table,
    id:
      globalThis.crypto?.randomUUID?.() ??
      `table-${targetBusinessId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    businessId: targetBusinessId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));

  updateStore([
    ...floorTablesStore.filter((table) => table.businessId !== targetBusinessId),
    ...duplicatedTables,
  ]);
}

export function resetFloorPlan(businessId: string) {
  loadStoreIfNeeded();
  const fallback = getFallbackTables(businessId).map((table) => ({ ...table }));
  const nextTables = [
    ...floorTablesStore.filter((table) => table.businessId !== businessId),
    ...fallback,
  ];

  updateStore(nextTables);
  return getFloorTablesByBusinessId(businessId);
}

export function getDefaultFloorPlanForBusiness(businessId: string) {
  return getFallbackTables(businessId);
}

export function getFloorPlanStateSummary(businessId: string) {
  const tables = getFloorTablesByBusinessId(businessId);
  const totalSeats = tables.reduce((sum, table) => sum + table.seats, 0);
  const available = tables.filter((table) => table.status === "available").length;
  const occupied = tables.filter((table) => table.status === "occupied").length;
  const reserved = tables.filter((table) => table.status === "reserved").length;
  const blocked = tables.filter((table) => table.status === "blocked").length;
  const outOfService = tables.filter((table) => table.status === "out_of_service").length;

  return {
    totalTables: tables.length,
    totalSeats,
    available,
    occupied,
    reserved,
    blocked,
    outOfService,
  };
}

export function subscribeFloorPlan(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const onCustomChange = () => listener();
  const onStorageChange = () => listener();

  window.addEventListener(CHANGE_EVENT, onCustomChange);
  window.addEventListener("storage", onStorageChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustomChange);
    window.removeEventListener("storage", onStorageChange);
  };
}

export type { FloorTableStatus, FloorTableShape };

// Plano local/mock: la persistencia vive en este navegador hasta que
// conectemos Supabase y una logica real de mesas/asignacion.
