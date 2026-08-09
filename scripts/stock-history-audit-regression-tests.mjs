import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
  historyPage,
  historyAction,
  reader,
  contract,
  stockRedirect,
  stockUi,
  docs,
  packageText,
] = await Promise.all([
  readFile("src/app/local/historial/page.tsx", "utf8"),
  readFile(
    "src/app/local/historial/stock-history-actions.ts",
    "utf8",
  ),
  readFile(
    "src/lib/data/server/business-stock-history.ts",
    "utf8",
  ),
  readFile(
    "src/lib/stock/stock-history-contract.ts",
    "utf8",
  ),
  readFile(
    "src/app/local/stock/historial/page.tsx",
    "utf8",
  ),
  readFile(
    "src/app/local/productos/v2-productos-page.tsx",
    "utf8",
  ),
  readFile(
    "docs/database/STOCK-HISTORY-AUDIT.md",
    "utf8",
  ),
  readFile("package.json", "utf8"),
]);

console.log(
  "Ejecutando regresión de auditoría de Stock en Historial...",
);

assert.equal(
  historyPage.includes(
    '"envios" | "reservas" | "cocina" | "stock"',
  ),
  true,
);
assert.equal(
  historyPage.includes(
    'selectHistoryTab("stock")',
  ),
  true,
);
console.log(
  "✓ Historial general incorpora la pestaña Stock",
);

assert.equal(
  historyPage.includes(
    "loadBusinessStockHistoryAction",
  ),
  true,
);
assert.equal(
  historyPage.includes(
    'getDataSource() !== "supabase"',
  ),
  true,
);
assert.equal(
  historyPage.includes(
    "V2_OPERATIONAL_STORAGE_KEYS.stockMovements",
  ),
  true,
);
console.log(
  "✓ Supabase usa ledger persistente y local conserva fallback",
);

assert.equal(
  historyAction.includes(
    "resolveActiveBusiness",
  ),
  true,
);
assert.equal(
  historyAction.includes(
    '"history",',
  ),
  true,
);
assert.equal(
  historyAction.includes(
    '"stock",',
  ),
  true,
);
console.log(
  "✓ Server Action revalida tenant y permisos de Historial + Stock",
);

assert.equal(
  reader.includes(
    '.from("stock_movements")',
  ),
  true,
);
assert.equal(
  reader.includes(
    '.eq("business_id", businessId)',
  ),
  true,
);
assert.equal(
  reader.includes("created_by"),
  true,
);
assert.equal(
  reader.includes(
    '.from("business_members")',
  ),
  true,
);
console.log(
  "✓ reader usa ledger, tenant y responsable",
);

assert.equal(
  reader.includes("display_name"),
  true,
);
assert.equal(
  reader.includes("email"),
  true,
);
assert.equal(
  historyPage.includes("actorName"),
  true,
);
assert.equal(
  historyPage.includes("actorEmail"),
  true,
);
console.log(
  "✓ auditoría muestra responsable e identidad disponible",
);

for (const movementType of [
  "opening",
  "replenishment",
  "consumption",
  "return",
  "adjustment",
]) {
  assert.equal(
    historyPage.includes(
      `value="${movementType}"`,
    ),
    true,
  );
}
console.log(
  "✓ todos los tipos de movimiento pueden filtrarse",
);

for (const origin of [
  "`manual`",
  "`reservation`",
  "`shipping`",
  "`recipe`",
  "`import`",
]) {
  assert.equal(
    docs.includes(origin),
    true,
  );
}
console.log(
  "✓ manual y automatizaciones comparten auditoría",
);

assert.equal(
  stockRedirect.includes(
    '/local/historial?tab=stock',
  ),
  true,
);
assert.equal(
  stockUi.includes(
    'href="/local/historial?tab=stock"',
  ),
  true,
);
console.log(
  "✓ Stock abre directamente su pestaña de Historial",
);

assert.equal(
  historyPage.includes("createClient("),
  false,
);
assert.equal(
  historyPage.includes(
    '.from("stock_movements")',
  ),
  false,
);
console.log(
  "✓ componente cliente no crea Supabase ni consulta tablas",
);

assert.equal(
  docs.includes("created_by"),
  true,
);
assert.equal(
  docs.includes("RLS"),
  true,
);
assert.equal(
  docs.includes("Sesión local"),
  true,
);
console.log(
  "✓ documentación fija identidad, seguridad y fallback",
);

const packageJson = JSON.parse(packageText);

assert.equal(
  packageJson.scripts?.["test:stock-history-audit"],
  "node scripts/stock-history-audit-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["test:regression"]
    ?.includes("test:stock-history-audit"),
  true,
);
console.log(
  "✓ regresión E29C forma parte del QA global",
);

for (const [label, source] of [
  ["history", historyPage],
  ["action", historyAction],
  ["reader", reader],
  ["contract", contract],
  ["redirect", stockRedirect],
  ["docs", docs],
]) {
  assert.equal(
    /[ \t]+\n/u.test(source),
    false,
    `${label} contiene whitespace accidental`,
  );
}
console.log(
  "✓ archivos E29C sin whitespace accidental",
);

console.log(
  "Todos los casos de auditoría de Stock en Historial pasaron (11).",
);
