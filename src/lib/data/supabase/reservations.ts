import type {
  CreateReservationInput,
  FloorTable,
  Reservation,
  ReservationStatus,
  Service,
} from "@/data/types";
import { POSTGRES_UUID_REGEX } from "@/lib/data/business-resolution";
import { getReservationRules } from "@/data/scheduling";
import {
  getSupabaseFloorTablesByBusiness,
  getSupabaseFloorTablesByBusinessSync,
} from "@/lib/data/supabase/floorPlan";
import { getSupabaseBusinessById } from "@/lib/data/supabase/businesses";
import { getSupabaseReadClient } from "@/lib/supabase/read-client";
import { getSupabaseServicesByBusiness, getSupabaseServicesByBusinessSync } from "@/lib/data/supabase/services";
import { normalizePhone } from "@/lib/reservations";
import { buildDateTimeFromDateAndTime, timeToMinutes } from "@/lib/date-time";
import {
  findAvailableTableForReservation,
  getAvailableTablesForReservationSlot,
  getOccupiedTableIdsForSlot,
  getReservationsOverlappingSlot,
  intervalsOverlap,
  normalizeAssignedTableIds,
  reservationUsesTable,
} from "@/lib/reservation-availability";

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
  source: string | null;
  assigned_table_ids: unknown;
  deposit_status: string | null;
  deposit_amount: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SupabaseCustomerRow = {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string | null;
  internal_notes: string | null;
  preferences: string | null;
  tags: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type SupabaseReservationError = {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

type SupabaseReservationInput = CreateReservationInput;

const RESERVATION_SELECT =
  "id, business_id, service_id, customer_id, customer_name, customer_phone, customer_email, notes, reservation_date, reservation_time, party_size, status, source, assigned_table_ids, deposit_status, deposit_amount, created_at, updated_at";

const CUSTOMER_SELECT =
  "id, business_id, name, phone, email, internal_notes, preferences, tags, created_at, updated_at";

const ACTIVE_STATUSES: ReservationStatus[] = ["pending", "confirmed"];

function getSupabaseClientOrThrow() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  return supabase;
}

function assertSupabaseUuid(value: string, field: string) {
  const trimmed = value.trim();

  if (!POSTGRES_UUID_REGEX.test(trimmed)) {
    throw new Error(`${field} invalido para Supabase: se esperaba UUID y llego ${value}`);
  }

  return trimmed;
}

function formatSupabaseReservationError(
  table: string,
  error: SupabaseReservationError | Error | unknown,
) {
  const data =
    error && typeof error === "object"
      ? (error as SupabaseReservationError)
      : null;

  const message =
    (error instanceof Error ? error.message : data?.message)?.trim() ||
    "No se pudo completar la operacion.";
  const code = data?.code?.trim();
  const details = data?.details?.trim();
  const hint = data?.hint?.trim();

  const parts = [`Fallo ${table}: ${message}`];

  if (code) {
    parts.push(`Code: ${code}`);
  }

  if (details) {
    parts.push(`Details: ${details}`);
  }

  if (hint) {
    parts.push(`Hint: ${hint}`);
  }

  return new Error(parts.join(". "));
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeDepositStatus(value: string | null | undefined) {
  if (value === "pending" || value === "paid" || value === "failed" || value === "refunded") {
    return value;
  }

  return "not_required";
}

function depositStatusToRow(value: string | null | undefined) {
  if (value === "pending" || value === "paid" || value === "failed" || value === "refunded") {
    return value;
  }

  return "none";
}

function normalizeSource(value: string | null | undefined) {
  if (value === "web" || value === "whatsapp" || value === "instagram" || value === "manual" || value === "admin") {
    return value;
  }

  return "web";
}

function normalizeAndValidateAssignedTableIds(tableIds: string[]) {
  const uniqueTableIds = [...new Set(tableIds.map((entry) => entry.trim()).filter(Boolean))];

  for (const [index, tableId] of uniqueTableIds.entries()) {
    assertSupabaseUuid(tableId, `assignedTableIds[${index}]`);
  }

  return uniqueTableIds;
}

function getReservationAssignedTableIds(
  reservation:
    | Pick<Reservation, "assignedTableIds" | "tableId">
    | { assigned_table_ids?: unknown; tableId?: unknown },
) {
  const normalized = normalizeAssignedTableIds(
    "assignedTableIds" in reservation
      ? reservation.assignedTableIds
      : (reservation as { assigned_table_ids?: unknown }).assigned_table_ids,
  );

  if (normalized.length > 0) {
    return normalized;
  }

  const directTableId =
    "tableId" in reservation ? reservation.tableId : (reservation as { tableId?: unknown }).tableId;

  return typeof directTableId === "string" && directTableId.trim()
    ? [directTableId.trim()]
    : [];
}

function getReservationSlotDurationMinutes(businessId: string, reservation: Reservation) {
  const service =
    getSupabaseServicesByBusinessSync(businessId).find((entry) => entry.id === reservation.serviceId) ??
    null;
  const defaultDurationMinutes =
    getReservationRules(businessId)?.defaultReservationDurationMinutes ?? 120;
  return service?.durationMinutes ?? defaultDurationMinutes;
}

function isBaseTableUsable(table: FloorTable) {
  return (
    table.status !== "blocked" &&
    table.status !== "out_of_service"
  );
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
  const [loadedReservations, loadedTables, services] = await Promise.all([
    reservations ? Promise.resolve(reservations) : getSupabaseReservationsByBusiness(businessId),
    tables ? Promise.resolve(tables) : getSupabaseFloorTablesByBusiness(businessId),
    getSupabaseServicesByBusiness(businessId),
  ]);
  const defaultDurationMinutes =
    getReservationRules(businessId)?.defaultReservationDurationMinutes ?? 120;

  const start = timeToMinutes(reservationTime);
  if (start === null) {
    return null;
  }

  const end = start + Math.max(1, durationMinutes);
  const occupiedTableIds = new Set<string>();

  for (const reservation of loadedReservations) {
    if (reservation.businessId !== businessId) {
      continue;
    }

    if (!ACTIVE_STATUSES.includes(reservation.status)) {
      continue;
    }

    const existingStart = timeToMinutes(reservation.reservationTime);
    if (existingStart === null) {
      continue;
    }

    const existingServiceDuration =
      services.find((entry) => entry.id === reservation.serviceId)?.durationMinutes ??
      defaultDurationMinutes;
    const existingEnd = existingStart + Math.max(1, existingServiceDuration);

    if (
      reservation.reservationDate !== reservationDate ||
      !intervalsOverlap(existingStart, existingEnd, start, end)
    ) {
      continue;
    }

    for (const tableId of reservation.assignedTableIds ?? []) {
      occupiedTableIds.add(tableId);
    }
  }

  const candidate =
    loadedTables
      .filter(
        (table) =>
          isBaseTableUsable(table) &&
          table.seats >= partySize &&
          !occupiedTableIds.has(table.id),
      )
      .sort((left, right) => left.seats - right.seats || left.label.localeCompare(right.label))[0] ?? null;

  return candidate?.id ?? null;
}

function isReservationActiveForSlot(
  businessId: string,
  reservation: Reservation,
  date: string,
  time: string,
) {
  if (reservation.reservationDate !== date) {
    return false;
  }

  if (!reservation.assignedTableIds || reservation.assignedTableIds.length === 0) {
    return false;
  }

  if (reservation.status !== "pending" && reservation.status !== "confirmed") {
    return false;
  }

  const reservationStart = buildDateTimeFromDateAndTime(
    reservation.reservationDate,
    reservation.reservationTime,
  );
  const selectedDateTime = buildDateTimeFromDateAndTime(date, time);

  if (!reservationStart || !selectedDateTime) {
    return false;
  }

  if (timeToMinutes(reservation.reservationTime) === null || timeToMinutes(time) === null) {
    return false;
  }

  const durationMinutes = getReservationSlotDurationMinutes(businessId, reservation);
  const reservationEnd = new Date(reservationStart.getTime() + durationMinutes * 60 * 1000);

  return selectedDateTime.getTime() >= reservationStart.getTime() &&
    selectedDateTime.getTime() < reservationEnd.getTime();
}

export function isSupabaseReservationActiveForSlot(
  businessId: string,
  reservation: Reservation,
  date: string,
  time: string,
) {
  return isReservationActiveForSlot(businessId, reservation, date, time);
}

function resolveAssignedTableLabels(businessId: string, assignedTableIds: string[]) {
  const tables = getSupabaseFloorTablesByBusinessSync(businessId);
  const labels = assignedTableIds
    .map((tableId) => tables.find((table) => table.id === tableId)?.label ?? null)
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) {
    return {
      tableLabel: null as string | null,
      joinedTableLabel: null as string | null,
    };
  }

  if (labels.length === 1) {
    return {
      tableLabel: labels[0] ?? null,
      joinedTableLabel: null as string | null,
    };
  }

  return {
    tableLabel: labels[0] ?? null,
    joinedTableLabel: labels.join(" + "),
  };
}

export function mapSupabaseReservationToReservation(row: SupabaseReservationRow): Reservation {
  const assignedTableIds = normalizeAssignedTableIds(row.assigned_table_ids);
  const { tableLabel, joinedTableLabel } = resolveAssignedTableLabels(
    row.business_id,
    assignedTableIds,
  );

  return {
    id: row.id,
    businessId: row.business_id,
    serviceId: row.service_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    reservationDate: row.reservation_date,
    reservationTime: row.reservation_time,
    partySize: row.party_size,
    status: row.status,
    notes: row.notes,
    source: normalizeSource(row.source),
    tableId: assignedTableIds[0] ?? null,
    tableLabel,
    joinedTableId: assignedTableIds.length > 1 ? row.id : null,
    joinedTableLabel,
    assignedTableIds: assignedTableIds.length > 0 ? assignedTableIds : null,
    assignedAt: null,
    assignedBy: null,
    normalizedPhone: normalizePhone(row.customer_phone),
    requiresDeposit: normalizeDepositStatus(row.deposit_status) !== "not_required",
    depositAmount: row.deposit_amount,
    depositStatus: normalizeDepositStatus(row.deposit_status),
    depositProvider: null,
    isDemo: false,
    demoBatch: null,
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
  };
}

export function mapReservationInputToSupabaseRow(
  data: SupabaseReservationInput,
  options?: {
    customerId?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    status?: ReservationStatus;
    assignedTableIds?: string[];
  },
) {
  const normalizedPhone = normalizePhone(data.customerPhone);
  const assignedTableIds = normalizeAssignedTableIds(options?.assignedTableIds ?? data.assignedTableIds);

  return {
    business_id: assertSupabaseUuid(data.businessId, "businessId"),
    service_id: assertSupabaseUuid(data.serviceId, "serviceId"),
    customer_id: options?.customerId ?? null,
    customer_name: data.customerName.trim(),
    customer_phone: normalizedPhone,
    customer_email: data.customerEmail?.trim() || null,
    notes: data.notes?.trim() || null,
    reservation_date: data.reservationDate,
    reservation_time: data.reservationTime,
    party_size: data.partySize,
    status: options?.status ?? data.status ?? "pending",
    source: data.source ?? "web",
    assigned_table_ids: assignedTableIds,
    deposit_status: depositStatusToRow(data.depositStatus),
    deposit_amount: data.depositAmount ?? null,
    created_at: options?.createdAt ?? nowIso(),
    updated_at: options?.updatedAt ?? nowIso(),
  };
}

async function readReservationsForBusiness(businessId: string) {
  const supabase = getSupabaseClientOrThrow();
  const safeBusinessId = assertSupabaseUuid(businessId, "businessId");

  const { data, error } = await supabase
    .schema("public")
    .from("reservations")
    .select(RESERVATION_SELECT)
    .eq("business_id", safeBusinessId)
    .order("reservation_date", { ascending: true })
    .order("reservation_time", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw formatSupabaseReservationError("reservations", error);
  }

  return (data ?? []) as SupabaseReservationRow[];
}

async function readReservationById(reservationId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("reservations")
    .select(RESERVATION_SELECT)
    .eq("id", reservationId)
    .maybeSingle();

  if (error) {
    throw formatSupabaseReservationError("reservations", error);
  }

  return (data as SupabaseReservationRow | null) ?? null;
}

async function readCustomerByBusinessPhone(businessId: string, phone: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("customers")
    .select(CUSTOMER_SELECT)
    .eq("business_id", businessId)
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    throw formatSupabaseReservationError("customers", error);
  }

  return (data as SupabaseCustomerRow | null) ?? null;
}

