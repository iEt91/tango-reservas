import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const paths = {
  migration:
    "supabase/migrations/20260811_021_kitchen_operational_write.sql",
  rollback:
    "supabase/rollbacks/20260811_021_kitchen_operational_write.down.sql",
  postflight:
    "supabase/preflight/20260811_021_kitchen_operational_write_postflight.sql",
  contract:
    "src/lib/kitchen/business-kitchen-contract.ts",
  reader:
    "src/lib/data/server/business-kitchen.ts",
  actions:
    "src/app/local/cocina/actions.ts",
  staging:
    "scripts/kitchen-operational-write-staging-test.mjs",
  remoteHistory:
    "scripts/remote-schema-history-regression-tests.mjs",
  manifest:
    "supabase/MIGRATIONS.sha256",
  package:
    "package.json",
  reservationConsumption:
    "supabase/migrations/20260810_017_reservation_consumption_write.sql",
  staffContract:
    "src/lib/staff/staff-contract.ts",
  kitchenUi:
    "src/app/local/cocina/page.tsx",
  docs:
    "docs/database/KITCHEN-OPERATIONAL-WRITE-RPC.md",
};

const sources =
  Object.fromEntries(
    await Promise.all(
      Object.entries(paths).map(
        async ([key, path]) => [
          key,
          await readFile(path, "utf8"),
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
  checks.push(label);
  console.log(`✓ ${label}`);
}

function sha256(source) {
  return createHash("sha256")
    .update(source)
    .digest("hex");
}

console.log(
  "Ejecutando regresión del backend operativo de Cocina E33A...",
);

check(
  "migración 021 amplía business_orders sin tocar estado comercial",
  /add column if not exists kitchen_status/u.test(
    sources.migration,
  )
    && /business_orders_kitchen_status_check/u.test(
      sources.migration,
    )
    && /status in \('open', 'completed', 'cancelled'\)/u.test(
      sources.reservationConsumption,
    )
    && !/alter table public\.business_orders[\s\S]*?drop constraint business_orders_status_check/u.test(
      sources.migration,
    ),
);

check(
  "Cocina crea tickets líneas e idempotencia por tenant",
  /create table if not exists public\.business_kitchen_tickets/u.test(
    sources.migration,
  )
    && /create table if not exists public\.business_kitchen_ticket_items/u.test(
      sources.migration,
    )
    && /create table if not exists public\.business_kitchen_operations/u.test(
      sources.migration,
    )
    && /business_kitchen_operations_business_key/u.test(
      sources.migration,
    )
    && /foreign key \(business_id, order_id, order_kind\)/u.test(
      sources.migration,
    ),
);

check(
  "tickets preservan estados tiempos y baja lógica",
  /status text not null default 'pending'/u.test(
    sources.migration,
  )
    && /target_seconds integer not null default 900/u.test(
      sources.migration,
    )
    && /entered_at timestamptz/u.test(
      sources.migration,
    )
    && /voided_at timestamptz/u.test(
      sources.migration,
    )
    && /completed_at timestamptz/u.test(
      sources.migration,
    ),
);

check(
  "tiempo objetivo reutiliza preparación persistente de Recetas",
  /private\.kitchen_recipe_target_seconds/u.test(
    sources.migration,
  )
    && /public\.menu_recipes/u.test(
      sources.migration,
    )
    && /preparation_time_seconds/u.test(
      sources.migration,
    )
    && /900/u.test(
      sources.migration,
    ),
);

check(
  "trigger sincroniza deltas dentro de la misma transacción del pedido",
  /sync_business_order_item_kitchen_delta/u.test(
    sources.migration,
  )
    && /after insert or update of quantity or delete/u.test(
      sources.migration,
    )
    && /business_order_items_sync_kitchen_delta/u.test(
      sources.migration,
    )
    && /add_business_kitchen_ticket_item/u.test(
      sources.migration,
    )
    && /reduce_business_kitchen_ticket_item/u.test(
      sources.migration,
    ),
);

check(
  "base pending absorbe cambios sin crear agregado",
  /order_row\.kitchen_status = 'pending'/u.test(
    sources.migration,
  )
    && /return new;/u.test(
      sources.migration,
    ),
);

check(
  "incrementos se fusionan en el último agregado pending",
  /ticket\.status = 'pending'/u.test(
    sources.migration,
  )
    && /order by ticket\.sequence desc/u.test(
      sources.migration,
    )
    && /on conflict \(\s*business_id,\s*ticket_id,\s*menu_item_id\s*\)/u.test(
      sources.migration,
    )
    && /quantity =\s*current_item\.quantity\s*\+ excluded\.quantity/u.test(
      sources.migration,
    ),
);

check(
  "reducciones respetan pending preparing ready y no completed",
  /ticket\.status in \('pending', 'preparing', 'ready'\)/u.test(
    sources.migration,
  )
    && /when 'pending' then 1/u.test(
      sources.migration,
    )
    && /when 'preparing' then 2/u.test(
      sources.migration,
    )
    && /when 'ready' then 3/u.test(
      sources.migration,
    )
    && !/ticket\.status in \('pending', 'preparing', 'ready', 'completed'\)/u.test(
      sources.migration,
    ),
);

check(
  "ticket vacío se anula lógicamente",
  /not exists \([\s\S]*?business_kitchen_ticket_items[\s\S]*?voided_at = coalesce\(voided_at, now\(\)\)/u.test(
    sources.migration,
  ),
);

check(
  "snapshot base resta cantidades asignadas a agregados",
  /ticket_allocations/u.test(
    sources.migration,
  )
    && /order_item\.quantity[\s\S]*?allocation\.allocated_quantity/u.test(
      sources.migration,
    )
    && /base_items/u.test(
      sources.migration,
    ),
);

check(
  "snapshot expone solo contexto mínimo de Reserva para Cocina",
  /get_business_kitchen_snapshot/u.test(
    sources.migration,
  )
    && /reservation\.customer_name/u.test(
      sources.migration,
    )
    && /reservation\.reservation_time/u.test(
      sources.migration,
    )
    && /reservation_table_assignments/u.test(
      sources.migration,
    )
    && /floor_tables/u.test(
      sources.migration,
    )
    && /'reservation'::text as source/u.test(
      sources.migration,
    ),
);

check(
  "E33A deja delivery pickup para corte posterior",
  /ticket\.order_kind = 'dine_in'/u.test(
    sources.migration,
  )
    && /order_row\.order_kind = 'dine_in'/u.test(
      sources.migration,
    )
    && /order_kind in \('dine_in', 'delivery', 'pickup'\)/u.test(
      sources.migration,
    ),
);

check(
  "lectura exige kitchen view y mutación kitchen manage",
  /'kitchen',\s*'view'/u.test(
    sources.migration,
  )
    && /'kitchen',\s*'manage'/u.test(
      sources.migration,
    )
    && /key: "kitchen"/u.test(
      sources.staffContract,
    ),
);

check(
  "RPC de estado admite solo transiciones de la UI existente",
  /current_status = 'pending' and p_status = 'preparing'/u.test(
    sources.migration,
  )
    && /current_status = 'preparing' and p_status = 'ready'/u.test(
      sources.migration,
    )
    && /current_status = 'ready' and p_status = 'preparing'/u.test(
      sources.migration,
    )
    && /current_status = 'ready' and p_status = 'completed'/u.test(
      sources.migration,
    )
    && /Kitchen status transition is not allowed/u.test(
      sources.migration,
    ),
);

check(
  "mutación de estado usa advisory lock e idempotencia",
  /pg_advisory_xact_lock/u.test(
    sources.migration,
  )
    && /business_kitchen_operations/u.test(
      sources.migration,
    )
    && /operation\.operation_key = btrim\(p_operation_key\)/u.test(
      sources.migration,
    )
    && /return existing_operation\.result_snapshot/u.test(
      sources.migration,
    ),
);

check(
  "tablas técnicas quedan con RLS forzada y sin grants API",
  /alter table public\.business_kitchen_tickets\s+enable row level security/u.test(
    sources.migration,
  )
    && /alter table public\.business_kitchen_tickets\s+force row level security/u.test(
      sources.migration,
    )
    && /revoke all\s+on table\s+public\.business_kitchen_tickets,[\s\S]*?from public, anon, authenticated/u.test(
      sources.migration,
    )
    && /grant select, insert, update, delete[\s\S]*?to service_role/u.test(
      sources.migration,
    ),
);

check(
  "RPC públicas revocan anon PUBLIC y conceden authenticated",
  /revoke all on function public\.get_business_kitchen_snapshot\([\s\S]*?\) from public, anon, authenticated/u.test(
    sources.migration,
  )
    && /grant execute on function public\.get_business_kitchen_snapshot\([\s\S]*?\) to authenticated/u.test(
      sources.migration,
    )
    && /revoke all on function public\.set_business_kitchen_command_status\([\s\S]*?\) from public, anon, authenticated/u.test(
      sources.migration,
    )
    && /grant execute on function public\.set_business_kitchen_command_status\([\s\S]*?\) to authenticated/u.test(
      sources.migration,
    ),
);

check(
  "helpers privados fijan search_path y no se exponen",
  /function private\.sync_business_order_item_kitchen_delta\(\)[\s\S]*?security definer[\s\S]*?set search_path = ''/u.test(
    sources.migration,
  )
    && /revoke all on function private\.sync_business_order_item_kitchen_delta\(\)\s*from public, anon, authenticated/u.test(
      sources.migration,
    ),
);

check(
  "rollback corta API y trigger sin destruir evidencia",
  /drop function if exists public\.get_business_kitchen_snapshot/u.test(
    sources.rollback,
  )
    && /drop trigger if exists\s+business_order_items_sync_kitchen_delta/u.test(
      sources.rollback,
    )
    && /force row level security/u.test(
      sources.rollback,
    )
    && !/drop table[\s\S]*?business_kitchen/u.test(
      sources.rollback,
    )
    && !/drop column[\s\S]*?kitchen_status/u.test(
      sources.rollback,
    ),
);

check(
  "postflight verifica columnas tablas RLS grants trigger y EXECUTE",
  /Kitchen columns are incomplete/u.test(
    sources.postflight,
  )
    && /Kitchen tables require forced RLS/u.test(
      sources.postflight,
    )
    && /Kitchen technical tables expose direct grants/u.test(
      sources.postflight,
    )
    && /business_order_items_sync_kitchen_delta/u.test(
      sources.postflight,
    )
    && /Authenticated cannot execute Kitchen snapshot/u.test(
      sources.postflight,
    )
    && /select 'PASS' as kitchen_operational_write_postflight/u.test(
      sources.postflight,
    ),
);

check(
  "contrato TypeScript valida fecha estado UUID operación y snapshots",
  /BUSINESS_KITCHEN_STATUSES/u.test(
    sources.contract,
  )
    && /normalizeBusinessKitchenDate/u.test(
      sources.contract,
    )
    && /normalizeBusinessKitchenStatusMutationInput/u.test(
      sources.contract,
    )
    && /toBusinessKitchenStatusRpcPayload/u.test(
      sources.contract,
    )
    && /mapBusinessKitchenSnapshot/u.test(
      sources.contract,
    )
    && /mapBusinessKitchenStatusMutation/u.test(
      sources.contract,
    ),
);

check(
  "reader de Cocina es server-only y usa únicamente RPC",
  /assertServerOnly/u.test(
    sources.reader,
  )
    && /get_business_kitchen_snapshot/u.test(
      sources.reader,
    )
    && !/\.from\(/u.test(
      sources.reader,
    ),
);

check(
  "Server Actions revalidan negocio y permisos kitchen",
  /resolveActiveBusiness/u.test(
    sources.actions,
  )
    && /hasStaffAccess/u.test(
      sources.actions,
    )
    && /"kitchen"/u.test(
      sources.actions,
    )
    && /"view"/u.test(
      sources.actions,
    )
    && /"manage"/u.test(
      sources.actions,
    ),
);

check(
  "navegador no decide business_id en mutación",
  /p_business_id:\s*context\.businessId/u.test(
    sources.actions,
  )
    && !/p_business_id/u.test(
      sources.contract,
    ),
);

check(
  "staging cubre snapshot idempotencia agregado reducción BOLA y DML",
  /snapshot base usa pedidos canónicos/u.test(
    sources.staging,
  )
    && /cambio de estado es idempotente/u.test(
      sources.staging,
    )
    && /incremento posterior crea agregado/u.test(
      sources.staging,
    )
    && /reducción consume agregado activo/u.test(
      sources.staging,
    )
    && /BOLA y anon quedan bloqueados/u.test(
      sources.staging,
    )
    && /DML técnico directo queda bloqueado/u.test(
      sources.staging,
    )
    && /E33A_STAGING_PASS/u.test(
      sources.staging,
    ),
);

check(
  "UI de Cocina sigue fuera de E33A",
  /window\.localStorage/u.test(
    sources.kitchenUi,
  )
    && !/getBusinessKitchenSnapshotAction/u.test(
      sources.kitchenUi,
    )
    && /E33B conectará la UI actual/u.test(
      sources.docs,
    ),
);

check(
  "historial remoto incorpora migración 021",
  /20260811_021_kitchen_operational_write\.sql/u.test(
    sources.remoteHistory,
  )
    && /Cocina agrega estado operativo y comandas incrementales/u.test(
      sources.remoteHistory,
    ),
);

check(
  "manifiesto protege migración y rollback 021",
  sources.manifest.includes(
    "62d8b0232f23e69195832fb84445126864f15d31b72e53527aa96362030590a6  supabase/migrations/20260811_021_kitchen_operational_write.sql",
  )
    && sources.manifest.includes(
      "2f228000c815e09a32c6f4e28a903cfcd902144d00ab82cbd2fcf6adf77f5ee6  supabase/rollbacks/20260811_021_kitchen_operational_write.down.sql",
    ),
);

check(
  "migración y rollback 021 tienen los SHA esperados",
  sha256(sources.migration)
    === "62d8b0232f23e69195832fb84445126864f15d31b72e53527aa96362030590a6"
    && sha256(sources.rollback)
      === "2f228000c815e09a32c6f4e28a903cfcd902144d00ab82cbd2fcf6adf77f5ee6",
);

check(
  "migraciones financieras 019 y 020 no se modifican",
  sources.manifest.includes(
    "e4aa218d4d24848f7381fc08685070fdb85b73816c17df9952e27ec4fa46e69f  supabase/migrations/20260810_019_cash_payments_write.sql",
  )
    && sources.manifest.includes(
      "d19277d5449443562b60b4809eb89089f158edf19d82a8b121ca6ff444cec935  supabase/migrations/20260811_020_expenses_cash_close.sql",
    ),
);

const pkg =
  JSON.parse(
    sources.package,
  );

check(
  "E33A forma parte del QA global",
  pkg.scripts?.[
    "test:kitchen-operational-write"
  ]
    ===
    "node scripts/kitchen-operational-write-regression-tests.mjs"
    && pkg.scripts?.[
      "staging:test-kitchen-operational-write"
    ]
      ===
      "node scripts/kitchen-operational-write-staging-test.mjs"
    && pkg.scripts?.[
      "test:regression"
    ]?.includes(
      "test:kitchen-operational-write",
    ),
);

for (
  const [
    label,
    source,
  ] of Object.entries(
    sources,
  )
) {
  check(
    `${label} sin whitespace accidental`,
    !/[ \t]+\n/u.test(source),
  );
}

console.log(
  `Todos los casos del backend operativo de Cocina E33A pasaron (${checks.length}).`,
);
