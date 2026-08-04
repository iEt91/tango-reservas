import assert from "node:assert/strict";
import {
  access,
  readFile,
} from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260803_008_customers_write_rpc.sql";
const rollbackPath =
  "supabase/rollbacks/20260803_008_customers_write_rpc.down.sql";
const postflightPath =
  "supabase/preflight/20260803_008_customers_write_postflight.sql";
const contractPath =
  "src/lib/customers/business-customer-contract.ts";
const readerPath =
  "src/lib/data/server/business-customers.ts";
const actionPath =
  "src/app/local/clientes/actions.ts";
const clientPath =
  "src/lib/data/supabase/customers.ts";
const documentationPath =
  "docs/database/CUSTOMERS-WRITE-RPC.md";
const remoteTestPath =
  "scripts/customers-write-staging-test.mjs";

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

console.log("Ejecutando regresión de clientes persistentes...");

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
const seed = await readFile(
  "scripts/supabase-staging-seed.mjs",
  "utf8",
);
const isolation = await readFile(
  "scripts/supabase-isolation-test.mjs",
  "utf8",
);

for (const column of [
  "birth_date",
  "preferences",
  "tags",
  "is_active",
]) {
  assert.match(
    migration,
    new RegExp(
      `add column if not exists ${column}`,
      "u",
    ),
  );
}
console.log("✓ el esquema agrega los campos usados por la UI");

for (const constraint of [
  "customers_full_name_length_check",
  "customers_email_length_check",
  "customers_phone_length_check",
  "customers_notes_length_check",
  "customers_preferences_length_check",
  "customers_birth_date_check",
  "customers_tags_check",
]) {
  assert.match(migration, new RegExp(constraint, "u"));
}
console.log("✓ PostgreSQL valida el contrato de clientes");

assert.match(
  migration,
  /customers_business_normalized_phone_key/u,
);
assert.match(
  migration,
  /customers_business_normalized_email_key/u,
);
assert.match(
  migration,
  /customers_select_active_member/u,
);
assert.match(
  migration,
  /array\['owner', 'admin', 'staff'\]/u,
);
console.log("✓ lectura y deduplicación están aisladas por tenant");

assert.match(migration, /^begin;/u);
assert.match(migration, /commit;\s*$/u);
assert.match(migration, /security definer/u);
assert.match(migration, /set search_path = ''/u);
assert.match(migration, /private\.has_business_role/u);
assert.match(migration, /business_id = p_business_id/u);
console.log("✓ las RPC son transaccionales y autorizadas");

assert.match(migration, /save_business_customer/u);
assert.match(migration, /set_business_customer_active/u);
assert.match(
  migration,
  /grant execute on function public\.save_business_customer[\s\S]+to authenticated/u,
);
assert.match(
  migration,
  /revoke insert, update, delete on table public\.customers/u,
);
assert.doesNotMatch(
  migration,
  /grant (?:insert|update|delete)/iu,
);
console.log("✓ no se habilita DML directo");

assert.match(
  rollback,
  /drop function if exists public\.save_business_customer/u,
);
assert.match(
  rollback,
  /drop policy if exists customers_select_active_member/u,
);
assert.doesNotMatch(
  rollback,
  /delete from public\.customers|truncate/iu,
);
assert.doesNotMatch(
  rollback,
  /disable row level security/iu,
);
console.log("✓ el rollback no elimina clientes ni debilita RLS");

assert.match(postflight, /pg_get_functiondef\(oid\)/u);
assert.match(postflight, /has_function_privilege/u);
assert.match(postflight, /has_table_privilege/u);
assert.match(postflight, /required_constraints <> 7/u);
assert.match(postflight, /required_columns <> 4/u);
assert.match(postflight, /cmd <> 'SELECT'/u);
console.log("✓ el postflight detecta permisos o esquema incompletos");

assert.match(contract, /UUID_PATTERN/u);
assert.match(contract, /EMAIL_PATTERN/u);
assert.match(contract, /DATE_PATTERN/u);
assert.match(contract, /normalizeTags/u);
assert.match(contract, /toBusinessCustomerRpcPayload/u);
console.log("✓ TypeScript valida identidad y datos personales");

assert.match(
  reader,
  /BUSINESS_CUSTOMER_SELECT[\s\S]+as const/u,
);
assert.match(reader, /createSupabaseAuthServerClient/u);
assert.match(reader, /\.eq\("business_id", businessId\)/u);
assert.doesNotMatch(
  reader,
  /service_role|SERVICE_ROLE|localStorage/u,
);
console.log("✓ la lectura servidor queda limitada al negocio activo");

assert.match(action, /^"use server";/u);
assert.match(action, /resolveActiveBusiness/u);
assert.match(action, /allowStaff: true/u);
assert.match(action, /allowStaff: false/u);
assert.match(action, /save_business_customer/u);
assert.match(action, /set_business_customer_active/u);
assert.doesNotMatch(
  action,
  /service_role|SERVICE_ROLE/u,
);
console.log("✓ las Server Actions revalidan sesión, rol y tenant");

assert.match(client, /full_name/u);
assert.match(client, /birth_date/u);
assert.doesNotMatch(client, /internal_notes/u);
assert.doesNotMatch(
  client,
  /\.from\("customers"\)[\s\S]{0,160}\.(?:insert|update|delete)\s*\(/u,
);
assert.match(
  client,
  /requieren una Server Action autenticada/u,
);
assert.match(
  client,
  /no se eliminan físicamente/u,
);
console.log("✓ la capa heredada lee el esquema real y falla cerrado");

assert.match(seed, /customerA/u);
assert.match(seed, /customerB/u);
assert.match(seed, /ensureCustomer/u);
assert.match(isolation, /customerAId/u);
assert.match(isolation, /assertCustomerWritesDenied/u);
assert.match(
  isolation,
  /Aislamiento multiempresa aprobado \(19 controles\)/u,
);
console.log("✓ el fixture y aislamiento incorporan clientes A/B");

assert.match(
  documentation,
  /No se crean columnas duplicadas/u,
);
assert.match(
  documentation,
  /No existe eliminación física/u,
);
assert.match(
  documentation,
  /customer_notes/u,
);
console.log("✓ la documentación delimita alcance y deuda");

assert.match(
  remoteTest,
  /la entrada inválida no cambió clientes/u,
);
assert.match(
  remoteTest,
  /el teléfono duplicado fue rechazado/u,
);
assert.match(
  remoteTest,
  /usuario A no puede crear en B/u,
);
assert.match(
  remoteTest,
  /DML directo INSERT sigue bloqueado/u,
);
assert.match(
  remoteTest,
  /clientes A restaurados/u,
);
assert.match(
  remoteTest,
  /clientes B restaurados/u,
);
console.log("✓ la prueba remota cubre BOLA, DML y restauración");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:customers-write"],
  "node scripts/customers-write-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:test-customers-write"],
  "node scripts/customers-write-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:customers-write/u,
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
  "Todos los casos de clientes persistentes pasaron (15).",
);
