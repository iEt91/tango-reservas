import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const paths = {
  migration: "supabase/migrations/20260811_022_shipping_orders_write.sql",
  rollback: "supabase/rollbacks/20260811_022_shipping_orders_write.down.sql",
  postflight: "supabase/preflight/20260811_022_shipping_orders_write_postflight.sql",
  contract: "src/lib/shipping/business-shipping-contract.ts",
  reader: "src/lib/data/server/business-shipping.ts",
  actions: "src/app/local/envios/actions.ts",
  staging: "scripts/shipping-orders-write-staging-test.mjs",
  remoteHistory: "scripts/remote-schema-history-regression-tests.mjs",
  manifest: "supabase/MIGRATIONS.sha256",
  package: "package.json",
  migration016: "supabase/migrations/20260809_016_recipe_stock_consumption.sql",
  migration017: "supabase/migrations/20260810_017_reservation_consumption_write.sql",
  migration019: "supabase/migrations/20260810_019_cash_payments_write.sql",
  migration021: "supabase/migrations/20260811_021_kitchen_operational_write.sql",
  shippingUi: "src/app/local/envios/v2-envios-page.tsx",
  publicWeb: "src/app/[slug]/page.tsx",
  trackingUi: "src/app/[slug]/pedido/[trackingId]/page.tsx",
  docs: "docs/database/SHIPPING-ORDERS-WRITE-RPC.md",
};

const sources = Object.fromEntries(
  await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [
      key,
      await readFile(path, "utf8"),
    ]),
  ),
);

const checks = [];

