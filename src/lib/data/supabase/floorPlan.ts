import type { FloorPlanBackground, FloorTable } from "@/data/types";
import { POSTGRES_UUID_REGEX } from "@/lib/data/business-resolution";
import { getSupabaseReadClient } from "@/lib/supabase/read-client";
import {
  clampTableCornerRadius,
  normalizeTableDimensions,
  TABLE_DEFAULT_CORNER_RADIUS,
} from "@/components/local-floor-plan/table-geometry";

export type SupabaseFloorTableRow = {
  id: string;
  business_id: string;
  label: string;
  seats: number | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  rotation: number | null;
  shape: string | null;
  corner_radius: number | null;
  status: string | null;
  can_join: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SupabaseFloorPlanSettingsRow = {
  business_id: string;
  background_image_url: string | null;
  background_x: number | null;
  background_y: number | null;
  background_width: number | null;
  background_height: number | null;
  background_opacity: number | null;
  background_brightness: number | null;
  background_contrast: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SupabaseTableCombinationRow = {
  id: string;
  business_id: string;
  label: string;
  table_ids: unknown;
  seats_total: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type FloorPlanCombination = {
  id: string;
  businessId: string;
  label: string;
  tableIds: string[];
  seatsTotal: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FloorPlanSettingsInput = Partial<
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
>;

type FloorTableInput = Partial<
  Pick<
    FloorTable,
    | "label"
    | "seats"
    | "x"
    | "y"
    | "width"
    | "height"
    | "rotation"
    | "status"
    | "shape"
    | "cornerRadius"
    | "isJoinable"
  >
>;

type TableCombinationInput = Partial<
  Pick<FloorPlanCombination, "label" | "tableIds" | "seatsTotal" | "isActive">
> & {
  tableIds?: string[];
};

const FLOOR_TABLE_SELECT =
  "id, business_id, label, seats, x, y, width, height, rotation, shape, corner_radius, status, can_join, created_at, updated_at";
const FLOOR_PLAN_SETTINGS_SELECT =
  "business_id, background_image_url, background_x, background_y, background_width, background_height, background_opacity, background_brightness, background_contrast, created_at, updated_at";
const TABLE_COMBINATIONS_SELECT =
  "id, business_id, label, table_ids, seats_total, is_active, created_at, updated_at";
const CHANGE_EVENT = "floor-plan";

let floorTablesCache = new Map<string, FloorTable[]>();
let floorPlanSettingsCache = new Map<string, FloorPlanBackground>();
let tableCombinationsCache = new Map<string, FloorPlanCombination[]>();
let loadedBusinesses = new Set<string>();
let loadingBusinesses = new Map<string, Promise<void>>();

function isBrowser() {
  return typeof window !== "undefined";
}

function getSupabaseClientOrThrow() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  return supabase;
}

function assertSupabaseUuid(value: string, field: string) {
  const trimmed = value.trim();

  if (!POSTGRES_UUID_REGEX.test(trimmed)) {
    throw new Error(`${field} invalido para Supabase: se esperaba UUID y llego ${value}`);
  }

  return trimmed;
}

function assertSupabaseUuidArray(values: string[], field: string) {
  return values.map((value, index) => assertSupabaseUuid(value, `${field}[${index}]`));
}

function normalizeFloorPlanError(
  table: string,
  error:
    | {
        message?: string | null;
        code?: string | null;
        details?: string | null;
        hint?: string | null;
      }
    | Error
    | unknown,
) {
  const data =
    error && typeof error === "object"
      ? (error as {
          message?: string | null;
          code?: string | null;
          details?: string | null;
          hint?: string | null;
        })
      : null;

  const message =
    (error instanceof Error ? error.message : data?.message)?.trim() ||
    "No se pudo completar la operacion.";
  const code = data?.code?.trim();
  const details = data?.details?.trim();
  const hint = data?.hint?.trim();

  const parts = [`Fallo ${table}: ${message}`];

  if (code) parts.push(`Code: ${code}`);
  if (details) parts.push(`Details: ${details}`);
  if (hint) parts.push(`Hint: ${hint}`);

  return new Error(parts.join(". "));
}

function nowIso() {
  return new Date().toISOString();
}

function cloneTable(table: FloorTable) {
  return { ...table };
}

function cloneTables(tables: FloorTable[]) {
  return tables.map(cloneTable);
}

function cloneFloorPlanSettings(settings: FloorPlanBackground) {
  return { ...settings };
}

function cloneCombination(combination: FloorPlanCombination) {
  return {
    ...combination,
    tableIds: [...combination.tableIds],
  };
}

function cloneCombinations(combinations: FloorPlanCombination[]) {
  return combinations.map(cloneCombination);
}

function normalizeTableShape(shape: string | null | undefined): FloorTable["shape"] {
  if (shape === "round") {
    return "round";
  }

  if (shape === "rectangular" || shape === "rectangle") {
    return "rectangle";
  }

  return "square";
}

function toNumber(value: number | null | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeTableStatus(value: string | null | undefined): FloorTable["status"] {
  if (
    value === "available" ||
    value === "occupied" ||
    value === "reserved" ||
    value === "blocked" ||
    value === "out_of_service"
  ) {
    return value;
  }

  return "available";
}

function normalizeTableIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean);
}

function createDefaultFloorPlanSettings(businessId: string): FloorPlanBackground {
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
    updatedAt: nowIso(),
  };
}

export function mapSupabaseFloorTableToFloorTable(row: SupabaseFloorTableRow): FloorTable {
  const shape = normalizeTableShape(row.shape);
  const dimensions = normalizeTableDimensions(shape, toNumber(row.width, 130), toNumber(row.height, 90));

  return {
    id: row.id,
    businessId: row.business_id,
    label: row.label ?? "Mesa",
    seats: Math.max(1, Math.round(toNumber(row.seats, 4))),
    x: toNumber(row.x, 80),
    y: toNumber(row.y, 80),
    width: dimensions.width,
    height: dimensions.height,
    rotation: toNumber(row.rotation, 0),
    status: normalizeTableStatus(row.status),
    shape,
    cornerRadius: clampTableCornerRadius(row.corner_radius ?? TABLE_DEFAULT_CORNER_RADIUS),
    isJoinable: row.can_join ?? true,
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
  };
}

export function mapFloorTableInputToSupabaseRow(
  data: FloorTableInput,
  options: { businessId: string },
) {
  const shape = normalizeTableShape(data.shape);
  const dimensions = normalizeTableDimensions(shape, data.width ?? 130, data.height ?? 90);

  return {
    business_id: assertSupabaseUuid(options.businessId, "businessId"),
    label: (data.label ?? "Nueva mesa").trim() || "Nueva mesa",
    seats: Math.max(1, Math.round(Number(data.seats) || 4)),
    x: Number.isFinite(Number(data.x)) ? Number(data.x) : 80,
    y: Number.isFinite(Number(data.y)) ? Number(data.y) : 80,
    width: dimensions.width,
    height: dimensions.height,
    rotation: Number.isFinite(Number(data.rotation)) ? Number(data.rotation) : 0,
    shape: shape === "rectangle" ? "rectangular" : shape,
    corner_radius: clampTableCornerRadius(data.cornerRadius ?? TABLE_DEFAULT_CORNER_RADIUS),
    status: normalizeTableStatus(data.status),
    can_join: data.isJoinable ?? true,
  };
}

export function mapSupabaseFloorPlanSettingsToFloorPlanSettings(
  row: SupabaseFloorPlanSettingsRow,
): FloorPlanBackground {
  return {
    businessId: row.business_id,
    backgroundImage: row.background_image_url ?? null,
    backgroundOpacity: Math.max(0, Math.min(100, toNumber(row.background_opacity, 50))),
    backgroundBrightness: Math.max(0, Math.min(100, toNumber(row.background_brightness, 100))),
    backgroundContrast: Math.max(0, Math.min(100, toNumber(row.background_contrast, 100))),
    backgroundX: toNumber(row.background_x, 0),
    backgroundY: toNumber(row.background_y, 0),
    backgroundWidth: Math.max(100, toNumber(row.background_width, 1000)),
    backgroundHeight: Math.max(100, toNumber(row.background_height, 600)),
    fit: "stretch",
    updatedAt: row.updated_at ?? nowIso(),
  };
}

export function mapFloorPlanSettingsInputToSupabaseRow(
  data: FloorPlanSettingsInput,
  businessId: string,
) {
  return {
    business_id: assertSupabaseUuid(businessId, "businessId"),
    background_image_url: data.backgroundImage ?? null,
    background_x: Number.isFinite(Number(data.backgroundX)) ? Number(data.backgroundX) : 0,
    background_y: Number.isFinite(Number(data.backgroundY)) ? Number(data.backgroundY) : 0,
    background_width: Math.max(100, Number(data.backgroundWidth ?? 1000)),
    background_height: Math.max(100, Number(data.backgroundHeight ?? 600)),
    background_opacity: Math.max(0, Math.min(100, Number(data.backgroundOpacity ?? 50))),
    background_brightness: Math.max(0, Math.min(100, Number(data.backgroundBrightness ?? 100))),
    background_contrast: Math.max(0, Math.min(100, Number(data.backgroundContrast ?? 100))),
  };
}

export function mapSupabaseTableCombinationToTableCombination(
  row: SupabaseTableCombinationRow,
): FloorPlanCombination {
  return {
    id: row.id,
    businessId: row.business_id,
    label: row.label ?? "Combinacion",
    tableIds: normalizeTableIds(row.table_ids),
    seatsTotal: Math.max(0, Math.round(toNumber(row.seats_total, 0))),
    isActive: row.is_active ?? true,
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
  };
}

export function mapTableCombinationInputToSupabaseRow(
  data: TableCombinationInput,
  businessId: string,
) {
  const tableIds = assertSupabaseUuidArray(normalizeTableIds(data.tableIds ?? []), "tableIds");

  return {
    business_id: assertSupabaseUuid(businessId, "businessId"),
    label: (data.label ?? "Nueva combinacion").trim() || "Nueva combinacion",
    table_ids: tableIds,
    seats_total: Math.max(0, Math.round(Number(data.seatsTotal ?? 0))),
    is_active: data.isActive ?? true,
  };
}

async function readFloorTables(businessId: string) {
  const supabase = getSupabaseClientOrThrow();
  const safeBusinessId = assertSupabaseUuid(businessId, "businessId");

  const { data, error } = await supabase
    .schema("public")
    .from("floor_tables")
    .select(FLOOR_TABLE_SELECT)
    .eq("business_id", safeBusinessId)
    .order("created_at", { ascending: true });

  if (error) {
    throw normalizeFloorPlanError("floor_tables", error);
  }

  return (data ?? []) as SupabaseFloorTableRow[];
}

async function readFloorPlanSettings(businessId: string) {
  const supabase = getSupabaseClientOrThrow();
  const safeBusinessId = assertSupabaseUuid(businessId, "businessId");

  const { data, error } = await supabase
    .schema("public")
    .from("floor_plan_settings")
    .select(FLOOR_PLAN_SETTINGS_SELECT)
    .eq("business_id", safeBusinessId)
    .maybeSingle();

  if (error) {
    throw normalizeFloorPlanError("floor_plan_settings", error);
  }

  return (data as SupabaseFloorPlanSettingsRow | null) ?? null;
}

async function readTableCombinations(businessId: string) {
  const supabase = getSupabaseClientOrThrow();
  const safeBusinessId = assertSupabaseUuid(businessId, "businessId");

  const { data, error } = await supabase
    .schema("public")
    .from("table_combinations")
    .select(TABLE_COMBINATIONS_SELECT)
    .eq("business_id", safeBusinessId)
    .order("label", { ascending: true });

  if (error) {
    throw normalizeFloorPlanError("table_combinations", error);
  }

  return (data ?? []) as SupabaseTableCombinationRow[];
}

async function refreshCacheForBusiness(businessId: string) {
  if (!businessId) {
    return;
  }

  const [tablesResult, settingsResult, combinationsResult] = await Promise.allSettled([
    readFloorTables(businessId),
    readFloorPlanSettings(businessId),
    readTableCombinations(businessId),
  ]);

  if (tablesResult.status === "fulfilled") {
    floorTablesCache.set(businessId, tablesResult.value.map(mapSupabaseFloorTableToFloorTable));
  } else {
    console.warn("[floor-plan] No se pudieron leer las mesas desde Supabase", tablesResult.reason);
    floorTablesCache.set(businessId, []);
  }

  if (settingsResult.status === "fulfilled") {
    const settings = settingsResult.value;
    floorPlanSettingsCache.set(
      businessId,
      settings
        ? mapSupabaseFloorPlanSettingsToFloorPlanSettings(settings)
        : createDefaultFloorPlanSettings(businessId),
    );
  } else {
    console.warn(
      "[floor-plan] No se pudo leer floor_plan_settings desde Supabase",
      settingsResult.reason,
    );
    floorPlanSettingsCache.set(businessId, createDefaultFloorPlanSettings(businessId));
  }

  if (combinationsResult.status === "fulfilled") {
    tableCombinationsCache.set(
      businessId,
      combinationsResult.value.map(mapSupabaseTableCombinationToTableCombination),
    );
  } else {
    console.warn(
      "[floor-plan] No se pudieron leer table_combinations desde Supabase",
      combinationsResult.reason,
    );
    tableCombinationsCache.set(businessId, []);
  }
  loadedBusinesses.add(businessId);
  dispatchChange();
}

function ensureLoaded(businessId: string) {
  if (!businessId) {
    return;
  }

  if (!loadedBusinesses.has(businessId) && !loadingBusinesses.has(businessId)) {
    void refreshSupabaseFloorPlanForBusiness(businessId);
  }
}

function dispatchChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function setTablesCache(businessId: string, tables: FloorTable[]) {
  floorTablesCache.set(businessId, tables);
}

function setSettingsCache(businessId: string, settings: FloorPlanBackground) {
  floorPlanSettingsCache.set(businessId, settings);
}

function setCombinationsCache(businessId: string, combinations: FloorPlanCombination[]) {
  tableCombinationsCache.set(businessId, combinations);
}

export function subscribeSupabaseFloorPlan(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleChange = () => listener();
  window.addEventListener(CHANGE_EVENT, handleChange);
  return () => window.removeEventListener(CHANGE_EVENT, handleChange);
}

export async function refreshSupabaseFloorPlanForBusiness(businessId: string) {
  if (!businessId) {
    return getSupabaseFloorTablesByBusinessSync(businessId);
  }

  if (loadingBusinesses.has(businessId)) {
    await loadingBusinesses.get(businessId);
    return getSupabaseFloorTablesByBusinessSync(businessId);
  }

  const promise = (async () => {
    await refreshCacheForBusiness(businessId);
  })();

  loadingBusinesses.set(businessId, promise);

  try {
    await promise;
  } finally {
    loadingBusinesses.delete(businessId);
  }

  return getSupabaseFloorTablesByBusinessSync(businessId);
}

export function getSupabaseFloorTablesByBusinessSync(businessId: string) {
  ensureLoaded(businessId);
  return cloneTables(floorTablesCache.get(businessId) ?? []);
}

export async function getSupabaseFloorTablesByBusiness(businessId: string) {
  await refreshSupabaseFloorPlanForBusiness(businessId);
  return getSupabaseFloorTablesByBusinessSync(businessId);
}

export function getSupabaseFloorPlanSettingsSync(businessId: string) {
  ensureLoaded(businessId);
  return cloneFloorPlanSettings(
    floorPlanSettingsCache.get(businessId) ?? createDefaultFloorPlanSettings(businessId),
  );
}

export async function getSupabaseFloorPlanSettings(businessId: string) {
  await refreshSupabaseFloorPlanForBusiness(businessId);
  return getSupabaseFloorPlanSettingsSync(businessId);
}

export async function upsertSupabaseFloorPlanSettings(
  businessId: string,
  data: FloorPlanSettingsInput,
) {
  const supabase = getSupabaseClientOrThrow();
  const row = mapFloorPlanSettingsInputToSupabaseRow(data, businessId);

  const { error } = await supabase
    .schema("public")
    .from("floor_plan_settings")
    .upsert(row, { onConflict: "business_id" });

  if (error) {
    throw normalizeFloorPlanError("floor_plan_settings", error);
  }

  await refreshSupabaseFloorPlanForBusiness(businessId);
  return getSupabaseFloorPlanSettingsSync(businessId);
}

export async function updateSupabaseFloorPlanSettings(
  businessId: string,
  data: FloorPlanSettingsInput,
) {
  return upsertSupabaseFloorPlanSettings(businessId, data);
}

export async function createSupabaseFloorTable(
  businessId: string,
  data: FloorTableInput,
) {
  const supabase = getSupabaseClientOrThrow();
  const row = mapFloorTableInputToSupabaseRow(data, { businessId });

  const { data: inserted, error } = await supabase
    .schema("public")
    .from("floor_tables")
    .insert(row)
    .select(FLOOR_TABLE_SELECT)
    .single();

  if (error) {
    throw normalizeFloorPlanError("floor_tables", error);
  }

  await refreshSupabaseFloorPlanForBusiness(assertSupabaseUuid(businessId, "businessId"));
  return mapSupabaseFloorTableToFloorTable(inserted as SupabaseFloorTableRow);
}

async function readFloorTableById(tableId: string) {
  const supabase = getSupabaseClientOrThrow();

  const { data, error } = await supabase
    .schema("public")
    .from("floor_tables")
    .select(FLOOR_TABLE_SELECT)
    .eq("id", assertSupabaseUuid(tableId, "tableId"))
    .maybeSingle();

  if (error) {
    throw normalizeFloorPlanError("floor_tables", error);
  }

  return (data as SupabaseFloorTableRow | null) ?? null;
}

async function pruneTableCombinationsForDeletedTable(businessId: string, tableId: string) {
  const supabase = getSupabaseClientOrThrow();
  const combinations = await readTableCombinations(businessId);

  for (const combination of combinations) {
    if (!combination.table_ids || !Array.isArray(combination.table_ids)) {
      continue;
    }

    const tableIds = normalizeTableIds(combination.table_ids).filter((entry) => entry !== tableId);

    if (tableIds.length === 0) {
      const { error } = await supabase
        .schema("public")
        .from("table_combinations")
        .delete()
        .eq("id", combination.id);

      if (error) {
        throw normalizeFloorPlanError("table_combinations", error);
      }
      continue;
    }

    const { error } = await supabase
      .schema("public")
      .from("table_combinations")
      .update({ table_ids: tableIds, seats_total: tableIds.length })
      .eq("id", combination.id);

    if (error) {
      throw normalizeFloorPlanError("table_combinations", error);
    }
  }
}

export async function updateSupabaseFloorTable(
  tableId: string,
  data: FloorTableInput,
) {
  const supabase = getSupabaseClientOrThrow();
  const current = await readFloorTableById(tableId);

  if (!current) {
    throw new Error("No se encontro la mesa para actualizar.");
  }

  const row = mapFloorTableInputToSupabaseRow(
    {
      ...data,
      x: data.x ?? current.x ?? undefined,
      y: data.y ?? current.y ?? undefined,
    },
    { businessId: current.business_id },
  );

  const { data: updated, error } = await supabase
    .schema("public")
    .from("floor_tables")
    .update(row)
    .eq("id", assertSupabaseUuid(tableId, "tableId"))
    .select(FLOOR_TABLE_SELECT)
    .single();

  if (error) {
    throw normalizeFloorPlanError("floor_tables", error);
  }

  await refreshSupabaseFloorPlanForBusiness(current.business_id);
  return mapSupabaseFloorTableToFloorTable(updated as SupabaseFloorTableRow);
}

export async function updateSupabaseFloorTablePosition(
  tableId: string,
  x: number,
  y: number,
) {
  const supabase = getSupabaseClientOrThrow();
  const current = await readFloorTableById(tableId);

  if (!current) {
    throw new Error("No se encontro la mesa para actualizar.");
  }

  const { data: updated, error } = await supabase
    .schema("public")
    .from("floor_tables")
    .update({
      x,
      y,
    })
    .eq("id", assertSupabaseUuid(tableId, "tableId"))
    .select(FLOOR_TABLE_SELECT)
    .single();

  if (error) {
    throw normalizeFloorPlanError("floor_tables", error);
  }

  await refreshSupabaseFloorPlanForBusiness(current.business_id);
  return mapSupabaseFloorTableToFloorTable(updated as SupabaseFloorTableRow);
}

export async function updateSupabaseFloorTableStatus(
  tableId: string,
  status: FloorTable["status"],
) {
  const supabase = getSupabaseClientOrThrow();
  const current = await readFloorTableById(tableId);

  if (!current) {
    throw new Error("No se encontro la mesa para actualizar.");
  }

  const { data: updated, error } = await supabase
    .schema("public")
    .from("floor_tables")
    .update({ status })
    .eq("id", assertSupabaseUuid(tableId, "tableId"))
    .select(FLOOR_TABLE_SELECT)
    .single();

  if (error) {
    throw normalizeFloorPlanError("floor_tables", error);
  }

  await refreshSupabaseFloorPlanForBusiness(current.business_id);
  return mapSupabaseFloorTableToFloorTable(updated as SupabaseFloorTableRow);
}

export async function deleteSupabaseFloorTable(tableId: string) {
  const supabase = getSupabaseClientOrThrow();
  const current = await readFloorTableById(tableId);

  if (!current) {
    return false;
  }

  const { error } = await supabase
    .schema("public")
    .from("floor_tables")
    .delete()
    .eq("id", assertSupabaseUuid(tableId, "tableId"));

  if (error) {
    throw normalizeFloorPlanError("floor_tables", error);
  }

  await pruneTableCombinationsForDeletedTable(current.business_id, current.id);
  await refreshSupabaseFloorPlanForBusiness(current.business_id);
  return true;
}

export async function getSupabaseTableCombinationsByBusiness(businessId: string) {
  await refreshSupabaseFloorPlanForBusiness(businessId);
  return getSupabaseTableCombinationsByBusinessSync(businessId);
}

export function getSupabaseTableCombinationsByBusinessSync(businessId: string) {
  ensureLoaded(businessId);
  return cloneCombinations(tableCombinationsCache.get(businessId) ?? []);
}

export async function createSupabaseTableCombination(
  businessId: string,
  data: TableCombinationInput,
) {
  const supabase = getSupabaseClientOrThrow();
  const row = mapTableCombinationInputToSupabaseRow(data, businessId);

  const { data: inserted, error } = await supabase
    .schema("public")
    .from("table_combinations")
    .insert(row)
    .select(TABLE_COMBINATIONS_SELECT)
    .single();

  if (error) {
    throw normalizeFloorPlanError("table_combinations", error);
  }

  await refreshSupabaseFloorPlanForBusiness(assertSupabaseUuid(businessId, "businessId"));
  return mapSupabaseTableCombinationToTableCombination(inserted as SupabaseTableCombinationRow);
}

async function readTableCombinationById(combinationId: string) {
  const supabase = getSupabaseClientOrThrow();

  const { data, error } = await supabase
    .schema("public")
    .from("table_combinations")
    .select(TABLE_COMBINATIONS_SELECT)
    .eq("id", assertSupabaseUuid(combinationId, "combinationId"))
    .maybeSingle();

  if (error) {
    throw normalizeFloorPlanError("table_combinations", error);
  }

  return (data as SupabaseTableCombinationRow | null) ?? null;
}

export async function updateSupabaseTableCombination(
  combinationId: string,
  data: TableCombinationInput,
) {
  const supabase = getSupabaseClientOrThrow();
  const current = await readTableCombinationById(combinationId);

  if (!current) {
    throw new Error("No se encontro la combinacion para actualizar.");
  }

  const row = mapTableCombinationInputToSupabaseRow(
    {
      label: data.label ?? current.label,
      tableIds: data.tableIds ?? normalizeTableIds(current.table_ids),
      seatsTotal: data.seatsTotal ?? current.seats_total ?? 0,
      isActive: data.isActive ?? current.is_active ?? true,
    },
    current.business_id,
  );

  const { data: updated, error } = await supabase
    .schema("public")
    .from("table_combinations")
    .update(row)
    .eq("id", assertSupabaseUuid(combinationId, "combinationId"))
    .select(TABLE_COMBINATIONS_SELECT)
    .single();

  if (error) {
    throw normalizeFloorPlanError("table_combinations", error);
  }

  await refreshSupabaseFloorPlanForBusiness(current.business_id);
  return mapSupabaseTableCombinationToTableCombination(updated as SupabaseTableCombinationRow);
}

export async function deleteSupabaseTableCombination(combinationId: string) {
  const supabase = getSupabaseClientOrThrow();
  const current = await readTableCombinationById(combinationId);

  if (!current) {
    return false;
  }

  const { error } = await supabase
    .schema("public")
    .from("table_combinations")
    .delete()
    .eq("id", assertSupabaseUuid(combinationId, "combinationId"));

  if (error) {
    throw normalizeFloorPlanError("table_combinations", error);
  }

  await refreshSupabaseFloorPlanForBusiness(current.business_id);
  return true;
}

export async function setSupabaseTableCombinationActive(
  combinationId: string,
  isActive: boolean,
) {
  const supabase = getSupabaseClientOrThrow();
  const current = await readTableCombinationById(combinationId);

  if (!current) {
    throw new Error("No se encontro la combinacion para actualizar.");
  }

  const { data: updated, error } = await supabase
    .schema("public")
    .from("table_combinations")
    .update({ is_active: isActive })
    .eq("id", assertSupabaseUuid(combinationId, "combinationId"))
    .select(TABLE_COMBINATIONS_SELECT)
    .single();

  if (error) {
    throw normalizeFloorPlanError("table_combinations", error);
  }

  await refreshSupabaseFloorPlanForBusiness(current.business_id);
  return mapSupabaseTableCombinationToTableCombination(updated as SupabaseTableCombinationRow);
}

export async function getSupabaseFloorPlanByBusiness(businessId: string) {
  await refreshSupabaseFloorPlanForBusiness(businessId);

  return {
    tables: getSupabaseFloorTablesByBusinessSync(businessId),
    settings: getSupabaseFloorPlanSettingsSync(businessId),
    combinations: getSupabaseTableCombinationsByBusinessSync(businessId),
  };
}

export function createSupabaseDefaultFloorPlanSettings(businessId: string) {
  return createDefaultFloorPlanSettings(businessId);
}

