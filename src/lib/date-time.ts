const RESERVATION_TIME_REGEX =
  /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/;

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function timeToMinutes(value?: string | null) {
  const normalized = normalizeReservationTime(value);
  if (!normalized) {
    return null;
  }

  const [hours = "0", minutes = "0"] = normalized.split(":");
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);

  if (!Number.isFinite(parsedHours) || !Number.isFinite(parsedMinutes)) {
    return null;
  }

  return parsedHours * 60 + parsedMinutes;
}

export function normalizeReservationTime(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(RESERVATION_TIME_REGEX);
  if (!match) {
    return null;
  }

  const hours = match[1];
  const minutes = match[2];
  const seconds = match[3] ?? "00";

  return `${hours}:${minutes}:${seconds}`;
}

export function normalizeDateKey(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed || !DATE_KEY_REGEX.test(trimmed)) {
    return null;
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return trimmed;
}

export function isValidDate(value?: string | null) {
  return normalizeDateKey(value) !== null;
}

export function buildDateTimeFromDateAndTime(
  dateValue?: string | null,
  timeValue?: string | null,
) {
  const normalizedDate = normalizeDateKey(dateValue);
  const normalizedTime = normalizeReservationTime(timeValue);

  if (!normalizedDate || !normalizedTime) {
    return null;
  }

  const [year, month, day] = normalizedDate.split("-").map(Number);
  const [hours, minutes, seconds] = normalizedTime.split(":").map(Number);
  const dateTime = new Date(year, month - 1, day, hours, minutes, seconds, 0);

  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
}

export function buildDateTimeIsoFromDateAndTime(
  dateValue?: string | null,
  timeValue?: string | null,
) {
  const dateTime = buildDateTimeFromDateAndTime(dateValue, timeValue);
  return dateTime ? dateTime.toISOString() : null;
}

export function safeIsoFromDateTime(
  dateValue?: string | null,
  timeValue?: string | null,
  fallback: string | null = null,
) {
  const dateTime = buildDateTimeFromDateAndTime(dateValue, timeValue);
  if (!dateTime) {
    return fallback;
  }

  const iso = dateTime.toISOString();
  return Number.isNaN(new Date(iso).getTime()) ? fallback : iso;
}
