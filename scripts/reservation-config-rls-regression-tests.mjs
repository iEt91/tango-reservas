import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260802_004_reservation_config_read_rls.sql";
const rollbackPath =
  "supabase/rollbacks/20260802_004_reservation_config_read_rls.down.sql";
const postflightPath =
  "supabase/preflight/20260802_004_reservation_config_postflight.sql";
const documentationPath =
  "docs/database/RESERVATION-CONFIG-RLS.md";

console.log("Ejecutando regresión RLS de configuración de reservas...");

for (const path of [
  migrationPath,
  rollbackPath,
  postflightPath,
  documentationPath,
]) {
  await access(path);
}
console.log("✓ existen migración, rollback, postflight y documentación");

const migration = await readFile(migrationPath, "utf8");
assert.match(migration, /^begin;/iu);
assert.match(migration, /commit;\s*$/iu);
for (const policy of [
  "business_hours_select_active_member",
  "reservation_rules_select_active_member",
  "services_select_active_member",
]) {
  assert.match(
    migration,
    new RegExp(`create policy ${policy}`, "iu"),
  );
}
console.log("✓ la migración es transaccional y crea tres políticas SELECT");

for (const table of [
  "business_hours",
  "reservation_rules",
  "services",
]) {
  assert.match(
    migration,
    new RegExp(
      `create policy ${table}_select_active_member[\\s\\S]+for select[\\s\\S]+to authenticated`,
      "iu",
    ),
  );
  assert.match(
    migration,
    new RegExp(
      `grant select on table public\\.${table} to authenticated`,
      "iu",
    ),
  );
  assert.match(
    migration,
    new RegExp(
      `revoke all on table public\\.${table} from anon`,
      "iu",
    ),
  );
}
console.log("✓ solo miembros activos reciben lectura por business_id");

assert.match(
  migration,
  /array\['owner', 'admin', 'staff'\]::text\[\]/giu,
);
assert.match(
  migration,
  /\(select auth\.uid\(\)\) is not null/giu,
);
assert.match(
  migration,
  /select private\.has_business_role/giu,
);
assert.doesNotMatch(
  migration,
  /security definer|create or replace function/iu,
);
assert.doesNotMatch(
  migration,
  /grant\s+(insert|update|delete|all)/iu,
);
console.log("✓ reutiliza el helper privado y no habilita escrituras");

const rollback = await readFile(rollbackPath, "utf8");
for (const policy of [
  "services_select_active_member",
  "reservation_rules_select_active_member",
  "business_hours_select_active_member",
]) {
  assert.match(
    rollback,
    new RegExp(`drop policy if exists ${policy}`, "iu"),
  );
}
assert.doesNotMatch(
  rollback,
  /disable row level security|no force row level security/iu,
);
console.log("✓ el rollback restaura default deny sin debilitar RLS");

const postflight = await readFile(postflightPath, "utf8");
assert.match(postflight, /relrowsecurity/iu);
assert.match(postflight, /relforcerowsecurity/iu);
assert.match(postflight, /exactamente tres políticas SELECT/iu);
assert.match(postflight, /exactamente tres grants SELECT/iu);
assert.match(postflight, /privilegios de escritura/iu);
assert.match(postflight, /'PASS' as result/iu);
console.log("✓ el postflight detecta políticas o grants inseguros");

const seed = await readFile(
  "scripts/supabase-staging-seed.mjs",
  "utf8",
);
assert.match(seed, /FIXTURE_IDS/u);
assert.match(seed, /ensureBusinessHour/u);
assert.match(seed, /ensureReservationRule/u);
assert.match(seed, /ensureService/u);
assert.match(seed, /businessHourAId/u);
assert.match(seed, /reservationRuleAId/u);
assert.match(seed, /serviceAId/u);
assert.doesNotMatch(seed, /console\.log\([^)]*serverSecret/u);
console.log("✓ el seed prepara fixtures deterministas sin imprimir secretos");

const remoteTest = await readFile(
  "scripts/supabase-isolation-test.mjs",
  "utf8",
);
assert.match(remoteTest, /assertSingleConfigurationRow/u);
assert.match(remoteTest, /assertReservationConfigWritesDenied/u);
assert.match(remoteTest, /configuración y las reservas cruzadas devuelven cero filas/u);
assert.match(remoteTest, /Aislamiento multiempresa aprobado \(21 controles\)/u);
assert.doesNotMatch(remoteTest, /SUPABASE_SERVICE_ROLE_KEY/u);
console.log("✓ la prueba remota cubre lectura propia, BOLA y DML bloqueado");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:reservation-config-rls"],
  "node scripts/reservation-config-rls-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:reservation-config-rls/u,
);
console.log("✓ la regresión nueva forma parte del QA local");

for (const path of [
  migrationPath,
  rollbackPath,
  postflightPath,
  documentationPath,
]) {
  const content = await readFile(path, "utf8");

  for (const [lineNumber, line] of content.split("\n").entries()) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${path}, línea ${lineNumber + 1}`,
    );
  }
}
console.log("✓ archivos nuevos sin whitespace accidental");

console.log("Todos los casos RLS de configuración pasaron (9).");
