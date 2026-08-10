import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260809_015_recipes_write_rpc.sql";
const rollbackPath =
  "supabase/rollbacks/20260809_015_recipes_write_rpc.down.sql";
const postflightPath =
  "supabase/preflight/20260809_015_recipes_write_postflight.sql";
const contractPath =
  "src/lib/recipes/business-recipe-contract.ts";
const readerPath =
  "src/lib/data/server/business-recipes.ts";
const actionsPath =
  "src/app/local/menu/recetas/actions.ts";
const docsPath =
  "docs/database/RECIPES-WRITE-RPC.md";

const [
  migration,
  rollback,
  postflight,
  contract,
  reader,
  actions,
  docs,
  remoteHistory,
  packageText,
  manifest,
] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(rollbackPath, "utf8"),
  readFile(postflightPath, "utf8"),
  readFile(contractPath, "utf8"),
  readFile(readerPath, "utf8"),
  readFile(actionsPath, "utf8"),
  readFile(docsPath, "utf8"),
  readFile(
    "scripts/remote-schema-history-regression-tests.mjs",
    "utf8",
  ),
  readFile("package.json", "utf8"),
  readFile(
    "supabase/MIGRATIONS.sha256",
    "utf8",
  ),
]);

console.log(
  "Ejecutando regresión del backend persistente de Recetas...",
);

assert.match(migration, /^begin;\n/u);
assert.match(migration, /\ncommit;\n$/u);
assert.match(
  migration,
  /create table if not exists public\.menu_recipes/u,
);
assert.match(
  migration,
  /create table if not exists public\.menu_recipe_ingredients/u,
);
console.log(
  "✓ migración transaccional crea recetas e ingredientes",
);

assert.match(
  migration,
  /menu_recipes_menu_item_tenant_fk/u,
);
assert.match(
  migration,
  /menu_recipe_ingredients_recipe_tenant_fk/u,
);
assert.match(
  migration,
  /menu_recipe_ingredients_stock_product_tenant_fk/u,
);
assert.match(
  migration,
  /menu_recipes_business_menu_item_key/u,
);
assert.match(
  migration,
  /menu_recipe_ingredients_recipe_product_key/u,
);
console.log(
  "✓ claves compuestas mantienen tenant y una receta por plato",
);

assert.match(
  migration,
  /recipe_quantity_in_stock_unit/u,
);
assert.match(
  migration,
  /p_recipe_unit = 'g'[\s\S]+p_stock_unit = 'kg'/u,
);
assert.match(
  migration,
  /p_recipe_unit = 'ml'[\s\S]+p_stock_unit = 'l'/u,
);
assert.match(
  migration,
  /quantity > 0/u,
);
assert.match(
  migration,
  /menu_recipe_ingredients_unit_check/u,
);
console.log(
  "✓ cantidades y conversiones de unidades están centralizadas",
);

