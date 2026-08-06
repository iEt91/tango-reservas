import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const initialPath =
  "supabase/migrations/20260802_001_initial_schema_lockdown.sql";
const membersPath =
  "supabase/migrations/20260802_002_business_members_and_rls.sql";
const identityPath =
  "supabase/migrations/20260802_003_business_identity_read_rls.sql";
const reservationConfigPath =
  "supabase/migrations/20260802_004_reservation_config_read_rls.sql";
const businessHoursWritePath =
  "supabase/migrations/20260803_005_business_hours_write_rpc.sql";
const reservationSettingsWritePath =
  "supabase/migrations/20260803_006_reservation_settings_write_rpc.sql";
const servicesWritePath =
  "supabase/migrations/20260803_007_services_write_rpc.sql";
const customersWritePath =
  "supabase/migrations/20260803_008_customers_write_rpc.sql";
const reservationsWritePath =
  "supabase/migrations/20260804_009_reservations_write_rpc.sql";
const floorPlanWritePath =
  "supabase/migrations/20260804_010_floor_plan_write_rpc.sql";
const menuWritePath =
  "supabase/migrations/20260806_011_menu_write_rpc.sql";

const initial = await readFile(initialPath, "utf8");
const members = await readFile(membersPath, "utf8");
const identity = await readFile(identityPath, "utf8");
const reservationConfig = await readFile(
  reservationConfigPath,
  "utf8",
);
const businessHoursWrite = await readFile(
  businessHoursWritePath,
  "utf8",
);
const reservationSettingsWrite = await readFile(
  reservationSettingsWritePath,
  "utf8",
);
const servicesWrite = await readFile(
  servicesWritePath,
  "utf8",
);
const customersWrite = await readFile(
  customersWritePath,
  "utf8",
);
const reservationsWrite = await readFile(
  reservationsWritePath,
  "utf8",
);
const floorPlanWrite = await readFile(
  floorPlanWritePath,
  "utf8",
);
const menuWrite = await readFile(
  menuWritePath,
  "utf8",
);

const tables = [
  "businesses",
  "business_profiles",
  "business_sections",
  "business_images",
  "profiles",
  "business_hours",
  "reservation_rules",
  "services",
  "customers",
  "reservations",
];

console.log("Ejecutando regresión del historial remoto...");

for (const table of tables) {
  assert.match(
    initial,
    new RegExp(
      `alter table public\\.${table} enable row level security`,
      "u",
    ),
  );
  assert.match(
    initial,
    new RegExp(
      `alter table public\\.${table} force row level security`,
      "u",
    ),
  );
  assert.match(
    initial,
    new RegExp(
      `revoke all on table public\\.${table} from anon, authenticated`,
      "u",
    ),
  );
}
console.log("✓ las tablas iniciales nacen bloqueadas");

assert.match(
  initial,
  /auth_user_id uuid unique\s+references auth\.users\(id\)/u,
);
assert.match(
  initial,
  /role text not null default 'owner'\s+check \(role in \('owner', 'admin', 'staff'\)\)/u,
);
console.log("✓ profiles referencia Auth y restringe roles");

assert.match(members, /create schema if not exists private/u);
assert.match(members, /function private\.has_business_role/u);
assert.match(
  members,
  /security definer\s+set search_path = ''/u,
);
assert.match(members, /force row level security/u);
assert.match(
  members,
  /grant select on table public\.business_members to authenticated/u,
);
assert.doesNotMatch(
  members,
  /create or replace function public\.has_business_role/u,
);
console.log("✓ membresías usan helper privado y RLS");

assert.match(
  identity,
  /create policy businesses_select_active_member/u,
);
assert.match(
  identity,
  /create policy profiles_select_self_or_manager/u,
);
assert.match(
  identity,
  /grant select on table public\.businesses to authenticated/u,
);
assert.match(
  identity,
  /grant select on table public\.profiles to authenticated/u,
);
assert.doesNotMatch(
  identity,
  /grant\s+(insert|update|delete|all)/iu,
);
console.log("✓ identidad multiempresa conserva lectura mínima");

