import type {
  FloorPlanBackground,
  FloorTable,
} from "@/data/types";
import {
  clampTableCornerRadius,
  normalizeTableDimensions,
  TABLE_DEFAULT_CORNER_RADIUS,
} from "@/components/local-floor-plan/table-geometry";
import { POSTGRES_UUID_REGEX } from "@/lib/data/business-resolution";
import { getSupabaseReadClient } from "@/lib/supabase/read-client";

export type SupabaseFloorTableRow = {
  id: string;
  business_id: string;
  label: string;
  seats: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: string;
  corner_radius: number;
  status: string;
  can_join: boolean;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SupabaseFloorPlanSettingsRow = {
  business_id: string;
  background_image_url: string | null;
  background_fit: string;
  background_x: number;
  background_y: number;
  background_width: number;
  background_height: number;
  background_opacity: number;
  background_brightness: number;
  background_contrast: number;
  created_at: string;
  updated_at: string;
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
  Pick<
    FloorPlanCombination,
    "label" | "tableIds" | "seatsTotal" | "isActive"
  >
> & {
  tableIds?: string[];
};

const FLOOR_TABLE_SELECT =
  "id, business_id, label, seats, x, y, width, height, rotation, shape, corner_radius, status, can_join, is_active, archived_at, created_at, updated_at" as const;

const FLOOR_PLAN_SETTINGS_SELECT =
  "business_id, background_image_url, background_fit, background_x, background_y, background_width, background_height, background_opacity, background_brightness, background_contrast, created_at, updated_at" as const;

const CHANGE_EVENT = "floor-plan";

const floorTablesCache = new Map<
  string,
  FloorTable[]
>();
const floorPlanSettingsCache = new Map<
  string,
  FloorPlanBackground
>();
const loadedBusinesses = new Set<string>();
const loadingBusinesses = new Map<
  string,
  Promise<void>
>();

function isBrowser() {
  return typeof window !== "undefined";
}

function getSupabaseClientOrThrow() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    throw new Error(
      "Faltan variables de entorno de Supabase.",
    );
  }

  return supabase;
}

function assertSupabaseUuid(
  value: string,
  field: string,
) {
  const trimmed = value.trim();

  if (!POSTGRES_UUID_REGEX.test(trimmed)) {
    throw new Error(
      `${field} inválido para Supabase: se esperaba UUID.`,
    );
  }

  return trimmed;
}

function nowIso() {
  return new Date().toISOString();
}

function toNumber(
  value: number | null | undefined,
  fallback: number,
) {
  return typeof value === "number"
    && Number.isFinite(value)
    ? value
    : fallback;
}

function normalizeTableShape(
  shape: string | null | undefined,
): FloorTable["shape"] {
  if (shape === "round") {
    return "round";
  }

  if (
    shape === "rectangle"
    || shape === "rectangular"
  ) {
    return "rectangle";
  }

  return "square";
}

function normalizeTableStatus(
  value: string | null | undefined,
): FloorTable["status"] {
  if (
    value === "blocked"
    || value === "out_of_service"
  ) {
    return value;
  }

  return "available";
}

function normalizeBackgroundFit(
  value: string | null | undefined,
): FloorPlanBackground["fit"] {
  if (value === "contain" || value === "cover") {
    return value;
  }

  return "stretch";
}

