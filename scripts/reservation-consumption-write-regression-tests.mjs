import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260810_017_reservation_consumption_write.sql";
const rollbackPath =
  "supabase/rollbacks/20260810_017_reservation_consumption_write.down.sql";
const postflightPath =
  "supabase/preflight/20260810_017_reservation_consumption_write_postflight.sql";
const contractPath =
  "src/lib/orders/business-order-contract.ts";
const readerPath =
  "src/lib/data/server/business-orders.ts";
const actionPath =
  "src/app/local/reservas/consumption-actions.ts";
const docsPath =
  "docs/database/RESERVATION-CONSUMPTION-WRITE-RPC.md";

const [
  migration,
  rollback,
  postflight,
  contract,
  reader,
  action,
  docs,
  packageText,
  remoteHistory,
  manifest,
] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(rollbackPath, "utf8"),
  readFile(postflightPath, "utf8"),
  readFile(contractPath, "utf8"),
  readFile(readerPath, "utf8"),
  readFile(actionPath, "utf8"),
  readFile(docsPath, "utf8"),
  readFile("package.json", "utf8"),
  readFile(
    "scripts/remote-schema-history-regression-tests.mjs",
    "utf8",
  ),
  readFile("supabase/MIGRATIONS.sha256", "utf8"),
]);

console.log(
  "Ejecutando regresión del consumo persistente de Reserva...",
);

assert.match(migration, /^begin;\n/u);
assert.match(migration, /\ncommit;\n$/u);
for (const table of [
  "business_orders",
  "business_order_items",
  "business_order_mutations",
  "business_order_stock_operations",
  "stock_recipe_return_operations",
  "stock_recipe_return_operation_movements",
]) {
  assert.match(
    migration,
    new RegExp(
      `create table if not exists public\\.${table}`,
      "u",
    ),
  );
}
console.log(
  "✓ migración transaccional crea pedido, líneas, idempotencia y devoluciones",
);

assert.match(
  migration,
  /add column if not exists consumption_started_at timestamptz/u,
);
assert.match(
  migration,
  /reservations_business_id_id_key[\s\S]+indisunique[\s\S]+create unique index reservations_business_id_id_key/u,
);
assert.match(
  migration,
  /business_orders_reservation_tenant_fk/u,
);
assert.match(
  migration,
  /business_order_items_menu_item_tenant_fk/u,
);
assert.match(
  migration,
  /business_order_stock_operations_recipe_operation_tenant_fk/u,
);
console.log(
  "✓ todas las relaciones críticas conservan business_id",
);

assert.match(
  migration,
  /order_kind in \('dine_in', 'delivery', 'pickup'\)/u,
);
assert.match(
  migration,
  /order_kind = 'dine_in' and reservation_id is not null/u,
);
assert.match(
  docs,
  /Envíos pueda reutilizar el mismo núcleo/u,
);
console.log(
  "✓ el núcleo de pedido queda preparado para salón, delivery y retiro",
);

assert.match(
  migration,
  /business_order_mutations_business_key/u,
);
assert.match(
  migration,
  /request_payload = normalized_items/u,
);
assert.match(
  migration,
  /return existing_mutation\.result_snapshot/u,
);
assert.match(
  migration,
  /already exists with different data/u,
);
console.log(
  "✓ una mutación completa es idempotente y detecta payload conflictivo",
);

assert.match(
  migration,
  /create or replace function private\.apply_recipe_stock_return/u,
);
assert.match(
  migration,
  /abs\(source_movement\.quantity_delta\)[\s\S]+cumulative_returned[\s\S]+original_operation\.sold_quantity/u,
);
assert.match(
  migration,
  /source_movement\.product_name_snapshot/u,
);
assert.match(
  migration,
  /source_movement\.unit_snapshot/u,
);
assert.match(
  migration,
  /source_movement\.unit_cost_snapshot/u,
);
assert.match(
  migration,
  /cumulative_returned > original_operation\.sold_quantity/u,
);
console.log(
  "✓ devolución usa el ledger histórico y nunca la receta actual",
);

const returnLoopPosition =
  migration.indexOf(
    "for diff_record in\n    select\n      current_item.menu_item_id",
  );
const consumeLoopPosition =
  migration.indexOf(
    "for diff_record in\n    select\n      target.menu_item_id::uuid",
  );
