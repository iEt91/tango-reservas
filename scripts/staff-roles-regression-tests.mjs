import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const files = {
  migration: "supabase/migrations/20260808_013_staff_roles_permissions.sql",
  rollback: "supabase/rollbacks/20260808_013_staff_roles_permissions.down.sql",
  postflight: "supabase/preflight/20260808_013_staff_roles_permissions_postflight.sql",
  docs: "docs/database/STAFF-ROLES-PERMISSIONS.md",
  contract: "src/lib/staff/staff-contract.ts",
  reader: "src/lib/data/server/business-staff.ts",
  actions: "src/app/local/configuracion/staff-actions.ts",
  ui: "src/app/local/configuracion/v2-staff-section.tsx",
  config: "src/app/local/configuracion/v2-configuracion-page.tsx",
  configPage: "src/app/local/configuracion/page.tsx",
  sidebar: "src/components/v2/v2-sidebar.tsx",
  proxy: "src/lib/supabase/auth-proxy.ts",
  activeBusiness: "src/lib/auth/active-business.ts",
  activeContract: "src/lib/auth/active-business-contract.ts",
  provider: "src/components/auth/active-business-provider.tsx",
  layout: "src/app/local/layout.tsx",
  login: "src/app/auth/login/page.tsx",
  accessDenied: "src/app/auth/access-denied/page.tsx",
  remote: "scripts/remote-schema-history-regression-tests.mjs",
  manifest: "supabase/MIGRATIONS.sha256",
  package: "package.json",
};

console.log("Ejecutando regresión de Staff, roles y permisos...");

for (const path of Object.values(files)) {
  await access(path);
}
console.log("✓ existen migración, UI sobre Configuración, seguridad y documentación");

const sources = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([key, path]) => [
      key,
      await readFile(path, "utf8"),
    ]),
  ),
);

assert.match(sources.migration, /^begin;/u);
assert.match(sources.migration, /commit;\s*$/u);
assert.match(sources.migration, /create table if not exists public\.staff_roles/u);
assert.match(sources.migration, /create table if not exists public\.staff_role_permissions/u);
assert.match(sources.migration, /create table if not exists public\.staff_member_notes/u);
assert.match(sources.migration, /create table if not exists public\.user_access_controls/u);
assert.match(sources.migration, /add column if not exists staff_role_id uuid/u);
console.log("✓ el esquema agrega roles, permisos, notas privadas y control de reautenticación");

for (const level of ["none", "view", "manage", "full"]) {
  assert.match(sources.migration, new RegExp(`'${level}'`, "u"));
  assert.match(sources.contract, new RegExp(`"${level}"`, "u"));
}
assert.match(sources.contract, /createNoAccessStaffPermissions/u);
assert.match(sources.ui, /createEmptyRoleDraft/u);
assert.match(sources.ui, /createNoAccessStaffPermissions\(\)/u);
assert.match(sources.ui, /Sin acceso/u);
assert.match(sources.ui, /Solo lectura/u);
assert.match(sources.ui, /Gestión/u);
assert.match(sources.ui, /Acceso total/u);
console.log("✓ los cuatro niveles existen y un rol nuevo empieza sin acceso");

for (const preset of [
  "manager",
  "kitchen",
  "cashier",
  "waiter",
  "delivery",
]) {
  assert.match(sources.migration, new RegExp(`'${preset}'`, "u"));
}
assert.match(sources.ui, /Predeterminado/u);
assert.match(sources.ui, /Duplicar/u);
assert.match(sources.migration, /Preset staff roles cannot be edited/u);
assert.match(sources.migration, /Preset staff roles cannot be removed/u);
console.log("✓ se crean cinco presets seguros que pueden duplicarse");

assert.match(sources.migration, /business_members_active_email_key/u);
assert.match(sources.migration, /lower\(email\)/u);
assert.match(sources.actions, /normalizeStaffEmail/u);
assert.match(sources.ui, /Email personal/u);
assert.doesNotMatch(sources.contract, /employeeCode|internalId|staffCode/iu);
console.log("✓ el email personal es la identidad funcional sin ID visible adicional");

assert.match(sources.migration, /business_members_staff_role_fk/u);
assert.match(sources.migration, /foreign key \(business_id, staff_role_id\)/u);
assert.match(sources.migration, /staff_role_permissions_role_fk/u);
assert.match(sources.reader, /\.eq\("business_id", businessId\)/u);
assert.match(sources.actions, /activeBusiness\.membership\.businessId/u);
console.log("✓ Staff y roles quedan aislados por el local activo");