function createDefaultFloorPlanSettings(
  businessId: string,
): FloorPlanBackground {
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

function cloneTable(table: FloorTable) {
  return {
    ...table,
  };
}

function cloneTables(tables: FloorTable[]) {
  return tables.map(cloneTable);
}

function cloneSettings(
  settings: FloorPlanBackground,
) {
  return {
    ...settings,
  };
}

function dispatchChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function unsupportedFloorPlanMutation(): never {
  throw new Error(
    "Las escrituras del plano requieren una Server Action autenticada.",
  );
}

function unsupportedCombinationMutation(): never {
  throw new Error(
    "Las combinaciones persistentes de mesas todavía no forman parte del contrato Supabase.",
  );
}

export function mapSupabaseFloorTableToFloorTable(
  row: SupabaseFloorTableRow,
): FloorTable {
  const shape = normalizeTableShape(row.shape);
  const dimensions = normalizeTableDimensions(
    shape,
    toNumber(row.width, 130),
    toNumber(row.height, 90),
  );

  return {
    id: row.id,
    businessId: row.business_id,
    label: row.label,
    seats: Math.max(
      1,
      Math.round(toNumber(row.seats, 4)),
    ),
    x: toNumber(row.x, 80),
    y: toNumber(row.y, 80),
    width: dimensions.width,
    height: dimensions.height,
    rotation: toNumber(row.rotation, 0),
    status: normalizeTableStatus(row.status),
    shape,
    cornerRadius: clampTableCornerRadius(
      row.corner_radius
      ?? TABLE_DEFAULT_CORNER_RADIUS,
    ),
    isJoinable: row.can_join,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapFloorTableInputToSupabaseRow(
  data: FloorTableInput,
  options: {
    businessId: string;
  },
) {
  const shape = normalizeTableShape(data.shape);
  const dimensions = normalizeTableDimensions(
    shape,
    data.width ?? 130,
    data.height ?? 90,
  );

  return {
    business_id: assertSupabaseUuid(
      options.businessId,
      "businessId",
    ),
    label:
      data.label?.trim()
      || "Nueva mesa",
    seats: Math.max(
      1,
      Math.round(Number(data.seats) || 4),
    ),
    x: Number.isFinite(Number(data.x))
      ? Number(data.x)
      : 80,
    y: Number.isFinite(Number(data.y))
      ? Number(data.y)
      : 80,
    width: dimensions.width,
    height: dimensions.height,
    rotation: Number.isFinite(
      Number(data.rotation),
    )
      ? Number(data.rotation)
      : 0,
    shape,
    corner_radius: clampTableCornerRadius(
      data.cornerRadius
      ?? TABLE_DEFAULT_CORNER_RADIUS,
    ),
    status: normalizeTableStatus(data.status),
    can_join: data.isJoinable ?? true,
  };
}

export function mapSupabaseFloorPlanSettingsToFloorPlanSettings(
  row: SupabaseFloorPlanSettingsRow,
): FloorPlanBackground {
  return {
    businessId: row.business_id,
    backgroundImage:
      row.background_image_url ?? null,
    backgroundOpacity: Math.max(
      0,
      Math.min(
        100,
        toNumber(row.background_opacity, 50),
      ),
    ),
    backgroundBrightness: Math.max(
      0,
      Math.min(
        100,
        toNumber(
          row.background_brightness,
          100,
        ),
      ),
    ),
    backgroundContrast: Math.max(
      0,
      Math.min(
        100,
        toNumber(
          row.background_contrast,
          100,
        ),
      ),
    ),
    backgroundX: toNumber(row.background_x, 0),
    backgroundY: toNumber(row.background_y, 0),
    backgroundWidth: Math.max(
      100,
      toNumber(row.background_width, 1000),
    ),
    backgroundHeight: Math.max(
      100,
      toNumber(row.background_height, 600),
    ),
    fit: normalizeBackgroundFit(
      row.background_fit,
    ),
    updatedAt: row.updated_at,
  };
}

export function mapFloorPlanSettingsInputToSupabaseRow(
  data: FloorPlanSettingsInput,
  businessId: string,
) {
  return {
    business_id: assertSupabaseUuid(
      businessId,
      "businessId",
    ),
    background_image_url:
      data.backgroundImage ?? null,
    background_fit:
      data.fit ?? "stretch",
    background_x: Number.isFinite(
      Number(data.backgroundX),
    )
      ? Number(data.backgroundX)
      : 0,
    background_y: Number.isFinite(
      Number(data.backgroundY),
    )
      ? Number(data.backgroundY)
      : 0,
    background_width: Math.max(
      100,
      Number(data.backgroundWidth ?? 1000),
    ),
    background_height: Math.max(
      100,
      Number(data.backgroundHeight ?? 600),
    ),
    background_opacity: Math.max(
      0,
      Math.min(
        100,
        Number(data.backgroundOpacity ?? 50),
      ),
    ),
    background_brightness: Math.max(
      0,
      Math.min(
        100,
        Number(
          data.backgroundBrightness ?? 100,
        ),
      ),
    ),
    background_contrast: Math.max(
      0,
      Math.min(
        100,
        Number(data.backgroundContrast ?? 100),
      ),
    ),
  };
}

export function mapSupabaseTableCombinationToTableCombination(
  row: SupabaseTableCombinationRow,
): FloorPlanCombination {
  return {
    id: row.id,
    businessId: row.business_id,
    label: row.label,
    tableIds: Array.isArray(row.table_ids)
      ? row.table_ids.filter(
          (entry): entry is string =>
            typeof entry === "string",
        )
      : [],
    seatsTotal: Math.max(
      0,
      Math.round(row.seats_total ?? 0),
    ),
    isActive: row.is_active ?? true,
    createdAt: row.created_at ?? nowIso(),
    updatedAt:
      row.updated_at
      ?? row.created_at
      ?? nowIso(),
  };
}

export function mapTableCombinationInputToSupabaseRow(
  data: TableCombinationInput,
  businessId: string,
) {
  return {
    business_id: assertSupabaseUuid(
      businessId,
      "businessId",
    ),
    label:
      data.label?.trim()
      || "Nueva combinación",
    table_ids: data.tableIds ?? [],
    seats_total: Math.max(
      0,
      Math.round(data.seatsTotal ?? 0),
    ),
    is_active: data.isActive ?? true,
  };
}

async function readFloorTables(
  businessId: string,
) {
  const supabase = getSupabaseClientOrThrow();
  const safeBusinessId = assertSupabaseUuid(
    businessId,
    "businessId",
  );
  const { data, error } = await supabase
    .schema("public")
    .from("floor_tables")
    .select(FLOOR_TABLE_SELECT)
    .eq("business_id", safeBusinessId)
    .eq("is_active", true)
    .order("label", { ascending: true });

  if (error) {
    throw new Error(
      "No se pudieron leer las mesas desde Supabase.",
    );
  }

  return (
    data ?? []
  ) as unknown as SupabaseFloorTableRow[];
}

async function readFloorPlanSettings(
  businessId: string,
) {
  const supabase = getSupabaseClientOrThrow();
  const safeBusinessId = assertSupabaseUuid(
    businessId,
    "businessId",
  );
  const { data, error } = await supabase
    .schema("public")
    .from("floor_plan_settings")
    .select(FLOOR_PLAN_SETTINGS_SELECT)
    .eq("business_id", safeBusinessId)
    .maybeSingle();

  if (error) {
    throw new Error(
      "No se pudo leer la configuración del plano desde Supabase.",
    );
  }

  return (
    data as unknown as
      | SupabaseFloorPlanSettingsRow
      | null
  ) ?? null;
}

async function refreshCacheForBusiness(
  businessId: string,
) {
  const [tables, settings] = await Promise.all([
    readFloorTables(businessId),
    readFloorPlanSettings(businessId),
  ]);

  floorTablesCache.set(
    businessId,
    tables.map(
      mapSupabaseFloorTableToFloorTable,
    ),
  );
  floorPlanSettingsCache.set(
    businessId,
    settings
      ? mapSupabaseFloorPlanSettingsToFloorPlanSettings(
          settings,
        )
      : createDefaultFloorPlanSettings(
          businessId,
        ),
  );
  loadedBusinesses.add(businessId);
  dispatchChange();
}

function ensureLoaded(businessId: string) {
  if (
    !businessId
    || loadedBusinesses.has(businessId)
    || loadingBusinesses.has(businessId)
  ) {
    return;
  }

  void refreshSupabaseFloorPlanForBusiness(
    businessId,
  );
}

export function subscribeSupabaseFloorPlan(
  listener: () => void,
) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleChange = () => listener();

  window.addEventListener(
    CHANGE_EVENT,
    handleChange,
  );

  return () =>
    window.removeEventListener(
      CHANGE_EVENT,
      handleChange,
    );
}

export async function refreshSupabaseFloorPlanForBusiness(
  businessId: string,
) {
  if (!businessId) {
    return [];
  }

  const existing = loadingBusinesses.get(
    businessId,
  );

  if (existing) {
    await existing;
    return getSupabaseFloorTablesByBusinessSync(
      businessId,
    );
  }

  const promise = refreshCacheForBusiness(
    businessId,
  );

  loadingBusinesses.set(
    businessId,
    promise,
  );

  try {
    await promise;
  } finally {
    loadingBusinesses.delete(businessId);
  }

  return getSupabaseFloorTablesByBusinessSync(
    businessId,
  );
}

export function getSupabaseFloorTablesByBusinessSync(
  businessId: string,
) {
  ensureLoaded(businessId);

  return cloneTables(
    floorTablesCache.get(businessId) ?? [],
  );
}

export async function getSupabaseFloorTablesByBusiness(
  businessId: string,
) {
  await refreshSupabaseFloorPlanForBusiness(
    businessId,
  );

  return getSupabaseFloorTablesByBusinessSync(
    businessId,
  );
}

export function getSupabaseFloorPlanSettingsSync(
  businessId: string,
) {
  ensureLoaded(businessId);

  return cloneSettings(
    floorPlanSettingsCache.get(businessId)
    ?? createDefaultFloorPlanSettings(
      businessId,
    ),
  );
}

export async function getSupabaseFloorPlanSettings(
  businessId: string,
) {
  await refreshSupabaseFloorPlanForBusiness(
    businessId,
  );

  return getSupabaseFloorPlanSettingsSync(
    businessId,
  );
}

export async function upsertSupabaseFloorPlanSettings(
  _businessId: string,
  _data: FloorPlanSettingsInput,
): Promise<never> {
  void _businessId;
  void _data;
  return unsupportedFloorPlanMutation();
}

export async function updateSupabaseFloorPlanSettings(
  _businessId: string,
  _data: FloorPlanSettingsInput,
): Promise<never> {
  void _businessId;
  void _data;
  return unsupportedFloorPlanMutation();
}

export async function createSupabaseFloorTable(
  _businessId: string,
  _data: FloorTableInput,
): Promise<never> {
  void _businessId;
  void _data;
  return unsupportedFloorPlanMutation();
}

export async function updateSupabaseFloorTable(
  _tableId: string,
  _data: FloorTableInput,
): Promise<never> {
  void _tableId;
  void _data;
  return unsupportedFloorPlanMutation();
}

export async function updateSupabaseFloorTablePosition(
  _tableId: string,
  _x: number,
  _y: number,
): Promise<never> {
  void _tableId;
  void _x;
  void _y;
  return unsupportedFloorPlanMutation();
}

export async function updateSupabaseFloorTableStatus(
  _tableId: string,
  _status: FloorTable["status"],
): Promise<never> {
  void _tableId;
  void _status;
  return unsupportedFloorPlanMutation();
}

export async function deleteSupabaseFloorTable(
  _tableId: string,
): Promise<never> {
  void _tableId;
  return unsupportedFloorPlanMutation();
}

export async function getSupabaseTableCombinationsByBusiness(
  _businessId: string,
) {
  void _businessId;
  return [] as FloorPlanCombination[];
}

export function getSupabaseTableCombinationsByBusinessSync(
  _businessId: string,
) {
  void _businessId;
  return [] as FloorPlanCombination[];
}

export async function createSupabaseTableCombination(
  _businessId: string,
  _data: TableCombinationInput,
): Promise<never> {
  void _businessId;
  void _data;
  return unsupportedCombinationMutation();
}

export async function updateSupabaseTableCombination(
  _combinationId: string,
  _data: TableCombinationInput,
): Promise<never> {
  void _combinationId;
  void _data;
  return unsupportedCombinationMutation();
}

export async function deleteSupabaseTableCombination(
  _combinationId: string,
): Promise<never> {
  void _combinationId;
  return unsupportedCombinationMutation();
}

export async function setSupabaseTableCombinationActive(
  _combinationId: string,
  _isActive: boolean,
): Promise<never> {
  void _combinationId;
  void _isActive;
  return unsupportedCombinationMutation();
}

export async function getSupabaseFloorPlanByBusiness(
  businessId: string,
) {
  await refreshSupabaseFloorPlanForBusiness(
    businessId,
  );

  return {
    tables:
      getSupabaseFloorTablesByBusinessSync(
        businessId,
      ),
    settings:
      getSupabaseFloorPlanSettingsSync(
        businessId,
      ),
    combinations: [] as FloorPlanCombination[],
  };
}

export function createSupabaseDefaultFloorPlanSettings(
  businessId: string,
) {
  return createDefaultFloorPlanSettings(
    businessId,
  );
}
