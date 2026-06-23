import type { Customer, CustomerStats, Reservation } from "@/data/types";
import { getBusinessServices } from "@/data/scheduling";
import { getReservationsSnapshot, subscribeReservations } from "@/data/reservations";
import { buildDateTimeFromDateAndTime } from "@/lib/date-time";
import { LOCAL_STORE_EVENTS, LOCAL_STORE_KEYS } from "@/lib/data/localStore";

type CustomerOverride = {
  notes: string;
  tags: string[];
  preferences: string;
  updatedAt: string;
};

type CRMStore = Record<string, CustomerOverride>;

export type CustomerFilter =
  | "all"
  | "recurring"
  | "cancelled"
  | "no_show"
  | "next"
  | "no_email"
  | "no_notes"
  | "with_tags";

export type CustomerCommercialState = "new" | "recurrent" | "vip" | "risk";

export type CustomerCommercialSummary = {
  key: CustomerCommercialState;
  label: string;
  tone: "cyan" | "emerald" | "amber" | "rose";
};

export type CustomerFavoriteService = {
  serviceId: string;
  name: string;
  count: number;
};

const STORAGE_KEY = LOCAL_STORE_KEYS.crm;
const CHANGE_EVENT = LOCAL_STORE_EVENTS.crm;

function isBrowser() {
  return typeof window !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
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

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : "";
}

function getReservationKey(reservation: Reservation) {
  const phone = normalizePhone(reservation.customerPhone);
  if (phone) {
    return `phone:${phone}`;
  }

  const email = reservation.customerEmail?.trim().toLowerCase();
  if (email) {
    return `email:${email}`;
  }

  return `name:${normalizeText(reservation.customerName) || "sin-nombre"}`;
}

export function getCustomerKey(reservation: Reservation) {
  return getReservationKey(reservation);
}

function makeCustomerId(businessId: string, customerKey: string) {
  return `customer::${businessId}::${customerKey}`;
}

function parseCustomerId(customerId: string) {
  const parts = customerId.split("::");
  if (parts.length < 3) {
    return null;
  }

  return {
    businessId: parts[1],
    customerKey: parts.slice(2).join("::"),
  };
}