async function createCustomerIfNeeded(data: SupabaseReservationInput) {
  const businessId = assertSupabaseUuid(data.businessId, "businessId");
  const phone = normalizePhone(data.customerPhone);

  if (!phone) {
    return null;
  }

  try {
    const existing = await readCustomerByBusinessPhone(businessId, phone);
    if (existing) {
      return existing.id;
    }

    const supabase = getSupabaseClientOrThrow();
    const { data: inserted, error } = await supabase
      .schema("public")
      .from("customers")
      .insert({
        business_id: businessId,
        name: data.customerName.trim(),
        phone,
        email: data.customerEmail?.trim() || null,
        internal_notes: null,
        preferences: null,
        tags: [],
      })
      .select(CUSTOMER_SELECT)
      .single();

    if (error) {
      throw formatSupabaseReservationError("customers", error);
    }

    return (inserted as SupabaseCustomerRow).id;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("fallo customers")) {
      return null;
    }

    return null;
  }
}

function isActiveStatus(status: ReservationStatus) {
  return ACTIVE_STATUSES.includes(status);
}

function sortByReservationDateTime(left: Reservation, right: Reservation) {
  const dateCompare = left.reservationDate.localeCompare(right.reservationDate);
  if (dateCompare !== 0) {
    return dateCompare;
  }

  const timeCompare = left.reservationTime.localeCompare(right.reservationTime);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  return right.createdAt.localeCompare(left.createdAt);
}

