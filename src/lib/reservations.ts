import type {
  CreateReservationInput,
  FloorTable,
  JoinedTable,
  Reservation,
  ReservationStatus,
  TableOccupancySummary,
} from "@/data/types";
import { getFloorTablesByBusinessId } from "@/data/floor-plan";
import {
  createJoinedTable,
  deleteJoinedTable,
  getActiveJoinedTablesForSlot,
  getJoinedTableByReservationId,
  releaseJoinedTable,
  resetJoinedTablesForBusiness,
} from "@/data/joined-tables";
import { getBusinessHours, getBusinessServices, getReservationRules } from "@/data/scheduling";
import { initialReservations } from "@/mocks/reservations";
import { initialBusinesses } from "@/mocks/businesses";
import { calculateAvailabilityForReservations } from "./availability-core";
import { LOCAL_STORE_EVENTS, LOCAL_STORE_KEYS } from "@/lib/data/localStore";
import {
  findAvailableTableForReservation,
  getOccupiedTableIdsForSlot as getOccupiedTableIdsForSlotFromAvailability,
  getReservationDurationMinutes,
  getReservationsOverlappingSlot,
  isReservationActiveAtSlot,
  normalizeAssignedTableIds,
  reservationUsesTable,
} from "@/lib/reservation-availability";

const STORAGE_KEY = LOCAL_STORE_KEYS.reservations;
const CHANGE_EVENT = LOCAL_STORE_EVENTS.reservations;

let reservationsStore: Reservation[] = initialReservations.map((reservation) => ({
  ...reservation,
}));
let hasHydratedFromStorage = false;

function cloneReservation(reservation: Reservation) {
  return { ...reservation };
}

function cloneReservations(reservations: Reservation[]) {
  return reservations.map(cloneReservation);
}

function getAutoConfirmReservationsForBusiness(businessId: string) {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORE_KEYS.businesses);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<Partial<{ id: string; autoConfirmReservations: boolean }>>;
        const current = parsed.find((entry) => entry.id === businessId);
        if (typeof current?.autoConfirmReservations === "boolean") {
          return current.autoConfirmReservations;
        }
      }
    } catch {
      // fallback below
    }
  }

  return initialBusinesses.find((business) => business.id === businessId)?.autoConfirmReservations ?? true;
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function isSequentialDigits(value: string) {
  if (value.length < 8) {
    return false;
  }

  let ascending = true;
  let descending = true;

  for (let index = 1; index < value.length; index += 1) {
    const previous = Number(value[index - 1]);
    const current = Number(value[index]);

    if (current !== previous + 1) {
      ascending = false;
    }

    if (current !== previous - 1) {
      descending = false;
    }
  }

  return ascending || descending;
}

function isRepeatedPattern(value: string) {
  if (value.length < 8) {
    return false;
  }

  for (let size = 1; size <= 3; size += 1) {
    if (value.length % size !== 0) {
      continue;
    }

    const pattern = value.slice(0, size);
    if (pattern.repeat(value.length / size) === value) {
      return true;
    }
  }

  return false;
}

export function validatePhone(phone: string) {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return {
      valid: false,
      normalized,
      error: "Ingresá un teléfono válido para poder reservar.",
    };
  }

  if (normalized.length < 8) {
    return {
      valid: false,
      normalized,
      error: "El teléfono parece demasiado corto.",
    };
  }

  if (normalized.length > 15) {
    return {
      valid: false,
      normalized,
      error: "El teléfono parece demasiado largo.",
    };
  }

  if (/^(\d)\1+$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "Este número parece de prueba. Ingresá un teléfono real.",
    };
  }

  if (isSequentialDigits(normalized) || isRepeatedPattern(normalized)) {
    return {
      valid: false,
      normalized,
      error: "El teléfono parece inválido. Revisalo antes de continuar.",
    };
  }

  return {
    valid: true,
    normalized,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
}

function buildReservationDedupKey(reservation: Reservation) {
  if (reservation.id) {
    return `id:${reservation.id}`;
  }

  return [
    reservation.businessId,
    reservation.reservationDate,
    reservation.reservationTime,
    normalizePhone(reservation.customerPhone),
    reservation.serviceId,
    reservation.customerName.trim().toLowerCase(),
  ].join("|");
}

export function dedupeReservations(reservations: Reservation[]) {
  const deduped = new Map<string, Reservation>();

  for (const reservation of reservations) {
    deduped.set(buildReservationDedupKey(reservation), reservation);
  }

  return [...deduped.values()];
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readReservationsFromStorage() {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Reservation[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadFromStorageIfNeeded() {
  if (!isBrowser() || hasHydratedFromStorage) {
    return;
  }

  hasHydratedFromStorage = true;
  const storedReservations = readReservationsFromStorage();
  if (storedReservations) {
    reservationsStore = dedupeReservations(storedReservations);
  } else {
    reservationsStore = dedupeReservations(
      initialReservations.map((reservation) => ({ ...reservation })),
    );
  }
}

function refreshFromStorage() {
  const storedReservations = readReservationsFromStorage();
  if (storedReservations) {
    reservationsStore = dedupeReservations(storedReservations);
  } else {
    reservationsStore = dedupeReservations(
      initialReservations.map((reservation) => ({ ...reservation })),
    );
  }

  hasHydratedFromStorage = true;
}

function persistStore() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reservationsStore));
}

function notifySubscribers() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function updateStore(nextReservations: Reservation[]) {
  reservationsStore = dedupeReservations(nextReservations);
  hasHydratedFromStorage = true;
  persistStore();
  notifySubscribers();
}

