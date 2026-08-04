import type {
  FloorPlanBackground,
  FloorPlanBackgroundFit,
  FloorTable,
  FloorTableShape,
  FloorTableStatus,
} from "@/data/types";
import { POSTGRES_UUID_REGEX } from "@/lib/data/business-resolution";

const FLOOR_TABLE_SHAPES = [
  "square",
  "rectangle",
  "round",
] as const satisfies readonly FloorTableShape[];

const FLOOR_TABLE_STATUSES = [
  "available",
  "blocked",
  "out_of_service",
] as const satisfies readonly FloorTableStatus[];

const FLOOR_BACKGROUND_FITS = [
  "contain",
  "cover",
  "stretch",
] as const satisfies readonly FloorPlanBackgroundFit[];

export type BusinessFloorTableDatabaseRow = {
  id: string;
  business_id: string;
  label: string;
  seats: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: FloorTableShape;
  corner_radius: number;
  status: FloorTableStatus;
  can_join: boolean;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessFloorPlanSettingsDatabaseRow = {
  business_id: string;
  background_image_url: string | null;
  background_fit: FloorPlanBackgroundFit;
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

export type BusinessReservationTableAssignmentRow = {
  business_id: string;
  reservation_id: string;
  table_id: string;
  assigned_at: string;
  assigned_by: string | null;
};

export type BusinessFloorTableEditor = {
  label: string;
  seats: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: FloorTableShape;
  cornerRadius: number;
  status: Extract<
    FloorTableStatus,
    "available" | "blocked" | "out_of_service"
  >;
  canJoin: boolean;
};

export type BusinessFloorPlanSettingsEditor = {
  backgroundImageUrl: string | null;
  backgroundFit: FloorPlanBackgroundFit;
  backgroundX: number;
  backgroundY: number;
  backgroundWidth: number;
  backgroundHeight: number;
  backgroundOpacity: number;
  backgroundBrightness: number;
  backgroundContrast: number;
};

export type BusinessReservationTableAssignment = {
  businessId: string;
  reservationId: string;
  tableIds: string[];
  assignedAt: string | null;
  assignedBy: string | null;
  totalSeats: number;
};

function assertObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} inválido.`);
  }

  return value as Record<string, unknown>;
}

function normalizeRequiredText(
  value: unknown,
  label: string,
  maximumLength: number,
) {
  if (typeof value !== "string") {
    throw new Error(`${label} inválido.`);
  }

  const normalized = value.trim();

  if (
    normalized.length < 1
    || normalized.length > maximumLength
  ) {
    throw new Error(`${label} inválido.`);
  }

  return normalized;
}

function normalizeOptionalText(
  value: unknown,
  label: string,
  maximumLength: number,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${label} inválido.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maximumLength) {
    throw new Error(`${label} inválido.`);
  }

  return normalized;
}

function normalizeNumber(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  const normalized = Number(value);

  if (
    !Number.isFinite(normalized)
    || normalized < minimum
    || normalized > maximum
  ) {
    throw new Error(`${label} inválido.`);
  }

  return normalized;
}

function normalizeInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  const normalized = normalizeNumber(
    value,
    label,
    minimum,
    maximum,
  );

  if (!Number.isInteger(normalized)) {
    throw new Error(`${label} inválido.`);
  }

  return normalized;
}

function normalizeBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} inválido.`);
  }

  return value;
}

function normalizeEnum<T extends string>(
  value: unknown,
  label: string,
  allowed: readonly T[],
): T {
  if (
    typeof value !== "string"
    || !allowed.includes(value as T)
  ) {
    throw new Error(`${label} inválido.`);
  }

  return value as T;
}

export function normalizeFloorPlanUuid(
  value: unknown,
  label: string,
): string;
export function normalizeFloorPlanUuid(
  value: unknown,
  label: string,
  options: {
    optional: true;
  },
): string | null;
export function normalizeFloorPlanUuid(
  value: unknown,
  label: string,
  options?: {
    optional?: boolean;
  },
) {
  if (
    options?.optional
    && (value === null || value === undefined || value === "")
  ) {
    return null;
  }

  if (
    typeof value !== "string"
    || !POSTGRES_UUID_REGEX.test(value.trim())
  ) {
    throw new Error(`${label} inválido.`);
  }

  return value.trim();
}

export function normalizeBusinessFloorTable(
  value: unknown,
): BusinessFloorTableEditor {
  const data = assertObject(value, "La mesa");

  return {
    label: normalizeRequiredText(
      data.label,
      "El nombre de la mesa",
      80,
    ),
    seats: normalizeInteger(
      data.seats,
      "La capacidad",
      1,
      100,
    ),
    x: normalizeNumber(
      data.x,
      "La posición horizontal",
      -10000,
      10000,
    ),
    y: normalizeNumber(
      data.y,
      "La posición vertical",
      -10000,
      10000,
    ),
    width: normalizeNumber(
      data.width,
      "El ancho",
      24,
      1000,
    ),
    height: normalizeNumber(
      data.height,
      "El alto",
      24,
      1000,
    ),
    rotation: normalizeNumber(
      data.rotation,
      "La rotación",
      -360,
      360,
    ),
    shape: normalizeEnum(
      data.shape,
      "La forma",
      FLOOR_TABLE_SHAPES,
    ),
    cornerRadius: normalizeNumber(
      data.cornerRadius,
      "El radio de las esquinas",
      0,
      100,
    ),
    status: normalizeEnum(
      data.status,
      "El estado",
      FLOOR_TABLE_STATUSES,
    ),
    canJoin: normalizeBoolean(
      data.canJoin,
      "La posibilidad de unir la mesa",
    ),
  };
}