let reservationsCache: Reservation[] = [];
let loadedBusinesses = new Set<string>();
let loadingBusinesses = new Map<string, Promise<void>>();
const CHANGE_EVENT = "reservations";

function isBrowser() {
  return typeof window !== "undefined";
}

export function subscribeSupabaseReservations(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleChange = () => listener();
  window.addEventListener(CHANGE_EVENT, handleChange);
  return () => window.removeEventListener(CHANGE_EVENT, handleChange);
}

function cloneReservation(reservation: Reservation) {
  return {
    ...reservation,
    assignedTableIds: reservation.assignedTableIds ? [...reservation.assignedTableIds] : null,
  };
}

function cloneReservations(reservations: Reservation[]) {
  return reservations.map(cloneReservation);
}

async function refreshReservationsCache(businessId: string) {
  const safeBusinessId = assertSupabaseUuid(businessId, "businessId");

  if (loadingBusinesses.has(safeBusinessId)) {
    return loadingBusinesses.get(safeBusinessId);
  }

  const promise = (async () => {
    const rows = await readReservationsForBusiness(safeBusinessId);
    const mapped = rows.map(mapSupabaseReservationToReservation);
    const others = reservationsCache.filter((reservation) => reservation.businessId !== safeBusinessId);
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
  const safeBusinessId = assertSupabaseUuid(businessId, "businessId");

  if (!loadedBusinesses.has(safeBusinessId) && !loadingBusinesses.has(safeBusinessId)) {
    void refreshReservationsCache(safeBusinessId);
  }
}

function getReservationsSnapshotForBusiness(businessId: string) {
  ensureLoaded(businessId);
  const safeBusinessId = assertSupabaseUuid(businessId, "businessId");
  return reservationsCache.filter((reservation) => reservation.businessId === safeBusinessId);
}

function getReservationSnapshotById(reservationId: string) {
  return reservationsCache.find((reservation) => reservation.id === reservationId) ?? null;
}

function toActiveReservations(businessId: string, date: string, time: string) {
  return getReservationsSnapshotForBusiness(businessId).filter(
    (reservation) =>
      reservation.reservationDate === date &&
      reservation.reservationTime === time &&
      isActiveStatus(reservation.status),
  );
}

function buildReadOnlyAvailabilitySummary(reservation: Reservation) {
  const slotSummary = getSupabaseTableAvailabilitySummary(
    reservation.businessId,
    reservation.reservationDate,
    reservation.reservationTime,
  );
  const tables = getSupabaseFloorTablesByBusinessSync(reservation.businessId);
  const singleSuggestions = (slotSummary.availableTableIds ?? [])
    .map((tableId) => tables.find((table) => table.id === tableId) ?? null)
    .filter((table): table is (typeof tables)[number] => table !== null)
    .map((table) => ({
      tableIds: [table.id],
      tableLabel: table.label,
      seats: table.seats,
      excessSeats: Math.max(0, table.seats - reservation.partySize),
      kind: "single" as const,
      available: true,
      suggested: true,
      reason: null,
    }));

  return {
    reservationId: reservation.id,
    businessId: reservation.businessId,
    date: reservation.reservationDate,
    time: reservation.reservationTime,
    validation: {
      isValid: true,
      errors: reservation.tableId || reservation.joinedTableId ? [] : ["Sin mesa asignada."],
      warnings: reservation.tableId || reservation.joinedTableId ? [] : ["Sin mesa asignada."],
    },
    singleSuggestions,
    joinedSuggestions: [],
    hasSuggestions: singleSuggestions.length > 0,
    availableTableCount: singleSuggestions.length,
  };
}

export async function getSupabaseReservationsByBusiness(businessId: string) {
  const rows = await readReservationsForBusiness(businessId);
  return rows.map(mapSupabaseReservationToReservation);
}

export async function getSupabaseReservationsByBusinessAndDate(businessId: string, date: string) {
  const rows = await readReservationsForBusiness(businessId);
  return rows
    .map(mapSupabaseReservationToReservation)
    .filter((reservation) => reservation.reservationDate === date)
    .sort(sortByReservationDateTime);
}

export async function createSupabaseReservation(
  businessId: string,
  data: SupabaseReservationInput,
) {
  const safeBusinessId = assertSupabaseUuid(businessId, "businessId");
  const business = await getSupabaseBusinessById(safeBusinessId);
  const services = await getSupabaseServicesByBusiness(safeBusinessId);
  const service = services.find((entry) => entry.id === data.serviceId) ?? null;

  if (!service) {
    throw new Error("El servicio seleccionado no existe o no esta activo.");
  }

  if (data.partySize > service.capacity) {
    throw new Error("La cantidad de personas supera la capacidad del servicio seleccionado.");
  }

  const phone = normalizePhone(data.customerPhone);
  if (!phone) {
    throw new Error("Ingresá un teléfono válido para poder reservar.");
  }

  const reservations = await getSupabaseReservationsByBusiness(safeBusinessId);
  const activeReservation = reservations.find(
    (reservation) =>
      isActiveStatus(reservation.status) &&
      normalizePhone(reservation.customerPhone) === phone,
  );

  if (activeReservation) {
    throw new Error("Ya tenés una reserva activa con este teléfono. Contactá al local para modificarla.");
  }

  const sameSlotTotal = reservations
    .filter(
      (reservation) =>
        reservation.serviceId === data.serviceId &&
        reservation.reservationDate === data.reservationDate &&
        reservation.reservationTime === data.reservationTime &&
        isActiveStatus(reservation.status),
    )
    .reduce((sum, reservation) => sum + reservation.partySize, 0);

  if (typeof service.capacity === "number" && service.capacity > 0) {
    if (sameSlotTotal + data.partySize > service.capacity) {
      throw new Error("No hay disponibilidad para ese horario.");
    }
  }

  const autoConfirmReservations = business?.auto_confirm_reservations ?? true;
  const shouldAutoAssignTables = data.source === "web" && autoConfirmReservations;
  const defaultDurationMinutes =
    getReservationRules(safeBusinessId)?.defaultReservationDurationMinutes ?? 120;
  const serviceDurationMinutes =
    typeof service.durationMinutes === "number" && service.durationMinutes > 0
      ? service.durationMinutes
      : defaultDurationMinutes;
  const tables = shouldAutoAssignTables
    ? await getSupabaseFloorTablesByBusiness(safeBusinessId)
    : [];
  const tableAvailability = shouldAutoAssignTables
    ? getAvailableTablesForReservationSlot({
        businessId: safeBusinessId,
        reservationDate: data.reservationDate,
        reservationTime: data.reservationTime,
        durationMinutes: serviceDurationMinutes,
        partySize: data.partySize,
        reservations,
        tables,
        services,
        fallbackDurationMinutes: defaultDurationMinutes,
      })
    : null;
  const assignedTableId = tableAvailability?.availableTables[0]?.id ?? null;

  const customerId = await createCustomerIfNeeded({
    ...data,
    businessId: safeBusinessId,
    customerPhone: phone,
  });

  const supabase = getSupabaseClientOrThrow();
  const payload = mapReservationInputToSupabaseRow(
    {
      ...data,
      businessId: safeBusinessId,
      customerPhone: phone,
    },
    {
      customerId,
      status:
        data.status ?? 
        (shouldAutoAssignTables && assignedTableId ? "confirmed" : "pending"),
      assignedTableIds: assignedTableId ? [assignedTableId] : [],
    },
  );

  const { data: inserted, error } = await supabase
    .schema("public")
    .from("reservations")
    .insert(payload)
    .select(RESERVATION_SELECT)
    .single();

  if (error) {
    throw formatSupabaseReservationError("reservations", error);
  }

  const mapped = mapSupabaseReservationToReservation(inserted as SupabaseReservationRow);
  reservationsCache = [...reservationsCache.filter((reservation) => reservation.id !== mapped.id), mapped];
  loadedBusinesses.add(safeBusinessId);

  if (isBrowser()) {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return mapped;
}

export async function updateSupabaseReservation(
  reservationId: string,
  data: Partial<SupabaseReservationInput>,
) {
  const current = await readReservationById(reservationId);
  if (!current) {
    throw new Error("La reserva no existe.");
  }

  const supabase = getSupabaseClientOrThrow();
  const nextBusinessId = data.businessId ? assertSupabaseUuid(data.businessId, "businessId") : current.business_id;
  const nextServiceId = data.serviceId ? assertSupabaseUuid(data.serviceId, "serviceId") : current.service_id;

  const payload: Record<string, unknown> = {
    customer_name: data.customerName?.trim() ?? current.customer_name,
    customer_phone: data.customerPhone ? normalizePhone(data.customerPhone) : current.customer_phone,
    customer_email:
      data.customerEmail === undefined ? current.customer_email : data.customerEmail?.trim() || null,
    notes: data.notes === undefined ? current.notes : data.notes?.trim() || null,
    reservation_date: data.reservationDate ?? current.reservation_date,
    reservation_time: data.reservationTime ?? current.reservation_time,
    party_size: data.partySize ?? current.party_size,
    status: data.status ?? current.status,
    source: data.source ?? current.source,
    assigned_table_ids: normalizeAssignedTableIds(data.assignedTableIds ?? current.assigned_table_ids),
    deposit_status:
      data.depositStatus === undefined
        ? current.deposit_status
        : depositStatusToRow(data.depositStatus),
    deposit_amount: data.depositAmount ?? current.deposit_amount,
    updated_at: nowIso(),
  };

  if (data.businessId) {
    payload.business_id = nextBusinessId;
  }

  if (data.serviceId) {
    payload.service_id = nextServiceId;
  }

  const { data: updated, error } = await supabase
    .schema("public")
    .from("reservations")
    .update(payload)
    .eq("id", reservationId)
    .select(RESERVATION_SELECT)
    .single();

  if (error) {
    throw formatSupabaseReservationError("reservations", error);
  }

  const mapped = mapSupabaseReservationToReservation(updated as SupabaseReservationRow);
  reservationsCache = [...reservationsCache.filter((reservation) => reservation.id !== mapped.id), mapped];

  if (isBrowser()) {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return mapped;
}

export async function updateSupabaseReservationStatus(
  reservationId: string,
  status: ReservationStatus,
) {
  return updateSupabaseReservation(reservationId, { status });
}

export async function updateSupabaseReservationAssignedTables(
  reservationId: string,
  tableIds: string[],
) {
  const current = await readReservationById(reservationId);
  if (!current) {
    throw new Error("La reserva no existe.");
  }

  const nextTableIds = normalizeAndValidateAssignedTableIds(tableIds);
  if (nextTableIds.length === 0) {
    return updateSupabaseReservation(reservationId, {
      assignedTableIds: [],
    });
  }

  const businessId = current.business_id;
  const tables = await getSupabaseFloorTablesByBusiness(businessId);
  const services = await getSupabaseServicesByBusiness(businessId);
  const service = services.find((entry) => entry.id === current.service_id) ?? null;
  const reservations = await getSupabaseReservationsByBusiness(businessId);
  const defaultDurationMinutes =
    getReservationRules(businessId)?.defaultReservationDurationMinutes ?? 120;
  const durationMinutes =
    service && service.durationMinutes > 0 ? service.durationMinutes : defaultDurationMinutes;
  const availability = getAvailableTablesForReservationSlot({
    businessId,
    reservationDate: current.reservation_date,
    reservationTime: current.reservation_time,
    durationMinutes,
    partySize: Math.max(1, current.party_size),
    reservations,
    tables,
    services,
    fallbackDurationMinutes: defaultDurationMinutes,
    optionalReservationIdToIgnore: reservationId,
  });

  const availableTableIdSet = new Set(availability.availableTableIds);
  const conflicts = nextTableIds.filter((tableId) => !availableTableIdSet.has(tableId));

  if (conflicts.length > 0) {
    const conflictLabels = conflicts
      .map((tableId) => tables.find((table) => table.id === tableId)?.label ?? tableId)
      .join(", ");
    throw new Error(
      `Mesa no disponible: ya tiene una reserva activa en ese horario. ${conflictLabels}`,
    );
  }

  const totalSeats = nextTableIds.reduce((sum, tableId) => {
    const table = tables.find((entry) => entry.id === tableId);
    return sum + (table?.seats ?? 0);
  }, 0);

  if (totalSeats < current.party_size) {
    throw new Error("La combinacion no tiene suficientes asientos.");
  }

  return updateSupabaseReservation(reservationId, {
    assignedTableIds: nextTableIds,
  });
}

export async function deleteSupabaseReservation(reservationId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("reservations")
    .delete()
    .eq("id", reservationId)
    .select(RESERVATION_SELECT)
    .maybeSingle();

  if (error) {
    throw formatSupabaseReservationError("reservations", error);
  }

  const removed = data ? mapSupabaseReservationToReservation(data as SupabaseReservationRow) : null;
  if (removed) {
    reservationsCache = reservationsCache.filter((reservation) => reservation.id !== reservationId);

    if (isBrowser()) {
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }

  return removed;
}

export function getSupabaseReservationsSnapshot() {
  return cloneReservations(reservationsCache);
}

export async function refreshSupabaseReservationsForBusiness(businessId: string) {
  await refreshReservationsCache(businessId);
  return getReservationsSnapshotForBusiness(businessId);
}

export function getSupabaseReservationById(reservationId: string) {
  return getReservationSnapshotById(reservationId);
}

export function getSupabaseActiveReservationByPhone(businessId: string, phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return null;
  }

  return (
    getReservationsSnapshotForBusiness(businessId).find((reservation) => {
      if (!isActiveStatus(reservation.status)) {
        return false;
      }

      return normalizePhone(reservation.customerPhone) === normalized;
    }) ?? null
  );
}

export function getSupabaseReservationsByBusinessSync(businessId: string) {
  return cloneReservations(getReservationsSnapshotForBusiness(businessId).sort(sortByReservationDateTime));
}

export function getSupabaseActiveReservationsForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  const services = getSupabaseServicesByBusinessSync(businessId);
  const slotStepMinutes = Math.max(
    1,
    getReservationRules(businessId)?.slotDurationMinutes || 30,
  );
  const defaultDurationMinutes =
    getReservationRules(businessId)?.defaultReservationDurationMinutes ?? 120;
  return getReservationsOverlappingSlot({
    businessId,
    date,
    time,
    reservations: getSupabaseReservationsByBusinessSync(businessId),
    services,
    slotDurationMinutes: slotStepMinutes,
    fallbackDurationMinutes: defaultDurationMinutes,
  });
}

export function getSupabaseReservationsByBusinessAndDateSync(businessId: string, date: string) {
  return cloneReservations(
    getReservationsSnapshotForBusiness(businessId)
      .filter((reservation) => reservation.reservationDate === date)
      .sort(sortByReservationDateTime),
  );
}

export function getSupabaseReservationTableAvailability(reservationId: string) {
  const reservation = getReservationSnapshotById(reservationId);
  if (!reservation) {
    return null;
  }

  return buildReadOnlyAvailabilitySummary(reservation);
}

export function getSupabaseTableAvailabilitySummary(
  businessId: string,
  date: string,
  time: string,
  reservationsOverride?: Reservation[],
) {
  const tables = getSupabaseFloorTablesByBusinessSync(businessId);
  const services = getSupabaseServicesByBusinessSync(businessId);
  const slotStepMinutes = Math.max(
    1,
    getReservationRules(businessId)?.slotDurationMinutes || 30,
  );
  const defaultDurationMinutes =
    getReservationRules(businessId)?.defaultReservationDurationMinutes ?? 120;
  const sourceReservations = reservationsOverride ?? getSupabaseReservationsByBusinessSync(businessId);
  const reservations = getReservationsOverlappingSlot({
    businessId,
    date,
    time,
    reservations: sourceReservations,
    services,
    slotDurationMinutes: slotStepMinutes,
    fallbackDurationMinutes: defaultDurationMinutes,
  });
  const occupiedTableIds = new Set(
    getOccupiedTableIdsForSlot({
      businessId,
      date,
      time,
      reservations: sourceReservations,
      services,
      fallbackDurationMinutes: defaultDurationMinutes,
      slotDurationMinutes: slotStepMinutes,
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
    const assignedTableIds = getReservationAssignedTableIds(reservation);

    for (const tableId of assignedTableIds) {
      occupiedTableIds.add(tableId);

      const table = tables.find((entry) => entry.id === tableId);
      const warnings = warningsByTableId[tableId] ?? [];

      if (table && table.seats < reservation.partySize) {
        warnings.push("La mesa tiene menos asientos que la reserva.");
      }

      const conflicts = reservations.filter(
        (entry) =>
          entry.id !== reservation.id &&
          (entry.status === "pending" || entry.status === "confirmed") &&
          reservationUsesTable(entry, tableId),
      );

      if (conflicts.length > 0) {
        warnings.push("Esta mesa ya esta asignada a otra reserva activa en ese horario.");
        conflictsByTableId[tableId] = conflicts.map((entry) => entry.id);
      }

      warningsByTableId[tableId] = [...new Set(warnings)];
    }
  }

  const availableTables = tables.filter((table) => !occupiedTableIds.has(table.id));
  const reservationsWithoutTable = reservations.filter(
    (reservation) => getReservationAssignedTableIds(reservation).length === 0,
  );

  return {
    businessId,
    date,
    time,
    occupiedTableIds: [...occupiedTableIds],
    reservationsWithoutTable,
    assignmentsByTableId: reservations.reduce<Record<string, Reservation[]>>(
      (assignments, reservation) => {
        const assignedTableIds = getReservationAssignedTableIds(reservation);

        for (const tableId of assignedTableIds) {
          assignments[tableId] = [...(assignments[tableId] ?? []), reservation];
        }

        return assignments;
      },
      {},
    ),
    joinedTableByTableId: tables.reduce<Record<string, null>>((result, table) => {
      result[table.id] = null;
      return result;
    }, {}),
    availableTableIds: availableTables.map((table) => table.id),
    warningsByTableId,
    conflictsByTableId,
    capacityAvailable: availableTables.reduce((sum, table) => sum + table.seats, 0),
    capacityOccupied: [...occupiedTableIds].reduce((sum, tableId) => {
      const table = tables.find((entry) => entry.id === tableId);
      return sum + (table?.seats ?? 0);
    }, 0),
    reservationsWithoutTableCount: reservationsWithoutTable.length,
    conflictCount: Object.values(conflictsByTableId).reduce((sum, list) => sum + list.length, 0),
  };
}
