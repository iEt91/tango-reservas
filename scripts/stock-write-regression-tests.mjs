import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260809_014_stock_write_rpc.sql";
const rollbackPath =
  "supabase/rollbacks/20260809_014_stock_write_rpc.down.sql";
const postflightPath =
  "supabase/preflight/20260809_014_stock_write_postflight.sql";
const contractPath =
  "src/lib/stock/business-stock-contract.ts";
const readerPath =
  "src/lib/data/server/business-stock.ts";
const actionsPath =
  "src/app/local/stock/actions.ts";
const docsPath =
  "docs/database/STOCK-WRITE-RPC.md";

const [
  migration,
  rollback,
  postflight,
  contract,
  reader,
  actions,
  docs,
] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(rollbackPath, "utf8"),
  readFile(postflightPath, "utf8"),
  readFile(contractPath, "utf8"),
  readFile(readerPath, "utf8"),
  readFile(actionsPath, "utf8"),
  readFile(docsPath, "utf8"),
]);

console.log(
  "Ejecutando regresión del backend persistente de Stock...",
);

assert.match(migration, /^begin;\n/u);
assert.match(migration, /\ncommit;\n$/u);
assert.match(
  migration,
  /create table if not exists public\.stock_products/u,
);
assert.match(
  migration,
  /create table if not exists public\.stock_movements/u,
);
console.log(
  "✓ migración transaccional crea productos y ledger",
);

assert.match(
  migration,
  /stock_movements_product_tenant_fk/u,
);
assert.match(
  migration,
  /foreign key \(business_id, product_id\)[\s\S]+stock_products\(business_id, id\)/u,
);
assert.match(
  migration,
  /stock_products_business_normalized_name_key/u,
);
console.log(
  "✓ claves y restricciones mantienen tenant e identidad",
);

for (const token of [
  "'kg'",
  "'g'",
  "'l'",
  "'ml'",
  "'unidad'",
  "'botella'",
  "'caja'",
  "'paquete'",
  "'bolsa'",
  "'lata'",
]) {
  assert.match(migration, new RegExp(token, "u"));
}
assert.match(
  migration,
  /stock_movements_direction_check/u,
);
assert.match(
  migration,
  /quantity_delta <> 0/u,
);
console.log(
  "✓ PostgreSQL valida unidades, cantidades y dirección",
);

assert.match(
  migration,
  /current_user_has_module_access/u,
);
assert.match(
  migration,
  /actor_role in \('owner', 'admin'\)/u,
);
assert.match(
  migration,
  /staff_role_permissions/u,
);
assert.match(
  migration,
  /when 'view' then 1[\s\S]+when 'manage' then 2[\s\S]+when 'full' then 3/u,
);
console.log(
  "✓ helper privado aplica permisos jerárquicos por módulo",
);

