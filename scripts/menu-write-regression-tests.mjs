import assert from "node:assert/strict";
import {
  access,
  readFile,
} from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260806_011_menu_write_rpc.sql";
const rollbackPath =
  "supabase/rollbacks/20260806_011_menu_write_rpc.down.sql";
const postflightPath =
  "supabase/preflight/20260806_011_menu_write_postflight.sql";
const contractPath =
  "src/lib/menu/business-menu-contract.ts";
const readerPath =
  "src/lib/data/server/business-menu.ts";
const actionPath =
  "src/app/local/menu/actions.ts";
const documentationPath =
  "docs/database/MENU-WRITE-RPC.md";
const remoteTestPath =
  "scripts/menu-write-staging-test.mjs";

const requiredFiles = [
  migrationPath,
  rollbackPath,
  postflightPath,
  contractPath,
  readerPath,
  actionPath,
  documentationPath,
  remoteTestPath,
];

console.log(
  "Ejecutando regresión del backend persistente de menú...",
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
const documentation = await readFile(
  documentationPath,
  "utf8",
);
const remoteTest = await readFile(
  remoteTestPath,
  "utf8",
);

for (const table of [
  "menu_categories",
  "menu_items",
]) {
  assert.match(
    migration,
    new RegExp(
      `create table if not exists public\\.${table}`,
      "u",
    ),
  );
  assert.match(
    migration,
    new RegExp(
      `alter table public\\.${table} force row level security`,
      "u",
    ),
  );
}
console.log(
  "✓ el esquema crea categorías y productos aislados",
);

for (const constraint of [
  "menu_categories_name_length_check",
  "menu_categories_sort_order_check",
  "menu_items_category_tenant_fk",
  "menu_items_price_check",
  "menu_items_image_url_length_check",
]) {
  assert.match(
    migration,
    new RegExp(constraint, "u"),
  );
}
console.log(
  "✓ PostgreSQL impone tenant límites y contrato comercial",
);

for (const policy of [
  "menu_categories_select_active_member",
  "menu_items_select_active_member",
]) {
  assert.match(
    migration,
    new RegExp(policy, "u"),
  );
}
assert.match(
  migration,
  /array\['owner', 'admin', 'staff'\]/u,
);
console.log(
  "✓ RLS permite lectura solo a miembros activos",
);

for (const rpc of [
  "save_business_menu_category",
  "archive_business_menu_category",
  "reorder_business_menu_categories",
  "save_business_menu_item",
  "archive_business_menu_item",
  "save_business_menu_item_quick_changes",
]) {
  assert.match(
    migration,
    new RegExp(rpc, "u"),
  );
}
assert.match(migration, /security definer/u);
assert.match(migration, /set search_path = ''/u);
assert.match(
  migration,
  /private\.has_business_role/u,
);
assert.match(
  migration,
  /array\['owner', 'admin'\]/u,
);
assert.match(
  migration,
  /pg_advisory_xact_lock/u,
);
console.log(
  "✓ las RPC son transaccionales y autorizadas",
);

assert.match(
  migration,
  /reorder_business_menu_categories[\s\S]+with ordinality/u,
);
assert.match(
  migration,
  /save_business_menu_item_quick_changes[\s\S]+jsonb_array_elements/u,
);
assert.match(
  migration,
  /Menu quick changes contain duplicates/u,
);
console.log(
  "✓ orden y cambios rápidos son atómicos",
);

assert.match(
  migration,
  /grant select on table public\.menu_categories/u,
);
assert.match(
  migration,
  /grant execute on function public\.save_business_menu_item/u,
);
assert.match(
  migration,
  /revoke insert, update, delete[\s\S]+public\.menu_items/u,
);
assert.doesNotMatch(
  migration,
  /grant (?:insert|update|delete)/iu,
);
console.log(
  "✓ no se habilita DML directo",
);

assert.match(
  rollback,
  /drop function if exists public\.save_business_menu_category/u,
);
assert.match(
  rollback,
  /drop function if exists public\.save_business_menu_item/u,
);
assert.match(
  rollback,
  /force row level security/u,
);
assert.doesNotMatch(
  rollback,
  /drop table|disable row level security/iu,
);
console.log(
  "✓ el rollback conserva datos y restaura default deny",
);

assert.match(
  postflight,
  /pg_get_functiondef/u,
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
  /constraint_count <> 9/u,
);
assert.match(
  postflight,
  /cmd <> 'SELECT'/u,
);
console.log(
  "✓ el postflight detecta esquema o permisos inseguros",
);

assert.match(contract, /UUID_PATTERN/u);
assert.match(
  contract,
  /normalizeBusinessMenuCategory/u,
);
assert.match(
  contract,
  /normalizeBusinessMenuItem/u,
);
assert.match(
  contract,
  /normalizeBusinessMenuQuickChanges/u,
);
assert.match(
  contract,
  /toBusinessMenuItemRpcPayload/u,
);
console.log(
  "✓ TypeScript valida IDs precios y lotes",
);

assert.match(
  reader,
  /getBusinessMenuForBusiness/u,
);
assert.match(
  reader,
  /\.eq\("business_id", businessId\)/u,
);
assert.match(
  reader,
  /\.is\("archived_at", null\)/u,
);
assert.doesNotMatch(
  reader,
  /service_role|SERVICE_ROLE|localStorage/u,
);
console.log(
  "✓ la lectura servidor queda aislada por negocio",
);

assert.match(action, /^"use server";/u);
assert.match(
  action,
  /resolveActiveBusiness/u,
);
assert.match(
  action,
  /membership\.role !== "owner"/u,
);
assert.match(
  action,
  /membership\.role !== "admin"/u,
);
assert.match(
  action,
  /save_business_menu_category/u,
);
assert.match(
  action,
  /save_business_menu_item_quick_changes/u,
);
assert.doesNotMatch(
  action,
  /service_role|SERVICE_ROLE|\.from\(/u,
);
console.log(
  "✓ las Server Actions revalidan sesión rol y tenant",
);

assert.match(
  remoteTest,
  /usuario A no puede crear en B/u,
);
assert.match(
  remoteTest,
  /usuario B no puede modificar A/u,
);
assert.match(
  remoteTest,
  /DML directo de categorías sigue bloqueado/u,
);
assert.match(
  remoteTest,
  /menú A restaurado/u,
);
assert.match(
  remoteTest,
  /menú B restaurado/u,
);
console.log(
  "✓ la prueba remota cubre BOLA DML y restauración",
);

assert.match(
  documentation,
  /Entrega 26/u,
);
assert.match(
  documentation,
  /la interfaz V2 todavía no cambia su fuente/iu,
);
assert.match(
  documentation,
  /Promociones y combos/iu,
);
assert.match(
  documentation,
  /Supabase Storage/iu,
);
assert.match(
  documentation,
  /no ejecuta `staging:cleanup-isolation`/iu,
);
console.log(
  "✓ la documentación delimita backend UI e imágenes",
);

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:menu-write"],
  "node scripts/menu-write-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:test-menu-write"],
  "node scripts/menu-write-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:menu-write/u,
);
console.log(
  "✓ pruebas local y remota están integradas",
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
  "Todos los casos del backend persistente de menú pasaron (14).",
);
