import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260802_003_business_identity_read_rls.sql";
const rollbackPath =
  "supabase/rollbacks/20260802_003_business_identity_read_rls.down.sql";
const postflightPath =
  "supabase/preflight/20260802_003_business_identity_postflight.sql";
const documentationPath =
  "docs/database/BUSINESS-IDENTITY-RLS.md";

console.log("Ejecutando regresión RLS de identidad del negocio...");

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
assert.match(
  migration,
  /create policy businesses_select_active_member/iu,
);
assert.match(
  migration,
  /create policy profiles_select_self_or_manager/iu,
);
console.log("✓ la migración es transaccional y crea dos políticas SELECT");

assert.match(
  migration,
  /businesses_select_active_member[\s\S]+array\['owner', 'admin', 'staff'\]::text\[\]/iu,
);
assert.match(
  migration,
  /profiles_select_self_or_manager[\s\S]+auth_user_id = \(select auth\.uid\(\)\)/iu,
);
assert.match(
  migration,
  /profiles_select_self_or_manager[\s\S]+array\['owner', 'admin'\]::text\[\]/iu,
);
console.log("✓ negocio, perfil propio y lectura de managers usan roles activos");

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
console.log("✓ reutiliza el helper privado sin crear funciones nuevas");

for (const table of ["businesses", "profiles"]) {
  assert.match(
    migration,
    new RegExp(
      `revoke all on table public\\.${table} from anon`,
      "iu",
    ),
  );
  assert.match(
    migration,
    new RegExp(
      `revoke all on table public\\.${table} from authenticated`,
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
}
assert.doesNotMatch(
  migration,
  /grant\s+(insert|update|delete|all)/iu,
);
console.log("✓ anon queda bloqueado y authenticated recibe solo SELECT");

const rollback = await readFile(rollbackPath, "utf8");
assert.match(
  rollback,
  /drop policy if exists profiles_select_self_or_manager/iu,
);
assert.match(
  rollback,
  /drop policy if exists businesses_select_active_member/iu,
);
assert.doesNotMatch(
  rollback,
  /disable row level security|no force row level security/iu,
);
console.log("✓ el rollback elimina acceso sin debilitar RLS");

const postflight = await readFile(postflightPath, "utf8");
assert.match(postflight, /relrowsecurity/iu);
assert.match(postflight, /relforcerowsecurity/iu);
assert.match(postflight, /authenticated no tiene exactamente dos grants SELECT/iu);
assert.match(postflight, /privilegios de escritura/iu);
assert.match(postflight, /'PASS' as result/iu);
console.log("✓ el postflight falla ante políticas o grants inseguros");

const remoteTest = await readFile(
  "scripts/supabase-isolation-test.mjs",
  "utf8",
);
assert.match(remoteTest, /assertOwnBusinessRow/u);
assert.match(remoteTest, /assertOwnProfileRow/u);
assert.match(remoteTest, /assertCrossRowHidden/u);
assert.match(remoteTest, /assertBusinessIdentityWritesDenied/u);
assert.match(remoteTest, /las tablas restantes siguen default deny/u);
assert.doesNotMatch(remoteTest, /SUPABASE_SERVICE_ROLE_KEY/u);
console.log("✓ la prueba remota cubre BOLA, perfiles y escrituras");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:business-identity-rls"],
  "node scripts/business-identity-rls-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:business-identity-rls/u,
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

console.log("Todos los casos RLS de identidad pasaron (8).");
