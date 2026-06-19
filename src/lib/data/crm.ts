import type {
  Customer,
  CustomerNote,
  CustomerStats,
  Reservation,
} from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import { buildDateTimeFromDateAndTime } from "@/lib/date-time";
import * as localCRM from "@/lib/crm";
import type {
  CustomerFilter,
  CustomerCommercialState,
  CustomerCommercialSummary,
  CustomerFavoriteService,
} from "@/lib/crm";
import {
  createSupabaseCustomerNote,
  deleteSupabaseCustomerNote,
  getSupabaseCustomerById,
  getSupabaseCustomerByIdSync,
  getSupabaseCustomerByPhone,
  getSupabaseCustomerByPhoneSync,
  getSupabaseCustomerNotes,
  getSupabaseCustomerNotesSync,
  getSupabaseCustomersByBusiness,
  getSupabaseCustomersByBusinessSync,
  refreshSupabaseCustomerNotes,
  refreshSupabaseCustomersForBusiness,
  subscribeSupabaseCRM,
  updateSupabaseCustomer,
  updateSupabaseCustomerNote,
  type SupabaseCustomerInput,
} from "@/lib/data/supabase/customers";
import { getReservationsSnapshot, subscribeReservations } from "@/data/reservations";
import { getServicesByBusinessSync } from "@/lib/data/services";

function isSupabaseMode() {
  return getDataSource() === "supabase";
}

function cloneCustomer(customer: Customer) {
  return {
    ...customer,
    tags: [...customer.tags],
  };
}

function cloneCustomers(customers: Customer[]) {
  return customers.map(cloneCustomer);
}

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function buildReservationDateTime(reservation: Reservation) {
  return buildDateTimeFromDateAndTime(reservation.reservationDate, reservation.reservationTime) ?? new Date(0);
}

function sortReservationsForCustomer(reservations: Reservation[]) {
  return [...reservations].sort((left, right) => {
    const leftTime = buildReservationDateTime(left).getTime();
    const rightTime = buildReservationDateTime(right).getTime();
    const now = Date.now();
    const leftFuture = leftTime >= now;
    const rightFuture = rightTime >= now;

    if (leftFuture !== rightFuture) {
      return leftFuture ? -1 : 1;
    }

    if (leftFuture) {
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
    } else if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    const createdAtCompare = right.createdAt.localeCompare(left.createdAt);
    if (createdAtCompare !== 0) {
      return createdAtCompare;
    }

    return left.id.localeCompare(right.id);
  });
}

function getReservationKey(reservation: Reservation) {
  const customerId = reservation.customerId?.trim();
  if (customerId) {
    return `customer:${customerId}`;
  }

  const phone = normalizePhone(reservation.customerPhone);
  if (phone) {
    return `phone:${phone}`;
  }

  const email = reservation.customerEmail?.trim().toLowerCase();
  if (email) {
    return `email:${email}`;
  }

  return `name:${normalizeSearchValue(reservation.customerName) || "sin-nombre"}`;
}

function getCustomerServiceMap(customer: Customer) {
  const services = getServicesByBusinessSync(customer.businessId);
  return new Map(services.map((service) => [service.id, service]));
}

function getCustomerReservationsForMode(customer: Customer) {
  const reservations = getReservationsSnapshot().filter((reservation) => {
    if (reservation.businessId !== customer.businessId) {
      return false;
    }

    if (reservation.customerId && reservation.customerId === customer.id) {
      return true;
    }

    if (customer.customerKey.startsWith("phone:")) {
      return normalizePhone(reservation.customerPhone) === customer.customerKey.replace(/^phone:/, "");
    }

    if (customer.customerKey.startsWith("email:")) {
      return reservation.customerEmail?.trim().toLowerCase() === customer.customerKey.replace(/^email:/, "");
    }

    return getReservationKey(reservation) === customer.customerKey;
  });

  return sortReservationsForCustomer(reservations).map((reservation) => ({ ...reservation }));
}

function getCustomerReservationSet(customer: Customer) {
  return getCustomerReservationsForMode(customer);
}