function sortReservations(reservations: Reservation[]) {
  return [...reservations].sort((left, right) => {
    const dateCompare = left.reservationDate.localeCompare(right.reservationDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return left.reservationTime.localeCompare(right.reservationTime);
  });
}

const dashboardStatusPriority: Record<ReservationStatus, number> = {
  pending: 1,
  confirmed: 2,
  completed: 3,
  no_show: 4,
  cancelled: 5,
};

const activeReservationStatuses: ReservationStatus[] = [
  "pending",
  "confirmed",
];

const activePhoneReservationStatuses: ReservationStatus[] = [
  "pending",
  "confirmed",
];

function occupiesTable(status: ReservationStatus) {
  return activeReservationStatuses.includes(status);
}

function isTableBlockedForAvailability(table: FloorTable) {
  return (
    table.status === "blocked" ||
    table.status === "out_of_service"
  );
}

function getTableBaseAvailabilityReason(table: FloorTable) {
  if (table.status === "blocked") {
    return "La mesa esta bloqueada.";
  }

  if (table.status === "out_of_service") {
    return "La mesa esta fuera de servicio.";
  }

  return null;
}

export function getTablesForBusiness(businessId: string) {
  return getFloorTablesByBusinessId(businessId);
}

export type ReservationTableSuggestion = {
  tableIds: string[];
  tableLabel: string;
  seats: number;
  excessSeats: number;
  kind: "single" | "joined";
  available: boolean;
  suggested: boolean;
  reason?: string | null;
};

export type ReservationTableAssignmentValidation = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

export type ReservationTableAvailabilitySummary = {
  reservationId: string;
  businessId: string;
  date: string;
  time: string;
  validation: ReservationTableAssignmentValidation;
  singleSuggestions: ReservationTableSuggestion[];
  joinedSuggestions: ReservationTableSuggestion[];
  hasSuggestions: boolean;
  availableTableCount: number;
};

export type PublicTableAssignmentResult = {
  singleSuggestions: ReservationTableSuggestion[];
  joinedSuggestions: ReservationTableSuggestion[];
  bestSuggestion: ReservationTableSuggestion | null;
  reason: string | null;
};

function getTableSlotConflictReason(
  reservation: Reservation,
  table: FloorTable,
  slotReservations: Reservation[],
  activeJoinedTables: JoinedTable[],
) {
  const baseReason = getTableBaseAvailabilityReason(table);
  if (baseReason) {
    return baseReason;
  }

  if (table.seats < reservation.partySize) {
    return "La mesa no tiene suficientes asientos.";
  }

  const occupiedByJoinedTable = activeJoinedTables.find(
    (joinedTable) =>
      joinedTable.reservationId !== reservation.id &&
      joinedTable.tableIds.includes(table.id),
  );
  if (occupiedByJoinedTable) {
    return "La mesa ya esta unida a otra reserva en ese horario.";
  }

  const occupiedByOverlappingJoinedTable = slotReservations.find((entry) => {
    if (entry.id === reservation.id || !entry.joinedTableId) {
      return false;
    }

    const joinedTable = getJoinedTableByReservationId(entry.id);
    return Boolean(joinedTable && joinedTable.tableIds.includes(table.id));
  });
  if (occupiedByOverlappingJoinedTable) {
    return "La mesa ya esta unida a otra reserva en ese horario.";
  }

  const conflictingReservation = slotReservations.find(
    (entry) =>
      entry.id !== reservation.id &&
      reservationUsesTable(entry, table.id) &&
      occupiesTable(entry.status),
  );

  if (conflictingReservation) {
    return "La mesa ya esta asignada a otra reserva en ese horario.";
  }

  return null;
}

function buildJoinedTableSlotConflictReason(
  reservation: Reservation,
  selectedTables: FloorTable[],
  slotReservations: Reservation[],
  activeJoinedTables: JoinedTable[],
) {
  if (selectedTables.length < 2) {
    return "Selecciona al menos 2 mesas.";
  }

  const totalSeats = selectedTables.reduce((sum, table) => sum + table.seats, 0);
  if (totalSeats < reservation.partySize) {
    return "La combinacion no tiene suficientes asientos.";
  }

  if (selectedTables.some((table) => isTableBlockedForAvailability(table))) {
    return "Una de las mesas esta bloqueada o fuera de servicio.";
  }

  if (selectedTables.some((table) => !table.isJoinable)) {
    return "Una de las mesas no se puede unir.";
  }

  if (
    activeJoinedTables.some(
      (joinedTable) =>
        joinedTable.reservationId !== reservation.id &&
        selectedTables.some((table) => joinedTable.tableIds.includes(table.id)),
    )
  ) {
    return "Una de las mesas ya esta unida a otra reserva en este horario.";
  }

  if (
    slotReservations.some((entry) => {
      if (entry.id === reservation.id || !entry.joinedTableId) {
        return false;
      }

      const joinedTable = getJoinedTableByReservationId(entry.id);
      return Boolean(
        joinedTable &&
          selectedTables.some((table) => joinedTable.tableIds.includes(table.id)),
      );
    })
  ) {
    return "Una de las mesas ya esta unida a otra reserva en este horario.";
  }

  if (
    slotReservations.some(
      (entry) =>
        entry.id !== reservation.id &&
        occupiesTable(entry.status) &&
        selectedTables.some((table) => reservationUsesTable(entry, table.id)),
    )
  ) {
    return "Una de las mesas ya esta ocupada en este horario.";
  }

  return null;
}

function getCombinationLabel(tableIds: string[], businessId: string) {
  const tables = getFloorTablesByBusinessId(businessId);
  const labels = tableIds
    .map((tableId) => tables.find((table) => table.id === tableId)?.label ?? tableId)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  if (labels.length === 0) {
    return "Mesa unida";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  const parts = labels.map((label) => label.trim().split(/\s+/));
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

  return labels.join(" + ");
}

function findLiveTable(businessId: string, tableId: string) {
  return getFloorTablesByBusinessId(businessId).find((table) => table.id === tableId) ?? null;
}

function getReservationConflictReservations(reservation: Reservation) {
  const services = getBusinessServices(reservation.businessId);
  const service = services.find((entry) => entry.id === reservation.serviceId) ?? null;
  const fallbackDurationMinutes =
    getReservationRules(reservation.businessId)?.defaultReservationDurationMinutes ?? 120;
  const durationMinutes = getReservationDurationMinutes(reservation, service, {
    fallbackDurationMinutes,
  });

  // We compare the full reservation interval here so a 15:00 booking blocks all
  // of its real duration, not only the first 30-minute slot.
  return getReservationsOverlappingSlot({
    businessId: reservation.businessId,
    date: reservation.reservationDate,
    time: reservation.reservationTime,
    reservations: dedupeReservations(getReservationsSnapshotInternal()),
    services,
    slotDurationMinutes: durationMinutes,
    fallbackDurationMinutes,
    optionalReservationIdToIgnore: reservation.id,
  });
}

export function getActiveReservationsForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  const reservations = dedupeReservations(getReservationsSnapshotInternal());
  const services = getBusinessServices(businessId);
  const slotStepMinutes = Math.max(
    1,
    getReservationRules(businessId)?.slotDurationMinutes || 30,
  );
  const fallbackDurationMinutes =
    getReservationRules(businessId)?.defaultReservationDurationMinutes ?? 120;

  return reservations.filter(
    (reservation) =>
      reservation.businessId === businessId &&
      isReservationActiveAtSlot(reservation, date, time, {
        service: services.find((entry) => entry.id === reservation.serviceId) ?? null,
        slotDurationMinutes: slotStepMinutes,
        fallbackDurationMinutes,
      }),
  );
}

function buildAssignmentReason({
  reservation,
  table,
  slotReservations,
  activeJoinedTables,
}: {
  reservation: Reservation;
  table: FloorTable;
  slotReservations: Reservation[];
  activeJoinedTables: JoinedTable[];
}) {
  return getTableSlotConflictReason(
    reservation,
    table,
    slotReservations,
    activeJoinedTables,
  );
}

function buildJoinedTablesReason({
  reservation,
  selectedTables,
  slotReservations,
  activeJoinedTables,
}: {
  reservation: Reservation;
  selectedTables: FloorTable[];
  slotReservations: Reservation[];
  activeJoinedTables: JoinedTable[];
}) {
  return buildJoinedTableSlotConflictReason(
    reservation,
    selectedTables,
    slotReservations,
    activeJoinedTables,
  );
}

function sortAvailabilityOptions(
  left: ReservationTableSuggestion,
  right: ReservationTableSuggestion,
) {
  if (left.suggested !== right.suggested) {
    return left.suggested ? -1 : 1;
  }

  if (left.available !== right.available) {
    return left.available ? -1 : 1;
  }

  if (left.excessSeats !== right.excessSeats) {
    return left.excessSeats - right.excessSeats;
  }

  if (left.tableIds.length !== right.tableIds.length) {
    return left.tableIds.length - right.tableIds.length;
  }

  return left.tableLabel.localeCompare(right.tableLabel);
}

function normalizeSuggestion(option: ReservationTableSuggestion) {
  return {
    ...option,
    tableIds: [...option.tableIds],
  };
}

export function canFitReservationInTable(reservation: Reservation, table: FloorTable) {
  return !getTableBaseAvailabilityReason(table) && table.seats >= reservation.partySize;
}

type PublicReservationAvailabilityInput = Pick<
  CreateReservationInput,
  "businessId" | "serviceId" | "reservationDate" | "reservationTime" | "partySize"
>;

function createReservationProbe(input: PublicReservationAvailabilityInput) {
  return {
    id: "__public_probe__",
    businessId: input.businessId,
    serviceId: input.serviceId,
    customerName: "Propuesta publica",
    customerPhone: "0000000000",
    customerEmail: null,
    reservationDate: input.reservationDate,
    reservationTime: input.reservationTime,
    partySize: input.partySize,
    status: "pending" as const,
    notes: null,
    source: "web" as const,
    tableId: null,
    tableLabel: null,
    joinedTableId: null,
    joinedTableLabel: null,
    assignedTableIds: null,
    assignedAt: null,
    assignedBy: null,
    createdAt: "",
    updatedAt: "",
  } satisfies Reservation;
}

export function getPublicTableAvailabilityForReservation(
  input: PublicReservationAvailabilityInput,
) {
  return getBestPublicTableAssignment(input);
}

export function getBestPublicTableAssignment(
  input: PublicReservationAvailabilityInput,
): PublicTableAssignmentResult {
  const probe = createReservationProbe(input);
  const tables = getTablesForBusiness(input.businessId);
  const singleSuggestions = findIndividualTableOptions(probe).filter((option) => option.available);
  const joinedSuggestions = findJoinedTableOptions(probe).filter((option) => option.available);
  const bestSuggestion = singleSuggestions[0] ?? joinedSuggestions[0] ?? null;

  if (bestSuggestion) {
    return {
      singleSuggestions,
      joinedSuggestions,
      bestSuggestion,
      reason: null,
    };
  }

  const usableTables = tables.filter(
    (table) =>
      table.status !== "blocked" &&
      table.status !== "out_of_service" &&
      table.status !== "occupied" &&
      table.status !== "reserved",
  );

  const reason =
    usableTables.length === 0
      ? "Sin mesas disponibles"
      : usableTables.every((table) => table.seats < input.partySize)
        ? "Capacidad insuficiente"
        : "Sin mesas disponibles";

  return {
    singleSuggestions,
    joinedSuggestions,
    bestSuggestion: null,
    reason,
  };
}

export function getBestTableSuggestionForPublicReservation(
  input: PublicReservationAvailabilityInput,
) {
  return getBestPublicTableAssignment(input).bestSuggestion;
}

export function getReservationsWithoutTableForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  return cloneReservations(
    getActiveReservationsForSlot(businessId, date, time).filter(
      (reservation) => !reservation.tableId && !reservation.joinedTableId,
    ),
  );
}

