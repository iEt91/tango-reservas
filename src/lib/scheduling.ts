import type {
  BusinessHours,
  DayOfWeek,
  ReservationRules,
  Service,
} from "@/data/types";
import {
  initialBusinessHours,
  initialReservationRules,
  initialServices,
} from "@/mocks/scheduling";
import { LOCAL_STORE_EVENTS, LOCAL_STORE_KEYS } from "@/lib/data/localStore";

const dayOrder: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function dayRank(day: DayOfWeek) {
  return dayOrder.indexOf(day);
}

function cloneBusinessHours(hours: BusinessHours[]) {
  return hours.map((entry) => ({ ...entry }));
}

function cloneReservationRules(rules: ReservationRules | null) {
  return rules ? { ...rules } : null;
}

export function createDefaultReservationRules(businessId: string): ReservationRules {
  return {
    id: `rules-${businessId}`,
    businessId,
    slotDurationMinutes: 30,
    maxReservationsPerSlot: 4,
    minNoticeMinutes: 30,
    maxDaysAhead: 14,
    requiresConfirmation: true,
    allowCancellation: true,
    cancellationLimitHours: 4,
    useBusinessHoursForReservations: true,
    reservationOpenTime: null,
    reservationCloseTime: null,
    allowReservationsAfterClose: true,
    defaultReservationDurationMinutes: 120,
  };
}

export function mergeReservationRuleDefaults(
  businessId: string,
  rules: ReservationRules | null,
) {
  if (!rules) {
    return null;
  }

  return {
    ...createDefaultReservationRules(businessId),
    ...rules,
    businessId,
  } satisfies ReservationRules;
}

function cloneServices(services: Service[]) {
  return services.map((service) => ({ ...service }));
}

function createServiceId(businessId: string, name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const randomPart =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return `service-${businessId}-${slug || "service"}-${randomPart}`;
}

function sortServices(services: Service[]) {
  return [...services].sort((left, right) => {
    const leftName = left.name.trim().toLowerCase();
    const rightName = right.name.trim().toLowerCase();

    if (leftName === rightName) {
      return left.id.localeCompare(right.id);
    }

    return leftName.localeCompare(rightName);
  });
}

const HOURS_STORAGE_KEY = LOCAL_STORE_KEYS.schedulingHours;
const RULES_STORAGE_KEY = LOCAL_STORE_KEYS.schedulingRules;
const SERVICES_STORAGE_KEY = LOCAL_STORE_KEYS.schedulingServices;
const CHANGE_EVENT = LOCAL_STORE_EVENTS.scheduling;

let businessHoursStore: BusinessHours[] = cloneBusinessHours(initialBusinessHours);
let reservationRulesStore: ReservationRules[] = initialReservationRules.map((rule) => ({
  ...rule,
}));
let servicesStore: Service[] = cloneServices(initialServices);
let hasHydratedFromStorage = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function readJSON<T>(storageKey: string) {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    return null;
  }
}

function loadStoreIfNeeded() {
  if (!isBrowser() || hasHydratedFromStorage) {
    return;
  }

  hasHydratedFromStorage = true;

  const storedHours = readJSON<BusinessHours[]>(HOURS_STORAGE_KEY);
  const storedRules = readJSON<ReservationRules[]>(RULES_STORAGE_KEY);
  const storedServices = readJSON<Service[]>(SERVICES_STORAGE_KEY);

  if (Array.isArray(storedHours)) {
    businessHoursStore = storedHours;
  }

  if (Array.isArray(storedRules)) {
    reservationRulesStore = storedRules;
  }

  if (Array.isArray(storedServices)) {
    servicesStore = storedServices;
  }
}

function persistStore() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(HOURS_STORAGE_KEY, JSON.stringify(businessHoursStore));
  window.localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(reservationRulesStore));
  window.localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(servicesStore));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeScheduling(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const onCustomChange = () => listener();
  const onStorageChange = () => listener();

  window.addEventListener(CHANGE_EVENT, onCustomChange);
  window.addEventListener("storage", onStorageChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustomChange);
    window.removeEventListener("storage", onStorageChange);
  };
}

export function getBusinessHours(businessId: string) {
  loadStoreIfNeeded();
  return cloneBusinessHours(
    businessHoursStore
      .filter((entry) => entry.businessId === businessId)
      .sort((left, right) => dayRank(left.dayOfWeek) - dayRank(right.dayOfWeek)),
  );
}

export function getReservationRules(businessId: string) {
  loadStoreIfNeeded();
  const rules = reservationRulesStore.find(
    (entry) => entry.businessId === businessId,
  );

  return cloneReservationRules(mergeReservationRuleDefaults(businessId, rules ?? null));
}

export function getBusinessServices(businessId: string) {
  loadStoreIfNeeded();
  return cloneServices(
    servicesStore.filter((service) => service.businessId === businessId),
  );
}

export function getServiceById(serviceId: string) {
  loadStoreIfNeeded();
  const service = servicesStore.find((entry) => entry.id === serviceId);
  return service ? { ...service } : null;
}

