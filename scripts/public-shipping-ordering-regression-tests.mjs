import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const paths = {
  migration:
    "supabase/migrations/20260811_023_public_shipping_ordering.sql",
  rollback:
    "supabase/rollbacks/20260811_023_public_shipping_ordering.down.sql",
  postflight:
    "supabase/preflight/20260811_023_public_shipping_ordering_postflight.sql",
  contract:
    "src/lib/public-shipping/public-shipping-contract.ts",
  gateway:
    "src/lib/data/server/public-shipping.ts",
  fingerprint:
    "src/lib/security/public-request-fingerprint.ts",
  supabaseServer:
    "src/lib/supabase/server.ts",
  orderingRoute:
    "src/app/api/public/[slug]/ordering/route.ts",
  createRoute:
    "src/app/api/public/[slug]/shipping/route.ts",
  trackingRoute:
    "src/app/api/public/[slug]/shipping/[trackingId]/route.ts",
  publicWeb:
    "src/app/[slug]/page.tsx",
  publicTracking:
    "src/app/[slug]/pedido/[trackingId]/page.tsx",
  shippingRoute:
    "src/app/local/envios/page.tsx",
  shippingUi:
    "src/app/local/envios/v2-envios-page.tsx",
  e34a:
    "scripts/shipping-orders-write-regression-tests.mjs",
  e34b:
    "scripts/shipping-ui-cutover-regression-tests.mjs",
  staging:
    "scripts/public-shipping-ordering-staging-test.mjs",
  remoteHistory:
    "scripts/remote-schema-history-regression-tests.mjs",
  manifest:
    "supabase/MIGRATIONS.sha256",
  migration022:
    "supabase/migrations/20260811_022_shipping_orders_write.sql",
  rollback022:
    "supabase/rollbacks/20260811_022_shipping_orders_write.down.sql",
  docs:
    "docs/database/PUBLIC-SHIPPING-ORDERING.md",
  package:
    "package.json",
};

const sources =
  Object.fromEntries(
    await Promise.all(
      Object.entries(paths)
        .map(
          async (
            [key, path],
          ) => [
            key,
            await readFile(
              path,
              "utf8",
            ),
          ],
        ),
    ),
  );

const checks = [];

function check(
  label,
  condition,
) {
  assert.ok(
    condition,
    label,
  );
  checks.push(
    label,
  );
  console.log(
    `✓ ${label}`,
  );
}

function sha256(
  source,
) {
  return createHash(
    "sha256",
  )
    .update(source)
    .digest("hex");
}

console.log(
  "Ejecutando pedidos web + tracking persistente E34C...",
);

check(
  "023 extiende evidencia Shipping con public_create",
  /business_shipping_operations_type_check/u.test(
    sources.migration,
  )
    && /'public_create'/u.test(
      sources.migration,
    )
    && /business_shipping_operations/u.test(
      sources.migration,
    ),
);

check(
  "023 crea rate-limit técnico con RLS forzada",
  /create table if not exists public\.business_public_request_limits/u.test(
    sources.migration,
  )
    && /force row level security/u.test(
      sources.migration,
    )
    && /shipping_create/u.test(
      sources.migration,
    )
    && /shipping_track/u.test(
      sources.migration,
    ),
);

check(
  "rate-limit es atómico y purga buckets antiguos",
  /on conflict \([\s\S]*?bucket_started_at[\s\S]*?\)[\s\S]*?do update/u.test(
    sources.migration,
  )
    && /request_count[\s\S]*?< p_limit/u.test(
      sources.migration,
    )
    && /rate limit exceeded/u.test(
      sources.migration,
    )
    && /interval '24 hours'/u.test(
      sources.migration,
    )
    && /service_consume_business_public_request_limit/u.test(
      sources.migration,
    ),
);

check(
  "snapshot público resuelve negocio activo por slug",
  /service_get_public_business_ordering_snapshot/u.test(
    sources.migration,
  )
    && /lower\(business\.slug\) = normalized_slug/u.test(
      sources.migration,
    )
    && /business\.status = 'active'/u.test(
      sources.migration,
    ),
);

check(
  "snapshot sólo publica Menú visible disponible",
  /menu_item\.status = 'available'/u.test(
    sources.migration,
  )
    && /menu_item\.is_visible = true/u.test(
      sources.migration,
    )
    && /category\.is_visible = true/u.test(
      sources.migration,
    )
    && /category\.is_active = true/u.test(
      sources.migration,
    ),
);

