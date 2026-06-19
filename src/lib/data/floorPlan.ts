import type { FloorPlanBackground, FloorTable } from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import {
  createFloorTable as createLocalFloorTable,
  deleteFloorTable as deleteLocalFloorTable,
  getDefaultFloorPlanForBusiness as getLocalDefaultFloorPlanForBusiness,
  getFloorPlanStateSummary as getLocalFloorPlanStateSummary,
  getFloorTablesByBusinessId as getLocalFloorTablesByBusinessId,
  resetFloorPlan as resetLocalFloorPlan,
  subscribeFloorPlan as subscribeLocalFloorPlan,
  updateFloorTable as updateLocalFloorTable,
  updateFloorTablePosition as updateLocalFloorTablePosition,
} from "@/lib/floor-plan";
import { getFloorPlanBackgroundByBusinessId as getLocalFloorPlanBackgroundByBusinessId } from "@/lib/floor-plan-background";
import {
  createSupabaseFloorTable,
  deleteSupabaseFloorTable,
  getSupabaseFloorPlanSettingsSync,
  getSupabaseFloorTablesByBusinessSync,
  getSupabaseTableCombinationsByBusinessSync,
  refreshSupabaseFloorPlanForBusiness,
  setSupabaseTableCombinationActive,
  subscribeSupabaseFloorPlan,
  updateSupabaseFloorPlanSettings,
  updateSupabaseFloorTable,
  updateSupabaseFloorTablePosition,
  updateSupabaseTableCombination,
  deleteSupabaseTableCombination,
  createSupabaseTableCombination,
} from "@/lib/data/supabase/floorPlan";

