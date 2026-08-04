import assert from "node:assert/strict";
import {
  access,
  readFile,
} from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260804_010_floor_plan_write_rpc.sql";
const rollbackPath =
  "supabase/rollbacks/20260804_010_floor_plan_write_rpc.down.sql";
const postflightPath =
  "supabase/preflight/20260804_010_floor_plan_write_postflight.sql";
const contractPath =
  "src/lib/floor-plan/business-floor-plan-contract.ts";
const readerPath =
  "src/lib/data/server/business-floor-plan.ts";
const actionPath =
  "src/app/local/plano/actions.ts";
const legacyAdapterPath =
  "src/lib/data/supabase/floorPlan.ts";
const seedPath =
  "scripts/floor-plan-staging-seed.mjs";
const remoteTestPath =
  "scripts/floor-plan-write-staging-test.mjs";
const documentationPath =
  "docs/database/FLOOR-PLAN-WRITE-RPC.md";

const requiredFiles = [
  migrationPath,
  rollbackPath,
  postflightPath,
  contractPath,
  readerPath,
  actionPath,
  legacyAdapterPath,
  seedPath,
  remoteTestPath,
  documentationPath,
];

console.log(
  "Ejecutando regresión de plano persistente...",
);

for (const path of requiredFiles) {
  await access(path);
}
console.log(
  "✓ existen migración, rollback, código y documentación",
);

const migration = await readFile(
  migrationPath,
  "utf8",
);
const rollback = await readFile(
  rollbackPath,
  "utf8",
);
const postflight = await readFile(
  postflightPath,
  "utf8",
);
const contract = await readFile(
  contractPath,
  "utf8",
);
const reader = await readFile(
  readerPath,
  "utf8",
);
const action = await readFile(
  actionPath,
  "utf8",
);
const legacyAdapter = await readFile(
  legacyAdapterPath,
  "utf8",
);
const seed = await readFile(seedPath, "utf8");
const remoteTest = await readFile(
  remoteTestPath,
  "utf8",
);
const documentation = await readFile(
  documentationPath,
  "utf8",
);

for (const table of [
  "floor_plan_settings",
  "floor_tables",
  "reservation_table_assignments",
]) {
  assert.match(
    migration,
    new RegExp(
      `create table if not exists(?:\\s+public)?\\.${table}|create table if not exists public\\.${table}`,
      "u",
    ),
  );
}
console.log(
  "✓ el esquema incorpora ajustes, mesas y asignaciones",
);

for (const constraint of [
  "floor_plan_settings_geometry_check",
  "floor_tables_seats_check",
  "floor_tables_archive_state_check",
  "reservation_table_assignments_reservation_fkey",
  "reservation_table_assignments_table_fkey",
]) {
  assert.match(
    migration,
    new RegExp(constraint, "u"),
  );
}
console.log(
  "✓ PostgreSQL impone geometría, capacidad y tenant",
);

for (const table of [
  "floor_plan_settings",
  "floor_tables",
  "reservation_table_assignments",
]) {
  assert.match(
    migration,
    new RegExp(
      `alter table public\\.${table}[\\s\\S]+enable row level security`,
      "u",
    ),
  );
  assert.match(
    migration,
    new RegExp(
      `alter table public\\.${table}[\\s\\S]+force row level security`,
      "u",
    ),
  );
}
console.log(
  "✓ las tres tablas nacen con RLS forzada",
);

for (const policy of [
  "floor_plan_settings_select_active_member",
  "floor_tables_select_active_member",
  "reservation_table_assignments_select_active_member",
]) {
  assert.match(
    migration,
    new RegExp(policy, "u"),
  );
}
assert.match(
  migration,
  /private\.has_business_role/u,
);
console.log(
  "✓ la lectura queda limitada al tenant activo",
);