for (const table of [
  "menu_recipes",
  "menu_recipe_ingredients",
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
  /menu_recipes_select_module_member/u,
);
assert.match(
  migration,
  /menu_recipe_ingredients_select_module_member/u,
);
assert.match(
  migration,
  /'recipes',\s*'view'/u,
);
console.log(
  "✓ RLS forzada exige acceso de lectura a Recetas",
);

assert.match(
  migration,
  /revoke all on table public\.menu_recipes[\s\S]+public, anon, authenticated/u,
);
assert.match(
  migration,
  /revoke all on table public\.menu_recipe_ingredients[\s\S]+public, anon, authenticated/u,
);
assert.doesNotMatch(
  migration,
  /grant\s+(insert|update|delete|all)\s+on table public\.menu_recipe/iu,
);
console.log(
  "✓ navegador no recibe DML directo sobre Recetas",
);

assert.match(
  migration,
  /save_business_menu_recipe/u,
);
assert.match(
  migration,
  /security definer/u,
);
assert.match(
  migration,
  /'recipes',\s*'manage'/u,
);
assert.match(
  migration,
  /on conflict \(business_id, menu_item_id\)/u,
);
assert.match(
  migration,
  /revision = recipe\.revision \+ 1/u,
);
console.log(
  "✓ RPC autorizada guarda y versiona una receta de forma atómica",
);

assert.match(
  migration,
  /Menu item is not available for this business/u,
);
assert.match(
  migration,
  /Recipe stock product is not active for this business/u,
);
assert.match(
  migration,
  /Recipe contains duplicate stock products/u,
);
assert.match(
  migration,
  /Recipe ingredient unit is incompatible with stock/u,
);
console.log(
  "✓ RPC rechaza BOLA, duplicados e incompatibilidad de unidad",
);

assert.match(
  migration,
  /delete from public\.menu_recipe_ingredients/u,
);
assert.match(
  migration,
  /jsonb_array_elements\(p_ingredients\)[\s\S]+with ordinality/u,
);
assert.match(
  migration,
  /jsonb_build_object\([\s\S]+'recipe'[\s\S]+'ingredients'/u,
);
console.log(
  "✓ reemplazo de ingredientes ocurre dentro de la misma transacción",
);

assert.match(
  migration,
  /validate_stock_product_recipe_references/u,
);
assert.match(
  migration,
  /stock_products_validate_recipe_references/u,
);
assert.match(
  migration,
  /Stock product is used by an active recipe/u,
);
assert.match(
  migration,
  /Stock unit is incompatible with an active recipe/u,
);
console.log(
  "✓ PostgreSQL protege insumos utilizados por recetas activas",
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
  /drop trigger if exists stock_products_validate_recipe_references/u,
);
assert.match(
  rollback,
  /revoke all on table public\.menu_recipes/u,
);
console.log(
  "✓ rollback conserva datos y vuelve a default deny",
);

assert.match(
  postflight,
  /Recipe tables must have forced RLS/u,
);
assert.match(
  postflight,
  /Direct recipe DML grant detected/u,
);
assert.match(
  postflight,
  /Tenant-safe recipe ingredient FKs are missing/u,
);
assert.match(
  postflight,
  /Recipe RPC must remain SECURITY DEFINER/u,
);
assert.match(
  postflight,
  /Stock recipe reference trigger is missing/u,
);
console.log(
  "✓ postflight falla ante esquema o permisos inseguros",
);

assert.match(
  contract,
  /BusinessRecipeIngredientInput/u,
);
assert.match(
  contract,
  /normalizeBusinessRecipe/u,
);
assert.match(
  contract,
  /toBusinessRecipeRpcPayload/u,
);
assert.match(
  contract,
  /mapBusinessRecipeRpcResult/u,
);
assert.match(
  contract,
  /isRecipeUnitCompatibleWithStock/u,
);
console.log(
  "✓ TypeScript comparte contrato, validación y unidades",
);

assert.match(
  reader,
  /assertServerOnly\(\s*"getBusinessRecipesForBusiness"/u,
);
assert.match(
  reader,
  /\.from\("menu_recipes"\)/u,
);
assert.match(
  reader,
  /\.from\("menu_recipe_ingredients"\)/u,
);
assert.match(
  reader,
  /\.eq\("business_id", businessId\)/u,
);
assert.match(
  reader,
  /\.limit\(1000\)/u,
);
assert.match(
  reader,
  /\.limit\(5000\)/u,
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
  /"recipes",\s*"manage"/u,
);
assert.match(
  actions,
  /save_business_menu_recipe/u,
);
assert.match(
  actions,
  /revalidatePath\("\/local\/menu\/recetas"\)/u,
);
console.log(
  "✓ Server Action revalida sesión, permiso y tenant",
);

assert.match(
  docs,
  /backend únicamente/u,
);
assert.match(
  docs,
  /E30B/u,
);
assert.match(
  docs,
  /E30C/u,
);
assert.match(
  docs,
  /localStorage/u,
);
assert.match(
  docs,
  /plato → receta → ingredientes → stock_movements/u,
);
console.log(
  "✓ documentación separa backend, UI y descuento automático",
);

const packageJson = JSON.parse(packageText);

assert.equal(
  packageJson.scripts?.["test:recipes-write"],
  "node scripts/recipes-write-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:test-recipes-write"],
  "node scripts/recipes-write-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:recipes-write/u,
);
console.log(
  "✓ pruebas local y staging quedan integradas",
);

assert.match(
  manifest,
  /20260809_015_recipes_write_rpc\.sql/u,
);
assert.match(
  manifest,
  /20260809_015_recipes_write_rpc\.down\.sql/u,
);
assert.match(
  remoteHistory,
  /20260809_015_recipes_write_rpc\.sql/u,
);
assert.match(
  remoteHistory,
  /Recetas agrega composición tenant-safe/u,
);
assert.match(
  remoteHistory,
  /historial remoto pasaron \(\d+\)/u,
);
console.log(
  "✓ manifiesto e historial remoto incorporan migración 015",
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
  "✓ archivos E30A sin whitespace accidental",
);

console.log(
  "Todos los casos del backend persistente de Recetas pasaron (18).",
);
