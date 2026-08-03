import assert from "node:assert/strict";
import {
  access,
  readFile,
} from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260803_006_reservation_settings_write_rpc.sql";
const rollbackPath =
  "supabase/rollbacks/20260803_006_reservation_settings_write_rpc.down.sql";
const postflightPath =
  "supabase/preflight/20260803_006_reservation_settings_write_postflight.sql";
const contractPath =
  "src/lib/configuration/reservation-settings-contract.ts";
const readerPath =
  "src/lib/data/server/reservation-settings.ts";
const actionPath =
  "src/app/local/configuracion/actions.ts";
const pagePath =
  "src/app/local/configuracion/page.tsx";
const clientPagePath =
  "src/app/local/configuracion/v2-configuracion-page.tsx";
const documentationPath =
  "docs/database/RESERVATION-SETTINGS-WRITE-RPC.md";
const remoteTestPath =
  "scripts/reservation-settings-write-staging-test.mjs";
const typesPath = "src/data/types.ts";
const schedulingPath = "src/lib/scheduling.ts";
const publicConfigPath =
  "src/lib/public-reservation-config.ts";

const requiredFiles = [
  migrationPath,
  rollbackPath,
  postflightPath,
  contractPath,
  readerPath,
  actionPath,
  pagePath,
  clientPagePath,
  documentationPath,
  remoteTestPath,
  typesPath,
  schedulingPath,
  publicConfigPath,
];

console.log("Ejecutando regresión de reglas persistentes...");

for (const path of requiredFiles) {
  await access(path);
}
console.log("✓ existen migración, rollback, código y documentación");

const migration = await readFile(migrationPath, "utf8");
const rollback = await readFile(rollbackPath, "utf8");
const postflight = await readFile(postflightPath, "utf8");
const contract = await readFile(contractPath, "utf8");
const reader = await readFile(readerPath, "utf8");
const action = await readFile(actionPath, "utf8");
const page = await readFile(pagePath, "utf8");
const clientPage = await readFile(clientPagePath, "utf8");
const remoteTest = await readFile(remoteTestPath, "utf8");
const types = await readFile(typesPath, "utf8");
const scheduling = await readFile(schedulingPath, "utf8");
const publicConfig = await readFile(publicConfigPath, "utf8");

for (const column of [
  "reservations_enabled",
  "default_reservation_duration_minutes",
  "max_people_per_slot",
  "allow_reservations_without_table",
  "auto_assign_reservation_tables",
  "allow_table_combinations",
]) {
  assert.match(migration, new RegExp(`\\b${column}\\b`, "u"));
}
console.log("✓ el esquema agrega columnas con significado exacto");

for (const constraint of [
  "reservation_rules_default_duration_check",
  "reservation_rules_min_notice_range_check",
  "reservation_rules_max_days_range_check",
  "reservation_rules_max_people_check",
]) {
  assert.match(migration, new RegExp(constraint, "u"));
}
console.log("✓ PostgreSQL impone límites operativos");

assert.match(migration, /^begin;/u);
assert.match(migration, /commit;\s*$/u);
assert.match(migration, /security definer/u);
assert.match(migration, /set search_path = ''/u);
assert.match(migration, /private\.has_business_role/u);
assert.match(migration, /array\['owner', 'admin'\]/u);
assert.match(
  migration,
  /hours_result := public\.replace_business_hours[\s\S]+insert into public\.reservation_rules/u,
);
assert.match(migration, /on conflict \(business_id\)/u);
console.log("✓ una RPC guarda horarios y reglas atómicamente");

assert.match(
  migration,
  /grant execute on function public\.save_reservation_configuration[\s\S]+to authenticated/u,
);
assert.match(
  migration,
  /revoke insert, update, delete on table public\.reservation_rules/u,
);
assert.doesNotMatch(migration, /grant (?:insert|update|delete)/iu);
console.log("✓ no se habilita DML directo");

assert.match(
  rollback,
  /drop function if exists public\.save_reservation_configuration/u,
);
assert.match(rollback, /drop column if exists reservations_enabled/u);
assert.doesNotMatch(rollback, /disable row level security/iu);
console.log("✓ el rollback conserva filas y aislamiento");

