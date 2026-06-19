import type { Business } from "@/data/types";
import { getBusinesses } from "@/data/businesses";
import { getBusinessBySlug as getLocalBusinessBySlug } from "@/data/businesses";
import { getBusinessHours, getBusinessServices, getReservationRules } from "@/data/scheduling";
import { getFloorTablesByBusinessId } from "@/data/floor-plan";
import { getReservationsByBusinessId } from "@/data/reservations";
import { getMenuSummary } from "@/data/menu";

export type AdminBusinessSetupStatus = {
  complete: boolean;
  missing: string[];
};

export type AdminBusinessStats = {
  reservationsTotal: number;
  reservationsPending: number;
  reservationsToday: number;
  lastReservationAt: string | null;
  lastActivityAt: string | null;
  setupStatus: AdminBusinessSetupStatus;
  menuSummary: ReturnType<typeof getMenuSummary>;
};

export type AdminDashboardStats = {
  totalBusinesses: number;
  activeBusinesses: number;
  draftBusinesses: number;
  inactiveBusinesses: number;
  reservationsTotal: number;
  reservationsPending: number;
  businessesWithReservationsToday: number;
  businessesIncomplete: number;
};

function getTodayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

function getLatestIso(values: Array<string | null | undefined>) {
  const validValues = values.filter((value): value is string => Boolean(value));
  if (validValues.length === 0) {
    return null;
  }

  const sortedValues = [...validValues].sort();
  return sortedValues[sortedValues.length - 1] ?? null;
}

function resolveStatsBusiness(business: Business) {
  return getLocalBusinessBySlug(business.slug) ?? business;
}

export function getBusinessSetupStatus(business: Business): AdminBusinessSetupStatus {
  const missing: string[] = [];
  const statsBusiness = resolveStatsBusiness(business);
  const services = getBusinessServices(statsBusiness.id);
  const hours = getBusinessHours(statsBusiness.id);
  const rules = getReservationRules(statsBusiness.id);
  const tables = getFloorTablesByBusinessId(statsBusiness.id);
  const menuSummary = getMenuSummary(statsBusiness.id);

  if (!statsBusiness.name.trim()) {
    missing.push("Falta nombre");
  }

  if (!statsBusiness.slug.trim()) {
    missing.push("Falta slug");
  }

  if (!statsBusiness.category.trim()) {
    missing.push("Falta rubro");
  }

  if (!statsBusiness.city.trim()) {
    missing.push("Falta localidad");
  }

  if (services.filter((service) => service.isActive).length === 0) {
    missing.push("Falta al menos 1 servicio activo");
  }

  if (hours.filter((entry) => entry.isOpen).length === 0) {
    missing.push("Faltan horarios");
  }

  if (!rules) {
    missing.push("Faltan reglas de reserva");
  }

  if (tables.length === 0) {
    missing.push("Faltan mesas");
  }

  if (!statsBusiness.heroTitle.trim() || !statsBusiness.aboutText.trim()) {
    missing.push("Falta contenido web básico");
  }

  if (menuSummary.totalCategories === 0 || menuSummary.totalItems === 0) {
    missing.push("Falta menú");
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}

export function getBusinessAdminStats(business: Business): AdminBusinessStats {
  const statsBusiness = resolveStatsBusiness(business);
  const reservations = getReservationsByBusinessId(statsBusiness.id);
  const today = getTodayIsoDate();
  const reservationsToday = reservations.filter((reservation) => reservation.reservationDate === today);
  const reservationsPending = reservations.filter((reservation) => reservation.status === "pending");
  const lastReservationAt = getLatestIso(reservations.map((reservation) => reservation.updatedAt));
  const lastActivityAt = getLatestIso([
    statsBusiness.updatedAt,
    ...reservations.map((reservation) => reservation.updatedAt),
  ]);

  return {
    reservationsTotal: reservations.length,
    reservationsPending: reservationsPending.length,
    reservationsToday: reservationsToday.length,
    lastReservationAt,
    lastActivityAt,
    setupStatus: getBusinessSetupStatus(statsBusiness),
    menuSummary: getMenuSummary(statsBusiness.id),
  };
}

export function getAdminDashboardStats(businesses: Business[] = getBusinesses()) {
  const today = getTodayIsoDate();
  const stats = businesses.map((business) => {
    const statsBusiness = resolveStatsBusiness(business);
    const reservations = getReservationsByBusinessId(statsBusiness.id);
    return {
      business,
      reservations,
      pending: reservations.filter((reservation) => reservation.status === "pending").length,
      reservationsToday: reservations.filter((reservation) => reservation.reservationDate === today)
        .length,
      setupStatus: getBusinessSetupStatus(statsBusiness),
    };
  });

  return {
    totalBusinesses: businesses.length,
    activeBusinesses: businesses.filter((business) => business.status === "active").length,
    draftBusinesses: businesses.filter((business) => business.status === "draft").length,
    inactiveBusinesses: businesses.filter((business) => business.status === "inactive").length,
    reservationsTotal: stats.reduce((sum, item) => sum + item.reservations.length, 0),
    reservationsPending: stats.reduce((sum, item) => sum + item.pending, 0),
    businessesWithReservationsToday: stats.filter((item) => item.reservationsToday > 0).length,
    businessesIncomplete: stats.filter((item) => !item.setupStatus.complete).length,
  };
}
