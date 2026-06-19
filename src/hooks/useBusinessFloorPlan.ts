"use client";

import { useEffect, useState } from "react";
import { getFloorTablesByBusinessId, subscribeFloorPlan } from "@/data/floor-plan";
import { getFloorPlanBackgroundByBusinessId, subscribeFloorPlanBackground } from "@/data/floor-plan-background";
import type { FloorPlanBackground, FloorTable } from "@/data/types";

export function useBusinessFloorPlan(businessId?: string | null) {
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [background, setBackground] = useState<FloorPlanBackground | null>(null);

  useEffect(() => {
    if (!businessId) {
      setTables([]);
      setBackground(null);
      return;
    }

    const syncFloorPlan = () => {
      setTables(getFloorTablesByBusinessId(businessId));
      setBackground(getFloorPlanBackgroundByBusinessId(businessId));
    };

    syncFloorPlan();
    const unsubscribeTables = subscribeFloorPlan(syncFloorPlan);
    const unsubscribeBackground = subscribeFloorPlanBackground(syncFloorPlan);

    return () => {
      unsubscribeTables();
      unsubscribeBackground();
    };
  }, [businessId]);

  return { tables, background };
}

