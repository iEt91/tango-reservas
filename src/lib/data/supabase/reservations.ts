import type {
  CreateReservationInput,
  FloorTable,
  Reservation,
  ReservationSource,
  ReservationStatus,
} from "@/data/types";
import { getReservationRules } from "@/data/scheduling";
import { POSTGRES_UUID_REGEX } from "@/lib/data/business-resolution";
import {
  getSupabaseFloorTablesByBusiness,
  getSupabaseFloorTablesByBusinessSync,
} from "@/lib/data/supabase/floorPlan";
import {
  getSupabaseServicesByBusiness,
  getSupabaseServicesByBusinessSync,
} from "@/lib/data/supabase/services";
import { buildDateTimeFromDateAndTime, timeToMinutes } from "@/lib/date-time";
import {
  getOccupiedTableIdsForSlot,
  getReservationsOverlappingSlot,
  intervalsOverlap,
  normalizeAssignedTableIds,
  reservationUsesTable,
} from "@/lib/reservation-availability";
import { normalizePhone } from "@/lib/reservations";
import { getSupabaseReadClient } from "@/lib/supabase/read-client";

export type SupabaseReservationRow = {
  id: string;
  business_id: string;
  service_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: ReservationStatus;
  source: ReservationSource;
  duration_minutes: number;
  public_code: string;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  no_show_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SupabaseReservationInput = CreateReservationInput;

const RESERVATION_SELECT =
  "id, business_id, service_id, customer_id, customer_name, customer_phone, customer_email, notes, reservation_date, reservation_time, party_size, status, source, duration_minutes, public_code, confirmed_at, completed_at, cancelled_at, no_show_at, created_at, updated_at" as const;
const ACTIVE_STATUSES: ReservationStatus[] = [
  "pending",
  "confirmed",
];
const CHANGE_EVENT = "reservations";

let reservationsCache: Reservation[] = [];
const loadedBusinesses = new Set<string>();
const loadingBusinesses = new Map<string, Promise<void>>();

function isBrowser() {
  return typeof window !== "undefined";
}

function getSupabaseClientOrThrow() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    throw new Error(
      "Faltan variables de entorno de Supabase.",
    );
  }

  return supabase;
}

function assertSupabaseUuid(value: string, field: string) {
  const trimmed = value.trim();

  if (!POSTGRES_UUID_REGEX.test(trimmed)) {
    throw new Error(
      `${field} inválido para Supabase: se esperaba UUID.`,
    );
  }

  return trimmed;
}

function normalizeSource(
  value: string | null | undefined,
): ReservationSource {
  if (
    value === "web"
    || value === "whatsapp"
    || value === "phone"
    || value === "instagram"
    || value === "manual"
    || value === "admin"
  ) {
    return value;
  }

  return "web";
}

function getReservationAssignedTableIds(
  reservation: Pick<
    Reservation,
    "assignedTableIds" | "tableId"
  >,
) {
  const normalized = normalizeAssignedTableIds(
    reservation.assignedTableIds,
  );

  if (normalized.length > 0) {
    return normalized;
  }

  const directTableId =
    "tableId" in reservation
      ? reservation.tableId
      : undefined;

  return typeof directTableId === "string"
    && directTableId.trim()
    ? [directTableId.trim()]
    : [];
}

function cloneReservation(reservation: Reservation) {
  return {
    ...reservation,
    assignedTableIds: reservation.assignedTableIds
      ? [...reservation.assignedTableIds]
      : null,
  };
}

function cloneReservations(reservations: Reservation[]) {
  return reservations.map(cloneReservation);
}

function sortByReservationDateTime(
  left: Reservation,
  right: Reservation,
) {
  const dateCompare = left.reservationDate.localeCompare(
    right.reservationDate,
  );

  if (dateCompare !== 0) {
    return dateCompare;
  }

  const timeCompare = left.reservationTime.localeCompare(
    right.reservationTime,
  );

  if (timeCompare !== 0) {
    return timeCompare;
  }

  return right.createdAt.localeCompare(left.createdAt);
}

