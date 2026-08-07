import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  page: "src/app/local/plano/page.tsx",
  ui: "src/app/local/plano/v2-plano-page.tsx",
  actions: "src/app/local/plano/actions.ts",
  cutover:
    "src/lib/floor-plan/v2-floor-plan-cutover.ts",
  persistence:
    "src/lib/floor-plan/v2-floor-table-persistence.ts",
  package: "package.json",
  docs:
    "docs/database/FLOOR-PLAN-TABLE-ADMIN-UI-CUTOVER.md",
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
  "Ejecutando regresión de administración persistente de mesas...",
);

check(
  "la página conserva lectura y asignaciones persistentes",
  sources.page.includes(
    'floorPlanPersistence="supabase"',
  )
    && sources.page.includes(
      "canAssignFloorPlan={canAssignFloorPlan}",
    ),
);

check(
  "owner y admin reciben permiso de administrar mesas",
  sources.page.includes(
    "const canManageFloorPlan",
  )
    && sources.page.includes(
      "canManageFloorPlan={canManageFloorPlan}",
    )
    && sources.page.includes(
      '["owner", "admin"]',
    ),
);

check(
  "staff no forma parte del permiso físico",
  !sources.page.includes(
    'const canManageFloorPlan = [\n    "owner",\n    "admin",\n    "staff"',
  ),
);

check(
  "la UI importa las Server Actions de guardar y eliminar",
  sources.ui.includes(
    "saveBusinessFloorTableAction",
  )
    && sources.ui.includes(
      "setBusinessFloorTableActiveAction",
    ),
);

check(
  "el alta usa un borrador y envía tableId nulo",
  sources.ui.includes(
    "createPersistentFloorTableDraft",
  )
    && sources.ui.includes(
      "editingTable.isDraft ? null : editingTable.id",
    )
    && sources.ui.includes(
      "tableId,",
    ),
);

check(
  "cancelar un borrador no crea datos remotos",
  sources.ui.includes(
    "setEditingTable(createPersistentFloorTableDraft(tables))",
  )
    && !sources.ui.includes(
      "saveBusinessFloorTableAction({\n        tableId: null",
    ),
);

check(
  "la edición usa el UUID persistente y espera una respuesta exitosa",
  sources.ui.includes(
    "await saveBusinessFloorTableAction",
  )
    && sources.ui.includes(
      "if (!result.ok)",
    )
    && sources.ui.includes(
      "mapFloorTableToV2Snapshot(result.table)",
    ),
);

check(
  "el eliminación lógica usa isActive false y no DELETE",
  sources.ui.includes(
    "await setBusinessFloorTableActiveAction",
  )
    && sources.ui.includes(
      "isActive: false",
    )
    && !sources.ui.includes(
      '.delete()',
    ),
);

check(
  "bloquear y reactivar guardan un estado físico canónico",
  sources.ui.includes(
    "getV2FloorTablePhysicalStatus",
  )
    && sources.ui.includes(
      "physicalStatus: status",
    )
    && sources.persistence.includes(
      "status: getV2FloorTablePhysicalStatus(table)",
    ),
);

check(
  "el snapshot preserva estado físico, radio y capacidad de unión",
  sources.cutover.includes(
    "const physicalStatus =",
  )
    && sources.cutover.includes(
      "physicalStatus,",
    )
    && sources.cutover.includes(
      "cornerRadius: table.cornerRadius",
    )
    && sources.cutover.includes(
      "canJoin: table.isJoinable",
    ),
);

check(
  "los estados reservada y ocupada siguen siendo derivados",
  sources.persistence.includes(
    "export type V2PhysicalTableStatus",
  )
    && sources.persistence.includes(
      '"out_of_service"',
    )
    && sources.ui.includes(
      "isReservationOccupyingTable",
    )
    && sources.ui.includes(
      'status: isReservationOccupyingTable',
    ),
);

check(
  "el cambio de nombre conserva la representación de asignaciones",
  sources.persistence.includes(
    "replaceAssignedTableLabel",
  )
    && sources.ui.includes(
      "replaceAssignedTableLabel(",
    ),
);

check(
  "las mutaciones físicas evitan dobles envíos",
  sources.ui.includes(
    "isTableMutating",
  )
    && sources.ui.includes(
      "setIsTableMutating(true)",
    )
    && sources.ui.includes(
      "setIsTableMutating(false)",
    ),
);

check(
  "la interfaz falla cerrado sin permiso de administración",
  sources.ui.includes(
    "canManageFloorPlan?: boolean",
  )
    && sources.ui.includes(
      "canManagePersistentTables",
    )
    && sources.ui.includes(
      "!canManagePersistentTables",
    ),
);

check(
  "la Server Action continúa revalidando owner y admin",
  sources.actions.includes(
    'resolveFloorPlanContext([\n      "owner",\n      "admin",\n    ])',
  )
    && sources.actions.includes(
      '"save_business_floor_table"',
    )
    && sources.actions.includes(
      '"set_business_floor_table_active"',
    ),
);

check(
  "uniones restauración y fondo permanecen fuera de E22",
  sources.ui.includes(
    "function startMergeMode",
  )
    && sources.ui.includes(
      "function restoreInitialLayout",
    )
    && sources.ui.includes(
      "function triggerBackgroundImageUpload",
    )
    && sources.ui.includes(
      "La unión visual, la restauración y el fondo continúan bloqueados.",
    ),
);

check(
  "el componente cliente no realiza DML directo",
  !sources.ui.includes("createClient(")
    && !sources.ui.includes('.from("floor_tables")')
    && !sources.ui.includes('.insert(')
    && !sources.ui.includes('.update(')
    && !sources.ui.includes('.delete('),
);

check(
  "la regresión E22 está integrada al QA",
  JSON.parse(sources.package).scripts[
    "test:floor-plan-table-admin-ui"
  ]
    ===
    "node scripts/floor-plan-table-admin-ui-regression-tests.mjs"
    && JSON.parse(sources.package).scripts[
      "test:regression"
    ].includes(
      "npm run test:floor-plan-table-admin-ui",
    ),
);

check(
  "la documentación delimita permisos, archivo y prueba manual",
  sources.docs.includes(
    "owner",
  )
    && sources.docs.includes(
      "Eliminación lógica",
    )
    && sources.docs.includes(
      "No volver a aplicar la migración `010`",
    )
    && sources.docs.includes(
      "staging:cleanup-isolation",
    ),
);

console.log(
  `Todos los casos de administración persistente de mesas pasaron (${checks.length}).`,
);
