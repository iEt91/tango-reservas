import type {
  AvailabilitySlot,
  BusinessHours,
  Reservation,
  ReservationRules,
  Service,
} from "@/data/types";
import { buildDateTimeFromDateAndTime, timeToMinutes } from "@/lib/date-time";
import { intervalsOverlap } from "@/lib/reservation-availability";

export type AvailabilityState =
  | "ok"
  | "closed"
  | "too_far"
  | "no_hours"
  | "no_rules"
  | "no_service"
  | "invalid_date";

export type AvailabilityCalculationParams = {
  businessId: string;
  date: string;
  serviceId?: string;
  services: Service[];
  reservations: Reservation[];
  hours: BusinessHours[];
  rules: ReservationRules | null;
  service: Service | null;
  now?: Date;
};

export type AvailabilityCalculationResult = {
  status: AvailabilityState;
  message?: string;
  slots: AvailabilitySlot[];
  businessHours: BusinessHours | null;
  reservationRules: ReservationRules | null;
  service: Service | null;
};

const dayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function startOfLocalDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseDateOnly(dateValue: string) {
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

function combineDateAndTime(dateValue: string, timeValue: string) {
  return buildDateTimeFromDateAndTime(dateValue, timeValue);
}

function formatMinutesToTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getDayOfWeek(dateValue: string) {
  const date = parseDateOnly(dateValue);

  if (!date) {
    return null;
  }

  return dayNames[date.getDay()];
}

function resolveReservationWindow(
  businessHours: BusinessHours,
  rules: ReservationRules,
) {
  const useBusinessHoursForReservations =
    rules.useBusinessHoursForReservations ?? true;
  const startTime = useBusinessHoursForReservations
    ? businessHours.openTime
    : rules.reservationOpenTime?.trim() || businessHours.openTime;
  const endTime = useBusinessHoursForReservations
    ? businessHours.closeTime
    : rules.reservationCloseTime?.trim() || businessHours.closeTime;
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  return {
    startMinutes,
    endMinutes,
    startTime,
    endTime,
    allowReservationsAfterClose: rules.allowReservationsAfterClose ?? false,
  };
}

function getReservationDurationMinutes(
  service: Service,
  rules: ReservationRules,
) {
  return Math.max(
    1,
    service.durationMinutes ||
      rules.defaultReservationDurationMinutes ||
      120,
  );
}

export function calculateAvailabilityForReservations({
  businessId,
  date,
  services,
  reservations,
  hours,
  rules,
  service,
  now = new Date(),
}: AvailabilityCalculationParams): AvailabilityCalculationResult {
  if (!rules) {
    return {
      status: "no_rules",
      message: "Todavia no hay reglas de reserva configuradas para este negocio.",
      slots: [],
      businessHours: null,
      reservationRules: null,
      service,
    };
  }

  if (!service) {
    return {
      status: "no_service",
      message: "No hay servicios activos para calcular disponibilidad.",
      slots: [],
      businessHours: null,
      reservationRules: rules,
      service: null,
    };
  }

  const selectedDate = parseDateOnly(date);
  if (!selectedDate) {
    return {
      status: "invalid_date",
      message: "La fecha seleccionada no es valida.",
      slots: [],
      businessHours: null,
      reservationRules: rules,
      service,
    };
  }

  const currentDay = startOfLocalDay(now);
  const selectedDay = startOfLocalDay(selectedDate);
  const diffDays = Math.floor(
    (selectedDay.getTime() - currentDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays > rules.maxDaysAhead) {
    return {
      status: "too_far",
      message: `La fecha supera el limite de ${rules.maxDaysAhead} dias hacia adelante.`,
      slots: [],
      businessHours: null,
      reservationRules: rules,
      service,
    };
  }

  const dayOfWeek = getDayOfWeek(date);
  const dailyHours =
    dayOfWeek ? hours.find((entry) => entry.dayOfWeek === dayOfWeek) : null;

  if (!dailyHours || !dailyHours.isOpen) {
    return {
      status: "closed",
      message: "El negocio esta cerrado ese dia.",
      slots: [],
      businessHours: dailyHours ?? null,
      reservationRules: rules,
      service,
    };
  }

  const reservationWindow = resolveReservationWindow(dailyHours, rules);

  if (!reservationWindow) {
    return {
      status: "no_rules",
      message: "Todavia no hay horarios de reserva configurados para este negocio.",
      slots: [],
      businessHours: dailyHours,
      reservationRules: rules,
      service,
    };
  }

  const openMinutes = reservationWindow.startMinutes;
  const closeMinutes = reservationWindow.endMinutes;
  const breakStartMinutes = dailyHours.breakStartTime
    ? timeToMinutes(dailyHours.breakStartTime)
    : null;
  const breakEndMinutes = dailyHours.breakEndTime
    ? timeToMinutes(dailyHours.breakEndTime)
    : null;
  const slotStep = Math.max(1, rules.slotDurationMinutes || 30);
  const serviceDuration = getReservationDurationMinutes(service, rules);
  const capacityLimit = Math.min(rules.maxReservationsPerSlot, service.capacity);
  const earliestAllowed = new Date(now.getTime() + rules.minNoticeMinutes * 60 * 1000);
  // The public widget only limits the start window here. The real occupancy
  // check happens later with the full reservation duration, so we do not
  // subtract duration from the closing hour and hide valid late starts.
  const latestAllowedStartMinutes = closeMinutes;

  const filteredReservations = reservations.filter(
    (reservation) =>
      reservation.businessId === businessId &&
      reservation.reservationDate === date &&
      reservation.status !== "cancelled" &&
      reservation.status !== "no_show",
  );

  const slots: AvailabilitySlot[] = [];

  for (
    let startMinutes = openMinutes;
    startMinutes <= latestAllowedStartMinutes;
    startMinutes += slotStep
  ) {
    const time = formatMinutesToTime(startMinutes);
    const candidateStart = combineDateAndTime(date, time);
    const candidateEnd = candidateStart
      ? new Date(candidateStart.getTime() + serviceDuration * 60 * 1000)
      : null;

    if (!candidateStart || !candidateEnd) {
      slots.push({
        time,
        available: false,
        remainingCapacity: 0,
        reason: "Horario invalido",
      });
      continue;
    }

    if (candidateStart < earliestAllowed) {
      slots.push({
        time,
        available: false,
        remainingCapacity: 0,
        reason: "Anticipo minimo no alcanzado",
      });
      continue;
    }

    if (
      !reservationWindow.allowReservationsAfterClose &&
      startMinutes + serviceDuration > closeMinutes
    ) {
      slots.push({
        time,
        available: false,
        remainingCapacity: 0,
        reason: "Fuera del horario operativo",
      });
      continue;
    }

    if (
      breakStartMinutes !== null &&
      breakEndMinutes !== null &&
      intervalsOverlap(
        startMinutes,
        startMinutes + serviceDuration,
        breakStartMinutes,
        breakEndMinutes,
      )
    ) {
      slots.push({
        time,
        available: false,
        remainingCapacity: 0,
        reason: "En descanso",
      });
      continue;
    }

    const occupied = filteredReservations.reduce((total, reservation) => {
      const reservationStart = combineDateAndTime(
        reservation.reservationDate,
        reservation.reservationTime,
      );
      if (!reservationStart) {
        return total;
      }

      const reservationService = services.find(
        (entry) => entry.id === reservation.serviceId,
      );
      const reservationDuration = reservationService?.durationMinutes ?? serviceDuration;
      const reservationEnd = new Date(
        reservationStart.getTime() + reservationDuration * 60 * 1000,
      );
      const overlapsCandidate =
        reservation.status !== "completed" &&
        intervalsOverlap(
          candidateStart.getTime(),
          candidateEnd.getTime(),
          reservationStart.getTime(),
          reservationEnd.getTime(),
        );

      return overlapsCandidate ? total + reservation.partySize : total;
    }, 0);

    const remainingCapacity = Math.max(capacityLimit - occupied, 0);

    slots.push({
      time,
      available: remainingCapacity > 0,
      remainingCapacity,
      reason: remainingCapacity > 0 ? undefined : "Completo",
    });
  }

  return {
    status: "ok",
    slots,
    businessHours: dailyHours,
    reservationRules: rules,
    service,
  };
}