assert.match(
  migration,
  /save_business_floor_plan_settings/u,
);
assert.match(
  migration,
  /array\['owner', 'admin'\]::text\[\]/u,
);
assert.match(
  migration,
  /on conflict \(business_id\)/u,
);
console.log(
  "✓ los ajustes usan RPC owner/admin y upsert",
);

assert.match(
  migration,
  /save_business_floor_table/u,
);
assert.match(
  migration,
  /Floor table payload contains unknown fields/u,
);
assert.match(
  migration,
  /Floor table label already exists/u,
);
console.log(
  "✓ alta y edición de mesas validan contrato completo",
);

assert.match(
  migration,
  /set_business_floor_table_active/u,
);
assert.match(
  migration,
  /active reservation assignment/u,
);
assert.doesNotMatch(
  migration,
  /delete from public\.floor_tables/u,
);
console.log(
  "✓ las mesas se archivan sin eliminación física",
);

assert.match(
  migration,
  /set_business_reservation_tables/u,
);
assert.match(
  migration,
  /array\['owner', 'admin', 'staff'\]::text\[\]/u,
);
assert.match(
  migration,
  /cardinality\(table_ids_value\) > 20/u,
);
assert.match(
  migration,
  /Closed reservation table assignments are immutable/u,
);
assert.match(
  migration,
  /allow_table_combinations/u,
);
assert.match(
  migration,
  /selected tables cannot be joined/u,
);
console.log(
  "✓ staff asigna mesas activas, combinables y con historial inmutable",
);

assert.match(
  migration,
  /validate_reservation_table_selection/u,
);
assert.match(
  migration,
  /pg_advisory_xact_lock/u,
);
assert.match(
  migration,
  /assignment\.business_id = p_business_id/u,
);
console.log(
  "✓ la disponibilidad se valida con lock y business_id",
);

assert.match(
  migration,
  /Selected tables do not have enough seats/u,
);
assert.match(
  migration,
  /sum\(floor_table\.seats\)/u,
);
console.log(
  "✓ la capacidad total cubre las personas de la reserva",
);

assert.match(
  migration,
  /overlapping reservation/u,
);
assert.match(
  migration,
  /other_reservation\.duration_minutes/u,
);
assert.match(
  migration,
  /hour_row\.close_time <= hour_row\.open_time/u,
);
console.log(
  "✓ los solapamientos contemplan duración y turnos nocturnos",
);

assert.match(
  migration,
  /reservations_validate_table_assignments/u,
);
assert.match(
  migration,
  /floor_tables_validate_assignments/u,
);
assert.match(
  migration,
  /reservation_rules_validate_table_assignments/u,
);
assert.match(
  migration,
  /after update of[\s\S]+can_join[\s\S]+on public\.floor_tables/u,
);
assert.match(
  migration,
  /after update of[\s\S]+party_size[\s\S]+status/u,
);
console.log(
  "✓ triggers protegen reservas, mesas y reglas posteriores",
);

for (const table of [
  "floor_plan_settings",
  "floor_tables",
  "reservation_table_assignments",
]) {
  assert.match(
    migration,
    new RegExp(
      `revoke insert, update, delete[\\s\\S]+public\\.${table}`,
      "u",
    ),
  );
}
assert.doesNotMatch(
  migration,
  /grant\s+(insert|update|delete|all)/iu,
);
console.log(
  "✓ no se habilita DML directo",
);

assert.match(
  rollback,
  /drop function if exists[\s\S]+set_business_reservation_tables/u,
);
assert.doesNotMatch(
  rollback,
  /drop table|disable row level security/iu,
);
assert.match(
  rollback,
  /force row level security/u,
);
console.log(
  "✓ el rollback conserva tablas, datos y aislamiento",
);

assert.match(
  postflight,
  /has_function_privilege/u,
);
assert.match(
  postflight,
  /has_table_privilege/u,
);
assert.match(
  postflight,
  /relforcerowsecurity/u,
);
assert.match(
  postflight,
  /trigger_count <> 3/u,
);
console.log(
  "✓ el postflight detecta permisos o triggers inseguros",
);