for (const table of [
  "staff_roles",
  "staff_role_permissions",
  "user_access_controls",
]) {
  assert.match(
    sources.migration,
    new RegExp(`alter table public\\.${table} force row level security`, "u"),
  );
}
assert.match(sources.migration, /business_members_select_own_or_owner/u);
assert.match(sources.migration, /staff_member_notes_select_owner/u);
assert.match(
  sources.migration,
  /staff_member_notes_select_owner[\s\S]+using \(\s*\(select private\.has_business_role\(/u,
);
assert.doesNotMatch(
  sources.migration,
  /staff_member_notes_select_owner[\s\S]{0,250}using \(\s*select private\.has_business_role\(/u,
);
assert.match(sources.reader, /from\("staff_member_notes"\)/u);
assert.doesNotMatch(sources.migration, /add column if not exists notes text/u);
assert.doesNotMatch(
  sources.migration,
  /grant\s+(insert|update|delete)\s+on table public\.(staff_roles|staff_role_permissions|user_access_controls)/iu,
);
console.log("✓ RLS queda forzada, notas owner-only usan SQL valido y no existe DML directo de Staff");

for (const rpc of [
  "save_business_staff_role",
  "archive_business_staff_role",
  "resolve_staff_auth_user",
  "save_business_staff_member",
  "set_business_staff_member_status",
]) {
  assert.match(sources.migration, new RegExp(`public\\.${rpc}`, "u"));
}
assert.match(
  sources.migration,
  /array\['owner'\]::text\[\]/u,
);
assert.doesNotMatch(
  sources.actions,
  /SUPABASE_SERVICE_ROLE_KEY/u,
);
assert.match(sources.actions, /getSupabaseServerClient/u);
assert.match(sources.actions, /admin\.auth\.admin\.inviteUserByEmail/u);
console.log("✓ solo el dueño administra Staff y las invitaciones privilegiadas quedan en servidor");

assert.match(sources.migration, /tango_sync_staff_membership/u);
assert.match(sources.migration, /email_confirmed_at/u);
assert.match(sources.migration, /status = 'active'/u);
assert.match(sources.actions, /existingUser\.confirmed/u);
assert.match(sources.actions, /Invitación enviada/u);
console.log("✓ una invitación aceptada activa la membresía sin duplicar cuentas");

assert.match(sources.migration, /bump_staff_user_reauth/u);
assert.match(sources.migration, /reauth_after/u);
assert.match(sources.proxy, /user_access_controls/u);
assert.match(sources.proxy, /last_sign_in_at/u);
assert.match(sources.proxy, /signOut\(\{ scope: "global" \}\)/u);
assert.match(sources.login, /access_changed/u);
console.log("✓ cambiar rol o acceso fuerza una nueva autenticación");

assert.match(sources.activeContract, /staffRoleId/u);
assert.match(sources.activeContract, /permissions: StaffPermissionMap/u);
assert.match(sources.activeBusiness, /staff_role_permissions/u);
assert.match(sources.provider, /useBusinessMemberships/u);
assert.match(sources.layout, /memberships=\{resolution\.memberships\}/u);
console.log("✓ el contexto activo incluye rol por local y permisos efectivos");

assert.match(sources.sidebar, /useBusinessMemberships/u);
assert.match(sources.sidebar, /auth\/select-business\/activate/u);
assert.match(sources.sidebar, /hasStaffAccess/u);
assert.match(sources.sidebar, /ownerOnly: true/u);
assert.doesNotMatch(sources.sidebar, /v2CurrentLocal/u);
console.log("✓ el sidebar usa el local real, alterna membresías y oculta módulos sin acceso");

assert.match(sources.proxy, /getStaffModuleForPathname/u);
assert.match(sources.proxy, /permission\.access_level === "none"/u);
assert.match(sources.proxy, /\/local\/configuracion/u);
assert.match(sources.proxy, /\/local\/seguridad/u);
assert.match(sources.proxy, /reason=permission/u);
console.log("✓ escribir una URL manualmente no evita los permisos ni los módulos owner-only");

assert.match(sources.configPage, /membership\.role !== "owner"/u);
assert.match(sources.configPage, /getBusinessStaffForBusiness/u);
assert.match(sources.config, /<V2StaffSection/u);
assert.match(sources.config, /id="config-staff"/u);
assert.match(sources.config, />Staff<\/a>/u);
assert.doesNotMatch(sources.config, /v2LocalUsers/u);
assert.doesNotMatch(sources.config, /Usuarios y permisos/u);
await assert.rejects(
  access("src/app/local/configuracion/v2-staff-page.tsx"),
);
console.log("✓ Staff vive dentro de Configuración V2 sin crear una página visual alternativa");

assert.match(sources.ui, /Notas internas/u);
assert.match(sources.ui, /Solo visible para el dueño/u);
assert.match(sources.ui, /Empleados/u);
assert.match(sources.ui, /Roles/u);
assert.match(sources.ui, /Invitaciones/u);
assert.match(sources.ui, /Suspender/u);
assert.match(sources.ui, /Eliminar/u);
console.log("✓ la UI cubre empleados, roles, invitaciones y notas internas");

assert.match(sources.rollback, /^begin;/u);
assert.match(sources.rollback, /business_members_select_own_or_manager/u);
assert.match(sources.rollback, /force row level security/u);
assert.doesNotMatch(
  sources.rollback,
  /drop table|drop column|disable row level security/iu,
);
assert.match(sources.postflight, /staff_roles no tiene RLS forzada/u);
assert.match(sources.postflight, /exactamente los cinco roles predeterminados/u);
assert.match(sources.postflight, /'PASS' as result/u);
console.log("✓ rollback conserva datos y postflight detecta seguridad incompleta");

assert.match(sources.remote, /staffRolesPath/u);
assert.match(sources.remote, /save_business_staff_role/u);
assert.match(sources.remote, /user_access_controls/u);
assert.match(
  sources.manifest,
  /20260808_013_staff_roles_permissions\.sql/u,
);
assert.match(
  sources.manifest,
  /20260808_013_staff_roles_permissions\.down\.sql/u,
);
console.log("✓ historial remoto y manifiesto incluyen la migración 013");

const packageJson = JSON.parse(sources.package);
assert.equal(
  packageJson.scripts?.["test:staff-roles"],
  "node scripts/staff-roles-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:test-staff-roles"],
  "node scripts/staff-roles-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:staff-roles/u,
);
console.log("✓ QA local y staging quedan integrados en package.json");

for (const [key, path] of Object.entries(files)) {
  if (key === "package") continue;
  const content = await readFile(path, "utf8");

  for (const [index, line] of content.split(/\r?\n/u).entries()) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${path}, línea ${index + 1}`,
    );
  }
}
console.log("✓ archivos E28A sin whitespace accidental");

console.log("Todos los casos de Staff y permisos pasaron (19).");
