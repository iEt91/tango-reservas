import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const initialMigrationPath =
  "supabase/migrations/20260802_001_initial_schema_lockdown.sql";
const migrationPath =
  "supabase/migrations/20260802_002_business_members_and_rls.sql";
const initialRollbackPath =
  "supabase/rollbacks/20260802_001_initial_schema_lockdown.down.sql";
const rollbackPath =
  "supabase/rollbacks/20260802_002_business_members_and_rls.down.sql";
const rolloutPath = "docs/database/SECURITY-ROLLOUT.md";
const roleContractPath = "src/lib/auth/business-access.ts";

console.log("Ejecutando regresión de seguridad multiempresa...");

for (const path of [
  initialMigrationPath,
  migrationPath,
  initialRollbackPath,
  rollbackPath,
  rolloutPath,
  roleContractPath,
]) {
  await access(path);
}
console.log(
  "✓ existen historial inicial, membresías, rollbacks y contratos",
);

const initialMigration = await readFile(
  initialMigrationPath,
  "utf8",
);
const migration = await readFile(migrationPath, "utf8");

assert.match(initialMigration, /^begin;/iu);
assert.match(initialMigration, /commit;\s*$/iu);
assert.match(
  initialMigration,
  /create table if not exists public\.businesses/iu,
);
assert.match(
  initialMigration,
  /create table if not exists public\.profiles/iu,
);
assert.match(
  initialMigration,
  /references auth\.users\(id\)/iu,
);
assert.match(
  initialMigration,
  /alter table public\.businesses enable row level security/iu,
);
assert.match(
  initialMigration,
  /alter table public\.businesses force row level security/iu,
);
assert.match(
  initialMigration,
  /revoke all on table public\.businesses from anon, authenticated/iu,
);
console.log(
  "✓ el esquema inicial nace bloqueado y vinculado con Auth",
);

assert.match(migration, /^begin;/iu);
assert.match(migration, /commit;\s*$/iu);
assert.match(
  migration,
  /create table if not exists public\.business_members/iu,
);
assert.match(
  migration,
  /references public\.businesses\(id\)/iu,
);
assert.match(
  migration,
  /references auth\.users\(id\)/iu,
);
assert.match(
  migration,
  /unique\s*\(\s*business_id\s*,\s*user_id\s*\)/iu,
);
console.log(
  "✓ la migración 002 vincula membresías con negocio y Auth",
);

for (const role of ["owner", "admin", "staff"]) {
  assert.match(migration, new RegExp(`'${role}'`, "u"));
}
for (const status of ["active", "invited", "disabled"]) {
  assert.match(migration, new RegExp(`'${status}'`, "u"));
}
assert.match(
  migration,
  /insert into public\.business_members[\s\S]+from public\.profiles/iu,
);
console.log("✓ roles, estados y backfill están definidos");

assert.match(
  migration,
  /create schema if not exists private/iu,
);
for (const functionName of [
  "has_business_role",
  "tango_set_updated_at",
]) {
  assert.match(
    migration,
    new RegExp(`function private\\.${functionName}`, "iu"),
  );
  assert.doesNotMatch(
    migration,
    new RegExp(
      `create or replace function public\\.${functionName}`,
      "iu",
    ),
  );
}
assert.match(migration, /security definer/iu);
assert.match(migration, /set search_path = ''/giu);
assert.match(
  migration,
  /revoke all on schema private from public/iu,
);
assert.doesNotMatch(
  migration,
  /create or replace function private\.(current_business_role|is_business_member)/iu,
);
console.log(
  "✓ solo permanecen los helpers privados estrictamente necesarios",
);

assert.match(
  migration,
  /alter table public\.business_members enable row level security/iu,
);
assert.match(
  migration,
  /alter table public\.business_members force row level security/iu,
);
assert.match(
  migration,
  /create policy business_members_select_own_or_manager/iu,
);
assert.match(
  migration,
  /\(select auth\.uid\(\)\) is not null/iu,
);
assert.match(
  migration,
  /select private\.has_business_role/iu,
);
assert.match(
  migration,
  /revoke all on table public\.business_members from authenticated/iu,
);
assert.match(
  migration,
  /grant select on table public\.business_members to authenticated/iu,
);
console.log("✓ RLS permite solo lectura autenticada autorizada");

for (const operationalTable of [
  "businesses",
  "reservations",
  "customers",
  "services",
]) {
  assert.doesNotMatch(
    migration,
    new RegExp(
      `alter table public\\.${operationalTable} enable row level security`,
      "iu",
    ),
  );
}
console.log(
  "✓ la migración 002 no reconfigura tablas operativas",
);

const initialRollback = await readFile(
  initialRollbackPath,
  "utf8",
);
const rollback = await readFile(rollbackPath, "utf8");

assert.match(
  initialRollback,
  /drop table if exists public\.businesses/iu,
);
assert.match(
  rollback,
  /drop policy if exists business_members_select_own_or_manager/iu,
);
assert.match(
  rollback,
  /drop table if exists public\.business_members/iu,
);
assert.match(
  rollback,
  /drop function if exists private\.has_business_role/iu,
);
assert.match(rollback, /drop schema if exists private/iu);
console.log("✓ los rollbacks corresponden a cada migración");

const roleContract = await readFile(
  roleContractPath,
  "utf8",
);
assert.match(
  roleContract,
  /BUSINESS_ROLES = \["owner", "admin", "staff"\] as const/u,
);
assert.match(roleContract, /canManageBusinessMembers/u);
assert.match(roleContract, /hasMinimumBusinessRole/u);
console.log("✓ TypeScript comparte el contrato de roles");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:database-security"],
  "node scripts/database-security-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:database-security/u,
);
console.log("✓ la seguridad multiempresa está integrada al QA");

for (const path of [
  initialMigrationPath,
  migrationPath,
  initialRollbackPath,
  rollbackPath,
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

const obsoleteName = [
  "20260802",
  "001",
  "business",
  "members",
  "and",
  "rls",
].join("_");
const obsoletePaths = [
  `supabase/migrations/${obsoleteName}.sql`,
  `supabase/rollbacks/${obsoleteName}.down.sql`,
];

for (const path of obsoletePaths) {
  await assert.rejects(
    access(path),
    (error) => error?.code === "ENOENT",
    `el archivo obsoleto todavía existe: ${path}`,
  );
}
console.log("✓ no quedan archivos con el nombre de migración eliminado");

console.log(
  "Todos los casos de seguridad multiempresa pasaron (8).",
);
