import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const masterPath =
  "src/lib/demo-demuru-master-data.ts";
const bootstrapPath =
  "src/lib/demo-demuru-bootstrap.ts";
const mockPath =
  "src/lib/v2/v2-mock-data.ts";
const publicPagePath =
  "src/app/[slug]/page.tsx";
const shellPath =
  "src/components/v2/v2-app-shell.tsx";
const stockPagePath =
  "src/app/local/productos/v2-productos-page.tsx";
const docsPath =
  "docs/demo/DEMURU-MASTER-DATA.md";

const [
  master,
  bootstrap,
  mock,
  publicPage,
  shell,
  stockPage,
  docs,
  packageText,
] = await Promise.all([
  readFile(masterPath, "utf8"),
  readFile(bootstrapPath, "utf8"),
  readFile(mockPath, "utf8"),
  readFile(publicPagePath, "utf8"),
  readFile(shellPath, "utf8"),
  readFile(stockPagePath, "utf8"),
  readFile(docsPath, "utf8"),
  readFile("package.json", "utf8"),
]);

console.log(
  "Ejecutando Demo Perfecta Demuru - Master Data E35A...",
);

const expectedItems =
  {
  "Burrata de estación": 12500,
  "Remolacha asada": 14800,
  "Croquetas de hongos": 18900,
  "Tostón ahumado": 9800,
  "Ojo de bife": 13400,
  "Pulpo grillado": 15700,
  "Pesca del día": 19800,
  "Pollo braseado": 10700,
  "Ravioles de osobuco": 14300,
  "Sorrentinos de calabaza": 16600,
  "Pappardelle": 20700,
  "Ñoquis de papa": 11600,
  "Creme brulee (para 2)": 16000,
  "Flan mixto": 10000,
  "Panqueque caramelizado": 10000,
  "Marquise chocolate": 16000,
  "Vino de la casa": 16100,
  "Aperitivo cítrico": 18400,
  "Copa especial": 22500,
  "Agua saborizada": 13400
};

for (
  const [name, price]
  of Object.entries(expectedItems)
) {
  const escapedName =
    name.replace(
      /[.*+?^${}()|[\]\\]/gu,
      "\\$&",
    );

  assert.match(
    master,
    new RegExp(
      `"name":\\s*"${escapedName}"[\\s\\S]{0,220}"price":\\s*${price}`,
      "u",
    ),
    `${name} no conserva su precio oficial de la demo`,
  );
}

console.log(
  "✓ los 20 productos conservan nombres y precios exactos de /demuru",
);

assert.equal(
  (
    master.match(
      /"id": "demuru-cat-/gu,
    )
    ?? []
  ).length,
  5,
);
assert.equal(
  (
    master.match(
      /"id": "demuru-menu-/gu,
    )
    ?? []
  ).length,
  20,
);
assert.equal(
  (
    master.match(
      /"menuItemId": "demuru-menu-/gu,
    )
    ?? []
  ).length,
  20,
);
console.log(
  "✓ catálogo canónico contiene 5 categorías y 20 recetas",
);

const stockDefinitionIds =
  new Set(
    [
      ...master.matchAll(
        /"id": "(stock-[^"]+)"[\s\S]{0,180}"supplier":/gu,
      ),
    ].map(
      (match) =>
        match[1],
    ),
  );

assert.equal(
  stockDefinitionIds.size,
  77,
);
console.log(
  "✓ inventario maestro contiene 77 insumos únicos",
);

const menuDefinitionIds =
  new Set(
    [
      ...master.matchAll(
        /"id": "(demuru-menu-[^"]+)"[\s\S]{0,180}"imageUrl":/gu,
      ),
    ].map(
      (match) =>
        match[1],
    ),
  );

const recipeMenuIds =
  [
    ...master.matchAll(
      /"menuItemId": "(demuru-menu-[^"]+)"/gu,
    ),
  ].map(
    (match) =>
      match[1],
  );

assert.equal(
  recipeMenuIds.length,
  20,
);
assert.deepEqual(
  new Set(
    recipeMenuIds,
  ),
  menuDefinitionIds,
);
console.log(
  "✓ cada producto del menú tiene exactamente una receta",
);

const ingredientStockIds =
  [
    ...master.matchAll(
      /"stockProductId": "(stock-[^"]+)"/gu,
    ),
  ].map(
    (match) =>
      match[1],
  );