assert.match(postflight, /pg_get_functiondef\(oid\)/u);
assert.match(postflight, /has_function_privilege/u);
assert.match(postflight, /has_table_privilege/u);
assert.match(postflight, /required_columns <> 6/u);
assert.match(postflight, /cmd <> 'SELECT'/u);
console.log("✓ el postflight detecta permisos o esquema incompletos");

assert.match(contract, /ALLOWED_DURATIONS/u);
assert.match(contract, /minimumNoticeHours \* 2/u);
assert.match(contract, /maxPeoplePerSlot > 1000/u);
assert.match(
  contract,
  /defaultReservationStatus !== "pending"[\s\S]+defaultReservationStatus !== "confirmed"/u,
);
assert.match(
  contract,
  /expectedStatus: ReservationDefaultStatus/u,
);
assert.match(contract, /defaultReservationStatus !== expectedStatus/u);
assert.match(contract, /toReservationSettingsRpcPayload/u);
console.log("✓ el contrato valida rangos y coherencia");

assert.match(reader, /RESERVATION_SETTINGS_SELECT[\s\S]+as const/u);
assert.match(reader, /createSupabaseAuthServerClient/u);
assert.match(reader, /\.eq\("business_id", businessId\)/u);
assert.match(reader, /\.maybeSingle\(\)/u);
assert.doesNotMatch(reader, /service_role|SERVICE_ROLE|localStorage/u);
console.log("✓ la lectura servidor usa sesión y negocio activo");

assert.match(action, /saveReservationConfigurationAction/u);
assert.match(action, /normalizeReservationSettingsEditor/u);
assert.match(action, /save_reservation_configuration/u);
assert.match(action, /membership\.role !== "owner"/u);
assert.match(action, /membership\.role !== "admin"/u);
assert.doesNotMatch(action, /service_role|SERVICE_ROLE/u);
console.log("✓ la Server Action revalida sesión, rol y entrada");

assert.match(page, /getReservationSettingsForBusiness/u);
assert.match(page, /Promise\.all/u);
assert.match(page, /initialReservationSettings/u);
assert.match(page, /reservationSettingsPersistence="supabase"/u);
console.log("✓ la página carga horarios y reglas en paralelo");

assert.match(clientPage, /mergeReservationSettingsEditor/u);
assert.match(clientPage, /saveReservationConfigurationAction/u);
assert.match(clientPage, /reservationSettingsPersistence/u);
assert.match(clientPage, /updateConfirmationMode/u);
assert.match(clientPage, /updateDefaultReservationStatus/u);
assert.match(clientPage, /step="0\.5"/u);
assert.match(clientPage, /max=\{1000\}/u);
console.log("✓ la UI conserva diseño y evita estados contradictorios");

for (const property of [
  "reservationsEnabled",
  "maxPeoplePerSlot",
  "allowReservationsWithoutTable",
  "autoAssignReservationTables",
  "allowTableCombinations",
]) {
  const pattern = new RegExp(property, "u");
  assert.match(types, pattern);
  assert.match(scheduling, pattern);
  assert.match(publicConfig, pattern);
}
console.log("✓ tipos y fallbacks comparten el nuevo contrato");

assert.match(remoteTest, /la transacción inválida no cambió horarios ni reglas/u);
assert.match(remoteTest, /usuario A no puede escribir B/u);
assert.match(remoteTest, /usuario B no puede escribir A/u);
assert.match(remoteTest, /DML directo de reglas sigue bloqueado/u);
assert.match(remoteTest, /reglas A restauradas/u);
assert.match(remoteTest, /reglas B restauradas/u);
console.log("✓ la prueba remota cubre atomicidad, BOLA y restauración");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:reservation-settings-write"],
  "node scripts/reservation-settings-write-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:test-reservation-settings-write"],
  "node scripts/reservation-settings-write-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:reservation-settings-write/u,
);
console.log("✓ pruebas local y remota están integradas");

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
console.log("✓ archivos nuevos sin whitespace accidental");

console.log(
  "Todos los casos de reglas persistentes pasaron (16).",
);
