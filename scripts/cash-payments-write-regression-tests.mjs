import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260810_019_cash_payments_write.sql";
const rollbackPath =
  "supabase/rollbacks/20260810_019_cash_payments_write.down.sql";
const postflightPath =
  "supabase/preflight/20260810_019_cash_payments_write_postflight.sql";
const contractPath =
  "src/lib/payments/business-payment-contract.ts";
const cashActionsPath =
  "src/app/local/caja/actions.ts";
const paymentActionsPath =
  "src/app/local/reservas/payment-actions.ts";
const readerPath =
  "src/lib/data/server/business-cash.ts";
const docsPath =
  "docs/database/CASH-PAYMENTS-WRITE-RPC.md";

const [
  migration,
  rollback,
  postflight,
  contract,
  cashActions,
  paymentActions,
  reader,
  docs,
  remoteHistory,
  manifest,
  packageText,
] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(rollbackPath, "utf8"),
  readFile(postflightPath, "utf8"),
  readFile(contractPath, "utf8"),
  readFile(cashActionsPath, "utf8"),
  readFile(paymentActionsPath, "utf8"),
  readFile(readerPath, "utf8"),
  readFile(docsPath, "utf8"),
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

const packageJson =
  JSON.parse(packageText);

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function assertNoWhitespace(
  value,
  label,
) {
  const lines =
    value.split(/\r?\n/u);

  lines.forEach((line, index) => {
    assert.equal(
      line,
      line.trimEnd(),
      `${label}:${index + 1} tiene whitespace final`,
    );
  });

  assert.ok(
    value.endsWith("\n"),
    `${label} debe terminar con newline`,
  );
}

console.log(
  "Ejecutando regresión del backend persistente de Caja/Pagos E32A...",
);

assert.match(
  migration,
  /create table if not exists public\.cash_sessions/u,
);
assert.match(
  migration,
  /create table if not exists public\.business_payment_operations/u,
);
assert.match(
  migration,
  /create table if not exists public\.business_payments/u,
);
console.log(
  "✓ migración crea sesión de caja, idempotencia y ledger de pagos",
);

for (const token of [
  "business_payment_operations_order_tenant_fk",
  "business_payment_operations_reservation_tenant_fk",
  "business_payment_operations_session_tenant_fk",
  "business_payments_order_tenant_fk",
  "business_payments_reservation_tenant_fk",
  "business_payments_session_tenant_fk",
]) {
  assert.match(
    migration,
    new RegExp(token, "u"),
  );
}
console.log(
  "✓ todas las relaciones financieras conservan business_id",
);