assert.ok(returnLoopPosition >= 0);
assert.ok(consumeLoopPosition > returnLoopPosition);
assert.match(
  migration,
  /private\.apply_recipe_stock_consumption\([\s\S]+'reservation'/u,
);
assert.match(
  migration,
  /private\.apply_recipe_stock_return\([\s\S]+'reservation'/u,
);
console.log(
  "✓ devoluciones ocurren antes de altas y todo usa el motor E30C",
);

assert.match(
  migration,
  /current_user_has_module_access\([\s\S]+p_business_id,[\s\S]+'reservations',[\s\S]+'manage'/u,
);
assert.match(
  migration,
  /Reservation must be confirmed before recording consumption/u,
);
assert.match(
  migration,
  /Reservation requires an assigned table before recording consumption/u,
);
assert.match(
  migration,
  /item\.status = 'available'/u,
);
console.log(
  "✓ RPC falla cerrado por permiso, tenant, estado, mesa y plato",
);

assert.match(
  migration,
  /name_snapshot,[\s\S]+unit_price_snapshot/u,
);
assert.match(
  migration,
  /item\.name,[\s\S]+item\.price/u,
);
assert.match(
  migration,
  /item\.unit_price_snapshot[\s\S]+\* item\.quantity/u,
);
console.log(
  "✓ nombre, precio y subtotal nacen de datos canónicos",
);

for (const table of [
  "business_orders",
  "business_order_items",
  "business_order_mutations",
  "business_order_stock_operations",
  "stock_recipe_return_operations",
  "stock_recipe_return_operation_movements",
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
  /business_orders_select_domain_member/u,
);
assert.match(
  migration,
  /business_order_items_select_domain_member/u,
);
assert.match(
  migration,
  /'reservations',[\s\S]+'view'/u,
);
assert.match(
  migration,
  /'shipping',[\s\S]+'view'/u,
);
console.log(
  "✓ RLS forzada separa lectura de salón y futuro Envíos",
);

assert.match(
  migration,
  /revoke all on table public\.business_order_mutations/u,
);
assert.match(
  migration,
  /grant select on table public\.business_orders/u,
);
assert.doesNotMatch(
  migration,
  /grant\s+(insert|update|delete|all)\s+on table public\.business_order/iu,
);
assert.match(
  migration,
  /revoke all on function private\.apply_recipe_stock_return/u,
);
console.log(
  "✓ navegador recibe solo lectura operativa y ningún DML técnico",
);

assert.match(
  migration,
  /guard_reservation_terminal_with_consumption/u,
);
assert.match(
  migration,
  /new\.status in \('completed', 'cancelled', 'no_show'\)/u,
);
assert.match(
  migration,
  /Reservation has open persistent consumption/u,
);
console.log(
  "✓ estados terminales no pueden abandonar un consumo abierto",
);

assert.doesNotMatch(
  rollback,
  /drop table|drop column|disable row level security/iu,
);
assert.match(
  rollback,
  /force row level security/u,
);
assert.match(
  rollback,
  /drop function if exists public\.save_business_reservation_consumption/u,
);
console.log(
  "✓ rollback conserva evidencia y vuelve a default deny",
);

for (const token of [
  "Reservation consumption tables must have forced RLS.",
  "Direct reservation consumption DML grant detected.",
  "Technical reservation consumption tables must remain private.",
  "Recipe stock return helper must stay private.",
  "Reservation terminal guard trigger is missing.",
  "Reservation consumption RPC must remain SECURITY DEFINER.",
]) {
  assert.ok(
    postflight.includes(token),
    `postflight perdió: ${token}`,
  );
}
console.log(
  "✓ postflight detecta esquema, grants o helpers inseguros",
);

assert.match(
  contract,
  /normalizeBusinessReservationConsumptionInput/u,
);
assert.match(
  contract,
  /toBusinessReservationConsumptionRpcPayload/u,
);
assert.match(
  contract,
  /mapBusinessReservationConsumptionResult/u,
);
assert.match(
  contract,
  /rawItems\.length > 100/u,
);
console.log(
  "✓ TypeScript normaliza IDs, cantidades, duplicados y respuesta canónica",
);

assert.match(
  reader,
  /assertServerOnly\(\s*"getBusinessDineInOrderForReservation"/u,
);
assert.match(
  reader,
  /\.from\("business_orders"\)/u,
);
assert.match(
  reader,
  /\.from\("business_order_items"\)/u,
);
assert.match(
  reader,
  /\.eq\("business_id", businessId\)/u,
);
console.log(
  "✓ reader queda exclusivamente en servidor y acotado al tenant",
);

assert.match(
  action,
  /resolveActiveBusiness/u,
);
assert.match(
  action,
  /hasStaffAccess\([\s\S]+"reservations",[\s\S]+"manage"/u,
);
assert.match(
  action,
  /save_business_reservation_consumption/u,
);
assert.match(
  action,
  /revalidatePath\("\/local\/cocina"\)/u,
);
assert.match(
  action,
  /revalidatePath\("\/local\/stock"\)/u,
);
console.log(
  "✓ Server Action revalida sesión, permiso, tenant y consumidores",
);

assert.match(
  docs,
  /No hace todavía el corte visual/u,
);
assert.match(
  docs,
  /E31B/u,
);
assert.doesNotMatch(
  migration,
  /localStorage/u,
);
console.log(
  "✓ E31A mantiene backend canónico y admite un cutover UI posterior",
);

const packageJson =
  JSON.parse(packageText);
assert.equal(
  packageJson.scripts?.["test:reservation-consumption-write"],
  "node scripts/reservation-consumption-write-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:test-reservation-consumption-write"],
  "node scripts/reservation-consumption-write-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:reservation-consumption-write/u,
);
console.log(
  "✓ pruebas local y staging quedan integradas",
);

assert.match(
  manifest,
  /20260810_017_reservation_consumption_write\.sql/u,
);
assert.match(
  manifest,
  /20260810_017_reservation_consumption_write\.down\.sql/u,
);
assert.match(
  remoteHistory,
  /reservationConsumptionWritePath/u,
);
assert.match(
  remoteHistory,
  /Consumo de Reserva agrega pedido transaccional y devolución histórica/u,
);
assert.match(
  remoteHistory,
  /const reservationConsumptionWrite = await readFile\([\s\S]+reservationConsumptionWritePath/u,
);
console.log(
  "✓ manifiesto e historial remoto incorporan migración 017",
);

for (const [label, source] of [
  ["migration", migration],
  ["rollback", rollback],
  ["postflight", postflight],
  ["contract", contract],
  ["reader", reader],
  ["action", action],
  ["docs", docs],
]) {
  assert.doesNotMatch(
    source,
    /[ \t]+\n/u,
    `${label} contiene whitespace accidental`,
  );
}
console.log(
  "✓ archivos E31A sin whitespace accidental",
);

console.log(
  "Todos los casos del consumo persistente de Reserva pasaron (20).",
);