check(
  "creación pública no acepta business_id precio nombre ni subtotal",
  /service_create_public_shipping_order/u.test(
    sources.migration,
  )
    && !/p_business_id/u.test(
      sources.migration.match(
        /create or replace function public\.service_create_public_shipping_order[\s\S]*?create or replace function public\.service_get_public_shipping_tracking/u,
      )?.[0] ?? "",
    )
    && !/p_price/u.test(
      sources.migration,
    )
    && !/p_subtotal/u.test(
      sources.migration,
    )
    && /menu_item_row\.price/u.test(
      sources.migration,
    )
    && /menu_item_row\.name/u.test(
      sources.migration,
    ),
);

check(
  "pedido web nace pendiente de aceptación",
  /'web',[\s\S]*?true,[\s\S]*?generated_tracking/u.test(
    sources.migration,
  )
    && /business_shipping_orders/u.test(
      sources.migration,
    )
    && /business_orders/u.test(
      sources.migration,
    )
    && /business_order_items/u.test(
      sources.migration,
    ),
);

check(
  "tracking fuerte sigue generado en PostgreSQL",
  /generated_tracking :=[\s\S]*?'PED-'/u.test(
    sources.migration,
  )
    && /gen_random_uuid/u.test(
      sources.migration,
    )
    && /substr[\s\S]*?1,[\s\S]*?16/u.test(
      sources.migration,
    ),
);

check(
  "public_create usa advisory lock e idempotencia",
  /pg_advisory_xact_lock/u.test(
    sources.migration,
  )
    && /operation_key = normalized_key/u.test(
      sources.migration,
    )
    && /operation_type <> 'public_create'/u.test(
      sources.migration,
    )
    && /request_payload <> request_value/u.test(
      sources.migration,
    )
    && /return existing_operation\.result_snapshot/u.test(
      sources.migration,
    ),
);

check(
  "tracking público omite PII e IDs internos",
  /service_get_public_shipping_tracking/u.test(
    sources.migration,
  )
    && /'businessName'/u.test(
      sources.migration,
    )
    && /'trackingId'/u.test(
      sources.migration,
    )
    && /'total'/u.test(
      sources.migration,
    )
    && !/'phone'/u.test(
      sources.migration.match(
        /create or replace function public\.service_get_public_shipping_tracking[\s\S]*?revoke all on function public\.service_get_public_business_ordering_snapshot/u,
      )?.[0] ?? "",
    )
    && !/'address'/u.test(
      sources.migration.match(
        /create or replace function public\.service_get_public_shipping_tracking[\s\S]*?revoke all on function public\.service_get_public_business_ordering_snapshot/u,
      )?.[0] ?? "",
    )
    && !/'client'/u.test(
      sources.migration.match(
        /create or replace function public\.service_get_public_shipping_tracking[\s\S]*?revoke all on function public\.service_get_public_business_ordering_snapshot/u,
      )?.[0] ?? "",
    ),
);

check(
  "tracking terminal expira al minuto",
  /interval '1 minute'/u.test(
    sources.migration,
  )
    && /shipping_row\.completed_at/u.test(
      sources.migration,
    )
    && /shipping_row\.cancelled_at/u.test(
      sources.migration,
    ),
);

check(
  "RPC service-only no quedan ejecutables por anon authenticated",
  (
    sources.migration.match(
      /revoke all on function public\.service_/gu,
    )
    ?? []
  ).length === 4
    && /from public, anon, authenticated/u.test(
      sources.migration,
    )
    && (
      sources.migration.match(
        /to service_role;/gu,
      )
      ?? []
    ).length >= 4,
);

check(
  "023 no abre tablas operativas a anon",
  !/grant[\s\S]*?on table[\s\S]*?to anon/iu.test(
    sources.migration,
  )
    && /revoke all on table public\.business_public_request_limits[\s\S]*?anon/u.test(
      sources.migration,
    ),
);

check(
  "service RPC usa SECURITY INVOKER no SECURITY DEFINER",
  /service_get_public_business_ordering_snapshot[\s\S]*?security invoker/u.test(
    sources.migration,
  )
    && /service_create_public_shipping_order[\s\S]*?security invoker/u.test(
      sources.migration,
    )
    && /service_get_public_shipping_tracking[\s\S]*?security invoker/u.test(
      sources.migration,
    ),
);

