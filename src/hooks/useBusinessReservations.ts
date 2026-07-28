"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getReservationsByBusinessId, subscribeReservations } from "@/data/reservations";
import type { Reservation } from "@/data/types";

export function useBusinessReservations(businessId?: string | null) {
  const getSnapshot = () =>
    JSON.stringify(businessId ? getReservationsByBusinessId(businessId) : []);
  const snapshot = useSyncExternalStore(
    businessId ? subscribeReservations : () => () => {},
    getSnapshot,
    () => "[]",
  );

  return useMemo(() => {
    try {
      return JSON.parse(snapshot) as Reservation[];
    } catch {
      return [];
    }
  }, [snapshot]);
}
