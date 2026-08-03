import assert from "node:assert/strict";
import {
  access,
  readFile,
} from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260803_005_business_hours_write_rpc.sql";
const rollbackPath =
  "supabase/rollbacks/20260803_005_business_hours_write_rpc.down.sql";
const postflightPath =
  "supabase/preflight/20260803_005_business_hours_write_postflight.sql";
const contractPath =
  "src/lib/configuration/business-hours-contract.ts";
const repositoryPath =
  "src/lib/data/server/business-hours.ts";
const actionPath =
  "src/app/local/configuracion/actions.ts";
const pagePath =
  "src/app/local/configuracion/page.tsx";
const clientPagePath =
  "src/app/local/configuracion/v2-configuracion-page.tsx";
const documentationPath =
  "docs/database/BUSINESS-HOURS-WRITE-RPC.md";
const remoteTestPath =
  "scripts/business-hours-write-staging-test.mjs";

const requiredFiles = [
  migrationPath,
  rollbackPath,
  postflightPath,
  contractPath,
  repositoryPath,
  actionPath,
  pagePath,
  clientPagePath,
  documentationPath,
  remoteTestPath,
];

console.log("Ejecutando regresión de escritura de horarios...");

for (const path of requiredFiles) {
  await access(path);
}
console.log("✓ existen migración, rollback, código y documentación");

const migration = await readFile(migrationPath, "utf8");
const rollback = await readFile(rollbackPath, "utf8");
const postflight = await readFile(postflightPath, "utf8");
const contract = await readFile(contractPath, "utf8");
const repository = await readFile(repositoryPath, "utf8");
const action = await readFile(actionPath, "utf8");
const page = await readFile(pagePath, "utf8");
const clientPage = await readFile(clientPagePath, "utf8");
const remoteTest = await readFile(remoteTestPath, "utf8");

assert.match(migration, /^begin;/u);
assert.match(migration, /commit;\s*$/u);
assert.match(migration, /security definer/u);
assert.match(migration, /set search_path = ''/u);
assert.match(migration, /private\.has_business_role/u);
assert.match(migration, /array\['owner', 'admin'\]/u);
console.log("✓ la RPC es transaccional y valida owner/admin");

assert.match(migration, /jsonb_array_length\(p_hours\) <> 7/u);
assert.match(migration, /count\(distinct value ->> 'day_of_week'\)/u);
assert.match(migration, /intervalos de 30|HH:00 or HH:30/u);
assert.match(migration, /on conflict \(business_id, day_of_week\)/u);
console.log("✓ la RPC valida siete días y hace upsert determinista");

assert.match(
  migration,
  /revoke all on function public\.replace_business_hours/u,
);
assert.match(
  migration,
  /grant execute on function public\.replace_business_hours[\s\S]+to authenticated/u,
);
assert.match(
  migration,
  /revoke insert, update, delete on table public\.business_hours/u,
);
assert.doesNotMatch(migration, /grant (?:insert|update|delete)/iu);
console.log("✓ no se habilita DML directo sobre business_hours");

assert.match(rollback, /drop function if exists public\.replace_business_hours/u);
assert.doesNotMatch(rollback, /disable row level security/iu);
assert.doesNotMatch(rollback, /grant (?:insert|update|delete)/iu);
console.log("✓ el rollback elimina solo la RPC");

assert.match(postflight, /pg_get_functiondef\(oid\)/u);
assert.doesNotMatch(postflight, /function_oid/u);
assert.match(postflight, /search_path=""'/u);
assert.match(postflight, /has_function_privilege/u);
assert.match(postflight, /has_table_privilege/u);
assert.match(postflight, /cmd <> 'SELECT'/u);
console.log("✓ el postflight falla ante permisos o políticas inseguras");

assert.match(contract, /exactamente siete días/u);
assert.match(contract, /Los tramos de .* se superponen/u);
assert.match(contract, /break_start_time/u);
assert.match(contract, /break_end_time/u);
assert.match(
  contract,
  /new Map<[\s\S]+string,[\s\S]+BusinessHourDayDefinition/u,
);
console.log("✓ el contrato valida días, tramos y pausas");

assert.match(repository, /createSupabaseAuthServerClient/u);
assert.match(repository, /BUSINESS_HOURS_SELECT[\s\S]+as const/u);
assert.doesNotMatch(repository, /BUSINESS_HOURS_SELECT = \[[\s\S]+\.join/u);
assert.match(repository, /\.eq\("business_id", businessId\)/u);
assert.doesNotMatch(repository, /service.role|service_role|SUPABASE_SERVICE/u);
assert.doesNotMatch(repository, /localStorage/u);
console.log("✓ la lectura servidor queda limitada al negocio activo");

assert.match(action, /^"use server";/u);
assert.match(action, /resolveActiveBusiness/u);
assert.match(action, /membership\.role !== "owner"/u);
assert.match(action, /membership\.role !== "admin"/u);
assert.match(action, /\.rpc\(\s*"replace_business_hours"/u);
assert.doesNotMatch(action, /service.role|service_role|SUPABASE_SERVICE/u);
console.log("✓ la Server Action revalida sesión, tenant y rol");

assert.match(page, /getBusinessHoursForBusiness/u);
assert.match(page, /businessHoursPersistence="supabase"/u);
assert.match(clientPage, /initialBusinessHours/u);
assert.match(clientPage, /mergeBusinessHoursEditor/u);
assert.match(clientPage, /saveBusinessHoursAction/u);
assert.match(clientPage, /saveStatus === "error"/u);
assert.match(
  clientPage,
  /function getClosingTimeOptions\(openTime: string\)/u,
);
assert.match(
  clientPage,
  /TIME_SELECT_OPTIONS\.length - 1/u,
);
assert.match(
  clientPage,
  /\(día siguiente\)/u,
);
assert.match(
  clientPage,
  /\(\+1 día\)/u,
);
assert.match(
  clientPage,
  /getClosingTimeOptions\(slot\.open\)\.map/u,
);
assert.doesNotMatch(
  clientPage,
  /type BusinessHourEditorDay as V2BusinessHourConfig/u,
);
assert.doesNotMatch(
  clientPage,
  /type BusinessHourEditorSlot as V2BusinessHourSlot/u,
);
console.log("✓ la UI conserva diseño y corta horarios a Supabase");

assert.match(remoteTest, /business A restaurado/u);
assert.match(remoteTest, /usuario A no puede escribir B/u);
assert.match(remoteTest, /anon no puede ejecutar la RPC/u);
assert.match(remoteTest, /direct DML remains blocked|DML directo sigue bloqueado/u);
console.log("✓ la prueba remota cubre BOLA, anon, DML y restauración");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:business-hours-write"],
  "node scripts/business-hours-write-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:test-business-hours-write"],
  "node scripts/business-hours-write-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:business-hours-write/u,
);
console.log("✓ pruebas local y remota están integradas");

for (const path of requiredFiles) {
  const content = await readFile(path, "utf8");

  for (const [index, line] of content.split(/\r?\n/u).entries()) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${path}, línea ${index + 1}`,
    );
  }
}
console.log("✓ archivos nuevos sin whitespace accidental");

console.log(
  "Todos los casos de escritura de horarios pasaron (14).",
);