check(
  "fingerprint HMAC delega el secreto al módulo privilegiado",
  /assertServerOnly/u.test(
    sources.fingerprint,
  )
    && /createSupabaseServerHmac/u.test(
      sources.fingerprint,
    )
    && !/createHmac/u.test(
      sources.fingerprint,
    )
    && !/SUPABASE_SERVICE_ROLE_KEY/u.test(
      sources.fingerprint,
    )
    && !/NEXT_PUBLIC_SUPABASE/u.test(
      sources.fingerprint,
    )
    && /createSupabaseServerHmac/u.test(
      sources.supabaseServer,
    )
    && /createHmac/u.test(
      sources.supabaseServer,
    )
    && /SUPABASE_SERVICE_ROLE_KEY/u.test(
      sources.supabaseServer,
    ),
);

check(
  "gateway usa cliente privilegiado sólo servidor",
  /assertServerOnly/u.test(
    sources.gateway,
  )
    && /getSupabaseServerClient/u.test(
      sources.gateway,
    )
    && /service_get_public_business_ordering_snapshot/u.test(
      sources.gateway,
    )
    && /service_create_public_shipping_order/u.test(
      sources.gateway,
    )
    && /service_get_public_shipping_tracking/u.test(
      sources.gateway,
    ),
);

check(
  "browser público nunca importa Supabase",
  !/@supabase\/supabase-js/u.test(
      sources.publicWeb,
    )
    && !/@\/lib\/supabase\//u.test(
      sources.publicWeb,
    )
    && !/@supabase\/supabase-js/u.test(
      sources.publicTracking,
    )
    && !/@\/lib\/supabase\//u.test(
      sources.publicTracking,
    ),
);

check(
  "Route Handlers median ordering create tracking",
  /getPublicShippingOrderingSnapshot/u.test(
    sources.orderingRoute,
  )
    && /createPublicShippingOrder/u.test(
      sources.createRoute,
    )
    && /getPublicShippingTracking/u.test(
      sources.trackingRoute,
    )
    && /createPublicRequestFingerprint/u.test(
      sources.createRoute,
    )
    && /createPublicRequestFingerprint/u.test(
      sources.trackingRoute,
    ),
);

check(
  "POST limita body y no acepta precio subtotal",
  /65536/u.test(
    sources.createRoute,
  )
    && /menuItemId/u.test(
      sources.createRoute,
    )
    && /quantity/u.test(
      sources.createRoute,
    )
    && !/\bprice\b/u.test(
      sources.createRoute,
    )
    && !/\bsubtotal\b/u.test(
      sources.createRoute,
    ),
);

check(
  "web Supabase obtiene Menú por slug y conserva fallback local",
  /getDataSource/u.test(
    sources.publicWeb,
  )
    && /useParams/u.test(
      sources.publicWeb,
    )
    && /\/api\/public\/\$\{encodeURIComponent\(publicSlug\)\}\/ordering/u.test(
      sources.publicWeb,
    )
    && /readPublicMenuItems/u.test(
      sources.publicWeb,
    )
    && /writePublicDeliveries/u.test(
      sources.publicWeb,
    ),
);

check(
  "web Supabase crea por API con requestKey estable",
  /orderRequestKeyRef/u.test(
    sources.publicWeb,
  )
    && /crypto\.randomUUID/u.test(
      sources.publicWeb,
    )
    && /requestKey/u.test(
      sources.publicWeb,
    )
    && /\/shipping/u.test(
      sources.publicWeb,
    )
    && /isOrderSubmitting/u.test(
      sources.publicWeb,
    ),
);

check(
  "promociones sintéticas no se ordenan en Supabase",
  /!isSupabasePersistence[\s\S]*?orderable/u.test(
    sources.publicWeb,
  )
    || /orderable:[\s\S]*?!isSupabasePersistence/u.test(
      sources.publicWeb,
    ),
);

check(
  "tracking Supabase consulta API y conserva localStorage local",
  /getDataSource/u.test(
    sources.publicTracking,
  )
    && /\/api\/public\/\$\{encodeURIComponent\(slug\)\}\/shipping/u.test(
      sources.publicTracking,
    )
    && /setInterval/u.test(
      sources.publicTracking,
    )
    && /window\.localStorage/u.test(
      sources.publicTracking,
    ),
);

