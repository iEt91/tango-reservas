import type { JoinedTable } from "@/data/types";
import { getFloorTablesByBusinessId } from "@/data/floor-plan";
import { LOCAL_STORE_EVENTS, LOCAL_STORE_KEYS } from "@/lib/data/localStore";

const STORAGE_KEY = LOCAL_STORE_KEYS.joinedTables;
const CHANGE_EVENT = LOCAL_STORE_EVENTS.joinedTables;

let joinedTablesStore: JoinedTable[] = [];
let hasHydratedFromStorage = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `joined-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
}

function cloneJoinedTable(joinedTable: JoinedTable) {
  return {
    ...joinedTable,
    tableIds: [...joinedTable.tableIds],
  };
}

function cloneJoinedTables(joinedTables: JoinedTable[]) {
  return joinedTables.map(cloneJoinedTable);
}

function readJoinedTablesFromStorage() {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as JoinedTable[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadStoreIfNeeded() {
  if (!isBrowser() || hasHydratedFromStorage) {
    return;
  }

  hasHydratedFromStorage = true;
  const storedJoinedTables = readJoinedTablesFromStorage();
  if (storedJoinedTables) {
    joinedTablesStore = storedJoinedTables;
  }
}

function persistStore() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(joinedTablesStore));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function updateStore(nextJoinedTables: JoinedTable[]) {
  joinedTablesStore = nextJoinedTables;
  hasHydratedFromStorage = true;
  persistStore();
}

function getStoreIndex(joinedTableId: string) {
  return joinedTablesStore.findIndex((joinedTable) => joinedTable.id === joinedTableId);
}

function getJoinedTableLabels(tableIds: string[], businessId: string) {
  const tables = getFloorTablesByBusinessId(businessId);
  const selectedLabels = tableIds
    .map((tableId) => tables.find((table) => table.id === tableId)?.label ?? tableId)
    .filter(Boolean);

  return selectedLabels;
}

function buildJoinedTableLabel(labels: string[]) {
  const cleanLabels = [...new Set(labels.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
  if (cleanLabels.length === 0) {
    return "Mesa unida";
  }

  if (cleanLabels.length === 1) {
    return cleanLabels[0];
  }

  const parts = cleanLabels.map((label) => label.trim().split(/\s+/));
  const firstToken = parts[0]?.[0];
  const samePrefix = firstToken && parts.every((entry) => entry[0] === firstToken);

  if (samePrefix) {
    const suffixes = parts
      .map((entry) => entry.slice(1).join(" "))
      .filter(Boolean)
      .join("-");
    if (suffixes) {
      return `${firstToken} ${suffixes}`;
    }
  }

  return cleanLabels.join(" + ");
}

function normalizeJoinedTable(joinedTable: JoinedTable): JoinedTable {
  return {
    ...joinedTable,
    tableIds: [...new Set(joinedTable.tableIds)],
  };
}

export function getJoinedTablesByBusinessId(businessId: string) {
  loadStoreIfNeeded();
  return cloneJoinedTables(
    joinedTablesStore.filter((joinedTable) => joinedTable.businessId === businessId),
  );
}

export function getJoinedTableById(joinedTableId: string) {
  loadStoreIfNeeded();
  const joinedTable =
    joinedTablesStore.find((entry) => entry.id === joinedTableId) ?? null;
  return joinedTable ? cloneJoinedTable(joinedTable) : null;
}

export function getJoinedTableByReservationId(reservationId: string) {
  loadStoreIfNeeded();
  const joinedTable =
    joinedTablesStore.find(
      (entry) => entry.reservationId === reservationId && entry.status === "active",
    ) ?? null;
  return joinedTable ? cloneJoinedTable(joinedTable) : null;
}

export function getActiveJoinedTablesForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  loadStoreIfNeeded();
  return cloneJoinedTables(
    joinedTablesStore.filter(
      (joinedTable) =>
        joinedTable.businessId === businessId &&
        joinedTable.status === "active" &&
        joinedTable.reservationDate === date &&
        joinedTable.reservationTime === time,
    ),
  );
}

export function createJoinedTable(
  businessId: string,
  tableIds: string[],
  reservationId?: string | null,
  reservationDate?: string | null,
  reservationTime?: string | null,
) {
  loadStoreIfNeeded();

  const uniqueTableIds = [...new Set(tableIds.filter(Boolean))];
  const tables = getFloorTablesByBusinessId(businessId);
  const selectedTables = uniqueTableIds
    .map((tableId) => tables.find((table) => table.id === tableId) ?? null)
    .filter((table): table is (typeof tables)[number] => table !== null);
  selectedTables.sort((left, right) => left.label.localeCompare(right.label));
  const orderedTableIds = selectedTables.map((table) => table.id);

  const labels = getJoinedTableLabels(orderedTableIds, businessId);
  const totalSeats = selectedTables.reduce((sum, table) => sum + table.seats, 0);
  const existingIndex =
    reservationId == null
      ? -1
      : joinedTablesStore.findIndex(
          (joinedTable) =>
            joinedTable.reservationId === reservationId && joinedTable.status === "active",
        );

  const baseJoinedTable: JoinedTable = normalizeJoinedTable({
    id:
      existingIndex >= 0
        ? joinedTablesStore[existingIndex].id
        : createId(),
    businessId,
    tableIds: orderedTableIds,
    label: buildJoinedTableLabel(labels),
    totalSeats,
    reservationId: reservationId ?? null,
    reservationDate: reservationDate ?? null,
    reservationTime: reservationTime ?? null,
    status: "active",
    createdAt:
      existingIndex >= 0
        ? joinedTablesStore[existingIndex].createdAt
        : nowIso(),
    updatedAt: nowIso(),
  });

  if (existingIndex >= 0) {
    updateStore(
      joinedTablesStore.map((entry, entryIndex) =>
        entryIndex === existingIndex ? baseJoinedTable : entry,
      ),
    );
  } else {
    updateStore([baseJoinedTable, ...joinedTablesStore]);
  }

  return cloneJoinedTable(baseJoinedTable);
}

export function releaseJoinedTable(joinedTableId: string) {
  loadStoreIfNeeded();
  const index = getStoreIndex(joinedTableId);
  if (index === -1) {
    return null;
  }

  const timestamp = nowIso();
  const updatedJoinedTable: JoinedTable = {
    ...joinedTablesStore[index],
    status: "released",
    reservationId: null,
    reservationDate: null,
    reservationTime: null,
    updatedAt: timestamp,
  };

  updateStore(
    joinedTablesStore.map((entry, entryIndex) =>
      entryIndex === index ? updatedJoinedTable : entry,
    ),
  );

  return cloneJoinedTable(updatedJoinedTable);
}

export function deleteJoinedTable(joinedTableId: string) {
  loadStoreIfNeeded();
  const index = getStoreIndex(joinedTableId);
  if (index === -1) {
    return false;
  }

  updateStore(joinedTablesStore.filter((entry) => entry.id !== joinedTableId));
  return true;
}

export function resetJoinedTablesForBusiness(businessId: string) {
  loadStoreIfNeeded();
  updateStore(
    joinedTablesStore.filter((joinedTable) => joinedTable.businessId !== businessId),
  );
}

export function deleteJoinedTablesContainingTable(businessId: string, tableId: string) {
  loadStoreIfNeeded();
  updateStore(
    joinedTablesStore.filter(
      (joinedTable) =>
        joinedTable.businessId !== businessId || !joinedTable.tableIds.includes(tableId),
    ),
  );
}

export function subscribeJoinedTables(listener: () => void) {
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
