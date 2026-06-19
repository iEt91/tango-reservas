"use client";

import { useEffect, useState } from "react";
import type { Business } from "@/data/types";
import { getBusinesses, subscribeBusinesses } from "@/data/businesses";

export function useBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    const syncBusinesses = () => setBusinesses(getBusinesses());

    syncBusinesses();
    const unsubscribe = subscribeBusinesses(syncBusinesses);
    return unsubscribe;
  }, []);

  return businesses;
}

