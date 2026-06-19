import type {
  BusinessHours,
  DayOfWeek,
  Reservation,
  ReservationRules,
  ReservationStatus,
} from "@/data/types";
import { timeToMinutes } from "@/lib/date-time";
import { getTableAvailabilitySummary } from "@/data/reservations";
import { getBusinessServices } from "@/data/scheduling";
import { sortReservationsForLocalPanel } from "@/lib/reservations";
import { intervalsOverlap, isReservationActiveAtSlot } from "@/lib/reservation-availability";

export type CalendarViewMode = "day" | "week";
export type CalendarStatusFilter = ReservationStatus | "all";
export type CalendarServiceFilter = string | "all";

export type CalendarSlot = {
  time: string;
  reservations: Reservation[];
  isBreak: boolean;
  isOpen: boolean;
  reason?: string;
  unassignedReservationsCount?: number;
  hasTableConflicts?: boolean;
  conflictCount?: number;
  availableTableCount?: number;
  occupiedTableCount?: number;
};

export type CalendarDaySchedule = {
  date: string;
  label: string;
  weekday: DayOfWeek | null;
  businessHours: BusinessHours | null;
  slots: CalendarSlot[];
  isOpen: boolean;
  message?: string;
};

export type CalendarFilters = {
  serviceId: CalendarServiceFilter;
  status: CalendarStatusFilter;
  search: string;
};

export type CalendarStats = {
  totalReservations: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  noShow: number;
  peopleTotal: number;
  withoutTableCount: number;
};

const dayNames: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function parseDateValue(dateValue: string) {
  const match = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function normalizeDateKey(value?: string | Date | null) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMinutesToTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCalendarFilterValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "all";
}

export function hasActiveCalendarFilters(filters: CalendarFilters) {
  return (
    normalizeSearchValue(filters.search).length > 0 ||
    normalizeCalendarFilterValue(filters.status) !== "all" ||
    normalizeCalendarFilterValue(filters.serviceId) !== "all"
  );
}

function buildReservationSearchHaystack(
  reservation: Reservation,
  serviceNameById?: Map<string, string> | null,
) {
  const serviceName = serviceNameById?.get(reservation.serviceId) ?? "";

  return normalizeSearchValue(
    [
      reservation.customerName,
      reservation.customerPhone,
      reservation.customerEmail ?? "",
      reservation.notes ?? "",
      reservation.serviceId,
      serviceName,
      reservation.tableId ?? "",
      reservation.tableLabel ?? "",
      reservation.joinedTableId ?? "",
      reservation.joinedTableLabel ?? "",
      reservation.source,
      reservation.status,
    ].join(" "),
  );
}

export function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateValue(dateValue: string, days: number) {
  const date = parseDateValue(dateValue);
  if (!date) {
    return dateValue;
  }

  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

export function getWeekStartValue(dateValue: string) {
  const date = parseDateValue(dateValue);
  if (!date) {
    return dateValue;
  }

  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toDateInputValue(date);
}

export function getWeekDates(dateValue: string) {
  const weekStart = getWeekStartValue(dateValue);

  return Array.from({ length: 7 }, (_, index) =>
    addDaysToDateValue(weekStart, index),
  );
}

export function getCalendarDateLabel(dateValue: string) {
  const date = parseDateValue(dateValue);
  if (!date) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(/^./, (char) => char.toUpperCase());
}

export function getCalendarWeekdayShortLabel(dateValue: string) {
  const date = parseDateValue(dateValue);
  if (!date) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  })
    .format(date)
    .replace(/^./, (char) => char.toUpperCase());
}

export function getCalendarWeekTitle(dateValue: string) {
  const weekDates = getWeekDates(dateValue);
  return `${getCalendarDateLabel(weekDates[0])} - ${getCalendarDateLabel(
    weekDates[6],
  )}`;
}

export function getDayOfWeek(dateValue: string) {
  const date = parseDateValue(dateValue);
  if (!date) {
    return null;
  }

  return dayNames[date.getDay()];
}

function sortByStartTime(times: string[]) {
  return [...times].sort((left, right) => (timeToMinutes(left) ?? 0) - (timeToMinutes(right) ?? 0));
}

export function getReservationsByDay(reservations: Reservation[], dateValue: string) {
  const normalizedDateValue = normalizeDateKey(dateValue);

  return reservations.filter(
    (reservation) => normalizeDateKey(reservation.reservationDate) === normalizedDateValue,
  );
}

export function getReservationsByWeek(reservations: Reservation[], anchorDateValue: string) {
  const weekDates = new Set(getWeekDates(anchorDateValue).map((dateValue) => normalizeDateKey(dateValue)));

  return reservations.filter(
    (reservation) => weekDates.has(normalizeDateKey(reservation.reservationDate)),
  );
}

export function groupReservationsByTime(reservations: Reservation[]) {
  const map = new Map<string, Reservation[]>();

  for (const reservation of sortReservationsForLocalPanel(reservations)) {
    const list = map.get(reservation.reservationTime) ?? [];
    list.push(reservation);
    map.set(reservation.reservationTime, list);
  }

  return [...map.entries()]
    .sort(([leftTime], [rightTime]) => (timeToMinutes(leftTime) ?? 0) - (timeToMinutes(rightTime) ?? 0))
    .map(([time, items]) => ({ time, items }));
}

export function filterCalendarReservations(
  reservations: Reservation[],
  filters: CalendarFilters,
  context?: {
    serviceNameById?: Map<string, string> | null;
  },
) {
  const search = normalizeSearchValue(filters.search);

  return reservations.filter((reservation) => {
    const matchesStatus =
      filters.status === "all" || reservation.status === filters.status;
    const matchesService =
      filters.serviceId === "all" || reservation.serviceId === filters.serviceId;

    if (!matchesStatus || !matchesService) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = buildReservationSearchHaystack(
      reservation,
      context?.serviceNameById ?? null,
    );

    return haystack.includes(search);
  });
}

