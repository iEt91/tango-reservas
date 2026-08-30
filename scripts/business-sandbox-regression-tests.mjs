import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [migration, dynamicSeed, reservationGrid, showcaseSeed, refreshSeed, action, page, ui, selector] = await Promise.all([
  read("supabase/migrations/20260830151610_business_sandbox_mode.sql"),
  read("supabase/migrations/20260830154500_business_sandbox_dynamic_seed.sql"),
  read("supabase/migrations/20260830180000_business_sandbox_reservation_grid.sql"),
  read("supabase/migrations/20260830183000_business_sandbox_showcase_seed.sql"),
  read("supabase/migrations/20260830193000_refresh_business_sandbox_daily_window.sql"),
  read("src/app/local/configuracion/sandbox-actions.ts"),
  read("src/app/local/configuracion/page.tsx"),
  read("src/app/local/configuracion/v2-configuracion-page.tsx"),
  read("src/app/auth/select-business/activate/route.ts"),
]);

assert(migration.includes("create table if not exists public.business_sandboxes"), "Missing isolated sandbox registry.");
assert(migration.includes("source_business_id <> sandbox_business_id"), "Sandbox must be a distinct tenant.");
assert(migration.includes("enable row level security"), "Sandbox registry must enforce RLS.");
assert(migration.includes("private.has_business_role(source_business.id, array['owner']::text[])") , "Sandbox RPC must re-check owner access.");
assert(migration.includes("coalesce(p_confirmation, '') <> source_business.name"), "Sandbox reset needs typed confirmation.");
assert(migration.includes("delete from public.businesses where id = existing_sandbox_id"), "Reset must remove only the old sandbox tenant.");
assert(!migration.includes("insert into public.customers (business_id, full_name, email, phone, notes)\n  select"), "Sandbox must not clone real customers.");
assert(dynamicSeed.includes("'Mesa demo 1', 4, 16, 20"), "Seeded tables must use visible percentage coordinates.");
assert(dynamicSeed.includes("current_date + seed_row.day_offset"), "Sandbox reservations must be rebuilt around today.");
assert(dynamicSeed.includes("(-13, 'completed'::text") && dynamicSeed.includes("(13, 'confirmed'::text"), "Sandbox scenario must cover past and future dates.");
assert(reservationGrid.includes("for day_offset in -14..14 loop") && reservationGrid.includes("limit 7"), "Sandbox agenda must include seven reservations across 29 relative days.");
assert(showcaseSeed.includes("seed_business_sandbox_showcase") && showcaseSeed.includes("Tortilla de papa al hierro"), "Sandbox must include a detailed showcase menu.");
assert(showcaseSeed.includes("menu_recipe_ingredients") && showcaseSeed.includes("450::numeric, 'g'"), "Recipes must preserve exact ingredient quantities.");
assert(showcaseSeed.includes("business_shipping_orders") && showcaseSeed.includes("business_kitchen_tickets") && showcaseSeed.includes("business_payments"), "Sandbox must cover shipping, kitchen and cash flows.");
assert(refreshSeed.includes("for v_day_offset in -14..14 loop") && refreshSeed.includes("pg_advisory_xact_lock"), "Sandbox agenda must stay within a moving 29-day window without duplicate concurrent inserts.");
assert(refreshSeed.includes("America/Argentina/Buenos_Aires") && refreshSeed.includes("refresh_business_sandbox_reservation_window"), "Sandbox refresh needs the local clock and an access fallback.");
assert(action.includes("create_or_reset_business_sandbox"), "Configuration action must use the guarded RPC.");
assert(action.includes("seed_business_sandbox_showcase") && action.includes('seedVersion: "v4"'), "Configuration action must complete the v4 showcase seed.");
assert(page.includes("business_sandboxes"), "Configuration page must load sandbox status.");
assert(ui.includes("Crear simulación") && ui.includes("Reiniciar simulación") && ui.includes("Volver al local real"), "Sandbox controls are incomplete.");
assert(selector.includes("business_members") && selector.includes("status", "active"), "Business switch must validate an active membership.");
assert(selector.includes("refresh_business_sandbox_reservation_window"), "Business switch must catch up a stale sandbox agenda.");

console.log("Business sandbox regression checks passed.");
