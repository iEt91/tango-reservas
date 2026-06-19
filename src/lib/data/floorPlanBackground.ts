import type { FloorPlanBackground } from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import {
  defaultFloorPlanBackground as getLocalDefaultFloorPlanBackground,
  getFloorPlanBackgroundByBusinessId as getLocalFloorPlanBackgroundByBusinessId,
  resetFloorPlanBackground as resetLocalFloorPlanBackground,
  subscribeFloorPlanBackground as subscribeLocalFloorPlanBackground,
  updateFloorPlanBackground as updateLocalFloorPlanBackground,
} from "@/lib/floor-plan-background";
import {
  getSupabaseFloorPlanSettingsSync,
  subscribeSupabaseFloorPlan,
  updateSupabaseFloorPlanSettings,
} from "@/lib/data/supabase/floorPlan";

function isSupabaseSource() {
  return getDataSource() === "supabase";
}

export function getFloorPlanBackgroundByBusinessId(businessId: string) {
  if (isSupabaseSource()) {
    return getSupabaseFloorPlanSettingsSync(businessId);
  }

  return getLocalFloorPlanBackgroundByBusinessId(businessId);
}

export function updateFloorPlanBackground(
  businessId: string,
  data: Partial<
    Pick<
      FloorPlanBackground,
      | "backgroundImage"
      | "backgroundOpacity"
      | "backgroundBrightness"
      | "backgroundContrast"
      | "backgroundX"
      | "backgroundY"
      | "backgroundWidth"
      | "backgroundHeight"
      | "fit"
    >
  >,
) {
  if (isSupabaseSource()) {
    void updateSupabaseFloorPlanSettings(businessId, data);
    return {
      ...getSupabaseFloorPlanSettingsSync(businessId),
      ...data,
      businessId,
      updatedAt: new Date().toISOString(),
    } satisfies FloorPlanBackground;
  }

  return updateLocalFloorPlanBackground(businessId, data);
}

export function resetFloorPlanBackground(businessId: string) {
  if (isSupabaseSource()) {
    void updateSupabaseFloorPlanSettings(businessId, {
      backgroundImage: null,
      backgroundX: 0,
      backgroundY: 0,
      backgroundWidth: 1000,
      backgroundHeight: 600,
      backgroundOpacity: 50,
      backgroundBrightness: 100,
      backgroundContrast: 100,
      fit: "stretch",
    });

    return {
      businessId,
      backgroundImage: null,
      backgroundOpacity: 50,
      backgroundBrightness: 100,
      backgroundContrast: 100,
      backgroundX: 0,
      backgroundY: 0,
      backgroundWidth: 1000,
      backgroundHeight: 600,
      fit: "stretch",
      updatedAt: new Date().toISOString(),
    } satisfies FloorPlanBackground;
  }

  return resetLocalFloorPlanBackground(businessId);
}

export function subscribeFloorPlanBackground(listener: () => void) {
  if (isSupabaseSource()) {
    return subscribeSupabaseFloorPlan(listener);
  }

  return subscribeLocalFloorPlanBackground(listener);
}

export function defaultFloorPlanBackground(businessId: string) {
  if (isSupabaseSource()) {
    return getSupabaseFloorPlanSettingsSync(businessId);
  }

  return getLocalDefaultFloorPlanBackground(businessId);
}

