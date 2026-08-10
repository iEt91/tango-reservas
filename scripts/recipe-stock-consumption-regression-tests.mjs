import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260809_016_recipe_stock_consumption.sql";
const rollbackPath =
  "supabase/rollbacks/20260809_016_recipe_stock_consumption.down.sql";
const postflightPath =
  "supabase/preflight/20260809_016_recipe_stock_consumption_postflight.sql";
const contractPath =
  "src/lib/stock/recipe-stock-consumption-contract.ts";
const serverPath =
  "src/lib/data/server/business-recipe-stock-consumption.ts";
const docsPath =
  "docs/database/RECIPE-STOCK-CONSUMPTION.md";

const [
  migration,
  rollback,
  postflight,
  contract,
  server,
  docs,
  remoteHistory,
  manifest,
  packageText,
] = await Promise.all([
  readFile(
    migrationPath,
    "utf8",
  ),
  readFile(
    rollbackPath,
    "utf8",
  ),
  readFile(
    postflightPath,
    "utf8",
  ),
  readFile(
    contractPath,
    "utf8",
  ),
  readFile(
    serverPath,
    "utf8",
  ),
  readFile(
    docsPath,
    "utf8",
  ),
  readFile(
    "scripts/remote-schema-history-regression-tests.mjs",
    "utf8",
  ),
  readFile(
    "supabase/MIGRATIONS.sha256",
    "utf8",
  ),
  readFile(
    "package.json",
    "utf8",
  ),
]);

console.log(
  "Ejecutando regresión del motor Receta → Stock...",
);

assert.match(
  migration,
  /^begin;\n/u,
);
assert.match(
  migration,
  /\ncommit;\n$/u,
);
assert.match(
  migration,
  /stock_recipe_operations/u,
);
assert.match(
  migration,
  /stock_recipe_operation_movements/u,
);
console.log(
  "✓ migración transaccional crea cabecera y vínculo con ledger",
);

assert.match(
  migration,
  /stock_movements_business_id_id_key/u,
);
assert.match(
  migration,
  /stock_recipe_operations_menu_item_tenant_fk/u,
);
assert.match(
  migration,
  /stock_recipe_operations_recipe_tenant_fk/u,
);
assert.match(
  migration,
  /stock_recipe_operation_movements_movement_tenant_fk/u,
);
console.log(
  "✓ todas las relaciones críticas conservan business_id",
);

