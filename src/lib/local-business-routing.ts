import type { Business } from "@/data/types";
import { resolveBusinessForDataSource } from "@/lib/data/business-resolution";

export const LOCAL_BUSINESS_QUERY_KEY = "business";

export const INVALID_LOCAL_BUSINESS_MESSAGE =
  "El negocio indicado no existe o fue eliminado.";

export const NO_ACTIVE_LOCAL_BUSINESS_MESSAGE =
  "No hay negocios activos disponibles.";

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

export function buildLocalBusinessHref(
  pathname: string,
  businessSlug: string,
  currentSearchParams?: string | URLSearchParams | null,
) {
  const normalizedSlug = businessSlug.trim();

  if (!normalizedSlug) {
    return pathname;
  }

  const query = cloneSearchParams(currentSearchParams);
  query.set(LOCAL_BUSINESS_QUERY_KEY, normalizedSlug);
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
  const normalizedQuery = businessQuery.trim();

  if (normalizedQuery) {
    const resolved = await resolveBusinessForDataSource(normalizedQuery);
    if (resolved) {
      return resolved;
    }
  }

  return getFallbackBusiness(businesses);
}
