export const LOCAL_STORE_KEYS = {
  businesses: "tango-reservas.businesses.v1",
  publicWeb: "tango-reservas.public-web.v1",
  reservations: "tango-reservas.reservations.v1",
  menu: "tango-reservas.menu.v1",
  floorPlan: "tango-reservas.floor-plan.v1",
  floorPlanBackground: "tango-reservas.floor-plan-background.v1",
  joinedTables: "tango-reservas.joined-tables.v1",
  schedulingHours: "tango-reservas.business-hours.v1",
  schedulingRules: "tango-reservas.reservation-rules.v1",
  schedulingServices: "tango-reservas.services.v1",
  crm: "tango-reservas.crm.v1",
} as const;

export const LOCAL_STORE_EVENTS = {
  businesses: "tango-reservas:businesses-updated",
  publicWeb: "tango-reservas:public-web-updated",
  reservations: "tango-reservas:reservations-updated",
  menu: "tango-reservas:menu-updated",
  floorPlan: "tango-reservas:floor-plan-updated",
  floorPlanBackground: "tango-reservas:floor-plan-updated",
  joinedTables: "tango-reservas:joined-tables-updated",
  scheduling: "tango-reservas:scheduling-updated",
  crm: "tango-reservas:crm-updated",
} as const;

// TODO: replace local/mock repository with Supabase repository using docs/database/supabase-schema.sql

export function isBrowser() {
  return typeof window !== "undefined";
}

export function readLocalStoreJson<T>(key: string) {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as T;
    return parsed ?? null;
  } catch {
    return null;
  }
}

export function writeLocalStoreJson(key: string, value: unknown) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function dispatchLocalStoreEvent(eventName: string) {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(eventName));
}
