import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  page: "src/app/local/reservas/page.tsx",
  ui: "src/app/local/reservas/v2-reservas-page.tsx",
  actions: "src/app/local/reservas/actions.ts",
  cutover:
    "src/lib/reservations/v2-reservations-cutover.ts",
  reader:
    "src/lib/data/server/business-reservations.ts",
  migration:
    "supabase/migrations/20260804_009_reservations_write_rpc.sql",
  package: "package.json",
  docs:
    "docs/database/RESERVATIONS-UI-CUTOVER.md",
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
  "Ejecutando regresión del corte persistente de Reservas V2...",
);

check(
  "la página conserva fallback local",
  sources.page.includes(
    'getDataSource() !== "supabase"',
  )
    && sources.page.includes(
      "return <V2ReservasPage />",
    ),
);

check(
  "la página falla cerrado para sesión y membresía",
  sources.page.includes(
    'activeBusiness.status === "unauthenticated"',
  )
    && sources.page.includes(
      'activeBusiness.status === "selection_required"',
    )
    && sources.page.includes(
      'activeBusiness.status === "membership_missing"',
    ),
);

check(
  "el servidor carga reservas configuración servicios clientes y plano",
  sources.page.includes(
    "getBusinessReservationsForBusiness",
  )
    && sources.page.includes(
      "getReservationSettingsForBusiness",
    )
    && sources.page.includes(
      "getBusinessServicesForBusiness",
    )
    && sources.page.includes(
      "getBusinessCustomersForBusiness",
    )
    && sources.page.includes(
      "getBusinessFloorPlanForBusiness",
    ),
);

check(
  "la lectura inicial queda acotada",
  sources.page.includes(
    "fromDate: addDays(today, -31)",
  )
    && sources.page.includes(
      "bookingWindowDays",
    ),
);

check(
  "el snapshot mapea el contrato persistente",
  sources.cutover.includes(
    "mapBusinessReservationToV2Draft",
  )
    && sources.cutover.includes(
      "reservation.reservationDate",
    )
    && sources.cutover.includes(
      "reservation.publicCode",
    ),
);

check(
  "las asignaciones se convierten en etiquetas de mesa",
  sources.cutover.includes(
    "buildTableNamesByReservationId",
  )
    && sources.cutover.includes(
      'labels.join(" + ")',
    ),
);

check(
  "servicios clientes horarios y reglas alimentan la UI",
  sources.cutover.includes(
    "persistentServices",
  )
    && sources.cutover.includes(
      "persistentCustomers",
    )
    && sources.cutover.includes(
      "businessHours",
    )
    && sources.cutover.includes(
      "allowTableCombinations",
    ),
);

check(
  "la UI recibe un contrato explícito de persistencia",
  sources.ui.includes(
    'reservationPersistence?: "local" | "supabase"',
  )
    && sources.ui.includes(
      'reservationPersistence = "local"',
    )
    && sources.page.includes(
      'reservationPersistence="supabase"',
    ),
);

check(
  "Supabase hidrata reservas mesas y configuración",
  sources.ui.includes(
    "initialReservations = v2Reservations",
  )
    && sources.ui.includes(
      "initialFloorTables = DEFAULT_FLOOR_TABLES",
    )
    && sources.ui.includes(
      "initialLocalConfig = DEFAULT_LOCAL_CONFIG",
    ),
);

check(
  "reservas Supabase no se sincronizan con localStorage",
  sources.ui.includes(
    "if (isSupabasePersistence) {",
  )
    && sources.ui.includes(
      "syncMenuFromStorage();",
    )
    && sources.ui.includes(
      "if (isSupabasePersistence) return;",
    ),
);

check(
  "el alta usa una clave idempotente estable",
  sources.ui.includes(
    "reservationSaveKeyRef",
  )
    && sources.ui.includes(
      'createV2OperationalId("reservation-save")',
    )
    && sources.ui.includes(
      "idempotencyKey:",
    ),
);