assert.ok(
  ingredientStockIds.length
  >= 140,
);
for (
  const productId
  of ingredientStockIds
) {
  assert.ok(
    stockDefinitionIds.has(
      productId,
    ),
    `Ingrediente huérfano: ${productId}`,
  );
}

assert.deepEqual(
  new Set(
    ingredientStockIds,
  ),
  stockDefinitionIds,
);
console.log(
  "✓ todos los insumos se usan y todos los ingredientes resuelven Stock",
);

const ingredientQuantities =
  [
    ...master.matchAll(
      /"quantity": ([0-9]+(?:\.[0-9]+)?)/gu,
    ),
  ].map(
    (match) =>
      Number(
        match[1],
      ),
  );

assert.ok(
  ingredientQuantities.length
  >= 140,
);
assert.equal(
  ingredientQuantities.every(
    (quantity) =>
      Number.isFinite(quantity)
      && quantity > 0,
  ),
  true,
);
console.log(
  "✓ todas las cantidades de receta son positivas",
);

const aperitivoRecipe = master.match(
  /"id": "recipe-aperitivo"[\s\S]*?\n  \},\n  \{/u,
);

assert.ok(aperitivoRecipe, "No se encontró la receta de Aperitivo cítrico");
for (const expectedIngredient of [
  '"stockProductId": "stock-bitter-naranja"[\\s\\S]{0,80}"quantity": 0.06',
  '"stockProductId": "stock-espumante"[\\s\\S]{0,80}"quantity": 0.08',
  '"stockProductId": "stock-pomelo"[\\s\\S]{0,80}"quantity": 60',
  '"stockProductId": "stock-soda"[\\s\\S]{0,80}"quantity": 0.02',
  '"stockProductId": "stock-almibar"[\\s\\S]{0,80}"quantity": 10[\\s\\S]{0,40}"unit": "ml"',
]) {
  assert.match(
    aperitivoRecipe[0],
    new RegExp(expectedIngredient, "u"),
    "La receta de Aperitivo cítrico cambió sin actualizar sus cantidades de stock",
  );
}
console.log(
  "✓ Aperitivo cítrico descuenta 80 ml de espumante y 10 ml de almíbar por unidad",
);

assert.match(
  stockPage,
  /maximumFractionDigits:\s*3/u,
  "Stock debe mostrar hasta tres decimales para no redondear 0,01 l a 0,1 l",
);
console.log(
  "✓ Stock muestra 0,01 l sin redondearlo de forma engañosa",
);

const supportedUnits =
  new Set([
    "kg",
    "g",
    "l",
    "ml",
    "unidad",
    "botella",
    "caja",
    "paquete",
    "bolsa",
    "lata",
  ]);
const recipeUnits =
  [
    ...master.matchAll(
      /"unit": "([^"]+)"/gu,
    ),
  ].map(
    (match) =>
      match[1],
  );

for (
  const unit
  of recipeUnits
) {
  assert.ok(
    supportedUnits.has(
      unit,
    ),
    `Unidad no soportada: ${unit}`,
  );
}
console.log(
  "✓ unidades compatibles con Stock/Recetas",
);

for (
  const forbidden
  of [
    "Pizza muzzarella grande",
    "Pizza napolitana grande",
    "Fugazzeta rellena",
    "Empanada carne cortada a cuchillo",
    "Cajas de pizza grandes",
  ]
) {
  assert.doesNotMatch(
    mock,
    new RegExp(
      forbidden,
      "u",
    ),
  );
}
assert.match(
  mock,
  /demuruDemoMenuCategories/u,
);
assert.match(
  mock,
  /demuruDemoMenuItems/u,
);
assert.match(
  mock,
  /demuruDemoStockProducts/u,
);
console.log(
  "✓ mocks V2 dejan de representar una pizzería y delegan en Demuru",
);

assert.match(
  mock,
  /status:\s*item\.status as V2MenuItemStatus,/u,
);
assert.match(
  mock,
  /category:\s*product\.category as V2StockCategory,/u,
);
assert.match(
  mock,
  /unit:\s*product\.unit as V2StockUnit,/u,
);
assert.doesNotMatch(
  mock,
  /item\.status\s*\n\s*as V2MenuItemStatus/u,
);
assert.doesNotMatch(
  mock,
  /product\.category\s*\n\s*as V2StockCategory/u,
);
assert.doesNotMatch(
  mock,
  /product\.unit\s*\n\s*as V2StockUnit/u,
);
console.log(
  "✓ assertions TypeScript de los adaptadores permanecen sintácticamente indivisibles",
);