export type FloorPlanSnapshot = {
  tables: FloorTable[];
  settings: FloorPlanBackground;
  combinations: Array<{
    id: string;
    businessId: string;
    label: string;
    tableIds: string[];
    seatsTotal: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
};

function isSupabaseSource() {
  return getDataSource() === "supabase";
}

export function getFloorTablesByBusinessId(businessId: string) {
  if (isSupabaseSource()) {
    return getSupabaseFloorTablesByBusinessSync(businessId);
  }

  return getLocalFloorTablesByBusinessId(businessId);
}

export function getDefaultFloorPlanForBusiness(businessId: string) {
  if (isSupabaseSource()) {
    return getFloorTablesByBusinessId(businessId);
  }

  return getLocalDefaultFloorPlanForBusiness(businessId);
}

export function getFloorPlanStateSummary(businessId: string) {
  if (isSupabaseSource()) {
    const tables = getFloorTablesByBusinessId(businessId);
    const totalSeats = tables.reduce((sum, table) => sum + table.seats, 0);
    const available = tables.filter((table) => table.status === "available").length;
    const occupied = tables.filter((table) => table.status === "occupied").length;
    const reserved = tables.filter((table) => table.status === "reserved").length;
    const blocked = tables.filter((table) => table.status === "blocked").length;
    const outOfService = tables.filter((table) => table.status === "out_of_service").length;

    return {
      totalTables: tables.length,
      totalSeats,
      available,
      occupied,
      reserved,
      blocked,
      outOfService,
    };
  }

  return getLocalFloorPlanStateSummary(businessId);
}

export function subscribeFloorPlan(listener: () => void) {
  if (isSupabaseSource()) {
    return subscribeSupabaseFloorPlan(listener);
  }

  return subscribeLocalFloorPlan(listener);
}

export async function getFloorPlanByBusiness(businessId: string): Promise<FloorPlanSnapshot> {
  if (isSupabaseSource()) {
    await refreshSupabaseFloorPlanForBusiness(businessId);
    return {
      tables: getSupabaseFloorTablesByBusinessSync(businessId),
      settings: getSupabaseFloorPlanSettingsSync(businessId),
      combinations: getSupabaseTableCombinationsByBusinessSync(businessId),
    };
  }

  return {
    tables: getLocalFloorTablesByBusinessId(businessId),
    settings: getLocalFloorPlanBackgroundByBusinessId(businessId),
    combinations: [],
  };
}

export async function createFloorTable(
  businessId: string,
  data: Parameters<typeof createLocalFloorTable>[1],
) {
  if (isSupabaseSource()) {
    return createSupabaseFloorTable(businessId, data);
  }

  return createLocalFloorTable(businessId, data);
}

export async function updateFloorTable(
  tableId: string,
  data: Parameters<typeof updateLocalFloorTable>[1],
) {
  if (isSupabaseSource()) {
    return updateSupabaseFloorTable(tableId, data);
  }

  return updateLocalFloorTable(tableId, data);
}

export async function updateFloorTablePosition(tableId: string, x: number, y: number) {
  if (isSupabaseSource()) {
    return updateSupabaseFloorTablePosition(tableId, x, y);
  }

  return updateLocalFloorTablePosition(tableId, x, y);
}

export async function deleteFloorTable(tableId: string) {
  if (isSupabaseSource()) {
    return deleteSupabaseFloorTable(tableId);
  }

  return deleteLocalFloorTable(tableId);
}

export async function resetFloorPlan(businessId: string) {
  if (isSupabaseSource()) {
    await refreshSupabaseFloorPlanForBusiness(businessId);
    return getSupabaseFloorTablesByBusinessSync(businessId);
  }

  return resetLocalFloorPlan(businessId);
}

export async function updateFloorPlanSettings(
  businessId: string,
  data: Parameters<typeof updateSupabaseFloorPlanSettings>[1],
) {
  if (isSupabaseSource()) {
    return updateSupabaseFloorPlanSettings(businessId, data);
  }

  return {
    businessId,
    backgroundImage: data.backgroundImage ?? null,
    backgroundOpacity: typeof data.backgroundOpacity === "number" ? data.backgroundOpacity : 50,
    backgroundBrightness:
      typeof data.backgroundBrightness === "number" ? data.backgroundBrightness : 100,
    backgroundContrast:
      typeof data.backgroundContrast === "number" ? data.backgroundContrast : 100,
    backgroundX: typeof data.backgroundX === "number" ? data.backgroundX : 0,
    backgroundY: typeof data.backgroundY === "number" ? data.backgroundY : 0,
    backgroundWidth: typeof data.backgroundWidth === "number" ? data.backgroundWidth : 1000,
    backgroundHeight: typeof data.backgroundHeight === "number" ? data.backgroundHeight : 600,
    fit: (data.fit as FloorPlanBackground["fit"]) ?? "stretch",
    updatedAt: new Date().toISOString(),
  } satisfies FloorPlanBackground;
}

export async function getTableCombinations(businessId: string) {
  if (isSupabaseSource()) {
    return getSupabaseTableCombinationsByBusinessSync(businessId);
  }

  return [] as FloorPlanSnapshot["combinations"];
}

export async function createTableCombination(
  businessId: string,
  data: Parameters<typeof createSupabaseTableCombination>[1],
) {
  if (isSupabaseSource()) {
    return createSupabaseTableCombination(businessId, data);
  }

  return null;
}

export async function updateTableCombination(
  combinationId: string,
  data: Parameters<typeof updateSupabaseTableCombination>[1],
) {
  if (isSupabaseSource()) {
    return updateSupabaseTableCombination(combinationId, data);
  }

  return null;
}

export async function deleteTableCombination(combinationId: string) {
  if (isSupabaseSource()) {
    return deleteSupabaseTableCombination(combinationId);
  }

  return false;
}

export async function setTableCombinationActive(
  combinationId: string,
  isActive: boolean,
) {
  if (isSupabaseSource()) {
    return setSupabaseTableCombinationActive(combinationId, isActive);
  }

  return null;
}

export function getFloorPlanSettingsByBusinessId(businessId: string) {
  if (isSupabaseSource()) {
    return getSupabaseFloorPlanSettingsSync(businessId);
  }

  return getLocalFloorPlanBackgroundByBusinessId(businessId);
}
