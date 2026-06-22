import type { Business } from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import {
  getBusinessById as getHybridBusinessById,
  getBusinessBySlug as getHybridBusinessBySlug,
  mapSupabaseBusinessToBusiness,
} from "@/lib/data/admin-businesses";
import {
  getSupabaseBusinessById,
  getSupabaseBusinessBySlug,
} from "@/lib/data/supabase/businesses";

export const POSTGRES_UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function normalizeBusinessQueryValue(value: string) {
  return value.trim().split(/[?&#]/)[0]?.trim() ?? "";
}

export async function resolveBusinessForDataSource(businessParam: string): Promise<Business | null> {
  const value = normalizeBusinessQueryValue(businessParam);

  if (!value) {
    return null;
  }

  if (getDataSource() === "supabase") {
    const bySlug = await getSupabaseBusinessBySlug(value);
    if (bySlug) {
      return mapSupabaseBusinessToBusiness(bySlug);
    }

    if (POSTGRES_UUID_REGEX.test(value)) {
      const byId = await getSupabaseBusinessById(value);
      return byId ? mapSupabaseBusinessToBusiness(byId) : null;
    }

    return null;
  }

  const bySlug = await getHybridBusinessBySlug(value);
  if (bySlug) {
    return bySlug;
  }

  const byId = await getHybridBusinessById(value);
  return byId ?? null;
}