assert.match(
  migration,
  /payment_method in \(\s*'cash',\s*'card',\s*'mercado_pago',\s*'transfer'/u,
);
assert.doesNotMatch(
  migration,
  /payment_method in \([\s\S]*'mixed'/u,
);
console.log(
  "✓ Mixto se persiste como componentes canónicos y no como pseudo-método",
);

assert.match(
  migration,
  /create or replace function public\.open_business_cash_session/u,
);
assert.match(
  migration,
  /cash_sessions_business_date_key/u,
);
assert.match(
  migration,
  /cash_sessions_open_operation_key/u,
);
assert.match(
  migration,
  /pg_advisory_xact_lock/u,
);
console.log(
  "✓ apertura de caja es única, bloqueada e idempotente",
);

assert.match(
  migration,
  /create or replace function public\.complete_business_reservation_payment/u,
);
assert.match(
  migration,
  /business_payment_operations_business_key/u,
);
assert.match(
  migration,
  /request_payload = normalized_payments/u,
);
console.log(
  "✓ cobro completo usa idempotencia de operación y detecta conflictos",
);

assert.match(
  migration,
  /Payment total must match canonical order subtotal/u,
);
assert.match(
  migration,
  /payment_total <> order_row\.subtotal/u,
);
assert.doesNotMatch(
  migration,
  /p_(total|subtotal|price)/u,
);
console.log(
  "✓ el importe válido nace del subtotal canónico y no de precios del navegador",
);

assert.match(
  migration,
  /session_row\.business_date = reservation_row\.reservation_date/u,
);
assert.match(
  migration,
  /cash_session_row\.status <> 'open'/u,
);
console.log(
  "✓ el cobro exige caja abierta para la fecha de la reserva",
);

assert.match(
  migration,
  /set status = 'completed',\s*revision = revision \+ 1/u,
);
assert.match(
  migration,
  /update public\.reservations\s+set status = 'completed'/u,
);
console.log(
  "✓ pedido y reserva se completan dentro de la misma transacción",
);

assert.ok(
  migration.indexOf(
    "update public.business_orders",
  ) < migration.indexOf(
    "update public.reservations",
  ),
);
console.log(
  "✓ el pedido se cierra antes de la reserva y respeta el guard de E31A",
);

for (const table of [
  "cash_sessions",
  "business_payment_operations",
  "business_payments",
]) {
  assert.match(
    migration,
    new RegExp(
      `alter table public\\.${table}\\s+enable row level security`,
      "u",
    ),
  );
  assert.match(
    migration,
    new RegExp(
      `alter table public\\.${table}\\s+force row level security`,
      "u",
    ),
  );
}
console.log(
  "✓ las tablas financieras nacen con RLS forzada",
);

assert.match(
  migration,
  /cash_sessions_select_cash_member/u,
);
assert.match(
  migration,
  /business_payments_select_cash_member/u,
);
assert.match(
  migration,
  /current_user_has_module_access\(\s*business_id,\s*'cash',\s*'view'/u,
);
console.log(
  "✓ lectura financiera exige permiso Cash por tenant",
);

assert.match(
  migration,
  /current_user_has_module_access\(\s*p_business_id,\s*'cash',\s*'manage'/u,
);
assert.equal(
  migration.match(
    /current_user_has_module_access\(\s*p_business_id,\s*'cash',\s*'manage'/gu,
  )?.length,
  2,
);
console.log(
  "✓ apertura y cobro exigen Cash manage en PostgreSQL",
);

assert.match(
  migration,
  /revoke all on table public\.business_payment_operations[\s\S]+public, anon, authenticated/u,
);
assert.doesNotMatch(
  migration,
  /grant (insert|update|delete|all)[\s\S]+authenticated/iu,
);
console.log(
  "✓ navegador no recibe DML financiero ni lectura de idempotencia",
);

assert.match(
  migration,
  /security definer\s+set search_path = ''/u,
);
assert.equal(
  migration.match(
    /security definer\s+set search_path = ''/gu,
  )?.length,
  2,
);
assert.match(
  migration,
  /revoke all on function public\.open_business_cash_session[\s\S]+from public, anon/u,
);
assert.match(
  migration,
  /revoke all on function public\.complete_business_reservation_payment[\s\S]+from public, anon/u,
);
console.log(
  "✓ RPC públicas restringen EXECUTE y fijan search_path",
);

assert.match(
  rollback,
  /drop function if exists public\.complete_business_reservation_payment/u,
);
assert.match(
  rollback,
  /force row level security/u,
);
assert.doesNotMatch(
  rollback,
  /drop table/u,
);
console.log(
  "✓ rollback corta la API sin destruir evidencia financiera",
);

assert.match(
  postflight,
  /Direct cash\/payment DML grant detected/u,
);
assert.match(
  postflight,
  /Payment operation idempotency table must remain private/u,
);
assert.match(
  postflight,
  /Anon must not execute cash\/payment RPCs/u,
);
console.log(
  "✓ postflight falla ante grants, RLS o EXECUTE inseguros",
);

assert.match(
  contract,
  /export type BusinessPaymentMethod/u,
);
assert.match(
  contract,
  /normalizeBusinessReservationPaymentInput/u,
);
assert.match(
  contract,
  /Math\.abs\([\s\S]+toFixed\(2\)/u,
);
assert.match(
  contract,
  /seen\.has\(method\)/u,
);
console.log(
  "✓ TypeScript valida moneda a centavos y métodos sin duplicados",
);

assert.match(
  cashActions,
  /resolveActiveBusiness/u,
);
assert.match(
  cashActions,
  /requiredAccess:\s*"view"\s*\|\s*"manage"/u,
);
assert.match(
  cashActions,
  /"cash",\s*requiredAccess/u,
);
assert.match(
  cashActions,
  /resolveCashContext\(\s*"manage"/u,
);
assert.match(
  cashActions,
  /open_business_cash_session/u,
);
assert.doesNotMatch(
  cashActions,
  /service_role|SUPABASE_SERVICE_ROLE/iu,
);
console.log(
  "✓ Server Action de apertura revalida negocio y permiso Cash",
);

assert.match(
  paymentActions,
  /resolveActiveBusiness/u,
);
assert.match(
  paymentActions,
  /"cash",\s*"manage"/u,
);
assert.match(
  paymentActions,
  /complete_business_reservation_payment/u,
);
assert.doesNotMatch(
  paymentActions,
  /service_role|SUPABASE_SERVICE_ROLE/iu,
);
console.log(
  "✓ Server Action de cobro no acepta business_id del navegador",
);

assert.match(
  reader,
  /assertServerOnly/u,
);
assert.match(
  reader,
  /\.eq\(\s*"business_id",\s*businessId/u,
);
assert.match(
  reader,
  /\.in\(\s*"reservation_id",\s*uniqueReservationIds/u,
);
console.log(
  "✓ reader financiero queda en servidor y filtra explícitamente por tenant",
);

assert.match(
  docs,
  /E32A/u,
);
assert.match(
  docs,
  /Gastos persistentes/u,
);
assert.match(
  docs,
  /cierre definitivo de Caja/u,
);
console.log(
  "✓ documentación impide habilitar un cierre de Caja incompleto",
);

assert.match(
  remoteHistory,
  /cashPaymentsWritePath/u,
);
assert.match(
  remoteHistory,
  /Caja\/Pagos agrega sesión y cobro transaccional/u,
);
console.log(
  "✓ historial remoto incorpora migración 019",
);

const migrationHash =
  sha256(migration);
const rollbackHash =
  sha256(rollback);

assert.match(
  manifest,
  new RegExp(
    `${migrationHash}  ${migrationPath.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}`,
    "u",
  ),
);
assert.match(
  manifest,
  new RegExp(
    `${rollbackHash}  ${rollbackPath.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}`,
    "u",
  ),
);
console.log(
  "✓ manifiesto protege migración y rollback 019",
);

assert.equal(
  packageJson.scripts?.["test:cash-payments-write"],
  "node scripts/cash-payments-write-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:test-cash-payments-write"],
  "node scripts/cash-payments-write-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:cash-payments-write/u,
);
console.log(
  "✓ pruebas local y staging de Caja/Pagos quedan integradas",
);

for (const [label, value] of [
  ["migration", migration],
  ["rollback", rollback],
  ["postflight", postflight],
  ["contract", contract],
  ["cashActions", cashActions],
  ["paymentActions", paymentActions],
  ["reader", reader],
  ["docs", docs],
]) {
  assertNoWhitespace(
    value,
    label,
  );
}
console.log(
  "✓ archivos E32A sin whitespace accidental",
);

console.log(
  "Todos los casos del backend Caja/Pagos E32A pasaron (24).",
);