function isActiveStatus(status: ReservationStatus) {
  return ACTIVE_STATUSES.includes(status);
}

function isBaseTableUsable(table: FloorTable) {
  return table.status !== "blocked"
    && table.status !== "out_of_service";
}

function getReservationSlotDurationMinutes(
  businessId: string,
  reservation: Reservation,
) {
  const service = getSupabaseServicesByBusinessSync(
    businessId,
  ).find(
    (entry) => entry.id === reservation.serviceId,
  );
  const fallback =
    getReservationRules(businessId)
      ?.defaultReservationDurationMinutes
    ?? 120;

  return service?.durationMinutes ?? fallback;
}

async function readReservationsForBusiness(
  businessId: string,
) {
  const supabase = getSupabaseClientOrThrow();
  const safeBusinessId = assertSupabaseUuid(
    businessId,
    "businessId",
  );
  const { data, error } = await supabase
    .schema("public")
    .from("reservations")
    .select(RESERVATION_SELECT)
    .eq("business_id", safeBusinessId)
    .order("reservation_date", { ascending: true })
    .order("reservation_time", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      "No se pudieron leer las reservas del negocio.",
    );
  }

  return (data ?? []) as unknown as SupabaseReservationRow[];
}

function unsupportedSupabaseReservationMutation(): never {
  throw new Error(
    "Las escrituras de reservas requieren una Server Action autenticada.",
  );
}

function unsupportedSupabaseTableMutation(): never {
  throw new Error(
    "La asignación de mesas todavía no está migrada a Supabase.",
  );
}

