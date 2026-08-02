import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260802_001_business_members_and_rls.sql";
const rollbackPath =
  "supabase/rollbacks/20260802_001_business_members_and_rls.down.sql";
const rolloutPath = "docs/database/SECURITY-ROLLOUT.md";
const roleContractPath = "src/lib/auth/business-access.ts";

console.log("Ejecutando regresión de seguridad multiempresa...");

for (const path of [
  migrationPath,
  rollbackPath,
  rolloutPath,
  roleContractPath,
]) {
  await access(path);
}
console.log("✓ existen migración, rollback, guía y contrato de roles");

const migration = await readFile(migrationPath, "utf8");

assert.match(migration, /^begin;/i);
assert.match(migration, /commit;\s*$/i);
assert.match(
  migration,
  /create table if not exists public\.business_members/i,
);
assert.match(
  migration,
  /business_id uuid not null references public\.businesses/i,
);
assert.match(migration, /user_id uuid references auth\.users/i);
assert.match(
  migration,
  /unique\s*\(\s*business_id\s*,\s*user_id\s*\)/i,
);
console.log("✓ la migración es transaccional y vincula negocio con auth.users");

for (const role of ["owner", "admin", "staff"]) {
  assert.match(migration, new RegExp(`'${role}'`));
}
for (const status of ["active", "invited", "disabled"]) {
  assert.match(migration, new RegExp(`'${status}'`));
}
assert.match(
  migration,
  /insert into public\.business_members[\s\S]+from public\.profiles/i,
);
console.log("✓ roles, estados y backfill desde profiles están definidos");

for (const functionName of [
  "current_business_role",
  "is_business_member",
  "has_business_role",
]) {
  assert.match(
    migration,
    new RegExp(`function public\\.${functionName}`, "i"),
  );
}
assert.match(migration, /security definer/gi);
assert.match(migration, /set search_path = public, pg_temp/gi);
assert.match(
  migration,
  /revoke all on function public\.has_business_role/i,
);
console.log("✓ los helpers fijan contexto y restringen su ejecución");

assert.match(
  migration,
  /alter table public\.business_members enable row level security/i,
);
assert.match(
  migration,
  /create policy business_members_select_own_or_manager/i,
);
assert.match(migration, /user_id = auth\.uid\(\)/i);
assert.match(
  migration,
  /revoke all on table public\.business_members from anon/i,
);
assert.match(
  migration,
  /revoke insert, update, delete on table public\.business_members[\s\S]+from authenticated/i,
);
console.log("✓ RLS protege membresías y bloquea escrituras directas");

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
      "i",
    ),
  );
}
console.log("✓ la entrega no bloquea todavía las tablas operativas");

const rollback = await readFile(rollbackPath, "utf8");
assert.match(
  rollback,
  /drop policy if exists business_members_select_own_or_manager/i,
);
assert.match(
  rollback,
  /drop table if exists public\.business_members/i,
);
assert.match(
  rollback,
  /drop function if exists public\.has_business_role/i,
);
console.log("✓ el rollback revierte únicamente el bloque nuevo");

const roleContract = await readFile(roleContractPath, "utf8");
assert.match(
  roleContract,
  /BUSINESS_ROLES = \["owner", "admin", "staff"\] as const/,
);
assert.match(roleContract, /canManageBusinessMembers/);
assert.match(roleContract, /hasMinimumBusinessRole/);
console.log("✓ TypeScript comparte el mismo contrato de roles");

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(
  packageJson.scripts?.["test:database-security"],
  "node scripts/database-security-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:database-security/,
);
console.log("✓ la seguridad multiempresa está integrada al QA");

for (const [lineNumber, line] of migration.split("\n").entries()) {
  assert.equal(
    line.replace(/\s+$/u, ""),
    line,
    `espacio final en migración, línea ${lineNumber + 1}`,
  );
}
console.log("✓ la migración no contiene whitespace accidental");

console.log("Todos los casos de seguridad multiempresa pasaron (8).");
