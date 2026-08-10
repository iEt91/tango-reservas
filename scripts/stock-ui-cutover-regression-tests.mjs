import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pagePath =
  "src/app/local/stock/page.tsx";
const uiPath =
  "src/app/local/productos/v2-productos-page.tsx";
const docsPath =
  "docs/database/STOCK-UI-CUTOVER.md";

const [page, ui, docs, packageText] =
  await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(uiPath, "utf8"),
    readFile(docsPath, "utf8"),
    readFile("package.json", "utf8"),
  ]);

console.log(
  "Ejecutando regresión del corte persistente de Stock V2...",
);

assert.match(
  page,
  /getDataSource\(\) !== "supabase"/u,
);
assert.match(
  page,
  /return <V2ProductosPage \/>/u,
);
console.log(
  "✓ la página conserva el fallback local existente",
);

assert.match(
  page,
  /resolveActiveBusiness/u,
);
assert.match(
  page,
  /buildLoginPath\("\/local\/stock"\)/u,
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
  "✓ /local/stock falla cerrado antes de leer datos persistentes",
);

assert.match(
  page,
  /getBusinessStockForBusiness/u,
);
assert.match(
  page,
  /activeBusiness\.membership\.businessId/u,
);
assert.match(
  page,
  /initialBusinessStock=/u,
);
assert.match(
  page,
  /stockPersistence="supabase"/u,
);
console.log(
  "✓ el servidor hidrata la única UI V2 con el tenant activo",
);

assert.match(
  page,
  /hasStaffAccess/u,
);
assert.match(
  page,
  /"stock",\s*"manage"/u,
);
assert.match(
  page,
  /canManageStock=/u,
);
console.log(
  "✓ el permiso de escritura deriva del módulo Stock",
);

assert.match(
  ui,
  /type V2ProductosPageProps/u,
);
assert.match(
  ui,
  /initialBusinessStock\?: BusinessStockSnapshot/u,
);
assert.match(
  ui,
  /stockPersistence\?: "local" \| "supabase"/u,
);
assert.match(
  ui,
  /canManageStock\?: boolean/u,
);
console.log(
  "✓ la UI recibe un contrato explícito de persistencia",
);

assert.match(
  ui,
  /mapPersistentStockProducts/u,
);
assert.match(
  ui,
  /mapPersistentStockMovements/u,
);
assert.match(
  ui,
  /snapshot\?\.products/u,
);
assert.match(
  ui,
  /snapshot\?\.movements/u,
);
assert.match(
  ui,
  /mapPersistentStockProducts\(\s*initialBusinessStock/u,
);
assert.match(
  ui,
  /mapPersistentStockMovements\(\s*initialBusinessStock/u,
);
console.log(
  "✓ productos y movimientos persistentes hidratan el estado React",
);

assert.equal(
  ui.includes(
    "America/Argentina/Buenos_Aires",
  ),
  true,
);
assert.equal(
  ui.includes(
    "formatToParts(date)",
  ),
  true,
);
assert.equal(
  ui.includes(
    "formatStockDateTime",
  ),
  true,
);
assert.equal(
  ui.includes(
    'new Intl.DateTimeFormat("es-AR"',
  ),
  false,
);
console.log(
  "✓ fechas SSR y cliente usan un formato determinista sin diferencias de hidratación",
);

assert.match(
  ui,
  /if \(isSupabasePersistence\) \{[\s\S]+setStockProducts\([\s\S]+setStockMovements\([\s\S]+return;/u,
);
assert.match(
  ui,
  /window\.addEventListener\("storage", syncStockProducts\)/u,
);
assert.match(
  ui,
  /if \(isSupabasePersistence\)[\s\S]+return;[\s\S]+window\.addEventListener\("storage"/u,
);
console.log(
  "✓ listeners de localStorage quedan limitados al fallback local",
);

assert.match(
  ui,
  /saveBusinessStockProductAction/u,
);
assert.match(
  ui,
  /recordBusinessStockMovementAction/u,
);
assert.match(
  ui,
  /handleSaveEditingProduct/u,
);
assert.match(
  ui,
  /handleRecordStockMovement/u,
);
console.log(
  "✓ altas, ediciones y movimientos usan Server Actions",
);

assert.match(
  ui,
  /movementType/u,
);
assert.match(
  ui,
  /"opening"/u,
);
assert.match(
  ui,
  /"replenishment"/u,
);
assert.match(
  ui,
  /"consumption"/u,
);
assert.match(
  ui,
  /"return"/u,
);
assert.match(
  ui,
  /"adjustment"/u,
);
console.log(
  "✓ el modal opera sobre el ledger y no sobre un contador libre",
);

assert.equal(
  ui.includes(
    'movementQuantity.trim() !== ""',
  ),
  true,
);
assert.equal(
  ui.includes(
    "Guardar datos del insumo",
  ),
  true,
);
assert.equal(
  ui.includes(
    "El movimiento se aplica únicamente con",
  ),
  true,
);
assert.equal(
  ui.includes(
    "Registrar movimiento",
  ),
  true,
);
console.log(
  "✓ el footer no puede confundir guardado de datos con movimientos pendientes",
);

assert.match(
  ui,
  /disabled=\{isSupabasePersistence\}/u,
);
assert.match(
  ui,
  /En Supabase, el stock se modifica con movimientos auditables/u,
);
console.log(
  "✓ Stock total y descontado son derivados en modo Supabase",
);

assert.match(
  ui,
  /disabled=\{\s*isSupabasePersistence\s*&&\s*!canManageStock\s*\}/u,
);
assert.match(
  ui,
  /canManageStock\s*\?\s*"Editar"\s*:\s*"Ver"/u,
);
assert.match(
  ui,
  /No tenés permisos para modificar el stock de este local/u,
);
console.log(
  "✓ Solo lectura permanece visible pero sin mutaciones",
);

assert.match(
  ui,
  /stockPersistence === "supabase"/u,
);
assert.match(
  ui,
  /persistStockProducts/u,
);
assert.match(
  ui,
  /createSupabaseBrowserClient/u,
);
assert.match(
  ui,
  /postgres_changes/u,
);
assert.doesNotMatch(
  ui,
  /\.from\("stock_products"\)/u,
);
assert.doesNotMatch(
  ui,
  /\.from\("stock_movements"\)/u,
);
console.log(
  "✓ el cliente Supabase se limita a suscripción Realtime y conserva DML bloqueado",
);

assert.match(
  docs,
  /única interfaz V2 existente/u,
);
assert.match(
  docs,
  /localStorage` permanece únicamente como fallback/u,
);
assert.match(
  docs,
  /movimiento auditable/u,
);
console.log(
  "✓ documentación fija arquitectura, fallback y semántica",
);

const packageJson =
  JSON.parse(packageText);

assert.equal(
  packageJson.scripts?.["test:stock-ui-cutover"],
  "node scripts/stock-ui-cutover-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:stock-ui-cutover/u,
);
console.log(
  "✓ la regresión E29B forma parte del QA global",
);

for (const [label, source] of [
  ["page", page],
  ["ui", ui],
  ["docs", docs],
]) {
  assert.doesNotMatch(
    source,
    /[ \t]+\n/u,
    `${label} contiene whitespace accidental`,
  );
}
console.log(
  "✓ archivos E29B sin whitespace accidental",
);

console.log(
  "Todos los casos del corte persistente de Stock V2 pasaron (15).",
);
