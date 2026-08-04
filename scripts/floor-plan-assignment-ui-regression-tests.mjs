import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  page: "src/app/local/plano/page.tsx",
  ui: "src/app/local/plano/v2-plano-page.tsx",
  actions: "src/app/local/plano/actions.ts",
  package: "package.json",
  docs:
    "docs/database/FLOOR-PLAN-ASSIGNMENT-UI-CUTOVER.md",
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
  "Ejecutando regresión de asignaciones persistentes del plano V2...",
);

check(
  "la página conserva el corte de lectura Supabase de E20",
  sources.page.includes(
    'floorPlanPersistence="supabase"',
  )
    && sources.page.includes(
      "buildV2FloorPlanSnapshot",
    ),
);

check(
  "la página deriva permiso de asignación desde la membresía validada",
  sources.page.includes(
    "const canAssignFloorPlan",
  )
    && sources.page.includes('"owner"')
    && sources.page.includes('"admin"')
    && sources.page.includes('"staff"')
    && sources.page.includes(
      "canAssignFloorPlan={canAssignFloorPlan}",
    ),
);

check(
  "la UI recibe un permiso explícito y falla cerrado",
  sources.ui.includes(
    "canAssignFloorPlan?: boolean",
  )
    && sources.ui.includes(
      "canAssignPersistentReservations",
    )
    && sources.ui.includes(
      "!canAssignPersistentReservations",
    ),
);

check(
  "la UI importa únicamente la Server Action de asignaciones",
  sources.ui.includes(
    "setBusinessReservationTablesAction",
  )
    && !sources.ui.includes(
      '.from("reservation_table_assignments")',
    ),
);

check(
  "asignar usa UUID de reserva y UUID de mesa",
  sources.ui.includes(
    "await setBusinessReservationTablesAction",
  )
    && sources.ui.includes(
      "reservationId,",
    )
    && sources.ui.includes(
      "tableIds: [selectedTable.id]",
    ),
);

check(
  "liberar conserva la reserva y envía una lista de mesas vacía",
  sources.ui.includes(
    "tableIds: []",
  )
    && sources.ui.includes(
      'tableName: ""',
    ),
);

check(
  "la UI solo actualiza el snapshot tras una respuesta exitosa",
  sources.ui.includes(
    "if (!result.ok)",
  )
    && sources.ui.includes(
      "setPlanoReservations((current) =>",
    ),
);

check(
  "asignación y liberación previenen dobles envíos",
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
  "los errores seguros de la acción se muestran en la interfaz",
  sources.ui.includes(
    "setFloorPlanOperationError(result.error)",
  )
    && sources.ui.includes(
      "floorPlanOperationError",
    ),
);

check(
  "el flujo local anterior permanece disponible",
  sources.ui.includes(
    "persistReservations(nextReservations)",
  )
    && sources.ui.includes(
      'floorPlanPersistence = "local"',
    ),
);

check(
  "la edición física de mesas continúa bloqueada en Supabase",
  sources.ui.includes(
    "disabled={!selectedTable || isSupabasePersistence}",
  )
    && sources.ui.includes(
      "disabled={isSupabasePersistence}",
    ),
);

check(
  "la Server Action revalida roles y tenant",
  sources.actions.includes(
    'resolveFloorPlanContext([',
  )
    && sources.actions.includes(
      '"staff"',
    )
    && sources.actions.includes(
      "p_business_id: context.businessId",
    ),
);

check(
  "la operación remota continúa usando la RPC transaccional",
  sources.actions.includes(
    '"set_business_reservation_tables"',
  )
    && sources.actions.includes(
      "p_reservation_id",
    )
    && sources.actions.includes(
      "p_table_ids",
    ),
);

const packageJson = JSON.parse(
  sources.package,
);

check(
  "la regresión E21 está integrada al QA",
  packageJson.scripts[
    "test:floor-plan-assignment-ui"
  ]
    ===
    "node scripts/floor-plan-assignment-ui-regression-tests.mjs"
    && packageJson.scripts[
      "test:regression"
    ].includes(
      "npm run test:floor-plan-assignment-ui",
    ),
);

check(
  "la documentación fija alcance, permisos y prueba manual",
  sources.docs.includes(
    "asignar una reserva activa",
  )
    && sources.docs.includes(
      "Prevención de dobles envíos",
    )
    && sources.docs.includes(
      "No volver a aplicar la migración `010`",
    )
    && sources.docs.includes(
      "staging:cleanup-isolation",
    ),
);

check(
  "E21 no introduce una migración ni DML de navegador",
  !sources.ui.includes("createClient(")
    && !sources.ui.includes('.from("floor_tables")')
    && !sources.ui.includes(
      '.from("reservation_table_assignments")',
    ),
);

console.log(
  `Todos los casos de asignaciones persistentes del plano V2 pasaron (${checks.length}).`,
);