check(
  "el alta delega el código público canónico a PostgreSQL",
  sources.ui.includes(
    'editingMode === "create"\n                  ? ""',
  )
    && sources.migration.includes(
      "alter column public_code set default",
    )
    && sources.migration.includes(
      "replace(gen_random_uuid()::text, '-', '')",
    ),
);

check(
  "el alta exige un servicio persistente",
  sources.ui.includes(
    "No hay un servicio persistente activo",
  )
    && sources.ui.includes(
      "persistentServices.map",
    ),
);

check(
  "la reserva intenta vincular un cliente existente",
  sources.ui.includes(
    "persistentCustomers.find",
  )
    && sources.ui.includes(
      "customerId:",
    ),
);

check(
  "alta y edición usan la Server Action existente",
  sources.ui.includes(
    "saveBusinessReservationAction",
  )
    && sources.actions.includes(
      '"save_business_reservation"',
    ),
);

check(
  "los estados usan la Server Action y RPC existentes",
  sources.ui.includes(
    "setBusinessReservationStatusAction",
  )
    && sources.actions.includes(
      '"set_business_reservation_status"',
    ),
);

check(
  "la UI adopta la fila canónica devuelta",
  sources.ui.includes(
    "mapBusinessReservationToV2Draft(",
  )
    && sources.ui.includes(
      "result.reservation",
    ),
);

check(
  "mesa y estado del editor fallan cerrado en Supabase",
  sources.ui.includes(
    "disabled={isSupabasePersistence || isReservationMutating}",
  )
    && sources.ui.includes(
      "Las mesas persistentes se administran desde /local/plano.",
    ),
);

check(
  "consumo y pago local quedan bloqueados en Supabase",
  sources.ui.includes(
    "El consumo, la caja y los pagos persistentes todavía no están habilitados",
  )
    && sources.ui.includes(
      "function openOrderPopup",
    )
    && sources.ui.includes(
      "function openPaymentCloseModal",
    ),
);

check(
  "las mutaciones evitan dobles envíos",
  sources.ui.includes(
    "isReservationMutating",
  )
    && sources.ui.includes(
      "setIsReservationMutating(true)",
    )
    && sources.ui.includes(
      "setIsReservationMutating(false)",
    ),
);

check(
  "la lectura sigue aislada por business_id",
  sources.reader.includes(
    '.eq("business_id", businessId)',
  ),
);

check(
  "la Server Action revalida roles y tenant",
  sources.actions.includes(
    '["owner", "admin", "staff"]',
  )
    && sources.actions.includes(
      "resolveActiveBusiness",
    ),
);

check(
  "el navegador no introduce DML directo",
  !sources.ui.includes("createClient(")
    && !sources.ui.includes('.from("reservations")')
    && !sources.ui.includes(".insert(")
    && !sources.ui.includes(".update(")
    && !sources.ui.includes(".delete("),
);

check(
  "E25 no agrega una migración",
  sources.migration.includes(
    "save_business_reservation",
  )
    && sources.docs.includes(
      "E25 no agrega ni aplica migraciones.",
    ),
);

const packageJson = JSON.parse(
  sources.package,
);

check(
  "la regresión E25 está integrada al QA",
  packageJson.scripts[
    "test:reservations-ui-cutover"
  ]
    ===
    "node scripts/reservations-ui-cutover-regression-tests.mjs"
    && packageJson.scripts[
      "test:regression"
    ].includes(
      "npm run test:reservations-ui-cutover",
    ),
);

check(
  "la documentación delimita núcleo y deuda operativa",
  sources.docs.includes(
    "corte persistente del núcleo",
  )
    && sources.docs.includes(
      "Consumo, caja, pagos y cocina",
    )
    && sources.docs.includes(
      "staging:cleanup-isolation",
    ),
);

console.log(
  `Todos los casos del corte persistente de Reservas V2 pasaron (${checks.length}).`,
);
