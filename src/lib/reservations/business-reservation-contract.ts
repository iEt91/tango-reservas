export const BUSINESS_RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;

export const BUSINESS_RESERVATION_SOURCES = [
  "web",
  "whatsapp",
  "phone",
  "instagram",
  "manual",
  "admin",
] as const;

export type BusinessReservationStatus =
  (typeof BUSINESS_RESERVATION_STATUSES)[number];
export type BusinessReservationSource =
  (typeof BUSINESS_RESERVATION_SOURCES)[number];

export type BusinessReservationEditor = {
  id?: string | null;
  serviceId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  status: BusinessReservationStatus;
  notes: string;
  source: BusinessReservationSource;
  durationMinutes: number;
  publicCode: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string;
  completedAt: string;
  cancelledAt: string;
  noShowAt: string;
};

export type BusinessReservationDatabaseRow = {
  id: string;
  business_id: string;
  service_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: BusinessReservationStatus;
  notes: string | null;
  source: BusinessReservationSource;
  duration_minutes: number;
  public_code: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  no_show_at: string | null;
};

export type BusinessReservationRpcPayload = {
  service_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  notes: string | null;
  source: BusinessReservationSource;
  duration_minutes: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/u;
const PUBLIC_CODE_PATTERN = /^RES-[A-Z0-9]{12}$/u;

export function normalizeReservationId(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error("El identificador de la reserva es inválido.");
  }

  return value;
}

function normalizeRequiredUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} es inválido.`);
  }

  return value;
}

function normalizeOptionalUuid(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return normalizeRequiredUuid(value, label);
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw new Error("La fecha de la reserva es inválida.");
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("La fecha de la reserva es inválida.");
  }

  return value;
}

function normalizeTime(value: unknown) {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) {
    throw new Error("La hora de la reserva es inválida.");
  }

  return value.slice(0, 5);
}

export function normalizeBusinessReservationStatus(
  value: unknown,
): BusinessReservationStatus {
  if (
    typeof value !== "string"
    || !BUSINESS_RESERVATION_STATUSES.includes(
      value as BusinessReservationStatus,
    )
  ) {
    throw new Error("El estado de la reserva es inválido.");
  }

  return value as BusinessReservationStatus;
}

function normalizeSource(value: unknown): BusinessReservationSource {
  if (
    typeof value !== "string"
    || !BUSINESS_RESERVATION_SOURCES.includes(
      value as BusinessReservationSource,
    )
  ) {
    throw new Error("El origen de la reserva es inválido.");
  }

  return value as BusinessReservationSource;
}

function normalizeOptionalTimestamp(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error("La fecha operativa de la reserva es inválida.");
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("La fecha operativa de la reserva es inválida.");
  }

  return parsed.toISOString();
}

export function normalizeReservationIdempotencyKey(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("La clave de idempotencia es inválida.");
  }

  const normalized = value.trim();

  if (normalized.length < 8 || normalized.length > 120) {
    throw new Error(
      "La clave de idempotencia debe tener entre 8 y 120 caracteres.",
    );
  }

  return normalized;
}

export function normalizeBusinessReservation(
  value: unknown,
): BusinessReservationEditor {
  if (!value || typeof value !== "object") {
    throw new Error("La reserva es inválida.");
  }

  const data = value as Record<string, unknown>;
  const customerName =
    typeof data.customerName === "string"
      ? data.customerName.trim()
      : "";
  const customerPhone =
    typeof data.customerPhone === "string"
      ? data.customerPhone.replace(/\D/g, "")
      : "";
  const customerEmail =
    typeof data.customerEmail === "string"
      ? data.customerEmail.trim().toLowerCase()
      : "";
  const notes =
    typeof data.notes === "string"
      ? data.notes.trim()
      : "";
  const partySize = Number(data.partySize);
  const durationMinutes = Number(data.durationMinutes);
  const publicCode =
    typeof data.publicCode === "string"
      ? data.publicCode.trim().toUpperCase()
      : "";

  if (customerName.length < 1 || customerName.length > 160) {
    throw new Error(
      "El nombre debe tener entre 1 y 160 caracteres.",
    );
  }

  if (customerPhone.length < 6 || customerPhone.length > 40) {
    throw new Error("El teléfono de la reserva es inválido.");
  }

  if (
    customerEmail.length > 0
    && (
      customerEmail.length > 320
      || !EMAIL_PATTERN.test(customerEmail)
    )
  ) {
    throw new Error("El correo electrónico es inválido.");
  }

  if (notes.length > 4000) {
    throw new Error(
      "Las notas no pueden superar 4000 caracteres.",
    );
  }

  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 200) {
    throw new Error("La cantidad de personas es inválida.");
  }

  if (
    !Number.isInteger(durationMinutes)
    || durationMinutes < 15
    || durationMinutes > 720
    || durationMinutes % 15 !== 0
  ) {
    throw new Error(
      "La duración debe estar entre 15 y 720 minutos, en bloques de 15.",
    );
  }

  if (publicCode && !PUBLIC_CODE_PATTERN.test(publicCode)) {
    throw new Error("El código público de la reserva es inválido.");
  }

  return {
    id: normalizeReservationId(data.id),
    serviceId: normalizeRequiredUuid(
      data.serviceId,
      "El servicio",
    ),
    customerId: normalizeOptionalUuid(
      data.customerId,
      "El cliente",
    ),
    customerName,
    customerPhone,
    customerEmail,
    reservationDate: normalizeDate(data.reservationDate),
    reservationTime: normalizeTime(data.reservationTime),
    partySize,
    status: normalizeBusinessReservationStatus(data.status),
    notes,
    source: normalizeSource(data.source),
    durationMinutes,
    publicCode,
    createdAt: normalizeOptionalTimestamp(data.createdAt),
    updatedAt: normalizeOptionalTimestamp(data.updatedAt),
    confirmedAt: normalizeOptionalTimestamp(data.confirmedAt),
    completedAt: normalizeOptionalTimestamp(data.completedAt),
    cancelledAt: normalizeOptionalTimestamp(data.cancelledAt),
    noShowAt: normalizeOptionalTimestamp(data.noShowAt),
  };
}

export function mapBusinessReservationRow(
  row: BusinessReservationDatabaseRow,
): BusinessReservationEditor {
  return normalizeBusinessReservation({
    id: row.id,
    serviceId: row.service_id,
    customerId: row.customer_id ?? "",
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email ?? "",
    reservationDate: row.reservation_date,
    reservationTime: row.reservation_time,
    partySize: row.party_size,
    status: row.status,
    notes: row.notes ?? "",
    source: row.source,
    durationMinutes: row.duration_minutes,
    publicCode: row.public_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at ?? "",
    completedAt: row.completed_at ?? "",
    cancelledAt: row.cancelled_at ?? "",
    noShowAt: row.no_show_at ?? "",
  });
}

export function toBusinessReservationRpcPayload(
  value: unknown,
): BusinessReservationRpcPayload {
  const reservation = normalizeBusinessReservation(value);

  return {
    service_id: reservation.serviceId,
    customer_id: reservation.customerId || null,
    customer_name: reservation.customerName,
    customer_phone: reservation.customerPhone,
    customer_email: reservation.customerEmail || null,
    reservation_date: reservation.reservationDate,
    reservation_time: reservation.reservationTime,
    party_size: reservation.partySize,
    notes: reservation.notes || null,
    source: reservation.source,
    duration_minutes: reservation.durationMinutes,
  };
}