function readStore(): CRMStore {
  if (!isBrowser()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as CRMStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistStore(store: CRMStore) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function buildReservationDateTime(reservation: Reservation) {
  return buildDateTimeFromDateAndTime(reservation.reservationDate, reservation.reservationTime) ?? new Date(0);
}

function isFutureReservation(reservation: Reservation, now: Date) {
  return buildReservationDateTime(reservation).getTime() >= now.getTime();
}

function sortReservationsForCustomer(reservations: Reservation[], now: Date) {
  return [...reservations].sort((left, right) => {
    const leftFuture = isFutureReservation(left, now);
    const rightFuture = isFutureReservation(right, now);

    if (leftFuture !== rightFuture) {
      return leftFuture ? -1 : 1;
    }

    const leftTime = buildReservationDateTime(left).getTime();
    const rightTime = buildReservationDateTime(right).getTime();

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

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getServicePrice(serviceId: string, businessId: string) {
  return getBusinessServices(businessId).find((service) => service.id === serviceId)?.price ?? null;
}

function deriveCustomers(reservations: Reservation[], now = new Date()) {
  const grouped = new Map<
    string,
    {
      customerKey: string;
      customerId: string;
      businessId: string;
      name: string;
      phone: string;
      email: string | null;
      reservations: Reservation[];
    }
  >();

  for (const reservation of reservations) {
    const customerKey = getReservationKey(reservation);
    const customerId = makeCustomerId(reservation.businessId, customerKey);
    const current = grouped.get(customerId);
    const phone = reservation.customerPhone.trim();
    const email = reservation.customerEmail?.trim() || null;

    if (current) {
      current.reservations.push(reservation);
      if (!current.phone && phone) {
        current.phone = phone;
      }
      if (!current.email && email) {
        current.email = email;
      }
      if (!current.name || reservation.createdAt < current.reservations[0].createdAt) {
        current.name = reservation.customerName.trim();
      }
      continue;
    }

    grouped.set(customerId, {
      customerKey,
      customerId,
      businessId: reservation.businessId,
      name: reservation.customerName.trim(),
      phone,
      email,
      reservations: [reservation],
    });
  }

  const store = readStore();

  return [...grouped.values()]
    .map<Customer>((entry) => {
      const sortedReservations = sortReservationsForCustomer(entry.reservations, now);
      const reservationsByRecency = [...entry.reservations].sort(
        (left, right) =>
          buildReservationDateTime(right).getTime() -
          buildReservationDateTime(left).getTime(),
      );
      const latestReservation = reservationsByRecency[0] ?? sortedReservations[0] ?? null;
      const nextReservation = sortedReservations.find((reservation) =>
        isFutureReservation(reservation, now),
      );
      const override =
        store[entry.customerId] ?? {
          notes: "",
          tags: [],
          preferences: "",
          updatedAt: nowIso(),
        };

      const confirmedReservations = sortedReservations.filter(
        (reservation) => reservation.status === "confirmed",
      ).length;
      const cancelledReservations = sortedReservations.filter(
        (reservation) => reservation.status === "cancelled",
      ).length;
      const completedReservations = sortedReservations.filter(
        (reservation) => reservation.status === "completed",
      ).length;
      const noShowReservations = sortedReservations.filter(
        (reservation) => reservation.status === "no_show",
      ).length;
      return {
        id: entry.customerId,
        customerKey: entry.customerKey,
        businessId: entry.businessId,
        name:
          latestReservation?.customerName.trim() ||
          entry.name ||
          entry.phone ||
          entry.email ||
          "Sin nombre",
        phone: entry.phone || "Sin teléfono",
        email: entry.email,
        totalReservations: sortedReservations.length,
        confirmedReservations,
        cancelledReservations,
        completedReservations,
        noShowReservations,
        lastReservationAt: latestReservation
          ? buildReservationDateTime(latestReservation).toISOString()
          : nowIso(),
        nextReservationAt: nextReservation
          ? buildReservationDateTime(nextReservation).toISOString()
          : null,
        tags: [...override.tags],
        notes: override.notes,
        preferences: override.preferences,
        createdAt: entry.reservations
          .slice()
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0]?.createdAt ?? nowIso(),
        updatedAt: override.updatedAt,
      };
    })
    .sort((left, right) => {
      const leftDate = new Date(left.lastReservationAt).getTime();
      const rightDate = new Date(right.lastReservationAt).getTime();
      if (leftDate !== rightDate) {
        return rightDate - leftDate;
      }
      return left.name.localeCompare(right.name);
    });
}

export function buildCustomersFromReservations(
  reservations: Reservation[],
  now = new Date(),
) {
  return deriveCustomers(reservations, now);
}

export function getCustomerReservationHistory(customerId: string) {
  return getCustomerReservations(customerId);
}

export function getCustomerCommercialSummary(customer: Customer) {
  const reservations = getCustomerReservations(customer.id);
  const activeCount = customer.confirmedReservations + customer.completedReservations;
  const totalPeople = reservations.reduce((sum, reservation) => sum + reservation.partySize, 0);

  if (customer.noShowReservations > 0 || customer.cancelledReservations >= 2) {
    return {
      key: "risk",
      label: "Riesgo",
      tone: "rose",
    } satisfies CustomerCommercialSummary;
  }

  if (activeCount >= 4 || totalPeople >= 12) {
    return {
      key: "vip",
      label: "VIP",
      tone: "amber",
    } satisfies CustomerCommercialSummary;
  }

  if (customer.totalReservations >= 2) {
    return {
      key: "recurrent",
      label: "Recurrente",
      tone: "emerald",
    } satisfies CustomerCommercialSummary;
  }

  return {
    key: "new",
    label: "Nuevo",
    tone: "cyan",
  } satisfies CustomerCommercialSummary;
}

export function classifyCustomer(customer: Customer) {
  return getCustomerCommercialSummary(customer);
}

export function getCustomerFavoriteServices(customerId: string) {
  const customer = getCustomerById(customerId);
  if (!customer) {
    return [];
  }

  const reservations = getCustomerReservations(customerId);
  const counts = new Map<string, number>();

  for (const reservation of reservations) {
    counts.set(reservation.serviceId, (counts.get(reservation.serviceId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map<CustomerFavoriteService>(([serviceId, count]) => ({
      serviceId,
      count,
      name:
        getBusinessServices(customer.businessId).find((service) => service.id === serviceId)
          ?.name ?? serviceId,
    }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

export function getCustomerEstimatedSpend(customerId: string) {
  const customer = getCustomerById(customerId);
  if (!customer) {
    return null;
  }

  const reservations = getCustomerReservations(customerId);
  const total = reservations.reduce((sum, reservation) => {
    const price = getServicePrice(reservation.serviceId, customer.businessId);
    return sum + (price ?? 0);
  }, 0);

  return total > 0 ? total : null;
}

export function getCustomerSuggestedTags(customer: Customer) {
  const reservations = getCustomerReservations(customer.id);
  const haystack = normalizeSearchValue(
    [customer.notes, customer.preferences, customer.tags.join(" ")]
      .filter(Boolean)
      .join(" "),
  );
  const tags = new Set<string>();

  if (haystack.includes("cumple")) {
    tags.add("Cumpleaños");
  }

  if (haystack.includes("vegetariano")) {
    tags.add("Vegetariano");
  }

  if (haystack.includes("vegano")) {
    tags.add("Vegano");
  }

  if (customer.totalReservations >= 3) {
    tags.add("Recurrente");
  }

  if (customer.totalReservations >= 4) {
    tags.add("VIP");
  }

  if (customer.noShowReservations > 0) {
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

export function filterCustomers(
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
          getCustomerSuggestedTags(customer).join(" "),
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

export function saveCustomerNote(customerId: string, notes: string) {
  return updateCustomerNotes(customerId, notes);
}

export function saveCustomerTags(customerId: string, tags: string[]) {
  return updateCustomerTags(customerId, tags);
}

export function saveCustomerPreferences(customerId: string, preferences: string) {
  return updateCustomerPreferences(customerId, preferences);
}

function updateCustomerOverride(customerId: string, updater: (current: CustomerOverride) => CustomerOverride) {
  const store = readStore();
  const current =
    store[customerId] ??
    ({
      notes: "",
      tags: [],
      preferences: "",
      updatedAt: nowIso(),
    } satisfies CustomerOverride);
  const next = updater(current);
  const nextStore = { ...store, [customerId]: next };
  persistStore(nextStore);
  return next;
}

export function getCustomersByBusinessId(businessId: string) {
  return cloneCustomers(
    deriveCustomers(
      getReservationsSnapshot().filter(
        (reservation) => reservation.businessId === businessId,
      ),
    ).filter((customer) => customer.businessId === businessId),
  );
}

export function getCustomerById(customerId: string) {
  const parsed = parseCustomerId(customerId);
  if (!parsed) {
    return null;
  }

  return (
    getCustomersByBusinessId(parsed.businessId).find((customer) => customer.id === customerId) ??
    null
  );
}

export function getCustomerReservations(customerId: string) {
  const customer = getCustomerById(customerId);
  if (!customer) {
    return [];
  }

  const now = new Date();
  return sortReservationsForCustomer(
    getReservationsSnapshot().filter((reservation) => {
      return (
        reservation.businessId === customer.businessId &&
        getReservationKey(reservation) === customer.customerKey
      );
    }),
    now,
  ).map((reservation) => ({ ...reservation }));
}

export function getCustomerStats(customerId: string): CustomerStats | null {
  const customer = getCustomerById(customerId);
  if (!customer) {
    return null;
  }

  return {
    totalReservations: customer.totalReservations,
    confirmedReservations: customer.confirmedReservations,
    cancelledReservations: customer.cancelledReservations,
    completedReservations: customer.completedReservations,
    noShowReservations: customer.noShowReservations,
    recurringReservations: customer.totalReservations >= 2 ? customer.totalReservations : 0,
    lastReservationAt: customer.lastReservationAt,
    nextReservationAt: customer.nextReservationAt,
  };
}

export function updateCustomerNotes(customerId: string, notes: string) {
  return updateCustomerOverride(customerId, (current) => ({
    ...current,
    notes,
    updatedAt: nowIso(),
  }));
}

export function updateCustomerTags(customerId: string, tags: string[]) {
  return updateCustomerOverride(customerId, (current) => ({
    ...current,
    tags,
    updatedAt: nowIso(),
  }));
}

export function updateCustomerPreferences(customerId: string, preferences: string) {
  return updateCustomerOverride(customerId, (current) => ({
    ...current,
    preferences,
    updatedAt: nowIso(),
  }));
}

export function deleteCRMForBusiness(businessId: string) {
  const store = readStore();
  const nextStore = Object.fromEntries(
    Object.entries(store).filter(([customerId]) => {
      const parsed = parseCustomerId(customerId);
      return parsed?.businessId !== businessId;
    }),
  );

  persistStore(nextStore);
}

export function subscribeCRM(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const onCustomChange = () => listener();
  const onStorageChange = () => listener();

  window.addEventListener(CHANGE_EVENT, onCustomChange);
  window.addEventListener("storage", onStorageChange);

  const unsubscribeReservations = subscribeReservations(listener);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustomChange);
    window.removeEventListener("storage", onStorageChange);
    unsubscribeReservations();
  };
}

export function getCRMStatusLabel(customer: Customer) {
  return getCustomerCommercialSummary(customer).label;
}

export function getCustomerReservationCount(customer: Customer) {
  return customer.totalReservations;
}

// CRM local/mock: los clientes se derivan de las reservas y las notas/tags
// opcionales se conservan en este navegador hasta conectar Supabase.