assert.match(
  migration,
  /stock_recipe_operations_business_key/u,
);
assert.match(
  migration,
  /operation_key = btrim\(p_operation_key\)/u,
);
assert.match(
  migration,
  /already exists with different data/u,
);
assert.match(
  migration,
  /return jsonb_build_object\([\s\S]+existing_operation/u,
);
console.log(
  "✓ idempotencia de operación completa evita dobles descuentos",
);

assert.match(
  migration,
  /private\.recipe_quantity_in_stock_unit/u,
);
assert.match(
  migration,
  /converted_quantity \* p_quantity/u,
);
assert.match(
  migration,
  /required_quantity :=[\s\S]+round/u,
);
console.log(
  "✓ cantidad vendida expande receta usando conversiones canónicas",
);

assert.match(
  migration,
  /for update of product/u,
);
assert.match(
  migration,
  /current_balance < required_quantity/u,
);
assert.match(
  migration,
  /Insufficient stock for recipe consumption/u,
);
assert.match(
  migration,
  /insert into public\.stock_recipe_operations[\s\S]+insert into public\.stock_movements/u,
);
console.log(
  "✓ todos los saldos se validan antes de escribir movimientos",
);

assert.match(
  migration,
  /movement_type,[\s\S]+origin,[\s\S]+quantity_delta/u,
);
assert.match(
  migration,
  /'consumption',[\s\S]+p_origin,[\s\S]+-required_quantity/u,
);
assert.match(
  migration,
  /recipe-op:[\s\S]+saved_operation\.id[\s\S]+product_id/u,
);
console.log(
  "✓ ledger recibe consumos negativos e idempotencia por ingrediente",
);

assert.match(
  migration,
  /recipe_revision/u,
);
assert.match(
  migration,
  /recipe\.revision/u,
);
assert.match(
  migration,
  /unit_cost_snapshot/u,
);
console.log(
  "✓ operación y ledger conservan snapshots auditables",
);

for (const table of [
  "stock_recipe_operations",
  "stock_recipe_operation_movements",
]) {
  assert.match(
    migration,
    new RegExp(
      `alter table public\\.${table}[\\s\\S]+force row level security`,
      "u",
    ),
  );
}
assert.match(
  migration,
  /'stock',\s*'view'/u,
);
assert.match(
  migration,
  /'recipes',\s*'view'/u,
);
console.log(
  "✓ RLS forzada exige lectura de Stock y Recetas",
);

assert.doesNotMatch(
  migration,
  /grant\s+(insert|update|delete|all)\s+on table public\.stock_recipe/iu,
);
assert.match(
  migration,
  /revoke all on table public\.stock_recipe_operations[\s\S]+public, anon, authenticated/u,
);
console.log(
  "✓ navegador no recibe DML directo sobre operaciones",
);

assert.match(
  migration,
  /private\.apply_recipe_stock_consumption/u,
);
assert.match(
  migration,
  /revoke all on function private\.apply_recipe_stock_consumption/u,
);
assert.match(
  migration,
  /public\.consume_business_menu_recipe_stock/u,
);
assert.match(
  migration,
  /'recipes',\s*'manage'/u,
);
assert.match(
  migration,
  /'stock',\s*'manage'/u,
);
assert.match(
  migration,
  /'recipe',\s*p_reference_id/u,
);
console.log(
  "✓ RPC pública falla cerrado y no permite falsear reserva/envío",
);

assert.match(
  migration,
  /Menu item has no persistent recipe/u,
);
assert.match(
  migration,
  /Recipe has no ingredients to consume/u,
);
assert.match(
  migration,
  /Recipe references an unavailable stock product/u,
);
console.log(
  "✓ motor falla cerrado ante receta incompleta o insumo inválido",
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
  /drop function if exists public\.consume_business_menu_recipe_stock/u,
);
console.log(
  "✓ rollback conserva evidencia y vuelve a default deny",
);

for (const token of [
  "Recipe stock operation tables must have forced RLS.",
  "Direct recipe stock operation DML grant detected.",
  "Recipe stock transaction helper must stay private.",
  "Recipe stock operation tenant FKs are missing.",
  "Recipe stock RPC must remain SECURITY DEFINER.",
]) {
  assert.ok(
    postflight.includes(token),
    `postflight perdió: ${token}`,
  );
}
console.log(
  "✓ postflight falla ante permisos o esquema inseguros",
);

assert.match(
  contract,
  /BusinessRecipeStockConsumptionInput/u,
);
assert.match(
  contract,
  /normalizeBusinessRecipeStockConsumption/u,
);
assert.match(
  contract,
  /mapBusinessRecipeStockConsumptionResult/u,
);
assert.match(
  contract,
  /quantity < 1[\s\S]+quantity > 9999/u,
);
console.log(
  "✓ TypeScript valida entrada y mapea operación + movimientos",
);

assert.match(
  server,
  /assertServerOnly\(\s*"consumeBusinessMenuRecipeStockForBusiness"/u,
);
assert.match(
  server,
  /consume_business_menu_recipe_stock/u,
);
assert.match(
  server,
  /toBusinessRecipeStockConsumptionRpcPayload/u,
);
assert.match(
  server,
  /mapBusinessRecipeStockConsumptionResult/u,
);
console.log(
  "✓ helper reutilizable permanece exclusivamente en servidor",
);

assert.match(
  docs,
  /consumos de\s+Reservas/u,
);
for (const token of [
  "/local/envios",
  "/local/cocina",
  "misma transacción PostgreSQL",
  "pedido/consumo persistente → plato → receta → ingredientes → Stock → Historial",
]) {
  assert.ok(
    docs.includes(token),
    `documentación perdió: ${token}`,
  );
}
assert.match(
  docs,
  /sin depender de\s+`localStorage`/u,
);
console.log(
  "✓ documentación evita mezclar ventas locales con Stock canónico",
);

const packageJson =
  JSON.parse(packageText);

assert.equal(
  packageJson.scripts?.[
    "test:recipe-stock-consumption"
  ],
  "node scripts/recipe-stock-consumption-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.[
    "staging:test-recipe-stock-consumption"
  ],
  "node scripts/recipe-stock-consumption-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.[
    "test:regression"
  ] ?? "",
  /test:recipes-ui-cutover && npm run test:recipe-stock-consumption/u,
);
console.log(
  "✓ pruebas local y staging quedan integradas",
);

assert.match(
  manifest,
  /20260809_016_recipe_stock_consumption\.sql/u,
);
assert.match(
  manifest,
  /20260809_016_recipe_stock_consumption\.down\.sql/u,
);
assert.match(
  remoteHistory,
  /20260809_016_recipe_stock_consumption\.sql/u,
);
assert.match(
  remoteHistory,
  /Receta → Stock agrega consumo transaccional e idempotente/u,
);
assert.match(
  remoteHistory,
  /historial remoto pasaron \(\d+\)/u,
);
console.log(
  "✓ manifiesto e historial remoto incorporan migración 016",
);

for (const [
  label,
  source,
] of [
  ["migration", migration],
  ["rollback", rollback],
  ["postflight", postflight],
  ["contract", contract],
  ["server", server],
  ["docs", docs],
]) {
  assert.doesNotMatch(
    source,
    /[ \t]+\n/u,
    `${label} contiene whitespace accidental`,
  );
}
console.log(
  "✓ archivos E30C sin whitespace accidental",
);

console.log(
  "Todos los casos del motor Receta → Stock pasaron (17).",
);
