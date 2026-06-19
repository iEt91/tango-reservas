"use client";

import { useEffect, useMemo, useState } from "react";
import type { Business } from "@/data/types";
import { getBusinesses, subscribeBusinesses } from "@/data/businesses";
import { getBusinessBySlugFromList } from "@/lib/local-business-routing";

export function useCurrentBusiness(slug?: string | null) {
  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    const syncBusinesses = () => setBusinesses(getBusinesses());

    syncBusinesses();
    const unsubscribe = subscribeBusinesses(syncBusinesses);
    return unsubscribe;
  }, []);

  return useMemo(() => {
    if (!slug) {
      return null;
    }

    return getBusinessBySlugFromList(businesses, slug) ?? null;
  }, [businesses, slug]);
}
