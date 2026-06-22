import type { BusinessHours, ReservationRules, Service } from "@/data/types";
import { getBusinessHours, getBusinessServices, getReservationRules } from "@/data/scheduling";
import {
  getBestPublicTableAssignment,
  getReservationsByBusinessId,
  getTablesForBusiness,
} from "@/data/reservations";
import { calculateAvailabilityForReservations } from "./availability-core";
import { getAvailableTablesForReservationSlot } from "@/lib/reservation-availability";

export type {
  AvailabilityCalculationParams,
  AvailabilityCalculationResult,
  AvailabilityState,
} from "./availability-core";

function resolveSelectedService(
  businessId: string,
  serviceId?: string,
  services?: Service[],
) {
  const availableServices = services ?? getBusinessServices(businessId);

  if (serviceId) {
    const requested = availableServices.find((service) => service.id === serviceId);
    if (requested) {
      return requested;
    }
  }

  return availableServices.find((service) => service.isActive) ?? availableServices[0] ?? null;
}

export function calculateAvailability({
  businessId,
  date,
  serviceId,
}: {
  businessId: string;
  date: string;
  serviceId?: string;
}) {
  const hours: BusinessHours[] = getBusinessHours(businessId);
  const rules: ReservationRules | null = getReservationRules(businessId);
  const services = getBusinessServices(businessId);
  const service = resolveSelectedService(businessId, serviceId, services);
  const reservations = getReservationsByBusinessId(businessId);

  return calculateAvailabilityForReservations({
    businessId,
    date,
    services,
    reservations,
    hours,
    rules,
    service,
  });
}

export function getAvailableSlots(
  businessId: string,
  date: string,
  serviceId?: string,
) {
  return calculateAvailability({ businessId, date, serviceId }).slots;
}

type PublicAvailabilityParams = {
  businessId: string;
  date: string;
  serviceId?: string;
  partySize: number;
  services?: Service[];
  reservations?: ReturnType<typeof getReservationsByBusinessId>;
  hours?: BusinessHours[];
  rules?: ReservationRules | null;
  service?: Service | null;
};

export function calculatePublicAvailability({
  businessId,
  date,
  serviceId,
  partySize,
  services: servicesOverride,
  reservations: reservationsOverride,
  hours: hoursOverride,
  rules: rulesOverride,
  service: serviceOverride,
}: PublicAvailabilityParams) {
  const hours: BusinessHours[] = hoursOverride ?? getBusinessHours(businessId);
  const rules: ReservationRules | null = rulesOverride ?? getReservationRules(businessId);
  const services = servicesOverride ?? getBusinessServices(businessId);
  const service =
    serviceOverride ?? resolveSelectedService(businessId, serviceId, services);
  const reservations = reservationsOverride ?? getReservationsByBusinessId(businessId);
  const fallbackDurationMinutes =
    rules?.defaultReservationDurationMinutes ?? 120;

  const baseAvailability = calculateAvailabilityForReservations({
    businessId,
    date,
    services,
    reservations,
    hours,
    rules,
    service,
  });

  if (baseAvailability.status !== "ok") {
    return baseAvailability;
  }

  if (!service) {
    return baseAvailability;
  }

  const tables = getTablesForBusiness(businessId);
  const serviceDurationMinutes =
    typeof service.durationMinutes === "number" && service.durationMinutes > 0
      ? service.durationMinutes
      : fallbackDurationMinutes;

  if (tables.length === 0) {
    return baseAvailability;
  }

  const slots = baseAvailability.slots.map((slot) => {
    if (slot.reason && slot.reason !== "Completo") {
      return slot;
    }

    if (partySize > service.capacity) {
      return {
        ...slot,
        available: false,
        remainingCapacity: 0,
        reason: "Capacidad insuficiente",
      };
    }

    const tableAvailability = getAvailableTablesForReservationSlot({
      businessId,
      reservationDate: date,
      reservationTime: slot.time,
      durationMinutes: serviceDurationMinutes,
      partySize,
      reservations,
      tables,
      services,
      fallbackDurationMinutes,
    });

    const bestSuggestion = tableAvailability.availableTables[0] ?? null;

    if (bestSuggestion) {
      return {
        ...slot,
        available: true,
        remainingCapacity: bestSuggestion.seats,
        reason: undefined,
      };
    }

    return {
      ...slot,
      available: false,
      remainingCapacity: 0,
      reason:
        "Sin horarios disponibles",
    };
  });

  return {
    ...baseAvailability,
    slots,
  };
}

export function getPublicAvailabilityForBusiness(params: PublicAvailabilityParams) {
  return calculatePublicAvailability(params);
}

export function getPublicAvailableSlots(
  businessId: string,
  date: string,
  partySize: number,
  serviceId?: string,
) {
  return calculatePublicAvailability({
    businessId,
    date,
    partySize,
    serviceId,
  }).slots;
}

export function canAcceptPublicReservation({
  businessId,
  date,
  time,
  partySize,
  serviceId,
}: {
  businessId: string;
  date: string;
  time: string;
  partySize: number;
  serviceId?: string;
}) {
  const slots = getPublicAvailableSlots(businessId, date, partySize, serviceId);
  const slot = slots.find((entry) => entry.time === time) ?? null;

  return Boolean(slot?.available && slot.remainingCapacity >= partySize);
}

// This wrapper keeps the public API stable while the actual calculation stays
// reusable for both the web widget and the local reservation store.