check(
  "tracking persistente no renderiza dirección cliente teléfono",
  /La vista persistente no publica datos personales/u.test(
    sources.publicTracking,
  )
    && /!isSupabasePersistence[\s\S]*?localDelivery\.client/u.test(
      sources.publicTracking,
    )
    && !/persistentTracking\?\.phone/u.test(
      sources.publicTracking,
    )
    && !/persistentTracking\?\.address/u.test(
      sources.publicTracking,
    ),
);

check(
  "panel Envíos recibe slug real",
  /businessSlug=/u.test(
    sources.shippingRoute,
  )
    && /activeBusiness\.membership\.business\.slug/u.test(
      sources.shippingRoute,
    )
    && /businessSlug/u.test(
      sources.shippingUi,
    ),
);

check(
  "panel re-habilita tracking persistente",
  !/Tracking p\u00fablico[\s\S]*?disabled=\{isSupabasePersistence\}[\s\S]*?Copiar link/u.test(
      sources.shippingUi,
    )
    && /getDeliveryTrackingPath/u.test(
      sources.shippingUi,
    )
    && /getDeliveryTrackingUrl/u.test(
      sources.shippingUi,
    )
    && !/seguimiento público persistente se habilitará/u.test(
      sources.shippingUi,
    ),
);

check(
  "históricos E34A E34B aceptan E34C",
  /frontera E34A admite la extensión pública E34C/u.test(
      sources.e34a,
    )
    && /frontera E34B admite tracking público E34C/u.test(
      sources.e34b,
    ),
);

check(
  "staging cubre idempotencia rate-limit PII BOLA Stock Cocina",
  /E34C_STAGING_PASS/u.test(
    sources.staging,
  )
    && /idempotencia/u.test(
      sources.staging,
    )
    && /rate-limit/u.test(
      sources.staging,
    )
    && /PII/u.test(
      sources.staging,
    )
    && /BOLA/u.test(
      sources.staging,
    )
    && /Stock/u.test(
      sources.staging,
    )
    && /Cocina/u.test(
      sources.staging,
    ),
);

const stockLinksBeforeStartMarker = `  const {
    data: stockLinksBefore,
    error: stockLinksBeforeError,
  } =`;
const stockLinksBeforeEndMarker =
  "  if (stockLinksBeforeError) {";
const stockLinksBeforeStart =
  sources.staging.indexOf(
    stockLinksBeforeStartMarker,
  );
const stockLinksBeforeEnd =
  sources.staging.indexOf(
    stockLinksBeforeEndMarker,
    stockLinksBeforeStart
      + stockLinksBeforeStartMarker.length,
  );
const stockLinkRead =
  stockLinksBeforeStart >= 0
    && stockLinksBeforeEnd > stockLinksBeforeStart
    ? sources.staging.slice(
        stockLinksBeforeStart,
        stockLinksBeforeEnd,
      )
    : "";

check(
  "staging consulta la PK real de business_order_stock_operations",
  sources.staging.split(
    stockLinksBeforeStartMarker,
  ).length - 1 === 1
    && sources.staging.split(
      stockLinksBeforeEndMarker,
    ).length - 1 === 1
    && /\.from\(\s*"business_order_stock_operations",?\s*\)/u.test(
      stockLinkRead,
    )
    && /\.select\("stock_recipe_operation_id"\)/u.test(
      stockLinkRead,
    )
    && !/\.select\("id"\)/u.test(
      stockLinkRead,
    )
    && /\.eq\(\s*"order_id",\s*shipping\.order_id,?\s*\)/u.test(
      stockLinkRead,
    ),
);

check(
  "staging acota Shipping snapshot al business_date real",
  /"id, order_id, business_date, source, needs_acceptance, tracking_code"/u.test(
    sources.staging,
  )
    && /p_start_date:\s*shipping\.business_date/u.test(
      sources.staging,
    )
    && /p_end_date:\s*shipping\.business_date/u.test(
      sources.staging,
    )
    && /const dateForKitchen =\s*shipping\.business_date;/u.test(
      sources.staging,
    )
    && !/"2000-01-01"/u.test(
      sources.staging,
    )
    && !/"2099-12-31"/u.test(
      sources.staging,
    ),
);

