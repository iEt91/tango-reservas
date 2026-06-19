import type { FloorTable } from "@/data/types";

function nowIso() {
  return "2026-06-11T10:00:00.000Z";
}

function createTable(
  businessId: string,
  idSuffix: string,
  label: string,
  seats: number,
  x: number,
  y: number,
  width: number,
  height: number,
  shape: FloorTable["shape"],
  status: FloorTable["status"],
  isJoinable = true,
  cornerRadius = 0,
): FloorTable {
  const timestamp = nowIso();

  return {
    id: `${businessId}-${idSuffix}`,
    businessId,
    label,
    seats,
    x,
    y,
    width,
    height,
    rotation: 0,
    status,
    shape,
    cornerRadius,
    isJoinable,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const initialFloorTables: FloorTable[] = [
  createTable("biz_demuru", "table-1", "Mesa 1", 2, 96, 88, 110, 78, "round", "available"),
  createTable("biz_demuru", "table-2", "Mesa 2", 4, 292, 88, 140, 92, "rectangle", "available"),
  createTable("biz_demuru", "table-3", "Mesa 3", 4, 522, 86, 140, 92, "rectangle", "reserved"),
  createTable("biz_demuru", "table-4", "Mesa 4", 6, 96, 266, 156, 100, "rectangle", "occupied"),
  createTable("biz_demuru", "table-5", "Mesa 5", 2, 332, 268, 110, 78, "round", "available"),
  createTable("biz_demuru", "table-6", "Mesa 6", 4, 550, 270, 140, 92, "rectangle", "blocked"),

  createTable("biz_barbados", "table-1", "Deck 1", 6, 92, 90, 170, 110, "rectangle", "available"),
  createTable("biz_barbados", "table-2", "Deck 2", 8, 330, 84, 184, 118, "rectangle", "occupied"),
  createTable("biz_barbados", "table-3", "Deck 3", 8, 590, 86, 184, 118, "rectangle", "reserved"),
  createTable("biz_barbados", "table-4", "Bar 1", 4, 184, 292, 136, 88, "round", "available"),
  createTable("biz_barbados", "table-5", "Bar 2", 4, 456, 294, 136, 88, "round", "blocked"),

  createTable("biz_cafe_demo", "table-1", "Mesa A", 2, 110, 96, 108, 74, "round", "available"),
  createTable("biz_cafe_demo", "table-2", "Mesa B", 2, 290, 96, 108, 74, "round", "available"),
  createTable("biz_cafe_demo", "table-3", "Mesa C", 4, 112, 246, 134, 86, "rectangle", "reserved"),
  createTable("biz_cafe_demo", "table-4", "Mesa D", 4, 320, 244, 134, 86, "rectangle", "out_of_service"),
];

export const defaultTablePositions = {
  biz_demuru: initialFloorTables.filter((table) => table.businessId === "biz_demuru"),
  biz_barbados: initialFloorTables.filter((table) => table.businessId === "biz_barbados"),
  biz_cafe_demo: initialFloorTables.filter((table) => table.businessId === "biz_cafe_demo"),
} as const;
