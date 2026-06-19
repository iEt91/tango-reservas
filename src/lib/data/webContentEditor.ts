import type { PublicWebContent } from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import {
  getPublicWebContentByBusinessId,
  resetPublicWebContent,
  subscribePublicWeb,
  updatePublicWebContent,
} from "@/lib/data/webContent";
import {
  getSupabaseWebContentByBusiness,
  upsertSupabaseWebContent,
} from "@/lib/data/supabase/webContent";

export async function getWebContentByBusiness(businessId: string) {
  if (getDataSource() === "supabase") {
    return getSupabaseWebContentByBusiness(businessId);
  }

  return getPublicWebContentByBusinessId(businessId);
}

export async function updateWebContent(
  businessId: string,
  data: Partial<Omit<PublicWebContent, "businessId" | "updatedAt">>,
) {
  if (getDataSource() === "supabase") {
    return upsertSupabaseWebContent(businessId, data);
  }

  return updatePublicWebContent(businessId, data);
}

export async function resetWebContent(businessId: string) {
  if (getDataSource() === "supabase") {
    return upsertSupabaseWebContent(businessId, {});
  }

  return resetPublicWebContent(businessId);
}

export function subscribeWebContent(listener: () => void) {
  if (getDataSource() === "supabase") {
    return () => {};
  }

  return subscribePublicWeb(listener);
}
