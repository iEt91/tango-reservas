import type { BusinessHours, DayOfWeek, ReservationRules } from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinessHours, getReservationRules } from "@/data/scheduling";

const DEMO_DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function createDemoPublicHours(businessId: string): BusinessHours[] {
  return DEMO_DAYS.map((dayOfWeek) => ({
    id: `demo-hours-${businessId}-${dayOfWeek}`,
    businessId,
    dayOfWeek,
    isOpen: true,
    openTime: "19:00",
    closeTime: "23:30",
    breakStartTime: null,
    breakEndTime: null,
  }));
}

export function createDemoPublicRules(businessId: string): ReservationRules {
  return {
    id: `demo-rules-${businessId}`,
    businessId,
    slotDurationMinutes: 30,
    maxReservationsPerSlot: 4,
    minNoticeMinutes: 30,
    maxDaysAhead: 14,
    requiresConfirmation: true,
    allowCancellation: true,
    cancellationLimitHours: 2,
    useBusinessHoursForReservations: true,
    reservationOpenTime: null,
    reservationCloseTime: null,
    allowReservationsAfterClose: true,
    defaultReservationDurationMinutes: 120,
  };
}

export function getPublicReservationConfig(businessId: string) {
  const dataSource = getDataSource();
  const hours = getBusinessHours(businessId);
  const rules = getReservationRules(businessId);
  const hasOpenHours = hours.some((entry) => entry.isOpen);
  const useDemoFallback = dataSource === "supabase" && (!hasOpenHours || hours.length === 0);
  const reservationHoursNotice =
    rules && rules.useBusinessHoursForReservations === false
      ? `Horarios de reservas: ${rules.reservationOpenTime ?? "sin inicio"} - ${
          rules.reservationCloseTime ?? "sin fin"
        }.`
      : null;

  return {
    hours: useDemoFallback ? createDemoPublicHours(businessId) : hours,
    rules: useDemoFallback && !rules ? createDemoPublicRules(businessId) : rules,
    notice: useDemoFallback
      ? "Horarios demo activos hasta migrar horarios comerciales a Supabase."
      : reservationHoursNotice,
    usedFallback: useDemoFallback,
  };
}