export function normalizeBusinessFloorPlanSettings(
  value: unknown,
): BusinessFloorPlanSettingsEditor {
  const data = assertObject(
    value,
    "La configuración del plano",
  );

  return {
    backgroundImageUrl: normalizeOptionalText(
      data.backgroundImageUrl,
      "La imagen de fondo",
      2048,
    ),
    backgroundFit: normalizeEnum(
      data.backgroundFit,
      "El ajuste del fondo",
      FLOOR_BACKGROUND_FITS,
    ),
    backgroundX: normalizeNumber(
      data.backgroundX,
      "La posición horizontal del fondo",
      -10000,
      10000,
    ),
    backgroundY: normalizeNumber(
      data.backgroundY,
      "La posición vertical del fondo",
      -10000,
      10000,
    ),
    backgroundWidth: normalizeNumber(
      data.backgroundWidth,
      "El ancho del fondo",
      100,
      10000,
    ),
    backgroundHeight: normalizeNumber(
      data.backgroundHeight,
      "El alto del fondo",
      100,
      10000,
    ),
    backgroundOpacity: normalizeNumber(
      data.backgroundOpacity,
      "La opacidad del fondo",
      0,
      100,
    ),
    backgroundBrightness: normalizeNumber(
      data.backgroundBrightness,
      "El brillo del fondo",
      0,
      100,
    ),
    backgroundContrast: normalizeNumber(
      data.backgroundContrast,
      "El contraste del fondo",
      0,
      100,
    ),
  };
}

export function normalizeBusinessFloorTableIds(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    throw new Error("Las mesas asignadas son inválidas.");
  }

  const normalized = value.map((entry) =>
    normalizeFloorPlanUuid(entry, "La mesa"),
  );
  const unique = [...new Set(normalized)];

  if (unique.length > 20) {
    throw new Error(
      "Una reserva no puede usar más de 20 mesas.",
    );
  }

  return unique;
}

export function toBusinessFloorTableRpcPayload(
  table: BusinessFloorTableEditor,
) {
  return {
    label: table.label,
    seats: table.seats,
    x: table.x,
    y: table.y,
    width: table.width,
    height: table.height,
    rotation: table.rotation,
    shape: table.shape,
    corner_radius: table.cornerRadius,
    status: table.status,
    can_join: table.canJoin,
  };
}

export function toBusinessFloorPlanSettingsRpcPayload(
  settings: BusinessFloorPlanSettingsEditor,
) {
  return {
    background_image_url: settings.backgroundImageUrl,
    background_fit: settings.backgroundFit,
    background_x: settings.backgroundX,
    background_y: settings.backgroundY,
    background_width: settings.backgroundWidth,
    background_height: settings.backgroundHeight,
    background_opacity: settings.backgroundOpacity,
    background_brightness: settings.backgroundBrightness,
    background_contrast: settings.backgroundContrast,
  };
}

export function mapBusinessFloorTableRow(
  row: BusinessFloorTableDatabaseRow,
): FloorTable {
  return {
    id: row.id,
    businessId: row.business_id,
    label: row.label,
    seats: row.seats,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    rotation: row.rotation,
    status: row.status,
    shape: row.shape,
    cornerRadius: row.corner_radius,
    isJoinable: row.can_join,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBusinessFloorPlanSettingsRow(
  row: BusinessFloorPlanSettingsDatabaseRow,
): FloorPlanBackground {
  return {
    businessId: row.business_id,
    backgroundImage: row.background_image_url,
    backgroundOpacity: row.background_opacity,
    backgroundBrightness: row.background_brightness,
    backgroundContrast: row.background_contrast,
    backgroundX: row.background_x,
    backgroundY: row.background_y,
    backgroundWidth: row.background_width,
    backgroundHeight: row.background_height,
    fit: row.background_fit,
    updatedAt: row.updated_at,
  };
}

export function createDefaultBusinessFloorPlanSettings(
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
    updatedAt: new Date(0).toISOString(),
  };
}

export function mapBusinessReservationTableAssignment(
  value: unknown,
): BusinessReservationTableAssignment {
  const data = assertObject(
    value,
    "La asignación de mesas",
  );
  const tableIds = normalizeBusinessFloorTableIds(
    data.table_ids,
  );

  return {
    businessId: normalizeFloorPlanUuid(
      data.business_id,
      "El negocio",
    ),
    reservationId: normalizeFloorPlanUuid(
      data.reservation_id,
      "La reserva",
    ),
    tableIds,
    assignedAt:
      typeof data.assigned_at === "string"
        ? data.assigned_at
        : null,
    assignedBy:
      typeof data.assigned_by === "string"
        ? data.assigned_by
        : null,
    totalSeats: normalizeNumber(
      data.total_seats ?? 0,
      "La capacidad asignada",
      0,
      2000,
    ),
  };
}