function enrichSupabaseCustomer(customer: Customer) {
  const reservations = getCustomerReservationSet(customer);
  const totalReservations = reservations.length;
  const confirmedReservations = reservations.filter((reservation) => reservation.status === "confirmed").length;
  const cancelledReservations = reservations.filter((reservation) => reservation.status === "cancelled").length;
  const completedReservations = reservations.filter((reservation) => reservation.status === "completed").length;
  const noShowReservations = reservations.filter((reservation) => reservation.status === "no_show").length;
  const sortedByRecency = [...reservations].sort(
    (left, right) =>
      buildReservationDateTime(right).getTime() - buildReservationDateTime(left).getTime(),
  );
  const latestReservation = sortedByRecency[0] ?? null;
  const nextReservation = sortedByRecency.find((reservation) =>
    buildReservationDateTime(reservation).getTime() >= Date.now(),
  );

  return {
    ...customer,
    totalReservations,
    confirmedReservations,
    cancelledReservations,
    completedReservations,
    noShowReservations,
    lastReservationAt: latestReservation
      ? buildReservationDateTime(latestReservation).toISOString()
      : customer.lastReservationAt,
    nextReservationAt: nextReservation
      ? buildReservationDateTime(nextReservation).toISOString()
      : null,
  };
}

function getCustomerCommercialSummaryForMode(customer: Customer): CustomerCommercialSummary {
  const reservations = getCustomerReservationSet(customer);
  const reservationCount = reservations.length;
  const activeCount = reservations.filter(
    (reservation) => reservation.status === "confirmed" || reservation.status === "completed",
  ).length;
  const totalPeople = reservations.reduce((sum, reservation) => sum + reservation.partySize, 0);

  const cancelledCount = reservations.filter((reservation) => reservation.status === "cancelled").length;
  const noShowCount = reservations.filter((reservation) => reservation.status === "no_show").length;

  if (noShowCount > 0 || cancelledCount >= 2) {
    return { key: "risk", label: "Riesgo", tone: "rose" };
  }

  if (activeCount >= 4 || totalPeople >= 12) {
    return { key: "vip", label: "VIP", tone: "amber" };
  }

  if (reservationCount >= 2) {
    return { key: "recurrent", label: "Recurrente", tone: "emerald" };
  }

  return { key: "new", label: "Nuevo", tone: "cyan" };
}

function getCustomerSuggestedTagsForMode(customer: Customer) {
  const reservations = getCustomerReservationSet(customer);
  const reservationCount = reservations.length;
  const haystack = normalizeSearchValue(
    [customer.notes, customer.preferences, customer.tags.join(" ")].filter(Boolean).join(" "),
  );
  const tags = new Set<string>();

  if (haystack.includes("cumple")) {
    tags.add("Cumpleanos");
  }

  if (haystack.includes("vegetariano")) {
    tags.add("Vegetariano");
  }

  if (haystack.includes("vegano")) {
    tags.add("Vegano");
  }

  if (reservationCount >= 3) {
    tags.add("Recurrente");
  }

  if (reservationCount >= 4) {
    tags.add("VIP");
  }

  if (reservations.some((reservation) => reservation.status === "no_show")) {
    tags.add("Riesgo");
  }

  if (reservations.some((reservation) => reservation.partySize >= 6)) {
    tags.add("Grupo");
  }

  if (reservations.some((reservation) => reservation.source === "web")) {
    tags.add("Web");
  }

  return [...tags].sort((left, right) => left.localeCompare(right));
}

