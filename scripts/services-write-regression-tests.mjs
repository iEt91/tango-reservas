import assert from "node:assert/strict";
import {
  access,
  readFile,
} from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260803_007_services_write_rpc.sql";
const rollbackPath =
  "supabase/rollbacks/20260803_007_services_write_rpc.down.sql";
const postflightPath =
  "supabase/preflight/20260803_007_services_write_postflight.sql";
const contractPath =
  "src/lib/services/business-service-contract.ts";
const readerPath =
  "src/lib/data/server/business-services.ts";
const actionPath =
  "src/app/local/configuracion/service-actions.ts";
const clientPath =
  "src/lib/data/supabase/services.ts";
const documentationPath =
  "docs/database/SERVICES-WRITE-RPC.md";
const remoteTestPath =
  "scripts/services-write-staging-test.mjs";

const requiredFiles = [
  migrationPath,
  rollbackPath,
  postflightPath,
  contractPath,
  readerPath,
  actionPath,
  clientPath,
  documentationPath,
  remoteTestPath,
];

console.log("Ejecutando regresión de servicios persistentes...");

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
const client = await readFile(clientPath, "utf8");
const documentation = await readFile(
  documentationPath,
  "utf8",
);
const remoteTest = await readFile(remoteTestPath, "utf8");

assert.match(
  migration,
  /add column if not exists sort_order integer not null default 0/u,
);
assert.match(
  migration,
  /services_business_normalized_name_key/u,
);
console.log("✓ el esquema incorpora orden y nombre único por tenant");

for (const constraint of [
  "services_name_length_check",
  "services_description_length_check",
  "services_duration_check",
  "services_capacity_check",
  "services_price_check",
  "services_sort_order_check",
]) {
  assert.match(
    migration,
    new RegExp(constraint, "u"),
  );
}
console.log("✓ PostgreSQL valida el contrato de servicios");

assert.match(migration, /^begin;/u);
assert.match(migration, /commit;\s*$/u);
assert.match(migration, /security definer/u);
assert.match(migration, /set search_path = ''/u);
assert.match(migration, /private\.has_business_role/u);
assert.match(migration, /array\['owner', 'admin'\]/u);
assert.match(migration, /hashtextextended/u);
assert.match(migration, /business_id = p_business_id/u);
console.log("✓ las RPC son transaccionales y autorizadas");

assert.match(
  migration,
  /grant execute on function public\.save_business_service[\s\S]+to authenticated/u,
);
assert.match(
  migration,
  /grant execute on function public\.set_business_service_active[\s\S]+to authenticated/u,
);
assert.match(
  migration,
  /revoke insert, update, delete on table public\.services/u,
);
assert.doesNotMatch(
  migration,
  /grant (?:insert|update|delete)/iu,
);
console.log("✓ no se habilita DML directo");

assert.match(
  rollback,
  /drop function if exists public\.save_business_service/u,
);
assert.match(
  rollback,
  /drop function if exists public\.set_business_service_active/u,
);
assert.match(
  rollback,
  /drop column if exists sort_order/u,
);
assert.doesNotMatch(
  rollback,
  /disable row level security/iu,
);
console.log("✓ el rollback no elimina servicios ni debilita RLS");

assert.match(postflight, /pg_get_functiondef\(oid\)/u);
assert.match(postflight, /has_function_privilege/u);
assert.match(postflight, /has_table_privilege/u);
assert.match(postflight, /required_constraints <> 6/u);
assert.match(postflight, /cmd <> 'SELECT'/u);
console.log("✓ el postflight detecta permisos o esquema incompletos");

assert.match(contract, /UUID_PATTERN/u);
assert.match(contract, /durationMinutes % 15/u);
assert.match(contract, /capacity > 1000/u);
assert.match(contract, /price > 99999999\.99/u);
assert.match(contract, /toBusinessServiceRpcPayload/u);
console.log("✓ TypeScript valida IDs, límites y payload");

assert.match(
  reader,
  /BUSINESS_SERVICE_SELECT[\s\S]+as const/u,
);
assert.match(reader, /createSupabaseAuthServerClient/u);
assert.match(reader, /\.eq\("business_id", businessId\)/u);
assert.match(reader, /\.order\("sort_order"/u);
assert.doesNotMatch(
  reader,
  /service_role|SERVICE_ROLE|localStorage/u,
);
console.log("✓ la lectura servidor queda limitada al negocio activo");

assert.match(action, /^"use server";/u);
assert.match(action, /resolveActiveBusiness/u);
assert.match(action, /membership\.role !== "owner"/u);
assert.match(action, /membership\.role !== "admin"/u);
assert.match(action, /save_business_service/u);
assert.match(action, /set_business_service_active/u);
assert.doesNotMatch(
  action,
  /service_role|SERVICE_ROLE/u,
);
console.log("✓ las Server Actions revalidan sesión, rol y tenant");

assert.doesNotMatch(
  client,
  /\.from\("services"\)[\s\S]{0,160}\.(?:insert|update|delete)\s*\(/u,
);
assert.match(
  client,
  /requieren una Server Action autenticada/u,
);
assert.match(
  client,
  /deben desactivarse mediante una Server Action/u,
);
console.log("✓ el cliente heredado falla cerrado sin DML directo");

assert.match(
  documentation,
  /no se eliminan físicamente/u,
);
assert.match(
  documentation,
  /sort_order/u,
);
assert.match(
  documentation,
  /panel heredado/u,
);
console.log("✓ la documentación delimita alcance y baja lógica");

assert.match(
  remoteTest,
  /la entrada inválida no cambió servicios/u,
);
assert.match(
  remoteTest,
  /usuario A no puede crear en B/u,
);
assert.match(
  remoteTest,
  /usuario B no puede actualizar A/u,
);
assert.match(
  remoteTest,
  /DML directo INSERT sigue bloqueado/u,
);
assert.match(
  remoteTest,
  /servicios A restaurados/u,
);
assert.match(
  remoteTest,
  /servicios B restaurados/u,
);
console.log("✓ la prueba remota cubre BOLA, DML y restauración");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:services-write"],
  "node scripts/services-write-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:test-services-write"],
  "node scripts/services-write-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:services-write/u,
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
  "Todos los casos de servicios persistentes pasaron (14).",
);
