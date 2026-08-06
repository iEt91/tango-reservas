export type V2AssignmentTableOption = {
  id: string;
  name: string;
  capacity: number;
  status:
    | "available"
    | "reserved"
    | "occupied"
    | "blocked";
  locked?: boolean;
  canJoin?: boolean;
};

type V2AssignmentTableSelectionResult =
  | {
      ok: true;
      tableIds: string[];
    }
  | {
      ok: false;
      error: string;
    };

export function getV2AssignmentTables<
  Table extends V2AssignmentTableOption,
>(
  tables: readonly Table[],
  tableIds: readonly string[],
) {
  const selectedIds = new Set(tableIds);

  return tables.filter((table) =>
    selectedIds.has(table.id),
  );
}

export function getV2AssignmentCapacity(
  tables: readonly V2AssignmentTableOption[],
) {
  return tables.reduce(
    (total, table) =>
      total + Math.max(Number(table.capacity) || 0, 0),
    0,
  );
}

export function getV2AssignmentLabel(
  tables: readonly V2AssignmentTableOption[],
) {
  return tables
    .map((table) => table.name.trim())
    .filter(Boolean)
    .join(" + ");
}

export function toggleV2AssignmentTableSelection({
  tables,
  selectedTableIds,
  tableId,
  allowTableCombinations,
}: {
  tables: readonly V2AssignmentTableOption[];
  selectedTableIds: readonly string[];
  tableId: string;
  allowTableCombinations: boolean;
}): V2AssignmentTableSelectionResult {
  const selectedTables = getV2AssignmentTables(
    tables,
    selectedTableIds,
  );
  const candidate = tables.find(
    (table) => table.id === tableId,
  );

  if (!candidate) {
    return {
      ok: false,
      error: "No se encontró la mesa seleccionada.",
    };
  }

  if (
    candidate.status !== "available"
    || candidate.locked
  ) {
    return {
      ok: false,
      error: "La mesa seleccionada no está disponible.",
    };
  }

  if (selectedTableIds.includes(tableId)) {
    if (selectedTables.length <= 1) {
      return {
        ok: false,
        error: "La asignación debe conservar al menos una mesa.",
      };
    }

    return {
      ok: true,
      tableIds: selectedTableIds.filter(
        (selectedId) => selectedId !== tableId,
      ),
    };
  }

  if (selectedTables.length >= 20) {
    return {
      ok: false,
      error: "Una reserva no puede usar más de 20 mesas.",
    };
  }

  if (
    selectedTables.length > 0
    && !allowTableCombinations
  ) {
    return {
      ok: false,
      error:
        "Las combinaciones de mesas están desactivadas en Configuración.",
    };
  }

  if (
    selectedTables.length > 0
    && (
      candidate.canJoin !== true
      || selectedTables.some(
        (table) => table.canJoin !== true,
      )
    )
  ) {
    return {
      ok: false,
      error:
        "Una de las mesas seleccionadas no admite combinaciones.",
    };
  }

  return {
    ok: true,
    tableIds: [
      ...new Set([
        ...selectedTableIds,
        tableId,
      ]),
    ],
  };
}
