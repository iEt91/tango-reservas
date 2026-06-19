"use client";

import { useEffect, useState } from "react";
import { getReservationsByBusinessId, subscribeReservations } from "@/data/reservations";
import type { Reservation } from "@/data/types";

export function useBusinessReservations(businessId?: string | null) {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (!businessId) {
      setReservations([]);
      return;
    }

    const syncReservations = () => setReservations(getReservationsByBusinessId(businessId));

    syncReservations();
    const unsubscribe = subscribeReservations(syncReservations);
    return unsubscribe;
  }, [businessId]);

  return reservations;
}