export function getAvailableTablesForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  const tables = getTablesForBusiness(businessId);
  const services = getBusinessServices(businessId);
  const fallbackDurationMinutes =
    getReservationRules(businessId)?.defaultReservationDurationMinutes ?? 120;
  const slotStepMinutes = Math.max(
    1,
    getReservationRules(businessId)?.slotDurationMinutes || 30,
  );
  const occupiedTableIds = new Set(
    getOccupiedTableIdsForSlotFromAvailability({
      businessId,
      date,
      time,
      reservations: getReservationsSnapshotInternal(),
      services,
      fallbackDurationMinutes,
      slotDurationMinutes: slotStepMinutes,
    }),
  );

  return tables.filter((table) => {
    if (getTableBaseAvailabilityReason(table)) {
      return false;
    }

    return !occupiedTableIds.has(table.id);
  });
}

export function findIndividualTableOptions(reservation: Reservation) {
  const tables = getTablesForBusiness(reservation.businessId);
  const slotReservations = getReservationConflictReservations(reservation);
  const activeJoinedTables = getActiveJoinedTablesForSlot(
    reservation.businessId,
    reservation.reservationDate,
    reservation.reservationTime,
  );

  return tables
    .map((table) => {
      const reason = getTableSlotConflictReason(
        reservation,
        table,
        slotReservations,
        activeJoinedTables,
      );
      const suggested = reason === null;

      return normalizeSuggestion({
        tableIds: [table.id],
        tableLabel: table.label,
        seats: table.seats,
        excessSeats: table.seats - reservation.partySize,
        kind: "single",
        available: suggested,
        suggested,
        reason,
      });
    })
    .sort(sortAvailabilityOptions);
}

