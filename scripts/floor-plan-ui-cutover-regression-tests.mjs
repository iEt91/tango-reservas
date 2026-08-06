import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  page: "src/app/local/plano/page.tsx",
  ui: "src/app/local/plano/v2-plano-page.tsx",
  cutover:
    "src/lib/floor-plan/v2-floor-plan-cutover.ts",
  package: "package.json",
  docs:
    "docs/database/FLOOR-PLAN-UI-READ-CUTOVER.md",
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
  "Ejecutando regresión del corte de lectura del plano V2...",
);

check(
  "la página conserva fallback local y corta Supabase en servidor",
  sources.page.includes(
    'getDataSource() !== "supabase"',
  )
    && sources.page.includes(
      "export default async function PlanoPage",
    ),
);

check(
  "la página falla cerrado para sesión, selección y membresía",
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
  "el servidor carga horarios, reglas, reservas y plano del tenant",
  [
    "getBusinessHoursForBusiness",
    "getReservationSettingsForBusiness",
    "getBusinessReservationsForBusiness",
    "getBusinessFloorPlanForBusiness",
  ].every((token) =>
    sources.page.includes(token),
  ),
);

check(
  "las reservas del plano se acotan a la ventana configurada",
  sources.page.includes("bookingWindowDays")
    && sources.page.includes("fromDate")
    && sources.page.includes("toDate"),
);

check(
  "las asignaciones se consultan por las reservas cargadas",
  sources.page.includes("reservationIds:")
    && sources.page.includes(
      "reservations.map",
    ),
);

check(
  "el snapshot cliente se construye fuera del componente visual",
  sources.page.includes(
    "buildV2FloorPlanSnapshot",
  )
    && sources.cutover.includes(
      "export function buildV2FloorPlanSnapshot",
    ),
);

check(
  "las mesas persistentes se mapean por UUID y geometría",
  [
    "id: table.id",
    "name: table.label",
    "capacity: table.seats",
    "x: table.x",
    "rotation: table.rotation",
  ].every((token) =>
    sources.cutover.includes(token),
  ),
);

check(
  "blocked y out_of_service fallan cerrado como mesa bloqueada",
  sources.cutover.includes(
    'table.status === "blocked"',
  )
    && sources.cutover.includes(
      'table.status === "out_of_service"',
    )
    && sources.cutover.includes(
      'status: isBlocked ? "blocked" : "available"',
    ),
);

check(
  "las asignaciones usan IDs persistentes antes de resolver etiquetas",
  sources.cutover.includes(
    "tableIdsByReservationId",
  )
    && sources.cutover.includes(
      "tableLabelsById.get(tableId)",
    ),
);

check(
  "horarios y reglas persistentes alimentan fecha, duración y ventana",
  sources.cutover.includes("businessHours")
    && sources.cutover.includes(
      "reservationEnabled",
    )
    && sources.cutover.includes(
      "standardDurationMinutes",
    )
    && sources.cutover.includes(
      "bookingWindowDays",
    ),
);

check(
  "el fondo persistente se transforma sin guardar binarios locales",
  sources.cutover.includes(
    "settings.backgroundImage",
  )
    && sources.cutover.includes(
      "settings.backgroundOpacity",
    ),
);

check(
  "la UI recibe un contrato explícito de persistencia",
  sources.ui.includes(
    'floorPlanPersistence?: "local" | "supabase"',
  )
    && sources.ui.includes(
      'floorPlanPersistence = "local"',
    ),
);

check(
  "Supabase hidrata mesas, reservas, configuración y fondo iniciales",
  [
    "initialTables",
    "initialReservations",
    "initialLocalConfig",
    "initialBackgroundImageUrl",
    "initialBackgroundSettings",
  ].every((token) =>
    sources.ui.includes(token),
  ),
);

check(
  "el efecto localStorage queda desactivado en Supabase",
  sources.ui.includes(
    "if (isSupabasePersistence) return;",
  )
    && sources.ui.includes(
      "}, [isSupabasePersistence]);",
    ),
);

check(
  "el corte persistente mantiene localStorage y DML fuera del flujo Supabase",
  sources.ui.includes(
    "Plano conectado a Supabase.",
  )
    && sources.ui.includes(
      "Las uniones, la restauración y el fondo continúan bloqueados.",
    )
    && sources.ui.includes(
      "if (isSupabasePersistence) return;",
    )
    && sources.ui.includes(
      "disabled={isSupabasePersistence}",
    ),
);

check(
  "el componente visual no crea un cliente Supabase ni hace DML directo",
  !sources.ui.includes("createClient(")
    && !sources.ui.includes('.from("floor_tables")')
    && !sources.ui.includes(
      '.from("reservation_table_assignments")',
    ),
);

const packageJson = JSON.parse(
  sources.package,
);

check(
  "la regresión E20 está integrada al QA",
  packageJson.scripts[
    "test:floor-plan-ui-cutover"
  ]
    ===
    "node scripts/floor-plan-ui-cutover-regression-tests.mjs"
    && packageJson.scripts[
      "test:regression"
    ].includes(
      "npm run test:floor-plan-ui-cutover",
    ),
);

check(
  "la documentación delimita lectura, seguridad y deuda",
  sources.docs.includes(
    "lectura canónica",
  )
    && sources.docs.includes(
      "No aplica una migración",
    )
    && sources.docs.includes(
      "E21",
    ),
);

console.log(
  `Todos los casos del corte de lectura del plano V2 pasaron (${checks.length}).`,
);