function buildReservationFilters(
  reservations: Reservation[],
  filters: CalendarFilters,
  context?: {
    serviceNameById?: Map<string, string> | null;
  },
) {
  return sortReservationsForLocalPanel(
    filterCalendarReservations(reservations, filters, context),
  );
}

export function getCalendarStats(reservations: Reservation[]) {
  return {
    totalReservations: reservations.length,
    pending: reservations.filter((reservation) => reservation.status === "pending").length,
    confirmed: reservations.filter((reservation) => reservation.status === "confirmed").length,
    cancelled: reservations.filter((reservation) => reservation.status === "cancelled").length,
    completed: reservations.filter((reservation) => reservation.status === "completed").length,
    noShow: reservations.filter((reservation) => reservation.status === "no_show").length,
    peopleTotal: reservations.reduce((total, reservation) => total + reservation.partySize, 0),
    withoutTableCount: reservations.filter(
      (reservation) => !reservation.tableId && !reservation.joinedTableId,
    ).length,
  } satisfies CalendarStats;
}

export function buildDaySchedule({
  businessId,
  dateValue,
  hours,
  reservations,
  rules,
  filters,
  serviceNameById,
}: {
  businessId: string;
  dateValue: string;
  hours: BusinessHours[];
  reservations: Reservation[];
  rules: ReservationRules;
  filters: CalendarFilters;
  serviceNameById?: Map<string, string> | null;
}) {
  const weekday = getDayOfWeek(dateValue);
  const businessHours = weekday
    ? hours.find((entry) => entry.dayOfWeek === weekday) ?? null
    : null;

  if (!weekday || !businessHours || !businessHours.isOpen) {
    return {
      date: dateValue,
      label: getCalendarDateLabel(dateValue),
      weekday,
      businessHours,
      slots: [],
      isOpen: false,
      message: "El negocio esta cerrado este dia.",
    } satisfies CalendarDaySchedule;
  }

  const openMinutes = timeToMinutes(businessHours.openTime) ?? 0;
  const closeMinutes = timeToMinutes(businessHours.closeTime) ?? 0;
  const breakStartMinutes = businessHours.breakStartTime
    ? timeToMinutes(businessHours.breakStartTime)
    : null;
  const breakEndMinutes = businessHours.breakEndTime
    ? timeToMinutes(businessHours.breakEndTime)
    : null;
  const slotStep = rules.slotDurationMinutes;
  const services = getBusinessServices(businessId);
  const selectedDateKey = normalizeDateKey(dateValue);
  const filteredReservations = buildReservationFilters(reservations, filters, {
    serviceNameById,
  }).filter(
    (reservation) => normalizeDateKey(reservation.reservationDate) === selectedDateKey,
  );

  const slots: CalendarSlot[] = [];
  // Keep the final minute of service visible when closing is 23:59.
  const latestEndMinutes = closeMinutes + 1;

  for (
    let startMinutes = openMinutes;
    startMinutes < latestEndMinutes;
    startMinutes += slotStep
  ) {
    const time = formatMinutesToTime(startMinutes);
      const isBreak =
        breakStartMinutes !== null &&
        breakEndMinutes !== null &&
        intervalsOverlap(
          startMinutes,
          startMinutes + slotStep,
          breakStartMinutes,
          breakEndMinutes,
        );
    const reservationsForSlot = filteredReservations.filter((reservation) =>
      isReservationActiveAtSlot(reservation, dateValue, time, {
        service: services.find((entry) => entry.id === reservation.serviceId) ?? null,
        slotDurationMinutes: slotStep,
        fallbackDurationMinutes: slotStep,
      }),
    );
    const tableSummary = getTableAvailabilitySummary(
      businessId,
      dateValue,
      time,
      reservationsForSlot,
    );

    slots.push({
      time,
      reservations: reservationsForSlot,
      isBreak,
      isOpen: !isBreak,
      reason: isBreak ? "En descanso" : undefined,
      unassignedReservationsCount: tableSummary.reservationsWithoutTableCount ?? 0,
      hasTableConflicts: (tableSummary.conflictCount ?? 0) > 0,
      conflictCount: tableSummary.conflictCount ?? 0,
      availableTableCount: tableSummary.availableTableIds?.length ?? 0,
      occupiedTableCount: tableSummary.occupiedTableIds.length,
    });
  }

  return {
    date: dateValue,
    label: getCalendarDateLabel(dateValue),
    weekday,
    businessHours,
    slots,
    isOpen: true,
  } satisfies CalendarDaySchedule;
}

export function buildWeekSchedule({
  businessId,
  anchorDateValue,
  hours,
  reservations,
  rules,
  filters,
  serviceNameById,
}: {
  businessId: string;
  anchorDateValue: string;
  hours: BusinessHours[];
  reservations: Reservation[];
  rules: ReservationRules;
  filters: CalendarFilters;
  serviceNameById?: Map<string, string> | null;
}) {
  const weekDates = getWeekDates(anchorDateValue);
  const daySchedules = weekDates.map((dateValue) =>
    buildDaySchedule({
      businessId,
      dateValue,
      hours,
      reservations,
      rules,
      filters,
      serviceNameById,
    }),
  );

  const slotTimes = sortByStartTime(
    [...new Set(daySchedules.flatMap((day) => day.slots.map((slot) => slot.time)))],
  );

  return {
    weekDates,
    daySchedules,
    slotTimes,
    label: `${getCalendarDateLabel(weekDates[0])} - ${getCalendarDateLabel(
      weekDates[6],
    )}`,
  };
}