for (const table of [
  "business_hours",
  "reservation_rules",
  "services",
]) {
  assert.match(
    reservationConfig,
    new RegExp(
      `create policy ${table}_select_active_member`,
      "u",
    ),
  );
  assert.match(
    reservationConfig,
    new RegExp(
      `grant select on table public\\.${table} to authenticated`,
      "u",
    ),
  );
}
assert.doesNotMatch(
  reservationConfig,
  /grant\s+(insert|update|delete|all)/iu,
);
console.log("✓ configuración de reservas abre solo lectura por tenant");

assert.match(businessHoursWrite, /replace_business_hours/u);
assert.match(businessHoursWrite, /security definer/u);
assert.match(businessHoursWrite, /private\.has_business_role/u);
assert.match(
  businessHoursWrite,
  /revoke insert, update, delete on table public\.business_hours/u,
);
console.log("✓ horarios agregan escritura RPC sin DML directo");

assert.match(
  reservationSettingsWrite,
  /save_reservation_configuration/u,
);
assert.match(
  reservationSettingsWrite,
  /hours_result := public\.replace_business_hours/u,
);
assert.match(
  reservationSettingsWrite,
  /on conflict \(business_id\)/u,
);
assert.match(
  reservationSettingsWrite,
  /revoke insert, update, delete on table public\.reservation_rules/u,
);
console.log("✓ reglas agregan guardado atómico sin relajar RLS");

assert.match(servicesWrite, /save_business_service/u);
assert.match(servicesWrite, /set_business_service_active/u);
assert.match(servicesWrite, /private\.has_business_role/u);
assert.match(servicesWrite, /sort_order/u);
assert.match(
  servicesWrite,
  /revoke insert, update, delete on table public\.services/u,
);
console.log("✓ servicios agregan RPC segura sin DML directo");

assert.match(customersWrite, /save_business_customer/u);
assert.match(
  customersWrite,
  /set_business_customer_active/u,
);
assert.match(
  customersWrite,
  /customers_select_active_member/u,
);
assert.match(
  customersWrite,
  /revoke insert, update, delete on table public\.customers/u,
);
console.log("✓ clientes agregan lectura RLS y RPC segura");

assert.match(
  reservationsWrite,
  /save_business_reservation/u,
);
assert.match(
  reservationsWrite,
  /set_business_reservation_status/u,
);
assert.match(
  reservationsWrite,
  /reservations_select_active_member/u,
);
assert.match(
  reservationsWrite,
  /pg_advisory_xact_lock/u,
);
assert.match(
  reservationsWrite,
  /revoke insert, update, delete[\s\S]+public\.reservations/u,
);
console.log("✓ reservas agregan disponibilidad transaccional sin DML directo");

for (const table of [
  "floor_plan_settings",
  "floor_tables",
  "reservation_table_assignments",
]) {
  assert.match(
    floorPlanWrite,
    new RegExp(
      `create table if not exists[\\s\\S]+public\\.${table}`,
      "u",
    ),
  );
}
assert.match(
  floorPlanWrite,
  /set_business_reservation_tables/u,
);
assert.match(
  floorPlanWrite,
  /reservations_validate_table_assignments/u,
);
assert.match(
  floorPlanWrite,
  /floor_tables_validate_assignments/u,
);
assert.match(
  floorPlanWrite,
  /reservation_rules_validate_table_assignments/u,
);
assert.match(
  floorPlanWrite,
  /revoke insert, update, delete[\s\S]+public\.reservation_table_assignments/u,
);
console.log("✓ plano y asignaciones agregan integridad transaccional");

for (const table of [
  "menu_categories",
  "menu_items",
]) {
  assert.match(
    menuWrite,
    new RegExp(
      `create table if not exists public\\.${table}`,
      "u",
    ),
  );
}
assert.match(
  menuWrite,
  /save_business_menu_category/u,
);
assert.match(
  menuWrite,
  /save_business_menu_item/u,
);
assert.match(
  menuWrite,
  /menu_items_category_tenant_fk/u,
);
assert.match(
  menuWrite,
  /revoke insert, update, delete[\s\S]+public\.menu_items/u,
);
console.log("✓ menú agrega categorías y productos seguros");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:remote-schema-history"],
  "node scripts/remote-schema-history-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:remote-schema-history/u,
);
console.log("✓ el historial remoto completo forma parte del QA");

console.log("Todos los casos del historial remoto pasaron (12).");
