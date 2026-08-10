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
const menuPromotionsPath =
  "supabase/migrations/20260807_012_menu_promotions_rpc.sql";
const staffRolesPath =
  "supabase/migrations/20260808_013_staff_roles_permissions.sql";
const stockWritePath =
  "supabase/migrations/20260809_014_stock_write_rpc.sql";
const recipesWritePath =
  "supabase/migrations/20260809_015_recipes_write_rpc.sql";
const recipeStockConsumptionPath =
  "supabase/migrations/20260809_016_recipe_stock_consumption.sql";
const reservationConsumptionWritePath =
  "supabase/migrations/20260810_017_reservation_consumption_write.sql";

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
const menuPromotions = await readFile(
  menuPromotionsPath,
  "utf8",
);
const staffRoles = await readFile(
  staffRolesPath,
  "utf8",
);
const stockWrite = await readFile(
  stockWritePath,
  "utf8",
);
const recipesWrite = await readFile(
  recipesWritePath,
  "utf8",
);
const recipeStockConsumption = await readFile(
  recipeStockConsumptionPath,
  "utf8",
);
const reservationConsumptionWrite = await readFile(
  reservationConsumptionWritePath,
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

assert.match(
  menuPromotions,
  /menu_category_products/u,
);
assert.match(
  menuPromotions,
  /save_business_menu_category_details/u,
);
assert.match(
  menuPromotions,
  /menu_category_products_select_active_member/u,
);
assert.match(
  menuPromotions,
  /quantity between 1 and 9999/u,
);
assert.match(
  menuPromotions,
  /revoke insert, update, delete[\s\S]+menu_category_products/u,
);
console.log("✓ promociones agregan composición segura y cantidades persistentes");

assert.match(staffRoles, /create table if not exists public\.staff_roles/u);
assert.match(staffRoles, /staff_role_permissions/u);
assert.match(staffRoles, /staff_member_notes/u);
assert.match(staffRoles, /user_access_controls/u);
assert.match(staffRoles, /save_business_staff_role/u);
assert.match(staffRoles, /save_business_staff_member/u);
assert.match(staffRoles, /business_members_select_own_or_owner/u);
assert.match(staffRoles, /force row level security/u);
assert.match(staffRoles, /revoke all on table public\.staff_roles/u);
console.log("✓ Staff agrega roles, permisos, notas privadas y reautenticación segura");

assert.match(stockWrite, /create table if not exists public\.stock_products/u);
assert.match(stockWrite, /create table if not exists public\.stock_movements/u);
assert.match(stockWrite, /current_user_has_module_access/u);
assert.match(stockWrite, /record_business_stock_movement/u);
assert.match(stockWrite, /stock_movements_operation_key_key/u);
assert.match(stockWrite, /stock_movements_product_tenant_fk/u);
assert.match(stockWrite, /force row level security/u);
assert.match(
  stockWrite,
  /revoke all on table public\.stock_products[\s\S]+public, anon, authenticated/u,
);
console.log("✓ Stock agrega catálogo, ledger idempotente y permisos por módulo");

assert.match(
  recipesWrite,
  /create table if not exists public\.menu_recipes/u,
);
assert.match(
  recipesWrite,
  /create table if not exists public\.menu_recipe_ingredients/u,
);
assert.match(
  recipesWrite,
  /save_business_menu_recipe/u,
);
assert.match(
  recipesWrite,
  /menu_recipes_menu_item_tenant_fk/u,
);
assert.match(
  recipesWrite,
  /menu_recipe_ingredients_stock_product_tenant_fk/u,
);
assert.match(
  recipesWrite,
  /current_user_has_module_access/u,
);
assert.match(
  recipesWrite,
  /force row level security/u,
);
assert.match(
  recipesWrite,
  /revoke all on table public\.menu_recipes[\s\S]+public, anon, authenticated/u,
);
console.log("✓ Recetas agrega composición tenant-safe y escritura RPC");

assert.match(
  recipeStockConsumption,
  /stock_recipe_operations/u,
);
assert.match(
  recipeStockConsumption,
  /stock_recipe_operation_movements/u,
);
assert.match(
  recipeStockConsumption,
  /private\.apply_recipe_stock_consumption/u,
);
assert.match(
  recipeStockConsumption,
  /consume_business_menu_recipe_stock/u,
);
assert.match(
  recipeStockConsumption,
  /Insufficient stock for recipe consumption/u,
);
assert.match(
  recipeStockConsumption,
  /stock_recipe_operations_business_key/u,
);
assert.match(
  recipeStockConsumption,
  /force row level security/u,
);
console.log("✓ Receta → Stock agrega consumo transaccional e idempotente");

assert.match(
  reservationConsumptionWrite,
  /business_orders/u,
);
assert.match(
  reservationConsumptionWrite,
  /save_business_reservation_consumption/u,
);
assert.match(
  reservationConsumptionWrite,
  /private\.apply_recipe_stock_return/u,
);
assert.match(
  reservationConsumptionWrite,
  /business_order_mutations_business_key/u,
);
assert.match(
  reservationConsumptionWrite,
  /reservations_guard_terminal_with_consumption/u,
);
assert.match(
  reservationConsumptionWrite,
  /force row level security/u,
);
console.log("✓ Consumo de Reserva agrega pedido transaccional y devolución histórica");

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

console.log("Todos los casos del historial remoto pasaron (18).");