assert.match(
  bootstrap,
  /DEMURU_DEMO_MASTER_VERSION/u,
);
assert.match(
  bootstrap,
  /getDataSource\(\) !== "local"/u,
);
assert.match(
  bootstrap,
  /V2_OPERATIONAL_STORAGE_KEYS\.menuCategories/u,
);
assert.match(
  bootstrap,
  /V2_OPERATIONAL_STORAGE_KEYS\.menuItems/u,
);
assert.match(
  bootstrap,
  /V2_OPERATIONAL_STORAGE_KEYS\.stockProducts/u,
);
assert.match(
  bootstrap,
  /recipes:\s*demuruDemoRecipes/u,
);
assert.match(
  bootstrap,
  /V2_OPERATIONAL_STORAGE_KEYS\.stockMovements/u,
);
console.log(
  "✓ bootstrap versionado instala Master Data sólo en fallback local",
);

assert.match(
  shell,
  /ensureDemuruDemoMasterData\(\)/u,
);
assert.match(
  publicPage,
  /ensureDemuruDemoMasterData\(\)/u,
);
assert.match(
  publicPage,
  /fallbackCategoryItems = v2MenuCategories\.map/u,
);
assert.doesNotMatch(
  publicPage,
  /\["Postre Demuru", "Chocolate y crema", "Flan de autor", "Frutas asadas"\]/u,
);
assert.doesNotMatch(
  publicPage,
  /\["Creme brulee \(para 2\)", "Flan mixto", "Panqueque caramelizado", "Marquise chocolate"\]\[itemIndex\]/u,
);
console.log(
  "✓ /demuru y V2 consumen la misma fuente canónica sin listas duplicadas",
);

for (
  const dessert
  of [
    "Creme brulee (para 2)",
    "Flan mixto",
    "Panqueque caramelizado",
    "Marquise chocolate",
  ]
) {
  assert.match(
    master,
    new RegExp(
      dessert
        .replace(
          /[.*+?^${}()|[\]\\]/gu,
          "\\$&",
        ),
      "u",
    ),
  );
}
console.log(
  "✓ Postres coincide con la carta real adjuntada",
);

const packageJson =
  JSON.parse(
    packageText,
  );

assert.equal(
  packageJson.scripts?.["test:demuru-master-data"],
  "node scripts/demuru-master-data-regression-tests.mjs",
);

const regressionCommands =
  (
    packageJson.scripts?.["test:regression"]
    ?? ""
  )
    .split(" && ")
    .filter(Boolean);
const e34cRegressionIndex =
  regressionCommands.indexOf(
    "npm run test:public-shipping-ordering",
  );
const e35aRegressionIndexes =
  regressionCommands
    .map(
      (command, index) =>
        command
        === "npm run test:demuru-master-data"
          ? index
          : -1,
    )
    .filter(
      (index) =>
        index >= 0,
    );

assert.equal(
  e35aRegressionIndexes.length,
  1,
);
assert.ok(
  e34cRegressionIndex >= 0,
);
assert.ok(
  e34cRegressionIndex
  < e35aRegressionIndexes[0],
);
console.log(
  "✓ E35A forma parte del QA global sin exigir ser la última suite",
);

assert.match(
  docs,
  /20 productos/u,
);
assert.match(
  docs,
  /77 insumos/u,
);
assert.match(
  docs,
  /costos internos de demostración/u,
);
assert.match(
  docs,
  /E35B/u,
);
console.log(
  "✓ documentación fija autoridad, límites y siguiente etapa",
);

for (
  const [label, source]
  of [
    ["master", master],
    ["bootstrap", bootstrap],
    ["mock", mock],
    ["publicPage", publicPage],
    ["shell", shell],
    ["docs", docs],
  ]
) {
  assert.doesNotMatch(
    source,
    /[ \t]+\n/u,
    `${label} contiene whitespace accidental`,
  );
}

console.log(
  "Todos los casos E35A pasaron.",
);