assert.match(
  contract,
  /normalizeBusinessFloorTable/u,
);
assert.match(
  contract,
  /normalizeBusinessFloorPlanSettings/u,
);
assert.match(
  contract,
  /normalizeBusinessFloorTableIds/u,
);
assert.match(
  contract,
  /toBusinessFloorTableRpcPayload/u,
);
console.log(
  "✓ TypeScript valida ajustes, mesas y asignaciones",
);

assert.match(
  reader,
  /createSupabaseAuthServerClient/u,
);
assert.match(
  reader,
  /\.eq\("business_id", businessId\)/u,
);
assert.match(
  reader,
  /\.eq\("is_active", true\)/u,
);
assert.doesNotMatch(
  reader,
  /service_role|SERVICE_ROLE|localStorage/u,
);
console.log(
  "✓ la lectura servidor usa sesión y negocio activo",
);

for (const actionName of [
  "saveBusinessFloorPlanSettingsAction",
  "saveBusinessFloorTableAction",
  "setBusinessFloorTableActiveAction",
  "setBusinessReservationTablesAction",
]) {
  assert.match(
    action,
    new RegExp(actionName, "u"),
  );
}
assert.match(
  action,
  /resolveActiveBusiness/u,
);
assert.doesNotMatch(
  action,
  /service_role|SERVICE_ROLE/u,
);
console.log(
  "✓ las Server Actions revalidan sesión, rol y tenant",
);

assert.match(
  legacyAdapter,
  /requieren una Server Action autenticada/u,
);
assert.doesNotMatch(
  legacyAdapter,
  /\.from\("(?:floor_tables|floor_plan_settings|reservation_table_assignments)"\)[\s\S]{0,500}\.(?:insert|update|delete)\(/u,
);
assert.match(
  legacyAdapter,
  /\.from\("floor_tables"\)/u,
);
assert.match(
  legacyAdapter,
  /\.from\("floor_plan_settings"\)/u,
);
console.log(
  "✓ la capa heredada conserva lectura y falla cerrado",
);

assert.match(seed, /floorTableAId/u);
assert.match(seed, /floorTableBId/u);
assert.match(seed, /reservation_table_assignments/u);
assert.match(
  remoteTest,
  /Escritura segura del plano aprobada \(27 controles\)/u,
);
assert.match(
  remoteTest,
  /usuario B no puede usar una mesa de A/u,
);
assert.match(
  remoteTest,
  /solapamiento de mesa fue rechazado/u,
);
assert.match(
  remoteTest,
  /asignación terminal conserva el historial/u,
);
assert.match(
  remoteTest,
  /mesa no combinable no puede integrarse/u,
);
assert.match(
  remoteTest,
  /triggers protegen combinaciones activas/u,
);
console.log(
  "✓ fixture y prueba remota cubren BOLA, combinaciones, historial y restauración",
);

assert.match(
  documentation,
  /No conecta todavía `\/local\/plano`/u,
);
assert.match(
  documentation,
  /No ejecutar `staging:cleanup-isolation`/u,
);
assert.match(
  documentation,
  /combinaciones persistentes/u,
);
console.log(
  "✓ la documentación delimita corte y deuda",
);

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:floor-plan-write"],
  "node scripts/floor-plan-write-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.[
    "staging:test-floor-plan-write"
  ],
  "node scripts/floor-plan-write-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.[
    "staging:seed-isolation"
  ] ?? "",
  /floor-plan-staging-seed/u,
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:floor-plan-write/u,
);
console.log(
  "✓ pruebas local, seed y prueba remota están integrados",
);

for (const path of requiredFiles) {
  const content = await readFile(path, "utf8");

  for (const [index, line] of content
    .split(/\r?\n/u)
    .entries()) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${path}, línea ${index + 1}`,
    );
  }
}
console.log(
  "✓ archivos nuevos sin whitespace accidental",
);

console.log(
  "Todos los casos de plano persistente pasaron (20).",
);
