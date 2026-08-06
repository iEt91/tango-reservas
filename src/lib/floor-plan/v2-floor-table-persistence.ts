export type V2PhysicalTableStatus =
  | "available"
  | "blocked"
  | "out_of_service";

export type V2PersistableFloorTable = {
  id: string;
  name: string;
  capacity: number;
  status:
    | "available"
    | "reserved"
    | "occupied"
    | "blocked";
  shape: "round" | "square" | "rectangle";
  zoneId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  physicalStatus?: V2PhysicalTableStatus;
  cornerRadius?: number;
  canJoin?: boolean;
  locked?: boolean;
  isDraft?: boolean;
};

function normalizeTableLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getDefaultCornerRadius(
  shape: V2PersistableFloorTable["shape"],
) {
  if (shape === "round") {
    return 50;
  }

  if (shape === "rectangle") {
    return 16;
  }

  return 12;
}

export function getV2FloorTablePhysicalStatus(
  table: V2PersistableFloorTable,
): V2PhysicalTableStatus {
  if (
    table.physicalStatus === "available"
    || table.physicalStatus === "blocked"
    || table.physicalStatus === "out_of_service"
  ) {
    return table.physicalStatus;
  }

  return table.status === "blocked"
    ? "blocked"
    : "available";
}

export function toBusinessFloorTableActionInput(
  table: V2PersistableFloorTable,
) {
  return {
    label: table.name.trim() || "Mesa sin nombre",
    seats: Math.max(
      Math.min(
        Math.trunc(Number(table.capacity) || 1),
        100,
      ),
      1,
    ),
    x: Number(table.x) || 0,
    y: Number(table.y) || 0,
    width: Math.max(Number(table.width) || 84, 24),
    height: Math.max(Number(table.height) || 84, 24),
    rotation: Number(table.rotation) || 0,
    shape: table.shape,
    cornerRadius:
      typeof table.cornerRadius === "number"
        ? table.cornerRadius
        : getDefaultCornerRadius(table.shape),
    status: getV2FloorTablePhysicalStatus(table),
    canJoin: table.canJoin ?? true,
  };
}

export function createPersistentFloorTableDraft(
  tables: V2PersistableFloorTable[],
): V2PersistableFloorTable {
  const activeLabels = new Set(
    tables.map((table) =>
      normalizeTableLabel(table.name),
    ),
  );
  let number = tables.length + 1;

  while (
    activeLabels.has(
      normalizeTableLabel(`Mesa ${number}`),
    )
  ) {
    number += 1;
  }

  return {
    id: `draft-${Date.now()}`,
    name: `Mesa ${number}`,
    capacity: 2,
    status: "available",
    physicalStatus: "available",
    shape: "round",
    zoneId: "main",
    x: 18 + (number % 6) * 9,
    y: 24 + (number % 4) * 12,
    width: 84,
    height: 84,
    rotation: 0,
    cornerRadius: 50,
    canJoin: true,
    locked: false,
    isDraft: true,
  };
}

export function replaceAssignedTableLabel(
  currentValue: string,
  previousLabel: string,
  nextLabel: string,
) {
  const previous = normalizeTableLabel(previousLabel);
  let changed = false;
  const labels = currentValue
    .split("+")
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => {
      if (normalizeTableLabel(label) !== previous) {
        return label;
      }

      changed = true;
      return nextLabel;
    });

  return changed
    ? labels.join(" + ")
    : currentValue;
}

const FLOOR_TABLE_GEOMETRY_KEYS = [
  "x",
  "y",
  "width",
  "height",
  "rotation",
] as const satisfies readonly (
  keyof Pick<
    V2PersistableFloorTable,
    "x" | "y" | "width" | "height" | "rotation"
  >
)[];

export function hasV2FloorTableGeometryChanged(
  previousTable: V2PersistableFloorTable,
  nextTable: V2PersistableFloorTable,
) {
  return FLOOR_TABLE_GEOMETRY_KEYS.some(
    (key) =>
      Math.abs(
        Number(previousTable[key])
        - Number(nextTable[key]),
      ) > 0.0001,
  );
}
