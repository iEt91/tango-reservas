"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getFloorTablesByBusinessId, subscribeFloorPlan } from "@/data/floor-plan";
import { getFloorPlanBackgroundByBusinessId, subscribeFloorPlanBackground } from "@/data/floor-plan-background";
import type { FloorPlanBackground, FloorTable } from "@/data/types";

export function useBusinessFloorPlan(businessId?: string | null) {
  const subscribe = (onStoreChange: () => void) => {
    if (!businessId) {
      return () => {};
    }

    const unsubscribeTables = subscribeFloorPlan(onStoreChange);
    const unsubscribeBackground = subscribeFloorPlanBackground(onStoreChange);

    return () => {
      unsubscribeTables();
      unsubscribeBackground();
    };
  };
  const getSnapshot = () =>
    JSON.stringify({
      tables: businessId ? getFloorTablesByBusinessId(businessId) : [],
      background: businessId ? getFloorPlanBackgroundByBusinessId(businessId) : null,
    });
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => '{"tables":[],"background":null}',
  );

  return useMemo(() => {
    try {
      return JSON.parse(snapshot) as {
        tables: FloorTable[];
        background: FloorPlanBackground | null;
      };
    } catch {
      return { tables: [], background: null };
    }
  }, [snapshot]);
}