function getCustomerFavoriteServicesForMode(customer: Customer) {
  const reservations = getCustomerReservationSet(customer);
  const counts = new Map<string, number>();

  for (const reservation of reservations) {
    counts.set(reservation.serviceId, (counts.get(reservation.serviceId) ?? 0) + 1);
  }

  const serviceMap = getCustomerServiceMap(customer);

  return [...counts.entries()]
    .map<CustomerFavoriteService>(([serviceId, count]) => ({
      serviceId,
      count,
      name: serviceMap.get(serviceId)?.name ?? "Servicio eliminado",
    }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function getCustomerEstimatedSpendForMode(customer: Customer) {
  const reservations = getCustomerReservationSet(customer);
  const serviceMap = getCustomerServiceMap(customer);
  const total = reservations.reduce((sum, reservation) => {
    const service = serviceMap.get(reservation.serviceId);
    return sum + (service?.price ?? 0);
  }, 0);

  return total > 0 ? total : null;
}

function getCustomerStatsForMode(customer: Customer): CustomerStats | null {
  const reservations = getCustomerReservationSet(customer);
  const totalReservations = reservations.length;
  const sortedByRecency = [...reservations].sort(
    (left, right) =>
      buildReservationDateTime(right).getTime() - buildReservationDateTime(left).getTime(),
  );
  const latestReservation = sortedByRecency[0] ?? null;
  const nextReservation = sortedByRecency.find((reservation) =>
    buildReservationDateTime(reservation).getTime() >= Date.now(),
  );

  return {
    totalReservations,
    confirmedReservations: reservations.filter((reservation) => reservation.status === "confirmed").length,
    cancelledReservations: reservations.filter((reservation) => reservation.status === "cancelled").length,
    completedReservations: reservations.filter((reservation) => reservation.status === "completed").length,
    noShowReservations: reservations.filter((reservation) => reservation.status === "no_show").length,
    recurringReservations: totalReservations >= 2 ? totalReservations : 0,
    lastReservationAt: latestReservation
      ? buildReservationDateTime(latestReservation).toISOString()
      : customer.lastReservationAt,
    nextReservationAt: nextReservation
      ? buildReservationDateTime(nextReservation).toISOString()
      : null,
  };
}

function filterBySearch(
  customers: Customer[],
  search: string,
  filter: CustomerFilter,
) {
  const normalizedQuery = normalizeSearchValue(search);

  return customers.filter((customer) => {
    const matchesSearch =
      !normalizedQuery ||
      normalizeSearchValue(
        [
          customer.name,
          customer.phone,
          customer.email ?? "",
          customer.tags.join(" "),
          customer.notes,
          customer.preferences,
          getCustomerSuggestedTagsForMode(customer).join(" "),
        ].join(" "),
      ).includes(normalizedQuery);

    if (!matchesSearch) {
      return false;
    }

    switch (filter) {
      case "recurring":
        return customer.totalReservations >= 2;
      case "cancelled":
        return customer.cancelledReservations > 0;
      case "no_show":
        return customer.noShowReservations > 0;
      case "next":
        return Boolean(customer.nextReservationAt);
      case "no_email":
        return !customer.email;
      case "no_notes":
        return !customer.notes.trim();
      case "with_tags":
        return customer.tags.length > 0;
      default:
        return true;
    }
  });
}

export type { CustomerFilter, CustomerCommercialState, CustomerCommercialSummary, CustomerFavoriteService };

export function buildCustomersFromReservations(reservations: Reservation[], now = new Date()) {
  return localCRM.buildCustomersFromReservations(reservations, now);
}

export function classifyCustomer(customer: Customer) {
  return isSupabaseMode()
    ? getCustomerCommercialSummaryForMode(customer)
    : localCRM.classifyCustomer(customer);
}

export function getCustomerCommercialSummary(customer: Customer) {
  return isSupabaseMode()
    ? getCustomerCommercialSummaryForMode(customer)
    : localCRM.getCustomerCommercialSummary(customer);
}

export function getCRMStatusLabel(customer: Customer) {
  return getCustomerCommercialSummary(customer).label;
}

export function filterCustomers(customers: Customer[], search: string, filter: CustomerFilter) {
  return isSupabaseMode()
    ? filterBySearch(customers, search, filter)
    : localCRM.filterCustomers(customers, search, filter);
}

export function getCustomerKey(reservation: Reservation) {
  return localCRM.getCustomerKey(reservation);
}

export function getCustomersByBusinessId(businessId: string) {
  if (isSupabaseMode()) {
    return cloneCustomers(getSupabaseCustomersByBusinessSync(businessId)).map(enrichSupabaseCustomer);
  }

  return localCRM.getCustomersByBusinessId(businessId);
}

export function getCustomerById(customerId: string) {
  if (isSupabaseMode()) {
    return getSupabaseCustomerByIdSync(customerId);
  }

  return localCRM.getCustomerById(customerId);
}

export function getCustomerReservations(customerId: string) {
  if (isSupabaseMode()) {
    const customer = getSupabaseCustomerByIdSync(customerId);
    return customer ? getCustomerReservationsForMode(customer) : [];
  }

  return localCRM.getCustomerReservations(customerId);
}

export function getCustomerReservationHistory(customerId: string) {
  return getCustomerReservations(customerId);
}

export function getCustomerStats(customerId: string): CustomerStats | null {
  if (isSupabaseMode()) {
    const customer = getSupabaseCustomerByIdSync(customerId);
    return customer ? getCustomerStatsForMode(customer) : null;
  }

  return localCRM.getCustomerStats(customerId);
}

export function getCustomerFavoriteServices(customerId: string) {
  if (isSupabaseMode()) {
    const customer = getSupabaseCustomerByIdSync(customerId);
    return customer ? getCustomerFavoriteServicesForMode(customer) : [];
  }

  return localCRM.getCustomerFavoriteServices(customerId);
}

export function getCustomerEstimatedSpend(customerId: string) {
  if (isSupabaseMode()) {
    const customer = getSupabaseCustomerByIdSync(customerId);
    return customer ? getCustomerEstimatedSpendForMode(customer) : null;
  }

  return localCRM.getCustomerEstimatedSpend(customerId);
}

export function getCustomerSuggestedTags(customer: Customer) {
  return isSupabaseMode()
    ? getCustomerSuggestedTagsForMode(customer)
    : localCRM.getCustomerSuggestedTags(customer);
}

export function getCustomerReservationCount(customer: Customer) {
  return isSupabaseMode() ? getCustomerReservationSet(customer).length : customer.totalReservations;
}

export function subscribeCRM(listener: () => void) {
  if (isSupabaseMode()) {
    return subscribeSupabaseCRM(listener);
  }

  return localCRM.subscribeCRM(listener);
}

export function saveCustomerNote(customerId: string, notes: string) {
  if (isSupabaseMode()) {
    return updateCustomerNotes(customerId, notes);
  }

  return localCRM.saveCustomerNote(customerId, notes);
}

export function saveCustomerTags(customerId: string, tags: string[]) {
  if (isSupabaseMode()) {
    return updateCustomerTags(customerId, tags);
  }

  return localCRM.saveCustomerTags(customerId, tags);
}

export function saveCustomerPreferences(customerId: string, preferences: string) {
  if (isSupabaseMode()) {
    return updateCustomerPreferences(customerId, preferences);
  }

  return localCRM.saveCustomerPreferences(customerId, preferences);
}

export function updateCustomerNotes(customerId: string, notes: string) {
  if (isSupabaseMode()) {
    return updateSupabaseCustomer(customerId, { internalNotes: notes });
  }

  return localCRM.updateCustomerNotes(customerId, notes);
}

export function updateCustomerTags(customerId: string, tags: string[]) {
  if (isSupabaseMode()) {
    return updateSupabaseCustomer(customerId, { tags });
  }

  return localCRM.updateCustomerTags(customerId, tags);
}

export function updateCustomerPreferences(customerId: string, preferences: string) {
  if (isSupabaseMode()) {
    return updateSupabaseCustomer(customerId, { preferences });
  }

  return localCRM.updateCustomerPreferences(customerId, preferences);
}

export async function updateCustomer(customerId: string, data: SupabaseCustomerInput) {
  if (isSupabaseMode()) {
    return updateSupabaseCustomer(customerId, data);
  }

  return getCustomerById(customerId);
}

export async function getCustomerNotes(customerId: string) {
  if (isSupabaseMode()) {
    return getSupabaseCustomerNotes(customerId);
  }

  const customer = getCustomerById(customerId);
  if (!customer || !customer.notes.trim()) {
    return [];
  }

  return [
    {
      id: `${customerId}-local-note`,
      customerId,
      note: customer.notes,
      createdAt: customer.updatedAt,
      updatedAt: customer.updatedAt,
    },
  ] satisfies CustomerNote[];
}

export async function createCustomerNote(customerId: string, note: string) {
  if (isSupabaseMode()) {
    return createSupabaseCustomerNote(customerId, note);
  }

  updateCustomerNotes(customerId, note);
  return {
    id: `${customerId}-local-note-${Date.now()}`,
    customerId,
    note,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies CustomerNote;
}

export async function updateCustomerNote(noteId: string, note: string) {
  if (isSupabaseMode()) {
    return updateSupabaseCustomerNote(noteId, note);
  }

  return null;
}

export async function deleteCustomerNote(noteId: string) {
  if (isSupabaseMode()) {
    return deleteSupabaseCustomerNote(noteId);
  }

  return false;
}

export { getSupabaseCustomerByPhone, getSupabaseCustomerByPhoneSync, getSupabaseCustomersByBusiness, getSupabaseCustomersByBusinessSync, getSupabaseCustomerNotesSync, refreshSupabaseCustomerNotes, refreshSupabaseCustomersForBusiness };
