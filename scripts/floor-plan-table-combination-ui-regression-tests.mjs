import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  ui: "src/app/local/plano/v2-plano-page.tsx",
  actions: "src/app/local/plano/actions.ts",
  cutover:
    "src/lib/floor-plan/v2-floor-plan-cutover.ts",
  helper:
    "src/lib/floor-plan/v2-floor-table-combination.ts",
  migration:
    "supabase/migrations/20260804_010_floor_plan_write_rpc.sql",
  package: "package.json",
  docs:
    "docs/database/FLOOR-PLAN-TABLE-COMBINATION-UI-CUTOVER.md",
};

const sources = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(
      async ([key, path]) => [
        key,
        await readFile(path, "utf8"),
      ],
    ),
  ),
);

const checks = [];

function check(label, assertion) {
  assert.ok(assertion, label);
  checks.push(label);
  console.log(`✓ ${label}`);
}

console.log(
  "Ejecutando regresión de combinaciones persistentes de mesas...",
);

check(
  "el snapshot expone la regla de combinaciones",
  sources.cutover.includes(
    "allowTableCombinations: boolean",
  )
    && sources.cutover.includes(
      "reservationSettings?.allowTableCombinations",
    )
    && sources.ui.includes(
      "allowTableCombinations: boolean",
    ),
);

check(
  "Supabase falla cerrado si falta la regla persistente",
  sources.cutover.includes(
    "reservationSettings?.allowTableCombinations",
  )
    && sources.cutover.includes(
      "?? false",
    ),
);

check(
  "el fallback local conserva combinaciones",
  sources.ui.includes(
    "allowTableCombinations: true",
  )
    && sources.ui.includes(
      "allowTableCombinations: Boolean(",
    ),
);

check(
  "la UI usa un helper específico de selección",
  sources.ui.includes(
    "getV2AssignmentTables",
  )
    && sources.ui.includes(
      "getV2AssignmentCapacity",
    )
    && sources.ui.includes(
      "getV2AssignmentLabel",
    )
    && sources.ui.includes(
      "toggleV2AssignmentTableSelection",
    ),
);

check(
  "la selección comienza con la mesa activa",
  sources.ui.includes(
    "setSelectedAssignmentTableIds([",
  )
    && sources.ui.includes(
      "selectedTable.id,",
    ),
);

check(
  "la selección conserva al menos una mesa",
  sources.helper.includes(
    "La asignación debe conservar al menos una mesa.",
  )
    && sources.helper.includes(
      "selectedTables.length <= 1",
    ),
);

check(
  "la configuración impide combinaciones cuando está desactivada",
  sources.helper.includes(
    "!allowTableCombinations",
  )
    && sources.helper.includes(
      "Las combinaciones de mesas están desactivadas",
    ),
);

check(
  "todas las mesas combinadas deben admitir unión",
  sources.helper.includes(
    "candidate.canJoin !== true",
  )
    && sources.helper.includes(
      "table.canJoin !== true",
    ),
);

check(
  "mesas ocupadas bloqueadas o reservadas fallan cerrado",
  sources.helper.includes(
    'candidate.status !== "available"',
  )
    && sources.helper.includes(
      "candidate.locked",
    ),
);

check(
  "la capacidad se calcula sobre todas las mesas",
  sources.helper.includes(
    "getV2AssignmentCapacity",
  )
    && sources.helper.includes(
      "total + Math.max(Number(table.capacity)",
    )
    && sources.ui.includes(
      "selectedAssignmentCapacity",
    ),
);

check(
  "los conflictos se comprueban mesa por mesa",
  sources.ui.includes(
    "selectedAssignmentTables.find((table) =>",
  )
    && sources.ui.includes(
      "findTableConflict(",
    ),
);

check(
  "la acción recibe el arreglo de UUID seleccionado",
  sources.ui.includes(
    "tableIds:",
  )
    && sources.ui.includes(
      "selectedAssignmentTableIds,",
    )
    && sources.ui.includes(
      "reservationId,",
    ),
);

check(
  "la etiqueta combinada se conserva en el snapshot cliente",
  sources.ui.includes(
    "selectedAssignmentLabel",
  )
    && sources.helper.includes(
      '.join(" + ")',
    )
    && sources.ui.includes(
      "tableName:",
    )
    && sources.ui.includes(
      "selectedAssignmentLabel,",
    ),
);