export function findJoinedTableOptions(reservation: Reservation) {
  const tables = getTablesForBusiness(reservation.businessId);
  const slotReservations = getReservationConflictReservations(reservation);
  const activeJoinedTables = getActiveJoinedTablesForSlot(
    reservation.businessId,
    reservation.reservationDate,
    reservation.reservationTime,
  );
  const availableTables = tables.filter(
    (table) => !getTableBaseAvailabilityReason(table),
  );
  const maxSize = Math.min(3, availableTables.length);
  const combinations: ReservationTableSuggestion[] = [];

  function walk(startIndex: number, current: FloorTable[]) {
    if (current.length >= 2) {
      const reason = buildJoinedTableSlotConflictReason(
        reservation,
        current,
        slotReservations,
        activeJoinedTables,
      );
      const seats = current.reduce((sum, table) => sum + table.seats, 0);
      if (!reason && seats >= reservation.partySize) {
        const tableIds = current.map((table) => table.id);
        combinations.push(
          normalizeSuggestion({
            tableIds,
            tableLabel: getCombinationLabel(tableIds, reservation.businessId),
            seats,
            excessSeats: seats - reservation.partySize,
            kind: "joined",
            available: true,
            suggested: true,
          }),
        );
      }
    }

    if (current.length === maxSize) {
      return;
    }

    for (let index = startIndex; index < availableTables.length; index += 1) {
      current.push(availableTables[index]);
      walk(index + 1, current);
      current.pop();
    }
  }

  walk(0, []);

  return combinations.sort(sortAvailabilityOptions).slice(0, 12);
}