export function mapSupabaseReservationToReservation(
  row: SupabaseReservationRow,
): Reservation {
  return {
    id: row.id,
    businessId: row.business_id,
    serviceId: row.service_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    reservationDate: row.reservation_date,
    reservationTime: row.reservation_time.slice(0, 5),
    partySize: row.party_size,
    status: row.status,
    notes: row.notes,
    source: normalizeSource(row.source),
    tableId: null,
    tableLabel: null,
    joinedTableId: null,
    joinedTableLabel: null,
    assignedTableIds: null,
    assignedAt: null,
    assignedBy: null,
    normalizedPhone: normalizePhone(row.customer_phone),
    requiresDeposit: false,
    depositAmount: null,
    depositStatus: "not_required",
    depositProvider: null,
    isDemo: false,
    demoBatch: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReservationInputToSupabaseRow(
  data: SupabaseReservationInput,
) {
  const fallbackDuration =
    getReservationRules(data.businessId)
      ?.defaultReservationDurationMinutes
    ?? 120;
  const service = getSupabaseServicesByBusinessSync(
    data.businessId,
  ).find((entry) => entry.id === data.serviceId);

  return {
    business_id: assertSupabaseUuid(
      data.businessId,
      "businessId",
    ),
    service_id: assertSupabaseUuid(
      data.serviceId,
      "serviceId",
    ),
    customer_id: data.customerId ?? null,
    customer_name: data.customerName.trim(),
    customer_phone: normalizePhone(data.customerPhone),
    customer_email: data.customerEmail?.trim() || null,
    notes: data.notes?.trim() || null,
    reservation_date: data.reservationDate,
    reservation_time: data.reservationTime,
    party_size: data.partySize,
    source: normalizeSource(data.source),
    duration_minutes:
      service?.durationMinutes ?? fallbackDuration,
  };
}

export async function findBestAvailableTableForReservation({
  businessId,
  reservationDate,
  reservationTime,
  durationMinutes,
  partySize,
  reservations,
  tables,
}: {
  businessId: string;
  reservationDate: string;
  reservationTime: string;
  durationMinutes: number;
  partySize: number;
  reservations?: Reservation[];
  tables?: FloorTable[];
}) {
  const [loadedReservations, loadedTables, services] =
    await Promise.all([
      reservations
        ? Promise.resolve(reservations)
        : getSupabaseReservationsByBusiness(businessId),
      tables
        ? Promise.resolve(tables)
        : getSupabaseFloorTablesByBusiness(businessId),
      getSupabaseServicesByBusiness(businessId),
    ]);
  const fallback =
    getReservationRules(businessId)
      ?.defaultReservationDurationMinutes
    ?? 120;
  const start = timeToMinutes(reservationTime);

  if (start === null) {
    return null;
  }

  const end = start + Math.max(1, durationMinutes);
  const occupiedTableIds = new Set<string>();

  for (const reservation of loadedReservations) {
    if (
      reservation.businessId !== businessId
      || !isActiveStatus(reservation.status)
      || reservation.reservationDate !== reservationDate
    ) {
      continue;
    }

    const existingStart = timeToMinutes(
      reservation.reservationTime,
    );

    if (existingStart === null) {
      continue;
    }

    const existingDuration =
      services.find(
        (entry) => entry.id === reservation.serviceId,
      )?.durationMinutes
      ?? fallback;

    if (
      !intervalsOverlap(
        existingStart,
        existingStart + Math.max(1, existingDuration),
        start,
        end,
      )
    ) {
      continue;
    }

    for (const tableId of getReservationAssignedTableIds(
      reservation,
    )) {
      occupiedTableIds.add(tableId);
    }
  }

  const candidate = loadedTables
    .filter(
      (table) =>
        isBaseTableUsable(table)
        && table.seats >= partySize
        && !occupiedTableIds.has(table.id),
    )
    .sort(
      (left, right) =>
        left.seats - right.seats
        || left.label.localeCompare(right.label),
    )[0];

  return candidate?.id ?? null;
}

function isReservationActiveForSlot(
  businessId: string,
  reservation: Reservation,
  date: string,
  time: string,
) {
  if (
    reservation.reservationDate !== date
    || !isActiveStatus(reservation.status)
  ) {
    return false;
  }

  const reservationStart = buildDateTimeFromDateAndTime(
    reservation.reservationDate,
    reservation.reservationTime,
  );
  const selectedDateTime = buildDateTimeFromDateAndTime(
    date,
    time,
  );

  if (!reservationStart || !selectedDateTime) {
    return false;
  }

  const durationMinutes =
    getReservationSlotDurationMinutes(
      businessId,
      reservation,
    );
  const reservationEnd = new Date(
    reservationStart.getTime()
    + durationMinutes * 60 * 1000,
  );

  return selectedDateTime >= reservationStart
    && selectedDateTime < reservationEnd;
}

export function isSupabaseReservationActiveForSlot(
  businessId: string,
  reservation: Reservation,
  date: string,
  time: string,
) {
  return isReservationActiveForSlot(
    businessId,
    reservation,
    date,
    time,
  );
}

export function subscribeSupabaseReservations(
  listener: () => void,
) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleChange = () => listener();
  window.addEventListener(CHANGE_EVENT, handleChange);

  return () =>
    window.removeEventListener(CHANGE_EVENT, handleChange);
}

async function refreshReservationsCache(businessId: string) {
  const safeBusinessId = assertSupabaseUuid(
    businessId,
    "businessId",
  );

  if (loadingBusinesses.has(safeBusinessId)) {
    return loadingBusinesses.get(safeBusinessId);
  }

  const promise = (async () => {
    const rows = await readReservationsForBusiness(
      safeBusinessId,
    );
    const mapped = rows.map(
      mapSupabaseReservationToReservation,
    );
    const others = reservationsCache.filter(
      (reservation) =>
        reservation.businessId !== safeBusinessId,
    );

    reservationsCache = [...others, ...mapped];
    loadedBusinesses.add(safeBusinessId);

    if (isBrowser()) {
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  })();

  loadingBusinesses.set(safeBusinessId, promise);

  try {
    await promise;
  } finally {
    loadingBusinesses.delete(safeBusinessId);
  }
}

function ensureLoaded(businessId: string) {
  const safeBusinessId = assertSupabaseUuid(
    businessId,
    "businessId",
  );

  if (
    !loadedBusinesses.has(safeBusinessId)
    && !loadingBusinesses.has(safeBusinessId)
  ) {
    void refreshReservationsCache(safeBusinessId);
  }
}

function getReservationsSnapshotForBusiness(
  businessId: string,
) {
  ensureLoaded(businessId);
  const safeBusinessId = assertSupabaseUuid(
    businessId,
    "businessId",
  );

  return reservationsCache.filter(
    (reservation) =>
      reservation.businessId === safeBusinessId,
  );
}

function getReservationSnapshotById(reservationId: string) {
  return reservationsCache.find(
    (reservation) => reservation.id === reservationId,
  ) ?? null;
}

export async function getSupabaseReservationsByBusiness(
  businessId: string,
) {
  const rows = await readReservationsForBusiness(businessId);
  return rows.map(mapSupabaseReservationToReservation);
}

export async function getSupabaseReservationsByBusinessAndDate(
  businessId: string,
  date: string,
) {
  const reservations =
    await getSupabaseReservationsByBusiness(businessId);

  return reservations
    .filter(
      (reservation) =>
        reservation.reservationDate === date,
    )
    .sort(sortByReservationDateTime);
}

export async function createSupabaseReservation(
  _businessId: string,
  _data: SupabaseReservationInput,
): Promise<never> {
  void _businessId;
  void _data;
  return unsupportedSupabaseReservationMutation();
}

export async function updateSupabaseReservation(
  _reservationId: string,
  _data: Partial<SupabaseReservationInput>,
): Promise<never> {
  void _reservationId;
  void _data;
  return unsupportedSupabaseReservationMutation();
}

export async function updateSupabaseReservationStatus(
  _reservationId: string,
  _status: ReservationStatus,
): Promise<never> {
  void _reservationId;
  void _status;
  return unsupportedSupabaseReservationMutation();
}

export async function updateSupabaseReservationAssignedTables(
  _reservationId: string,
  _tableIds: string[],
): Promise<never> {
  void _reservationId;
  void _tableIds;
  return unsupportedSupabaseTableMutation();
}

export async function deleteSupabaseReservation(
  _reservationId: string,
): Promise<never> {
  void _reservationId;
  return unsupportedSupabaseReservationMutation();
}

export function getSupabaseReservationsSnapshot() {
  return cloneReservations(reservationsCache);
}

export async function refreshSupabaseReservationsForBusiness(
  businessId: string,
) {
  await refreshReservationsCache(businessId);
  return getReservationsSnapshotForBusiness(businessId);
}

export function getSupabaseReservationById(
  reservationId: string,
) {
  return getReservationSnapshotById(reservationId);
}

export function getSupabaseActiveReservationByPhone(
  businessId: string,
  phone: string,
) {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return null;
  }

  return getReservationsSnapshotForBusiness(businessId).find(
    (reservation) =>
      isActiveStatus(reservation.status)
      && normalizePhone(reservation.customerPhone)
        === normalized,
  ) ?? null;
}

export function getSupabaseReservationsByBusinessSync(
  businessId: string,
) {
  return cloneReservations(
    getReservationsSnapshotForBusiness(businessId)
      .sort(sortByReservationDateTime),
  );
}

export function getSupabaseActiveReservationsForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  const services = getSupabaseServicesByBusinessSync(
    businessId,
  );
  const rules = getReservationRules(businessId);

  return getReservationsOverlappingSlot({
    businessId,
    date,
    time,
    reservations:
      getSupabaseReservationsByBusinessSync(businessId),
    services,
    slotDurationMinutes: Math.max(
      1,
      rules?.slotDurationMinutes || 30,
    ),
    fallbackDurationMinutes:
      rules?.defaultReservationDurationMinutes ?? 120,
  });
}