export function createBusinessService(
  businessId: string,
  data: Omit<Service, "id" | "businessId">,
) {
  loadStoreIfNeeded();

  const nextService: Service = {
    id: createServiceId(businessId, data.name),
    businessId,
    name: data.name,
    description: data.description,
    durationMinutes: data.durationMinutes,
    capacity: data.capacity,
    price: data.price ?? null,
    isActive: data.isActive,
  };

  servicesStore = sortServices([...servicesStore, nextService]);
  persistStore();

  return { ...nextService };
}

export function updateBusinessService(
  serviceId: string,
  data: Omit<Service, "id" | "businessId">,
) {
  loadStoreIfNeeded();
  const current = servicesStore.find((entry) => entry.id === serviceId) ?? null;

  if (!current) {
    throw new Error("No se encontró el servicio para actualizar.");
  }

  const nextService: Service = {
    ...current,
    name: data.name,
    description: data.description,
    durationMinutes: data.durationMinutes,
    capacity: data.capacity,
    price: data.price ?? null,
    isActive: data.isActive,
  };

  servicesStore = sortServices(
    servicesStore.map((entry) => (entry.id === serviceId ? nextService : entry)),
  );
  persistStore();

  return { ...nextService };
}

export function deleteBusinessService(serviceId: string) {
  loadStoreIfNeeded();
  const current = servicesStore.find((entry) => entry.id === serviceId) ?? null;
  servicesStore = servicesStore.filter((entry) => entry.id !== serviceId);
  persistStore();
  return current ? { ...current } : null;
}

export function setBusinessServiceActive(serviceId: string, isActive: boolean) {
  loadStoreIfNeeded();
  const current = servicesStore.find((entry) => entry.id === serviceId) ?? null;

  if (!current) {
    throw new Error("No se encontró el servicio para actualizar.");
  }

  const nextService: Service = {
    ...current,
    isActive,
  };

  servicesStore = servicesStore.map((entry) => (entry.id === serviceId ? nextService : entry));
  persistStore();
  return { ...nextService };
}

export function updateBusinessServices(businessId: string, data: Service[]) {
  loadStoreIfNeeded();
  servicesStore = [
    ...servicesStore.filter((service) => service.businessId !== businessId),
    ...data.map((service) => ({
      ...service,
      businessId,
    })),
  ].sort((left, right) => {
    if (left.businessId === right.businessId) {
      return left.name.localeCompare(right.name);
    }

    return left.businessId.localeCompare(right.businessId);
  });
  persistStore();

  return getBusinessServices(businessId);
}

export function updateBusinessHours(businessId: string, data: BusinessHours[]) {
  loadStoreIfNeeded();
  businessHoursStore = [
    ...businessHoursStore.filter((entry) => entry.businessId !== businessId),
    ...data.map((entry) => ({
      ...entry,
      businessId,
    })),
  ].sort((left, right) => {
    if (left.businessId === right.businessId) {
      return dayRank(left.dayOfWeek) - dayRank(right.dayOfWeek);
    }

    return left.businessId.localeCompare(right.businessId);
  });
  persistStore();

  return getBusinessHours(businessId);
}

export function updateReservationRules(businessId: string, data: ReservationRules) {
  loadStoreIfNeeded();
  const nextRules = mergeReservationRuleDefaults(businessId, data) ?? createDefaultReservationRules(businessId);

  reservationRulesStore = [
    ...reservationRulesStore.filter((entry) => entry.businessId !== businessId),
    nextRules,
  ];
  persistStore();

  return cloneReservationRules(nextRules);
}

export function deleteBusinessSchedulingData(businessId: string) {
  loadStoreIfNeeded();
  businessHoursStore = businessHoursStore.filter(
    (entry) => entry.businessId !== businessId,
  );
  reservationRulesStore = reservationRulesStore.filter(
    (entry) => entry.businessId !== businessId,
  );
  servicesStore = servicesStore.filter((service) => service.businessId !== businessId);
  persistStore();
}

function createDuplicatedId(prefix: string, businessId: string, sourceId: string) {
  return `${prefix}-${businessId}-${sourceId}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}

export function duplicateBusinessSchedulingData(
  sourceBusinessId: string,
  targetBusinessId: string,
) {
  loadStoreIfNeeded();

  const sourceHours = getBusinessHours(sourceBusinessId);
  const sourceRules = getReservationRules(sourceBusinessId);
  const sourceServices = getBusinessServices(sourceBusinessId);

  businessHoursStore = businessHoursStore.filter((entry) => entry.businessId !== targetBusinessId);
  reservationRulesStore = reservationRulesStore.filter(
    (entry) => entry.businessId !== targetBusinessId,
  );
  servicesStore = servicesStore.filter((entry) => entry.businessId !== targetBusinessId);

  businessHoursStore.push(
    ...sourceHours.map((entry) => ({
      ...entry,
      id: createDuplicatedId("hours", targetBusinessId, entry.id),
      businessId: targetBusinessId,
    })),
  );

  if (sourceRules) {
    reservationRulesStore.push({
      ...sourceRules,
      id: createDuplicatedId("rules", targetBusinessId, sourceRules.id),
      businessId: targetBusinessId,
    });
  }

  servicesStore.push(
    ...sourceServices.map((entry) => ({
      ...entry,
      id: createDuplicatedId("service", targetBusinessId, entry.id),
      businessId: targetBusinessId,
    })),
  );

  persistStore();
}

// This local scheduling layer is intentionally isolated so we can replace it with
// Supabase queries later without changing the admin or public UI composition.

