import type { FloorTable, FloorTableShape } from "@/data/types";

export const FLOOR_TABLE_SHAPE_OPTIONS: Array<{
  value: FloorTableShape;
  label: string;
}> = [
  { value: "square", label: "Cuadrada" },
  { value: "rectangle", label: "Rectangular" },
  { value: "round", label: "Redonda" },
];

export const TABLE_MIN_WIDTH = 70;
export const TABLE_MIN_HEIGHT = 50;
export const TABLE_DEFAULT_CORNER_RADIUS = 0;
export const TABLE_MAX_CORNER_RADIUS = 64;

export function clampTableCornerRadius(value: number | null | undefined) {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return TABLE_DEFAULT_CORNER_RADIUS;
  }

  return Math.max(0, Math.min(Number(value), TABLE_MAX_CORNER_RADIUS));
}

export function normalizeTableDimensions(
  shape: FloorTableShape,
  width: number,
  height: number,
) {
  const safeWidth = Math.max(TABLE_MIN_WIDTH, Math.round(Number(width) || TABLE_MIN_WIDTH));
  const safeHeight = Math.max(TABLE_MIN_HEIGHT, Math.round(Number(height) || TABLE_MIN_HEIGHT));

  if (shape === "square") {
    const size = Math.max(safeWidth, safeHeight);
    return {
      width: size,
      height: size,
    };
  }

  return {
    width: safeWidth,
    height: safeHeight,
  };
}

export function getTableBorderRadius(table: Pick<FloorTable, "shape" | "cornerRadius">) {
  if (table.shape === "round") {
    return "9999px";
  }

  return `${clampTableCornerRadius(table.cornerRadius)}px`;
}