export function validateReservationTableAssignment(reservation: Reservation) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!reservation.tableId && !reservation.joinedTableId) {
    warnings.push("Sin mesa asignada.");
    return { isValid: true, errors, warnings } satisfies ReservationTableAssignmentValidation;
  }

  const slotReservations = getReservationConflictReservations(reservation);
  const activeJoinedTables = getActiveJoinedTablesForSlot(
    reservation.businessId,
    reservation.reservationDate,
    reservation.reservationTime,
  );

  if (reservation.joinedTableId) {
    const joinedTable = getJoinedTableByReservationId(reservation.id);
    if (!joinedTable) {
      errors.push("JoinedTable invalida.");
    } else {
      const tables = getTablesForBusiness(reservation.businessId).filter((table) =>
        joinedTable.tableIds.includes(table.id),
      );
      if (tables.length !== joinedTable.tableIds.length) {
        errors.push("JoinedTable invalida.");
      } else {
        const reason = buildJoinedTableSlotConflictReason(
          reservation,
          tables,
          slotReservations,
          activeJoinedTables,
        );
        if (reason) {
          errors.push(reason);
        }
      }
    }
  } else if (reservation.tableId) {
    const table = findLiveTable(reservation.businessId, reservation.tableId);
    if (!table) {
      errors.push("Mesa inexistente.");
    } else {
      const reason = getTableSlotConflictReason(
        reservation,
        table,
        slotReservations,
        activeJoinedTables,
      );
      if (reason) {
        errors.push(reason);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  } satisfies ReservationTableAssignmentValidation;
}

export function getReservationTableAvailability(reservationId: string) {
  const reservation = getReservationById(reservationId);
  if (!reservation) {
    return null;
  }

  const validation = validateReservationTableAssignment(reservation);
  const singleSuggestions = findIndividualTableOptions(reservation);
  const joinedSuggestions = findJoinedTableOptions(reservation);

  return {
    reservationId: reservation.id,
    businessId: reservation.businessId,
    date: reservation.reservationDate,
    time: reservation.reservationTime,
    validation,
    singleSuggestions,
    joinedSuggestions,
    hasSuggestions: singleSuggestions.some((option) => option.available) || joinedSuggestions.length > 0,
    availableTableCount: singleSuggestions.filter((option) => option.available).length,
  } satisfies ReservationTableAvailabilitySummary;
}

export function getTableAvailabilitySummary(
  businessId: string,
  date: string,
  time: string,
  reservationsOverride?: Reservation[],
) {
  const tables = getTablesForBusiness(businessId);
  const services = getBusinessServices(businessId);
  const slotStepMinutes = Math.max(
    1,
    getReservationRules(businessId)?.slotDurationMinutes || 30,
  );
  const fallbackDurationMinutes =
    getReservationRules(businessId)?.defaultReservationDurationMinutes ?? 120;
  const reservations =
    reservationsOverride ??
    getActiveReservationsForSlot(businessId, date, time);
  const joinedTables = getActiveJoinedTablesForSlot(businessId, date, time);
  const reservationsWithoutTable = cloneReservations(
    reservations.filter((reservation) => {
      const assignedTableIds = reservation.assignedTableIds ?? (reservation.tableId ? [reservation.tableId] : []);
      return assignedTableIds.length === 0;
    }),
  );
  const availableTables = getAvailableTablesForSlot(businessId, date, time);
  const occupiedTableIds = new Set(
    getOccupiedTableIdsForSlotFromAvailability({
      businessId,
      date,
      time,
      reservations: reservationsOverride ?? getReservationsSnapshotInternal(),
      services,
      fallbackDurationMinutes,
      slotDurationMinutes: slotStepMinutes,
    }),
  );
  const warningsByTableId: Record<string, string[]> = {};
  const conflictsByTableId: Record<string, string[]> = {};

  for (const table of tables) {
    const baseReason = getTableBaseAvailabilityReason(table);
    if (baseReason) {
      warningsByTableId[table.id] = [baseReason];
    }
  }

  for (const reservation of reservations) {
    const validation = validateReservationTableAssignment(reservation);
    const uniqueAssignedTableIds = [
      ...new Set(reservation.assignedTableIds ?? (reservation.tableId ? [reservation.tableId] : [])),
    ];

    for (const tableId of uniqueAssignedTableIds) {
      occupiedTableIds.add(tableId);
      if (!warningsByTableId[tableId]) {
        warningsByTableId[tableId] = [];
      }
      warningsByTableId[tableId].push(...validation.warnings, ...validation.errors);
      if (validation.errors.length > 0) {
        conflictsByTableId[tableId] = [
          ...(conflictsByTableId[tableId] ?? []),
          ...validation.errors,
        ];
      }
    }
  }

  const capacityAvailable = availableTables.reduce((sum, table) => sum + table.seats, 0);
  const capacityOccupied = [...occupiedTableIds].reduce((sum, tableId) => {
    const table = tables.find((entry) => entry.id === tableId);
    return sum + (table?.seats ?? 0);
  }, 0);

  return {
    businessId,
    date,
    time,
    occupiedTableIds: [...occupiedTableIds],
    reservationsWithoutTable,
    assignmentsByTableId: reservations.reduce<Record<string, Reservation[]>>(
      (assignments, reservation) => {
        const uniqueAssignedTableIds = [
          ...new Set(reservation.assignedTableIds ?? (reservation.tableId ? [reservation.tableId] : [])),
        ];
        const resolvedTableIds = reservation.joinedTableId
          ? (
              joinedTables.find((entry) => entry.id === reservation.joinedTableId)?.tableIds ??
              uniqueAssignedTableIds
            )
          : uniqueAssignedTableIds;

        for (const tableId of [...new Set(resolvedTableIds)]) {
          assignments[tableId] = [...(assignments[tableId] ?? []), cloneReservation(reservation)];
        }

        return assignments;
      },
      {},
    ),
    joinedTableByTableId: tables.reduce<Record<string, JoinedTable | null>>((result, table) => {
      const joinedTable = joinedTables.find((entry) => entry.tableIds.includes(table.id)) ?? null;
      result[table.id] = joinedTable ? { ...joinedTable, tableIds: [...joinedTable.tableIds] } : null;
      return result;
    }, {}),
    availableTableIds: availableTables.map((table) => table.id),
    warningsByTableId,
    conflictsByTableId,
    capacityAvailable,
    capacityOccupied,
    reservationsWithoutTableCount: reservationsWithoutTable.length,
    conflictCount: Object.values(conflictsByTableId).reduce((sum, list) => sum + list.length, 0),
  } satisfies TableOccupancySummary;
}

export function sortReservationsForDashboard(reservations: Reservation[]) {
  return [...reservations].sort((left, right) => {
    const statusCompare =
      dashboardStatusPriority[left.status] - dashboardStatusPriority[right.status];
    if (statusCompare !== 0) {
      return statusCompare;
    }

    const dateCompare = left.reservationDate.localeCompare(right.reservationDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    const timeCompare = left.reservationTime.localeCompare(right.reservationTime);
    if (timeCompare !== 0) {
      return timeCompare;
    }

    const createdAtCompare = right.createdAt.localeCompare(left.createdAt);
    if (createdAtCompare !== 0) {
      return createdAtCompare;
    }

    return left.id.localeCompare(right.id);
  });
}

export function sortReservationsForLocalPanel(reservations: Reservation[]) {
  return [...reservations].sort((left, right) => {
    const dateCompare = left.reservationDate.localeCompare(right.reservationDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    const timeCompare = right.reservationTime.localeCompare(left.reservationTime);
    if (timeCompare !== 0) {
      return timeCompare;
    }

    const statusCompare =
      dashboardStatusPriority[left.status] - dashboardStatusPriority[right.status];
    if (statusCompare !== 0) {
      return statusCompare;
    }

    const createdAtCompare = right.createdAt.localeCompare(left.createdAt);
    if (createdAtCompare !== 0) {
      return createdAtCompare;
    }

    return left.id.localeCompare(right.id);
  });
}

function getReservationsSnapshotInternal() {
  loadFromStorageIfNeeded();
  return reservationsStore;
}

export function getReservationsSnapshot() {
  return getReservationsSnapshotInternal();
}

export function getActiveReservationByPhone(businessId: string, phone: string) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return null;
  }

  return (
    dedupeReservations(getReservationsSnapshotInternal()).find((reservation) => {
      if (reservation.businessId !== businessId) {
        return false;
      }

      if (!activePhoneReservationStatuses.includes(reservation.status)) {
        return false;
      }

      return (reservation.normalizedPhone ?? normalizePhone(reservation.customerPhone)) === normalizedPhone;
    }) ?? null
  );
}

export function subscribeReservations(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const onCustomChange = () => listener();
  const onStorageChange = () => {
    refreshFromStorage();
    listener();
  };
  window.addEventListener(CHANGE_EVENT, onCustomChange);
  window.addEventListener("storage", onStorageChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustomChange);
    window.removeEventListener("storage", onStorageChange);
  };
}

