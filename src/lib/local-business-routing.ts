import type { Business } from "@/data/types";
import {
  normalizeBusinessQueryValue,
  resolveBusinessForDataSource,
} from "@/lib/data/business-resolution";

export const LOCAL_BUSINESS_QUERY_KEY = "business";
export const LOCAL_ACCESS_MODE_QUERY_KEY = "mode";
export const LOCAL_ACCESS_SUPPORT_MODE = "support";
export const LOCAL_OWNER_BUSINESS_STORAGE_KEY = "tango_local_owner_business_slug";

export const INVALID_LOCAL_BUSINESS_MESSAGE =
  "El negocio indicado no existe o fue eliminado.";

export const NO_ACTIVE_LOCAL_BUSINESS_MESSAGE =
  "No hay negocios activos disponibles.";

export type LocalAccessMode = "support" | "owner";

export function getBusinessBySlugFromList(businesses: Business[], slug: string) {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  return businesses.find((business) => business.slug === normalizedSlug) ?? null;
}

export function getBusinessByIdFromList(businesses: Business[], businessId: string) {
  const normalizedId = businessId.trim();

  if (!normalizedId) {
    return null;
  }

  return businesses.find((business) => business.id === normalizedId) ?? null;
}

export function getFallbackBusiness(businesses: Business[]) {
  return businesses.find((business) => business.status === "active") ?? businesses[0] ?? null;
}

export function getActiveBusinessFallback(businesses: Business[]) {
  return businesses.find((business) => business.status === "active") ?? null;
}

export function getBusinessSlugFromId(businesses: Business[], businessId: string) {
  return getBusinessByIdFromList(businesses, businessId)?.slug ?? "";
}

function cloneSearchParams(currentSearchParams?: string | URLSearchParams | null) {
  if (!currentSearchParams) {
    return new URLSearchParams();
  }

  if (typeof currentSearchParams === "string") {
    return new URLSearchParams(currentSearchParams);
  }

  return new URLSearchParams(currentSearchParams.toString());
}

export function getLocalBusinessSlugFromSearchParams(
  currentSearchParams?: string | URLSearchParams | null,
) {
  const params = cloneSearchParams(currentSearchParams);
  return normalizeBusinessQueryValue(params.get(LOCAL_BUSINESS_QUERY_KEY) ?? "");
}

function getWindowLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function isSupportLocalAccess(
  currentSearchParams?: string | URLSearchParams | null,
) {
  const params = cloneSearchParams(currentSearchParams);
  return params.get(LOCAL_ACCESS_MODE_QUERY_KEY) === LOCAL_ACCESS_SUPPORT_MODE;
}

export function getLocalAccessMode(
  currentSearchParams?: string | URLSearchParams | null,
): LocalAccessMode {
  return isSupportLocalAccess(currentSearchParams) ? "support" : "owner";
}

export function getStoredOwnerBusinessSlug() {
  const storage = getWindowLocalStorage();
  if (!storage) {
    return "";
  }

  return storage.getItem(LOCAL_OWNER_BUSINESS_STORAGE_KEY)?.trim() ?? "";
}

export function setStoredOwnerBusinessSlug(slug: string) {
  const storage = getWindowLocalStorage();
  if (!storage) {
    return;
  }

  const normalized = slug.trim();
  if (!normalized) {
    storage.removeItem(LOCAL_OWNER_BUSINESS_STORAGE_KEY);
    return;
  }

  storage.setItem(LOCAL_OWNER_BUSINESS_STORAGE_KEY, normalized);
}

export function buildLocalBusinessHref(
  pathname: string,
  businessSlug: string,
  currentSearchParams?: string | URLSearchParams | null,
) {
  const normalizedSlug = normalizeBusinessQueryValue(businessSlug);

  if (!normalizedSlug) {
    return pathname;
  }

  const query = cloneSearchParams(currentSearchParams);
  query.set(LOCAL_BUSINESS_QUERY_KEY, normalizedSlug);
  return `${pathname}?${query.toString()}`;
}

export function buildLocalAccessHref(
  pathname: string,
  businessSlug: string,
  currentSearchParams?: string | URLSearchParams | null,
  accessMode?: LocalAccessMode,
) {
  const normalizedSlug = normalizeBusinessQueryValue(businessSlug);

  if (!normalizedSlug) {
    return pathname;
  }

  const query = cloneSearchParams(currentSearchParams);
  query.set(LOCAL_BUSINESS_QUERY_KEY, normalizedSlug);

  if (accessMode === "support") {
    query.set(LOCAL_ACCESS_MODE_QUERY_KEY, LOCAL_ACCESS_SUPPORT_MODE);
  } else {
    query.delete(LOCAL_ACCESS_MODE_QUERY_KEY);
  }

  return `${pathname}?${query.toString()}`;
}

export function navigateToBusiness(
  pathname: string,
  businessSlug: string,
  currentSearchParams?: string | URLSearchParams | null,
) {
  return buildLocalBusinessHref(pathname, businessSlug, currentSearchParams);
}

export async function resolveBusinessForLocalRoute(
  businessQuery: string,
  businesses: Business[] = [],
) {
  const normalizedQuery = normalizeBusinessQueryValue(businessQuery);

  if (normalizedQuery) {
    const resolved = await resolveBusinessForDataSource(normalizedQuery);
    return resolved;
  }

  return getFallbackBusiness(businesses);
}