check(
  "liberar elimina todas las asignaciones sin borrar la reserva",
  sources.ui.includes(
    "tableIds: []",
  )
    && sources.ui.includes(
      'tableName: ""',
    )
    && sources.ui.includes(
      "La reserva quedó sin mesas asignadas.",
    ),
);

check(
  "el modal muestra mesas capacidad y regla",
  sources.ui.includes(
    "Mesas seleccionadas",
  )
    && sources.ui.includes(
      "selectedAssignmentTables.length",
    )
    && sources.ui.includes(
      "selectedAssignmentCapacity",
    )
    && sources.ui.includes(
      "Combinaciones desactivadas",
    ),
);

check(
  "las asignaciones múltiples previenen dobles envíos",
  sources.ui.includes(
    "isAssignmentMutating",
  )
    && sources.ui.includes(
      "setIsAssignmentMutating(true)",
    )
    && sources.ui.includes(
      "setIsAssignmentMutating(false)",
    ),
);

check(
  "el editor permite configurar canJoin",
  sources.ui.includes(
    'label="Permitir unir con otras mesas"',
  )
    && sources.ui.includes(
      "editingTable.canJoin === false",
    )
    && sources.ui.includes(
      "canJoin:",
    )
    && sources.ui.includes(
      'event.target.value === "enabled"',
    )
    && sources.ui.includes(
      '<option value="disabled">No permitido</option>',
    ),
);

check(
  "bloquear una mesa asignada devuelve un mensaje específico",
  sources.actions.includes(
    'type FloorPlanMutationContext =',
  )
    && sources.actions.includes(
      'context: FloorPlanMutationContext',
    )
    && sources.actions.includes(
      'context === "table"',
    )
    && sources.actions.includes(
      "La mesa tiene una reserva activa y no puede bloquearse ni marcarse fuera de servicio.",
    )
    && sources.actions.includes(
      '"table",',
    ),
);

check(
  "la Server Action conserva roles tenant y RPC",
  sources.actions.includes(
    '"owner"',
  )
    && sources.actions.includes(
      '"admin"',
    )
    && sources.actions.includes(
      '"staff"',
    )
    && sources.actions.includes(
      '"set_business_reservation_tables"',
    )
    && sources.actions.includes(
      "p_table_ids: tableIds",
    ),
);

check(
  "PostgreSQL valida regla unión capacidad y disponibilidad",
  sources.migration.includes(
    "allow_table_combinations",
  )
    && sources.migration.includes(
      "joinable_count <> expected_count",
    )
    && sources.migration.includes(
      "total_seats < reservation_row.party_size",
    )
    && sources.migration.includes(
      "overlapping reservation",
    ),
);

check(
  "la unión visual permanece bloqueada",
  sources.ui.includes(
    "La unión visual, la restauración y el fondo continúan bloqueados.",
  )
    && sources.ui.includes(
      "function startMergeMode",
    )
    && sources.ui.includes(
      "disabled={\n                            isSupabasePersistence ||",
    ),
);

check(
  "el navegador no introduce DML directo",
  !sources.ui.includes("createClient(")
    && !sources.ui.includes(
      '.from("reservation_table_assignments")',
    )
    && !sources.ui.includes(".insert(")
    && !sources.ui.includes(".update(")
    && !sources.ui.includes(".delete("),
);

const packageJson = JSON.parse(
  sources.package,
);

check(
  "la regresión E24 está integrada al QA",
  packageJson.scripts[
    "test:floor-plan-table-combination-ui"
  ]
    ===
    "node scripts/floor-plan-table-combination-ui-regression-tests.mjs"
    && packageJson.scripts[
      "test:regression"
    ].includes(
      "npm run test:floor-plan-table-combination-ui",
    ),
);

check(
  "la documentación delimita operación seguridad y prueba manual",
  sources.docs.includes(
    "La combinación es operativa",
  )
    && sources.docs.includes(
      "La unión visual",
    )
    && sources.docs.includes(
      "No volver a aplicar la migración `010`",
    )
    && sources.docs.includes(
      "staging:cleanup-isolation",
    ),
);

console.log(
  `Todos los casos de combinaciones persistentes pasaron (${checks.length}).`,
);