export function getReservations() {
  return cloneReservations(getReservationsSnapshotInternal());
}

export function getReservationsByBusinessId(businessId: string) {
  return cloneReservations(
    sortReservations(
      dedupeReservations(getReservationsSnapshotInternal()).filter(
        (reservation) => reservation.businessId === businessId,
      ),
    ),
  );
}

export function getReservationsByDate(businessId: string, date: string) {
  return cloneReservations(
    sortReservations(
      dedupeReservations(getReservationsSnapshotInternal()).filter(
        (reservation) =>
          reservation.businessId === businessId &&
          reservation.reservationDate === date,
      ),
    ),
  );
}

export function getReservationById(id: string) {
  const reservation = getReservationsSnapshotInternal().find(
    (entry) => entry.id === id,
  );

  return reservation ? cloneReservation(reservation) : null;
}

export function getReservationTable(reservationId: string) {
  const reservation = getReservationById(reservationId);
  if (!reservation?.tableId) {
    return null;
  }

  return findLiveTable(reservation.businessId, reservation.tableId);
}

export function getReservationsByTableId(businessId: string, tableId: string) {
  return cloneReservations(
    sortReservations(
      dedupeReservations(getReservationsSnapshotInternal()).filter(
        (reservation) =>
          reservation.businessId === businessId &&
          (reservation.tableId === tableId ||
            normalizeAssignedTableIds(reservation.assignedTableIds).some((entry) => entry === tableId) ||
            (reservation.joinedTableId != null &&
              getJoinedTableByReservationId(reservation.id)?.tableIds.includes(tableId))),
      ),
    ),
  );
}

export function getOccupiedTableIdsForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  return getTableOccupancyForSlot(businessId, date, time).occupiedTableIds;
}

export function getTableOccupancyForSlot(
  businessId: string,
  date: string,
  time: string,
): TableOccupancySummary {
  return getTableAvailabilitySummary(businessId, date, time);
}

export function getReservationTableAssignmentOptions(reservationId: string) {
  const reservation = getReservationById(reservationId);
  if (!reservation) {
    return [];
  }

  return findIndividualTableOptions(reservation);
}

export function assignReservationToTable(reservationId: string, tableId: string) {
  loadFromStorageIfNeeded();
  const index = reservationsStore.findIndex((reservation) => reservation.id === reservationId);
  if (index === -1) {
    throw new Error("La reserva no existe.");
  }

  const reservation = reservationsStore[index];
  const table = findLiveTable(reservation.businessId, tableId);
  if (!table) {
    throw new Error("La mesa no existe o no pertenece a este negocio.");
  }

  const slotReservations = getReservationConflictReservations(reservation);
  const activeJoinedTables = getActiveJoinedTablesForSlot(
    reservation.businessId,
    reservation.reservationDate,
    reservation.reservationTime,
  );
  const reason = buildAssignmentReason({
    reservation,
    table,
    slotReservations,
    activeJoinedTables,
  });
  if (reason) {
    throw new Error(reason);
  }

  if (reservation.joinedTableId) {
    deleteJoinedTable(reservation.joinedTableId);
  }

  const timestamp = nowIso();
  const updatedReservation: Reservation = {
    ...reservation,
    tableId: table.id,
    tableLabel: table.label,
    joinedTableId: null,
    joinedTableLabel: null,
    assignedTableIds: null,
    assignedAt: timestamp,
    assignedBy: "local_mock",
    updatedAt: timestamp,
  };

  updateStore(
    sortReservations(
      reservationsStore.map((entry, entryIndex) =>
        entryIndex === index ? updatedReservation : entry,
      ),
    ),
  );

  return cloneReservation(updatedReservation);
}

