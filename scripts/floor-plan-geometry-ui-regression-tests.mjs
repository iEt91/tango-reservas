import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  page: "src/app/local/plano/page.tsx",
  ui: "src/app/local/plano/v2-plano-page.tsx",
  actions: "src/app/local/plano/actions.ts",
  persistence:
    "src/lib/floor-plan/v2-floor-table-persistence.ts",
  package: "package.json",
  docs:
    "docs/database/FLOOR-PLAN-GEOMETRY-UI-CUTOVER.md",
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
  "Ejecutando regresión de geometría persistente del plano...",
);

check(
  "la página mantiene el permiso físico owner/admin de E22",
  sources.page.includes(
    "const canManageFloorPlan",
  )
    && sources.page.includes(
      '["owner", "admin"]',
    )
    && sources.page.includes(
      "canManageFloorPlan={canManageFloorPlan}",
    ),
);

check(
  "la UI importa comparación de geometría y escritura segura",
  sources.ui.includes(
    "hasV2FloorTableGeometryChanged",
  )
    && sources.ui.includes(
      "saveBusinessFloorTableAction",
    )
    && sources.ui.includes(
      "toBusinessFloorTableActionInput",
    ),
);

check(
  "la geometría compara posición tamaño y rotación",
  [
    '"x"',
    '"y"',
    '"width"',
    '"height"',
    '"rotation"',
  ].every((token) =>
    sources.persistence.includes(token),
  )
    && sources.persistence.includes(
      "hasV2FloorTableGeometryChanged",
    ),
);

check(
  "la interacción conserva mesa original y mesa más reciente",
  sources.ui.includes(
    "interactionOriginalTableRef",
  )
    && sources.ui.includes(
      "interactionLatestTableRef",
    )
    && sources.ui.includes(
      "interactionOriginalTableRef.current = sourceTable",
    )
    && sources.ui.includes(
      "interactionLatestTableRef.current = sourceTable",
    ),
);

check(
  "mousemove actualiza la geometría visual sin ejecutar RPC",
  sources.ui.includes(
    "interactionLatestTableRef.current = nextTable",
  )
    && !sources.ui.includes(
      "handleMouseMove(event: globalThis.MouseEvent) {\n      await saveBusinessFloorTableAction",
    ),
);

check(
  "mouse up guarda una sola vez en Supabase",
  sources.ui.includes(
    "function handleMouseUp()",
  )
    && sources.ui.includes(
      "void persistInteractionGeometry(",
    )
    && sources.ui.includes(
      "if (!isSupabasePersistence)",
    ),
);

check(
  "una interacción sin cambios no ejecuta escritura",
  sources.ui.includes(
    "!hasV2FloorTableGeometryChanged(",
  )
    && sources.ui.includes(
      "originalTable,",
    )
    && sources.ui.includes(
      "nextTable,",
    )
    && sources.ui.includes(
      ") {\n        return;",
    ),
);

check(
  "el guardado usa UUID y contrato completo de mesa",
  sources.ui.includes(
    "tableId: nextTable.id",
  )
    && sources.ui.includes(
      "table: toBusinessFloorTableActionInput(nextTable)",
    ),
);

check(
  "la UI adopta la fila canónica devuelta por PostgreSQL",
  sources.ui.includes(
    "mapFloorTableToV2Snapshot(result.table)",
  )
    && sources.ui.includes(
      "replaceInteractionTable(savedTable)",
    ),
);

check(
  "un error revierte la geometría anterior",
  sources.ui.includes(
    "replaceInteractionTable(originalTable)",
  )
    && sources.ui.includes(
      "No se pudo guardar la geometría de la mesa.",
    ),
);

check(
  "las mutaciones evitan interacciones simultáneas",
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
  "mover y redimensionar fallan cerrado sin permiso",
  sources.ui.includes(
    "isSupabasePersistence",
  )
    && sources.ui.includes(
      "!canManagePersistentTables",
    )
    && sources.ui.includes(
      "startMoveTable",
    )
    && sources.ui.includes(
      "startResizeTable",
    ),
);

check(
  "el botón de movimiento queda disponible solo para administradores",
  sources.ui.includes(
    "onClick={toggleLayoutLock}",
  )
    && sources.ui.includes(
      "!canManagePersistentTables",
    )
    && sources.ui.includes(
      "isTableMutating",
    )
    && !sources.ui.includes(
      "onClick={toggleLayoutLock}\n                    disabled={isSupabasePersistence}",
    ),
);

check(
  "el modo local conserva cambios sin guardar",
  sources.ui.includes(
    "if (!isSupabasePersistence) {\n        setHasUnsavedChanges(true);",
  )
    && sources.ui.includes(
      "window.localStorage.setItem(FLOOR_TABLES_STORAGE_KEY",
    ),
);

check(
  "el botón global continúa fuera del flujo Supabase",
  sources.ui.includes(
    "onClick={saveChanges}",
  )
    && sources.ui.includes(
      "disabled={isSupabasePersistence}",
    ),
);

check(
  "uniones restauración y fondo permanecen bloqueados",
  sources.ui.includes(
    "Las uniones, la restauración y el fondo continúan bloqueados.",
  )
    && sources.ui.includes(
      "function startMergeMode",
    )
    && sources.ui.includes(
      "function restoreInitialLayout",
    )
    && sources.ui.includes(
      "function triggerBackgroundImageUpload",
    ),
);

check(
  "las notificaciones de guardado no alteran la altura del plano",
  sources.ui.includes(
    "pointer-events-none fixed right-6 top-24",
  )
    && sources.ui.includes(
      'aria-live="polite"',
    )
    && sources.ui.includes(
      'role="status"',
    )
    && sources.ui.includes(
      'role="alert"',
    )
    && !sources.ui.includes(
      'floorPlanOperationMessage ? (\n          <div className="mt-3',
    ),
);

check(
  "la Server Action conserva autorización owner/admin y RPC",
  sources.actions.includes(
    'resolveFloorPlanContext([\n      "owner",\n      "admin",\n    ])',
  )
    && sources.actions.includes(
      '"save_business_floor_table"',
    )
    && sources.actions.includes(
      "p_table_id: tableId",
    ),
);

check(
  "el cliente no introduce DML directo",
  !sources.ui.includes("createClient(")
    && !sources.ui.includes('.from("floor_tables")')
    && !sources.ui.includes(".insert(")
    && !sources.ui.includes(".update(")
    && !sources.ui.includes(".delete("),
);

const packageJson = JSON.parse(
  sources.package,
);

check(
  "la regresión E23 está integrada al QA",
  packageJson.scripts[
    "test:floor-plan-geometry-ui"
  ]
    ===
    "node scripts/floor-plan-geometry-ui-regression-tests.mjs"
    && packageJson.scripts[
      "test:regression"
    ].includes(
      "npm run test:floor-plan-geometry-ui",
    ),
);

check(
  "la documentación delimita auto guardado rollback y prueba manual",
  sources.docs.includes(
    "guardar automáticamente al soltar",
  )
    && sources.docs.includes(
      "se restaura la geometría anterior",
    )
    && sources.docs.includes(
      "No volver a aplicar la migración `010`",
    )
    && sources.docs.includes(
      "staging:cleanup-isolation",
    ),
);

console.log(
  `Todos los casos de geometría persistente pasaron (${checks.length}).`,
);