for (const table of [
  "stock_products",
  "stock_movements",
]) {
  assert.match(
    migration,
    new RegExp(
      `alter table public\\.${table} enable row level security`,
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
assert.match(
  migration,
  /stock_products_select_module_member/u,
);
assert.match(
  migration,
  /stock_movements_select_module_member/u,
);
assert.match(
  migration,
  /stock_movements_select_module_member[\s\S]+using \(\s*\(select private\.current_user_has_module_access[\s\S]+\)\s*\)/u,
);
assert.doesNotMatch(
  migration,
  /stock_movements_select_module_member[\s\S]+using \(\s*select private\.current_user_has_module_access/u,
);
console.log(
  "✓ RLS queda forzada y la lectura exige acceso a Stock",
);

assert.match(
  migration,
  /revoke all on table public\.stock_products[\s\S]+public, anon, authenticated/u,
);
assert.match(
  migration,
  /revoke all on table public\.stock_movements[\s\S]+public, anon, authenticated/u,
);
assert.doesNotMatch(
  migration,
  /grant\s+(insert|update|delete|all)\s+on table public\.(stock_products|stock_movements)\s+to authenticated/iu,
);
console.log(
  "✓ navegador no recibe DML directo",
);

assert.match(
  migration,
  /save_business_stock_product/u,
);
assert.match(
  migration,
  /'stock',\s*'manage'/u,
);
assert.match(
  migration,
  /The unit cannot change after stock movements exist/u,
);
console.log(
  "✓ catálogo se guarda por RPC y protege la unidad histórica",
);

assert.match(
  migration,
  /record_business_stock_movement/u,
);
assert.match(
  migration,
  /for update;/u,
);
assert.match(
  migration,
  /current_balance \+ quantity_delta_value < 0/u,
);
assert.match(
  migration,
  /Stock cannot become negative/u,
);
console.log(
  "✓ movimientos son transaccionales y no permiten stock negativo",
);

assert.match(
  migration,
  /stock_movements_operation_key_key/u,
);
assert.match(
  migration,
  /origin_value in \('reservation', 'shipping'\)[\s\S]+operation_key_value is null/u,
);
assert.match(
  migration,
  /return to_jsonb\(existing\)/u,
);
console.log(
  "✓ idempotencia cubre reintentos de reservas y envíos",
);

assert.match(
  migration,
  /product_name_snapshot/u,
);
assert.match(
  migration,
  /unit_snapshot/u,
);
assert.match(
  migration,
  /unit_cost_snapshot/u,
);
console.log(
  "✓ ledger conserva snapshots auditables",
);

assert.match(
  migration,
  /archive_business_stock_product/u,
);
assert.match(
  migration,
  /'stock',\s*'full'/u,
);
assert.match(
  migration,
  /current_balance <> 0/u,
);
assert.match(
  migration,
  /archived_at = now\(\)/u,
);
console.log(
  "✓ eliminar usa baja lógica, full access y saldo cero",
);

assert.doesNotMatch(
  rollback,
  /drop table/iu,
);
assert.match(
  rollback,
  /force row level security/u,
);
assert.match(
  rollback,
  /revoke all on table public\.stock_products/u,
);
assert.match(
  rollback,
  /drop function if exists private\.current_user_has_module_access/u,
);
console.log(
  "✓ rollback conserva datos y vuelve a default deny",
);

assert.match(
  postflight,
  /Direct stock DML grant detected/u,
);
assert.match(
  postflight,
  /Stock tables must have forced RLS/u,
);
assert.match(
  postflight,
  /Stock idempotency index is missing/u,
);
assert.match(
  postflight,
  /Stock RPCs must remain SECURITY DEFINER/u,
);
console.log(
  "✓ postflight falla ante seguridad incompleta",
);

assert.match(
  contract,
  /BUSINESS_STOCK_UNITS/u,
);
assert.match(
  contract,
  /normalizeBusinessStockProduct/u,
);
assert.match(
  contract,
  /normalizeBusinessStockMovement/u,
);
assert.match(
  contract,
  /buildBusinessStockSnapshot/u,
);
assert.match(
  contract,
  /currentStock \+ consumedBySales/u,
);
console.log(
  "✓ TypeScript comparte contrato, validación y saldo derivado",
);

assert.match(
  reader,
  /assertServerOnly\("getBusinessStockForBusiness"\)/u,
);
assert.match(
  reader,
  /\.from\("stock_products"\)/u,
);
assert.match(
  reader,
  /\.from\("stock_movements"\)/u,
);
assert.match(
  reader,
  /\.eq\("business_id", businessId\)/u,
);
assert.match(
  reader,
  /\.limit\(500\)/u,
);
console.log(
  "✓ lectura servidor queda limitada al negocio activo",
);

assert.match(
  actions,
  /resolveActiveBusiness/u,
);
assert.match(
  actions,
  /hasStaffAccess/u,
);
assert.match(
  actions,
  /"stock",\s*minimum/u,
);
assert.match(
  actions,
  /save_business_stock_product/u,
);
assert.match(
  actions,
  /record_business_stock_movement/u,
);
assert.match(
  actions,
  /archive_business_stock_product/u,
);
assert.match(
  actions,
  /revalidatePath\("\/local\/stock"\)/u,
);
console.log(
  "✓ Server Actions revalidan sesión, permiso y tenant",
);

assert.match(
  docs,
  /no crea una segunda página/u,
);
assert.match(
  docs,
  /E29B/u,
);
assert.match(
  docs,
  /localStorage/u,
);
console.log(
  "✓ documentación delimita backend, UI y deuda explícita",
);

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);

assert.equal(
  packageJson.scripts?.["test:stock-write"],
  "node scripts/stock-write-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:test-stock-write"],
  "node scripts/stock-write-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:stock-write/u,
);
console.log(
  "✓ pruebas local y staging quedan integradas",
);

const manifest = await readFile(
  "supabase/MIGRATIONS.sha256",
  "utf8",
);
assert.match(
  manifest,
  /20260809_014_stock_write_rpc\.sql/u,
);
assert.match(
  manifest,
  /20260809_014_stock_write_rpc\.down\.sql/u,
);
console.log(
  "✓ manifiesto protege migración y rollback 014",
);

for (const [label, source] of [
  ["migration", migration],
  ["rollback", rollback],
  ["postflight", postflight],
  ["contract", contract],
  ["reader", reader],
  ["actions", actions],
  ["docs", docs],
]) {
  assert.doesNotMatch(
    source,
    /[ \t]+\n/u,
    `${label} contiene whitespace accidental`,
  );
}
console.log(
  "✓ archivos E29A sin whitespace accidental",
);

console.log(
  "Todos los casos del backend persistente de Stock pasaron (17).",
);