function check(label, condition) {
  assert.ok(condition, label);
  checks.push(label);
  console.log(`✓ ${label}`);
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

console.log("Ejecutando regresión del backend persistente de Envíos E34A...");

check(
  "022 crea contexto Shipping alrededor del pedido canónico",
  /create table if not exists public\.business_shipping_orders/u.test(sources.migration)
    && /business_shipping_orders_order_tenant_fk/u.test(sources.migration)
    && /references public\.business_orders\(business_id, id, order_kind\)/u.test(sources.migration),
);

check(
  "022 crea evidencia idempotente de operaciones",
  /create table if not exists public\.business_shipping_operations/u.test(sources.migration)
    && /business_shipping_operations_business_key/u.test(sources.migration)
    && /operation_type in/u.test(sources.migration),
);

check(
  "Envíos preserva delivery pickup y estados existentes",
  /order_kind in \('delivery', 'pickup'\)/u.test(sources.migration)
    && /shipping_status in/u.test(sources.migration)
    && /'confirmed'/u.test(sources.migration)
    && /'completed'/u.test(sources.migration)
    && /'cancelled'/u.test(sources.migration),
);

check(
  "tracking se genera en PostgreSQL y queda tenant-unique",
  /business_shipping_orders_tracking_key/u.test(sources.migration)
    && /'PED-'/u.test(sources.migration)
    && /gen_random_uuid/u.test(sources.migration),
);

check(
  "pagos generalizan Reserva XOR Envío",
  /business_payment_operations[\s\S]*?add column if not exists shipping_id uuid/u.test(sources.migration)
    && /business_payments[\s\S]*?add column if not exists shipping_id uuid/u.test(sources.migration)
    && /alter column reservation_id drop not null/u.test(sources.migration)
    && /business_payment_operations_source_check/u.test(sources.migration)
    && /business_payments_source_check/u.test(sources.migration),
);

check(
  "pago de Reserva anterior no se reemplaza",
  /complete_business_reservation_payment/u.test(sources.migration019)
    && !/drop function[\s\S]*?complete_business_reservation_payment/u.test(sources.migration),
);

check(
  "pago Shipping usa Caja y subtotal canónico",
  /complete_business_shipping_payment/u.test(sources.migration)
    && /'shipping'[\s\S]*?'manage'/u.test(sources.migration)
    && /'cash'[\s\S]*?'manage'/u.test(sources.migration)
    && /cash_sessions/u.test(sources.migration)
    && /payment_total <> order_row\.subtotal/u.test(sources.migration),
);

check(
  "pago Shipping escribe el ledger financiero existente",
  /insert into public\.business_payment_operations/u.test(sources.migration)
    && /insert into public\.business_payments/u.test(sources.migration)
    && /shipping_id/u.test(sources.migration),
);

check(
  "guardado Shipping usa pedido y líneas existentes",
  /save_business_shipping_order/u.test(sources.migration)
    && /insert into public\.business_orders/u.test(sources.migration)
    && /business_order_items/u.test(sources.migration)
    && /subtotal_value/u.test(sources.migration),
);

check(
  "Stock reutiliza motores auditados con origin shipping",
  /private\.apply_recipe_stock_consumption/u.test(sources.migration)
    && /private\.apply_recipe_stock_return/u.test(sources.migration)
    && /'shipping'/u.test(sources.migration)
    && /business_order_stock_operations/u.test(sources.migration),
);

check(
  "motor histórico ya admite origin shipping",
  /p_origin not in \('reservation', 'shipping', 'recipe'\)/u.test(sources.migration016)
    && /p_origin not in \('reservation', 'shipping', 'recipe'\)/u.test(sources.migration017),
);

check(
  "pedido web pendiente no descuenta Stock hasta aceptación",
  /stock_is_reserved := not shipping_row\.needs_acceptance/u.test(sources.migration)
    && /accept_business_shipping_order/u.test(sources.migration)
    && /if shipping_row\.needs_acceptance then/u.test(sources.migration),
);

check(
  "cancelación permite devolución transaccional de Stock",
  /cancel_business_shipping_order/u.test(sources.migration)
    && /p_return_stock/u.test(sources.migration)
    && /shipping-cancel-return:/u.test(sources.migration),
);

check(
  "hitos separan ready y on_the_way",
  /set_business_shipping_milestone/u.test(sources.migration)
    && /p_milestone not in \('ready', 'on_the_way'\)/u.test(sources.migration)
    && /Pickup orders cannot be marked on the way/u.test(sources.migration),
);

check(
  "022 reutiliza trigger 021 sin reemplazarlo",
  /business_order_items_sync_kitchen_delta/u.test(sources.postflight)
    && /business_order_items_sync_kitchen_delta/u.test(sources.migration021)
    && !/drop trigger[\s\S]*?business_order_items_sync_kitchen_delta/u.test(sources.migration),
);

check(
  "Shipping agrega snapshot específico para Cocina",
  /get_business_shipping_kitchen_snapshot/u.test(sources.migration)
    && /business_kitchen_ticket_items/u.test(sources.migration)
    && /ticket_allocations/u.test(sources.migration)
    && /'delivery'::text as source/u.test(sources.migration),
);

check(
  "Shipping agrega transición de Cocina sin abrir E33A",
  /set_business_shipping_kitchen_command_status/u.test(sources.migration)
    && /order_row\.order_kind not in \('delivery', 'pickup'\)/u.test(sources.migration)
    && /business_kitchen_operations/u.test(sources.migration),
);

check(
  "snapshot Shipping exige view y mutaciones manage",
  /get_business_shipping_snapshot/u.test(sources.migration)
    && /'shipping',[\s\S]*?'view'/u.test(sources.migration)
    && /save_business_shipping_order[\s\S]*?'shipping',[\s\S]*?'manage'/u.test(sources.migration),
);

check(
  "tablas Shipping nacen con RLS forzada",
  /alter table public\.business_shipping_orders[\s\S]*?force row level security/u.test(sources.migration)
    && /alter table public\.business_shipping_operations[\s\S]*?force row level security/u.test(sources.migration),
);

check(
  "roles API no reciben DML técnico directo",
  /revoke all on table public\.business_shipping_orders[\s\S]*?public, anon, authenticated/u.test(sources.migration)
    && /grant select on table public\.business_shipping_orders[\s\S]*?authenticated/u.test(sources.migration)
    && !/grant (?:insert|update|delete|all)[\s\S]*?business_shipping_orders[\s\S]*?authenticated/iu.test(sources.migration),
);

check(
  "service_role recibe mantenimiento explícito",
  /grant select, insert, update, delete[\s\S]*?business_shipping_orders[\s\S]*?service_role/u.test(sources.migration)
    && /business_shipping_operations[\s\S]*?service_role/u.test(sources.migration),
);

check(
  "RPC públicas revocan anon y conceden authenticated",
  /revoke all on function public\.get_business_shipping_snapshot/u.test(sources.migration)
    && /grant execute on function public\.get_business_shipping_snapshot/u.test(sources.migration)
    && /to authenticated/u.test(sources.migration),
);

check(
  "helper privado no queda expuesto",
  /private\.build_business_shipping_result/u.test(sources.migration)
    && /revoke all on function private\.build_business_shipping_result[\s\S]*?public, anon, authenticated/u.test(sources.migration),
);

check(
  "todas las funciones SECURITY DEFINER fijan search_path",
  (sources.migration.match(/security definer\s+set search_path = ''/gu) ?? []).length >= 9,
);

check(
  "postflight cubre schema RLS grants RPC y compatibilidad",
  /Shipping tables are missing/u.test(sources.postflight)
    && /Payment source columns are incomplete/u.test(sources.postflight)
    && /Shipping tables require forced RLS/u.test(sources.postflight)
    && /Anonymous can execute Shipping RPCs/u.test(sources.postflight)
    && /Reservation payment RPC was lost/u.test(sources.postflight)
    && /shipping_orders_write_postflight/u.test(sources.postflight),
);

check(
  "rollback corta APIs sin destruir evidencia",
  /drop function if exists public\.get_business_shipping_snapshot/u.test(sources.rollback)
    && /Deliberately preserve Shipping rows/u.test(sources.rollback)
    && !/drop table/u.test(sources.rollback)
    && !/drop column/u.test(sources.rollback),
);

check(
  "contrato TypeScript valida fuente items pagos y operaciones",
  /BUSINESS_SHIPPING_TYPES/u.test(sources.contract)
    && /normalizeSaveBusinessShippingOrderInput/u.test(sources.contract)
    && /normalizeAcceptBusinessShippingOrderInput/u.test(sources.contract)
    && /normalizeCancelBusinessShippingOrderInput/u.test(sources.contract)
    && /normalizeCompleteBusinessShippingPaymentInput/u.test(sources.contract)
    && /mapBusinessShippingSnapshot/u.test(sources.contract),
);

check(
  "reader Shipping es server-only y usa solo RPC",
  /assertServerOnly/u.test(sources.reader)
    && /get_business_shipping_snapshot/u.test(sources.reader)
    && !/\.from\(/u.test(sources.reader),
);

check(
  "Server Actions revalidan shipping y cash",
  /resolveActiveBusiness/u.test(sources.actions)
    && /hasStaffAccess/u.test(sources.actions)
    && /"shipping"/u.test(sources.actions)
    && /"cash"/u.test(sources.actions)
    && /requireCashManage/u.test(sources.actions),
);

check(
  "navegador no decide business_id",
  /p_business_id:\s*context\.businessId/u.test(sources.actions)
    && !/businessId/u.test(sources.contract)
    && !/p_business_id/u.test(sources.contract),
);

check(
  "acciones cubren save accept milestone cancel y payment",
  /saveBusinessShippingOrderAction/u.test(sources.actions)
    && /acceptBusinessShippingOrderAction/u.test(sources.actions)
    && /setBusinessShippingMilestoneAction/u.test(sources.actions)
    && /cancelBusinessShippingOrderAction/u.test(sources.actions)
    && /completeBusinessShippingPaymentAction/u.test(sources.actions),
);

check(
  "staging cubre Stock Cocina Caja BOLA y DML",
  /E34A_STAGING_PASS/u.test(sources.staging)
    && /BOLA/u.test(sources.staging)
    && /DML/u.test(sources.staging)
    && /Stock/u.test(sources.staging)
    && /Cocina/u.test(sources.staging)
    && /Caja/u.test(sources.staging),
);

check(
  "frontera E34A admite el cutover UI E34B posterior",
  /window\.localStorage/u.test(sources.shippingUi)
    && /shippingPersistence/u.test(sources.shippingUi)
    && /getBusinessShippingSnapshotAction/u.test(sources.shippingUi)
    && /saveBusinessShippingOrderAction/u.test(sources.shippingUi)
    && /E34A es backend-only/u.test(sources.docs),
);

check(
  "frontera E34A admite la extensión pública E34C",
  /writePublicDeliveries/u.test(sources.publicWeb)
    && /api\/public/u.test(sources.publicWeb)
    && /getDataSource/u.test(sources.publicWeb)
    && /getDataSource/u.test(sources.trackingUi)
    && /E34C/u.test(sources.docs),
);

check(
  "historial remoto incorpora migración 022",
  /20260811_022_shipping_orders_write\.sql/u.test(sources.remoteHistory)
    && /Envíos agrega pedido Stock Cocina y pago canónicos/u.test(sources.remoteHistory),
);

check(
  "manifiesto protege migración y rollback 022",
  /20260811_022_shipping_orders_write\.sql/u.test(sources.manifest)
    && /20260811_022_shipping_orders_write\.down\.sql/u.test(sources.manifest),
);

check(
  "migración y rollback 022 tienen los SHA esperados",
  sha256(sources.migration) === "09bd53ae54735a8c20939621f44a8960c4dd400f92eaee71f802cea4ede2cd3f"
    && sha256(sources.rollback) === "d1b4b5381987e30292c05a0c95210f779ae668f50d8537f6d563b6e8dde0a3cd",
);

check(
  "migraciones 016 017 019 021 permanecen byte-identical",
  sha256(sources.migration016) === "1b36c68715516fae55b78284aff85be68e5b884071949a1def085838ab675640"
    && sha256(sources.migration017) === "baa7ab632573176a6ac8d1c4c28139dd77d8f30ebf5cfddcbd7cb13b4a2b4127"
    && sha256(sources.migration019) === "e4aa218d4d24848f7381fc08685070fdb85b73816c17df9952e27ec4fa46e69f"
    && sha256(sources.migration021) === "62d8b0232f23e69195832fb84445126864f15d31b72e53527aa96362030590a6",
);

const pkg = JSON.parse(sources.package);

check(
  "E34A forma parte del QA global",
  pkg.scripts?.["test:shipping-orders-write"]
    === "node scripts/shipping-orders-write-regression-tests.mjs"
    && pkg.scripts?.["staging:test-shipping-orders-write"]
      === "node scripts/shipping-orders-write-staging-test.mjs"
    && pkg.scripts?.["test:regression"]?.includes("test:shipping-orders-write"),
);

for (const [label, source] of Object.entries(sources)) {
  check(`${label} sin whitespace accidental`, !/[ \t]+\n/u.test(source));
}

console.log(
  `Todos los casos del backend persistente de Envíos E34A pasaron (${checks.length}).`,
);