export function assignReservationToJoinedTable(
  reservationId: string,
  tableIds: string[],
) {
  loadFromStorageIfNeeded();
  const index = reservationsStore.findIndex((reservation) => reservation.id === reservationId);
  if (index === -1) {
    throw new Error("La reserva no existe.");
  }

  const reservation = reservationsStore[index];
  const uniqueTableIds = normalizeAssignedTableIds(tableIds);
  const tables = getFloorTablesByBusinessId(reservation.businessId);
  const selectedTables = uniqueTableIds
    .map((tableId) => tables.find((table) => table.id === tableId) ?? null)
    .filter((table): table is FloorTable => table !== null);
  const slotReservations = getReservationConflictReservations(reservation);
  const activeJoinedTables = getActiveJoinedTablesForSlot(
    reservation.businessId,
    reservation.reservationDate,
    reservation.reservationTime,
  );
  const reason = buildJoinedTablesReason({
    reservation,
    selectedTables,
    slotReservations,
    activeJoinedTables,
  });
  if (reason) {
    throw new Error(reason);
  }

  if (reservation.joinedTableId) {
    releaseJoinedTable(reservation.joinedTableId);
  }

  const joinedTable = createJoinedTable(
    reservation.businessId,
    uniqueTableIds,
    reservation.id,
    reservation.reservationDate,
    reservation.reservationTime,
  );
  const timestamp = nowIso();
  const updatedReservation: Reservation = {
    ...reservation,
    tableId: null,
    tableLabel: null,
    joinedTableId: joinedTable.id,
    joinedTableLabel: joinedTable.label,
    assignedTableIds: [...uniqueTableIds],
    assignedAt: timestamp,
    assignedBy: "local_mock",
    updatedAt: timestamp,
  };

  updateStore(
    sortReservations(
      reservationsStore.map((entry, entryIndex) =>
        entryIndex === index ? updatedReservation : entry,
      ),
    ),
  );

  return cloneReservation(updatedReservation);
}

export function unassignReservationFromTable(reservationId: string) {
  loadFromStorageIfNeeded();
  const index = reservationsStore.findIndex((reservation) => reservation.id === reservationId);
  if (index === -1) {
    throw new Error("La reserva no existe.");
  }

  const reservation = reservationsStore[index];
  if (reservation.joinedTableId) {
    releaseJoinedTable(reservation.joinedTableId);
  }
  const timestamp = nowIso();
  const updatedReservation: Reservation = {
    ...reservation,
    tableId: null,
    tableLabel: null,
    joinedTableId: null,
    joinedTableLabel: null,
    assignedTableIds: null,
    assignedAt: null,
    assignedBy: null,
    updatedAt: timestamp,
  };

  updateStore(
    sortReservations(
      reservationsStore.map((entry, entryIndex) =>
        entryIndex === index ? updatedReservation : entry,
      ),
    ),
  );

  return cloneReservation(updatedReservation);
}

export function updateReservationAssignedTables(reservationId: string, tableIds: string[]) {
  const uniqueTableIds = normalizeAssignedTableIds(tableIds);

  if (uniqueTableIds.length === 0) {
    return unassignReservationFromTable(reservationId);
  }

  if (uniqueTableIds.length === 1) {
    return assignReservationToTable(reservationId, uniqueTableIds[0]);
  }

  return assignReservationToJoinedTable(reservationId, uniqueTableIds);
}

function removeReservationByIdInternal(reservationId: string) {
  const reservation = reservationsStore.find((entry) => entry.id === reservationId);
  if (!reservation) {
    return false;
  }

  if (reservation.joinedTableId) {
    releaseJoinedTable(reservation.joinedTableId);
  }

  reservationsStore = reservationsStore.filter((entry) => entry.id !== reservationId);
  return true;
}

export function deleteReservationById(reservationId: string) {
  loadFromStorageIfNeeded();
  const removed = removeReservationByIdInternal(reservationId);

  if (!removed) {
    return false;
  }

  updateStore(sortReservations(reservationsStore));
  return true;
}

export function deleteReservationsByIds(reservationIds: string[]) {
  loadFromStorageIfNeeded();
  const ids = new Set(reservationIds.filter(Boolean));
  if (ids.size === 0) {
    return 0;
  }

  let removedCount = 0;
  for (const reservationId of ids) {
    if (removeReservationByIdInternal(reservationId)) {
      removedCount += 1;
    }
  }

  if (removedCount > 0) {
    updateStore(sortReservations(reservationsStore));
  }

  return removedCount;
}

