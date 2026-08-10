import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
  page,
  ui,
  recipeActions,
  menuActions,
  docs,
  packageText,
] = await Promise.all([
  readFile(
    "src/app/local/menu/recetas/page.tsx",
    "utf8",
  ),
  readFile(
    "src/app/local/menu/recetas/v2-recipes-page.tsx",
    "utf8",
  ),
  readFile(
    "src/app/local/menu/recetas/actions.ts",
    "utf8",
  ),
  readFile(
    "src/app/local/menu/actions.ts",
    "utf8",
  ),
  readFile(
    "docs/database/RECIPES-UI-CUTOVER.md",
    "utf8",
  ),
  readFile(
    "package.json",
    "utf8",
  ),
]);

console.log(
  "Ejecutando regresión del corte persistente de Recetas V2...",
);

assert.doesNotMatch(
  page,
  /"use client"/u,
);
assert.match(
  page,
  /import \{ V2RecipesPage \} from "\.\/v2-recipes-page"/u,
);
assert.match(
  page,
  /getDataSource\(\) !== "supabase"/u,
);
assert.match(
  page,
  /return <V2RecipesPage \/>/u,
);
console.log(
  "✓ la misma UI conserva fallback local y wrapper servidor",
);

assert.match(
  page,
  /resolveActiveBusiness/u,
);
assert.match(
  page,
  /buildLoginPath\(\s*"\/local\/menu\/recetas"/u,
);
assert.match(
  page,
  /selection_required/u,
);
assert.match(
  page,
  /membership_missing/u,
);
console.log(
  "✓ la página falla cerrado para sesión y negocio activo",
);

assert.match(
  page,
  /"recipes",\s*"view"/u,
);
assert.match(
  page,
  /redirect\("\/auth\/access-denied"\)/u,
);
assert.match(
  page,
  /"recipes",\s*"manage"/u,
);
console.log(
  "✓ lectura y gestión de Recetas derivan de permisos efectivos",
);

assert.match(
  page,
  /getBusinessMenuForBusiness/u,
);
assert.match(
  page,
  /getBusinessRecipesForBusiness/u,
);
assert.match(
  page,
  /getBusinessStockForBusiness/u,
);
assert.match(
  page,
  /Promise\.all/u,
);
console.log(
  "✓ servidor hidrata Menú, Recetas y Stock del tenant activo",
);

assert.match(
  page,
  /"stock",\s*"view"/u,
);
assert.match(
  page,
  /const stockPromise = canViewStock/u,
);
assert.match(
  page,
  /products: \[\],\s*movements: \[\]/u,
);
console.log(
  "✓ Stock se lee solo cuando el rol tiene permiso de lectura",
);

for (const token of [
  'recipePersistence="supabase"',
  "initialMenuItems={menu.items}",
  "initialRecipes={recipes}",
  "initialStockProducts=",
  "canManageRecipes=",
  "canCreateMenuItems=",
  "canViewStock={canViewStock}",
]) {
  assert.ok(
    page.includes(token),
    `falta prop persistente: ${token}`,
  );
}
console.log(
  "✓ la UI recibe un contrato persistente explícito",
);

assert.match(
  ui,
  /^"use client";/u,
);
assert.match(
  ui,
  /export function V2RecipesPage/u,
);
assert.match(
  ui,
  /recipePersistence = "local"/u,
);
assert.match(
  ui,
  /buildPersistentInitialState/u,
);
assert.match(
  ui,
  /syncRecipesWithMenu/u,
);
console.log(
  "✓ la interfaz original hidrata el snapshot persistente",
);

assert.match(
  ui,
  /if \(usesSupabaseRecipes\) return;/u,
);
assert.match(
  ui,
  /readRecipesFromConfig/u,
);
assert.match(
  ui,
  /writeRecipesToConfig/u,
);
assert.match(
  ui,
  /if \(!usesSupabaseRecipes\)/u,
);
console.log(
  "✓ localStorage queda limitado al fallback local",
);

assert.match(
  ui,
  /saveBusinessMenuRecipeAction/u,
);
assert.match(
  ui,
  /menuItemId:\s*activeRecipe\.menuItemId/u,
);
assert.match(
  ui,
  /mapPersistentRecipe\(\s*result\.recipe/u,
);
assert.match(
  ui,
  /setActiveRecipeId\(\s*savedRecipe\.id/u,
);
console.log(
  "✓ Guardar adopta la receta canónica devuelta por PostgreSQL",
);

assert.match(
  ui,
  /saveBusinessMenuItemAction/u,
);
assert.match(
  ui,
  /const savedItem =\s*mapPersistentMenuItem/u,
);
assert.match(
  ui,
  /const draftRecipe:\s*V2RecipeConfig/u,
);
assert.match(
  ui,
  /El plato se creó, pero la receta quedó pendiente/u,
);
console.log(
  "✓ Nuevo plato usa Menú persistente y falla de forma recuperable",
);

assert.match(
  ui,
  /canManageRecipes/u,
);
assert.match(
  ui,
  /canCreateMenuItems/u,
);
assert.match(
  ui,
  /canViewStock/u,
);
assert.match(
  ui,
  /disabled=\{\s*!canManageRecipes/u,
);
console.log(
  "✓ controles de edición fallan cerrado según permisos",
);

assert.match(
  ui,
  /no tiene lectura de Stock/u,
);
assert.match(
  ui,
  /usesSupabaseRecipes && !canViewStock/u,
);
console.log(
  "✓ falta de permiso Stock queda visible y no se oculta",
);

assert.doesNotMatch(
  ui,
  /createSupabase/u,
);
assert.doesNotMatch(
  ui,
  /\.from\(["']/u,
);
assert.doesNotMatch(
  ui,
  /\.rpc\(["']/u,
);
console.log(
  "✓ el componente cliente no crea Supabase ni ejecuta DML directo",
);

assert.doesNotMatch(
  ui,
  /recordBusinessStockMovementAction/u,
);
assert.doesNotMatch(
  ui,
  /record_business_stock_movement/u,
);
assert.match(
  ui,
  /E30B no descuenta Stock automáticamente/u,
);
console.log(
  "✓ E30B no activa movimientos automáticos de Stock",
);

assert.match(
  menuActions,
  /revalidatePath\("\/local\/menu\/recetas"\)/u,
);
assert.match(
  recipeActions,
  /revalidatePath\("\/local\/menu\/recetas"\)/u,
);
console.log(
  "✓ Menú y Recetas revalidan la pantalla compartida",
);

for (const token of [
  "única interfaz existente",
  "localStorage",
  "E30C",
  "plato vendido → receta → ingredientes → stock_movements",
  "no crea movimientos de Stock",
]) {
  assert.ok(
    docs.includes(token),
    `documentación incompleta: ${token}`,
  );
}
console.log(
  "✓ documentación fija fuente de verdad y frontera con E30C",
);

const packageJson = JSON.parse(packageText);

assert.equal(
  packageJson.scripts?.["test:recipes-ui-cutover"],
  "node scripts/recipes-ui-cutover-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:recipes-write && npm run test:recipes-ui-cutover/u,
);
console.log(
  "✓ regresión E30B queda integrada al QA global",
);

for (const [label, source] of [
  ["page", page],
  ["ui", ui],
  ["recipeActions", recipeActions],
  ["menuActions", menuActions],
  ["docs", docs],
]) {
  assert.doesNotMatch(
    source,
    /[ \t]+\n/u,
    `${label} contiene whitespace accidental`,
  );
}
console.log(
  "✓ archivos E30B sin whitespace accidental",
);

console.log(
  "Todos los casos del corte persistente de Recetas V2 pasaron (17).",
);