export function getSupabaseReservationsByBusinessAndDateSync(
  businessId: string,
  date: string,
) {
  return cloneReservations(
    getReservationsSnapshotForBusiness(businessId)
      .filter(
        (reservation) =>
          reservation.reservationDate === date,
      )
      .sort(sortByReservationDateTime),
  );
}

export function getSupabaseReservationTableAvailability(
  reservationId: string,
) {
  const reservation = getReservationSnapshotById(
    reservationId,
  );

  if (!reservation) {
    return null;
  }

  return {
    reservationId: reservation.id,
    businessId: reservation.businessId,
    date: reservation.reservationDate,
    time: reservation.reservationTime,
    validation: {
      isValid: false,
      errors: [
        "La asignación de mesas todavía no está migrada a Supabase.",
      ],
      warnings: [],
    },
    singleSuggestions: [],
    joinedSuggestions: [],
    hasSuggestions: false,
    availableTableCount: 0,
  };
}

export function getSupabaseTableAvailabilitySummary(
  businessId: string,
  date: string,
  time: string,
  reservationsOverride?: Reservation[],
) {
  const tables = getSupabaseFloorTablesByBusinessSync(
    businessId,
  );
  const services = getSupabaseServicesByBusinessSync(
    businessId,
  );
  const rules = getReservationRules(businessId);
  const slotDurationMinutes = Math.max(
    1,
    rules?.slotDurationMinutes || 30,
  );
  const fallbackDurationMinutes =
    rules?.defaultReservationDurationMinutes ?? 120;
  const sourceReservations =
    reservationsOverride
    ?? getSupabaseReservationsByBusinessSync(businessId);
  const reservations = getReservationsOverlappingSlot({
    businessId,
    date,
    time,
    reservations: sourceReservations,
    services,
    slotDurationMinutes,
    fallbackDurationMinutes,
  });
  const occupiedTableIds = new Set(
    getOccupiedTableIdsForSlot({
      businessId,
      date,
      time,
      reservations: sourceReservations,
      services,
      fallbackDurationMinutes,
      slotDurationMinutes,
    }),
  );
  const warningsByTableId: Record<string, string[]> = {};
  const conflictsByTableId: Record<string, string[]> = {};

  for (const table of tables) {
    const warnings: string[] = [];

    if (table.status === "blocked") {
      warnings.push("Mesa bloqueada.");
    }

    if (table.status === "out_of_service") {
      warnings.push("Mesa fuera de servicio.");
    }

    if (warnings.length > 0) {
      warningsByTableId[table.id] = warnings;
    }
  }

  for (const reservation of reservations) {
    for (const tableId of getReservationAssignedTableIds(
      reservation,
    )) {
      occupiedTableIds.add(tableId);
      const conflicts = reservations.filter(
        (entry) =>
          entry.id !== reservation.id
          && isActiveStatus(entry.status)
          && reservationUsesTable(entry, tableId),
      );

      if (conflicts.length > 0) {
        conflictsByTableId[tableId] = conflicts.map(
          (entry) => entry.id,
        );
      }
    }
  }

  const availableTables = tables.filter(
    (table) => !occupiedTableIds.has(table.id),
  );
  const reservationsWithoutTable = reservations.filter(
    (reservation) =>
      getReservationAssignedTableIds(reservation).length === 0,
  );

  return {
    businessId,
    date,
    time,
    occupiedTableIds: [...occupiedTableIds],
    reservationsWithoutTable,
    assignmentsByTableId: {} as Record<
      string,
      Reservation[]
    >,
    joinedTableByTableId: tables.reduce<
      Record<string, null>
    >((result, table) => {
      result[table.id] = null;
      return result;
    }, {}),
    availableTableIds: availableTables.map(
      (table) => table.id,
    ),
    warningsByTableId,
    conflictsByTableId,
    capacityAvailable: availableTables.reduce(
      (sum, table) => sum + table.seats,
      0,
    ),
    capacityOccupied: 0,
    reservationsWithoutTableCount:
      reservationsWithoutTable.length,
    conflictCount: Object.values(
      conflictsByTableId,
    ).reduce(
      (sum, conflicts) => sum + conflicts.length,
      0,
    ),
  };
}