export function createReservation(data: CreateReservationInput) {
  const businessHours = getBusinessHours(data.businessId);
  const rules = getReservationRules(data.businessId);
  const services = getBusinessServices(data.businessId);
  const service = services.find((entry) => entry.id === data.serviceId) ?? null;
  const reservations = dedupeReservations(getReservationsSnapshotInternal());
  const tables = getTablesForBusiness(data.businessId);
  const autoConfirmReservations = getAutoConfirmReservationsForBusiness(data.businessId);
  const shouldAutoAssignTables = data.source === "web" && autoConfirmReservations;
  const usesTableAvailability = shouldAutoAssignTables && tables.length > 0;

  if (!rules) {
    throw new Error("Todavia no hay reglas de reserva configuradas para este negocio.");
  }

  if (!service) {
    throw new Error("El servicio seleccionado no existe o no esta activo.");
  }

  if (data.partySize > service.capacity) {
    throw new Error("La cantidad de personas supera la capacidad del servicio seleccionado.");
  }

  if (data.source === "web") {
    const phoneValidation = validatePhone(data.customerPhone);
    if (!phoneValidation.valid) {
      throw new Error(phoneValidation.error ?? "Ingresá un teléfono válido para poder reservar.");
    }

    const activeReservation = getActiveReservationByPhone(
      data.businessId,
      phoneValidation.normalized,
    );

    if (activeReservation) {
      throw new Error(
        `Ya tenés una reserva activa con este teléfono. Reserva existente: ${activeReservation.reservationDate} · ${activeReservation.reservationTime}. Si escribiste mal el teléfono, corregilo y volvé a intentar.`,
      );
    }
  }

  const availability = calculateAvailabilityForReservations({
    businessId: data.businessId,
    date: data.reservationDate,
    services,
    reservations,
    hours: businessHours,
    rules,
    service,
  });
  const selectedSlot = availability.slots.find(
    (slot) => slot.time === data.reservationTime,
  );
  const assignedTableId = shouldAutoAssignTables
    ? findAvailableTableForReservation({
        businessId: data.businessId,
        reservationDate: data.reservationDate,
        reservationTime: data.reservationTime,
        durationMinutes: service.durationMinutes,
        partySize: data.partySize,
        reservations,
        tables,
        services,
        fallbackDurationMinutes:
          rules.defaultReservationDurationMinutes ?? 120,
      })
    : null;

  const timestamp = nowIso();
  const nextStatus = data.status ?? "pending";

  const baseReservation: Reservation = {
    id: createId(),
    businessId: data.businessId,
    serviceId: data.serviceId,
    customerName: data.customerName.trim(),
    customerPhone: data.customerPhone.trim(),
    normalizedPhone: normalizePhone(data.customerPhone),
    customerEmail: data.customerEmail?.trim() || null,
    reservationDate: data.reservationDate,
    reservationTime: data.reservationTime,
    partySize: data.partySize,
    status: nextStatus,
    notes: data.notes?.trim() || null,
    source: data.source ?? "web",
    tableId: null,
    tableLabel: null,
    joinedTableId: null,
    joinedTableLabel: null,
    assignedTableIds: null,
    assignedAt: null,
    assignedBy: null,
    requiresDeposit: data.requiresDeposit ?? false,
    depositAmount: data.depositAmount ?? null,
    depositStatus: data.depositStatus ?? "not_required",
    depositProvider: data.depositProvider ?? null,
    isDemo: data.isDemo ?? false,
    demoBatch: data.demoBatch ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (!usesTableAvailability) {
    if (!selectedSlot || !selectedSlot.available) {
      throw new Error("Este horario ya no esta disponible. Elegi otro.");
    }

    if (selectedSlot.remainingCapacity < data.partySize) {
      throw new Error(
        "Este horario ya no esta disponible para la cantidad de personas elegida.",
      );
    }
  } else if (!selectedSlot || (selectedSlot.reason && selectedSlot.reason !== "Completo")) {
    throw new Error(
      selectedSlot?.reason ?? "Este horario ya no esta disponible. Elegi otro.",
    );
  }

  let nextReservation = baseReservation;

  if (usesTableAvailability) {
    if (assignedTableId) {
      const assignedTable = tables.find((entry) => entry.id === assignedTableId) ?? null;
      nextReservation = {
        ...baseReservation,
        status: data.status ?? "confirmed",
        tableId: assignedTableId,
        tableLabel: assignedTable?.label ?? null,
        joinedTableId: null,
        joinedTableLabel: null,
        assignedTableIds: [assignedTableId],
        assignedAt: timestamp,
        assignedBy: "local_mock",
      };
    } else {
      nextReservation = {
        ...baseReservation,
        status: data.status ?? "pending",
        assignedTableIds: [],
      };
    }
  } else {
    nextReservation = {
      ...baseReservation,
      status: data.status ?? "pending",
      assignedTableIds: [],
      tableId: null,
      tableLabel: null,
      joinedTableId: null,
      joinedTableLabel: null,
      assignedAt: null,
      assignedBy: null,
    };
  }

  updateStore(sortReservations([...reservationsStore, nextReservation]));
  return cloneReservation(nextReservation);
}

export function updateReservationStatus(id: string, status: ReservationStatus) {
  const index = getReservationsSnapshotInternal().findIndex(
    (reservation) => reservation.id === id,
  );

  if (index === -1) {
    return null;
  }

  const timestamp = nowIso();
  const nextReservations = reservationsStore.map((reservation) => {
    if (reservation.id !== id) {
      return reservation;
    }

    if (status === "cancelled" || status === "no_show") {
      if (reservation.joinedTableId) {
        releaseJoinedTable(reservation.joinedTableId);
      }

      return {
        ...reservation,
        status,
        tableId: null,
        tableLabel: null,
        joinedTableId: null,
        joinedTableLabel: null,
        assignedTableIds: null,
        assignedAt: null,
        assignedBy: null,
        updatedAt: timestamp,
      };
    }

    return { ...reservation, status, updatedAt: timestamp };
  });

  updateStore(sortReservations(nextReservations));
  return getReservationById(id);
}

export function cancelReservation(id: string) {
  return updateReservationStatus(id, "cancelled");
}

export function resetReservationsForBusiness(businessId: string) {
  const initialBusinessReservations = initialReservations
    .filter((reservation) => reservation.businessId === businessId)
    .map((reservation) => ({ ...reservation }));
  const nextReservations = [
    ...reservationsStore.filter(
      (reservation) => reservation.businessId !== businessId,
    ),
    ...initialBusinessReservations,
  ];

  resetJoinedTablesForBusiness(businessId);
  updateStore(sortReservations(nextReservations));
  return getReservationsByBusinessId(businessId);
}

// Local reservation store prepared for a future Supabase swap without changing
// the public widget or the dashboard actions.