check(
  "staging prepara receta persistente y limpia Stock temporal",
  /save_business_menu_recipe/u.test(
    sources.staging,
  )
    && /menu_recipe_ingredients/u.test(
      sources.staging,
    )
    && /record_business_stock_movement/u.test(
      sources.staging,
    )
    && /seedMovementIds/u.test(
      sources.staging,
    )
    && /stock_recipe_operation_movements/u.test(
      sources.staging,
    )
    && /stock_recipe_operations/u.test(
      sources.staging,
    )
    && /fixture público usa receta persistente y Stock temporal/u.test(
      sources.staging,
    ),
);

check(
  "postflight verifica RLS grants service-only y compatibilidad",
  /Anonymous table grants were introduced/u.test(
    sources.postflight,
  )
    && /Anonymous can execute service-only/u.test(
      sources.postflight,
    )
    && /Authenticated can execute service-only/u.test(
      sources.postflight,
    )
    && /service_role is missing/u.test(
      sources.postflight,
    )
    && /E34A acceptance RPC was lost/u.test(
      sources.postflight,
    ),
);

check(
  "rollback corta API sin destruir pedidos públicos",
  /drop function if exists public\.service_get_public_shipping_tracking/u.test(
      sources.rollback,
    )
    && /preserve[\s\S]*?'public_create'/u.test(
      sources.rollback,
    )
    && !/drop table public\.business_shipping_orders/u.test(
      sources.rollback,
    )
    && !/drop table public\.business_orders/u.test(
      sources.rollback,
    ),
);

check(
  "contrato valida ordering create tracking",
  /mapPublicShippingOrderingSnapshot/u.test(
    sources.contract,
  )
    && /mapPublicShippingCreateResult/u.test(
      sources.contract,
    )
    && /mapPublicShippingTrackingSnapshot/u.test(
      sources.contract,
    )
    && /normalizePublicShippingPaymentMethod/u.test(
      sources.contract,
    ),
);

check(
  "historial remoto incorpora 023",
  /20260811_023_public_shipping_ordering\.sql/u.test(
    sources.remoteHistory,
  )
    && /Pedidos web agrega gateway service-only y tracking mínimo/u.test(
      sources.remoteHistory,
    ),
);

check(
  "manifiesto protege 023 y rollback",
  /20260811_023_public_shipping_ordering\.sql/u.test(
    sources.manifest,
  )
    && /20260811_023_public_shipping_ordering\.down\.sql/u.test(
      sources.manifest,
    ),
);

check(
  "023 y rollback tienen SHA esperados",
  sha256(
    sources.migration,
  ) === "1d12803d7416dd9012c231c33572f31a511650d6dfcca365b5816795fde84b21"
    && sha256(
      sources.rollback,
    ) === "efdfcd06da91b0d1311d81c0545afe044596a8d20d2f71d2d531764cfed64a75",
);

check(
  "022 y rollback permanecen byte-identical",
  sha256(
    sources.migration022,
  ) === "09bd53ae54735a8c20939621f44a8960c4dd400f92eaee71f802cea4ede2cd3f"
    && sha256(
      sources.rollback022,
    ) === "d1b4b5381987e30292c05a0c95210f779ae668f50d8537f6d563b6e8dde0a3cd",
);

check(
  "documentación fija service-only anti-abuso y no migración local",
  /browser -> Route Handler Next\.js -> service_role server-only/u.test(
    sources.docs,
  )
    && /5 pedidos \/ 10 minutos/u.test(
      sources.docs,
    )
    && /no aplica 023/u.test(
      sources.docs,
    ),
);

const pkg =
  JSON.parse(
    sources.package,
  );

const globalRegressionCommands =
  (
    pkg.scripts?.[
      "test:regression"
    ]
    ?? ""
  )
    .split(" && ")
    .filter(Boolean);

check(
  "E34C forma parte del QA global",
  pkg.scripts?.[
    "test:public-shipping-ordering"
  ] ===
    "node scripts/public-shipping-ordering-regression-tests.mjs"
    && pkg.scripts?.[
      "staging:test-public-shipping-ordering"
    ] ===
      "node scripts/public-shipping-ordering-staging-test.mjs"
    && globalRegressionCommands
      .filter(
        (command) =>
          command
          === "npm run test:public-shipping-ordering",
      )
      .length
      === 1,
);

for (
  const [
    label,
    source,
  ]
  of Object.entries(
    sources,
  )
) {
  check(
    `${label} sin whitespace accidental`,
    !/[ \t]+\n/u.test(
      source,
    ),
  );
}

console.log(
  `Todos los casos E34C pasaron (${checks.length}).`,
);
