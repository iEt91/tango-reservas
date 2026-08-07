import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const files = {
  migration: "supabase/migrations/20260807_012_menu_promotions_rpc.sql",
  rollback: "supabase/rollbacks/20260807_012_menu_promotions_rpc.down.sql",
  postflight: "supabase/preflight/20260807_012_menu_promotions_postflight.sql",
  contract: "src/lib/menu/business-menu-contract.ts",
  reader: "src/lib/data/server/business-menu.ts",
  actions: "src/app/local/menu/actions.ts",
  ui: "src/app/local/menu/v2-menu-page.tsx",
  remote: "scripts/menu-promotions-staging-test.mjs",
  docs: "docs/database/MENU-PROMOTIONS-RPC.md",
  manifest: "supabase/MIGRATIONS.sha256",
  package: "package.json",
};

for (const path of Object.values(files)) {
  await access(path);
}

const sources = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([key, path]) => [
      key,
      await readFile(path, "utf8"),
    ]),
  ),
);

const checks = [];
function check(label, assertion) {
  assert.ok(assertion, label);
  checks.push(label);
  console.log(`✓ ${label}`);
}

console.log("Ejecutando regresión de promociones persistentes del Menú V2...");

check(
  "la migración amplía categorías sin reemplazar la UI",
  sources.migration.includes("add column if not exists is_promotion")
    && sources.migration.includes("add column if not exists fixed_price")
    && sources.migration.includes("add column if not exists discount_percent"),
);

check(
  "la composición usa una tabla tenant-safe",
  sources.migration.includes("create table if not exists public.menu_category_products")
    && sources.migration.includes("menu_category_products_category_tenant_fk")
    && sources.migration.includes("menu_category_products_item_tenant_fk")
    && sources.migration.includes("primary key (business_id, category_id, menu_item_id)"),
);

check(
  "las cantidades permiten 2x1 3x2 y packs sin ser ilimitadas",
  sources.migration.includes("quantity between 1 and 9999")
    && sources.contract.includes("quantity > 9999")
    && sources.ui.includes("max={9999}"),
);

check(
  "la RPC guarda categoría y composición en una sola transacción",
  sources.migration.includes("save_business_menu_category_details")
    && sources.migration.includes("public.save_business_menu_category(")
    && sources.migration.includes("delete from public.menu_category_products")
    && sources.migration.includes("insert into public.menu_category_products")
    && sources.migration.includes("pg_advisory_xact_lock"),
);

check(
  "RLS abre solo lectura a miembros activos",
  sources.migration.includes("force row level security")
    && sources.migration.includes("menu_category_products_select_active_member")
    && sources.migration.includes("array['owner', 'admin', 'staff']")
    && sources.migration.includes("grant select on table public.menu_category_products"),
);

check(
  "el navegador no recibe DML directo",
  sources.migration.includes("revoke insert, update, delete")
    && sources.postflight.includes("Authenticated has direct promotion DML")
    && !sources.ui.includes('.from("menu_category_products")')
    && !sources.ui.includes(".rpc("),
);

check(
  "la RPC exige owner o admin y rechaza productos de otro tenant",
  sources.migration.includes("array['owner', 'admin']")
    && sources.migration.includes("Menu category product is not available")
    && sources.migration.includes("item.business_id = p_business_id"),
);

check(
  "el rollback conserva datos y vuelve a default deny",
  sources.rollback.includes("drop function if exists public.save_business_menu_category_details")
    && sources.rollback.includes("force row level security")
    && sources.rollback.includes("no se eliminan la tabla")
    && !/drop table|drop column/iu.test(sources.rollback),
);

check(
  "el postflight valida columnas RLS constraints y grants",
  sources.postflight.includes("column_count <> 3")
    && sources.postflight.includes("constraint_count <> 5")
    && sources.postflight.includes("function_count <> 1")
    && sources.postflight.includes("has_function_privilege")
    && sources.postflight.includes("has_table_privilege"),
);

check(
  "TypeScript modela promoción precio descuento y composición",
  sources.contract.includes("isPromotion: boolean")
    && sources.contract.includes("fixedPrice: number | null")
    && sources.contract.includes("discountPercent: number | null")
    && sources.contract.includes("products: BusinessMenuCategoryProductInput[]")
    && sources.contract.includes("toBusinessMenuCategoryProductsRpcPayload"),
);

check(
  "el mapper acepta composición desde tabla y respuesta RPC",
  sources.contract.includes("menu_item_id?: string")
    && sources.contract.includes("product_id?: string")
    && sources.contract.includes(
      "product.menu_item_id ?? product.product_id",
    ),
);

check(
  "la lectura servidor hidrata la composición por negocio",
  sources.reader.includes('from("menu_category_products")')
    && sources.reader.includes('.eq("business_id", businessId)')
    && sources.reader.includes("productsByCategory")
    && sources.reader.includes("fixed_price")
    && sources.reader.includes("discount_percent"),
);

check(
  "la Server Action usa la nueva RPC segura",
  sources.actions.includes('"save_business_menu_category_details"')
    && sources.actions.includes("toBusinessMenuCategoryProductsRpcPayload")
    && sources.actions.includes("resolveAuthorizedMenuContext")
    && !sources.actions.includes('.from("menu_category_products")'),
);

check(
  "la misma v2-menu-page guarda promociones sin popup de bloqueo",
  sources.ui.includes("isPromotion: Boolean(sanitizedCategory.isPromotion)")
    && sources.ui.includes("products: sanitizedCategory.isPromotion")
    && sources.ui.includes("saveBusinessMenuCategoryAction")
    && !sources.ui.includes("Promociones, combos y descuentos de categoría quedan fuera")
    && !sources.ui.includes("Promociones y combos permanecen fuera"),
);

check(
  "asignar y quitar productos de una promoción persiste la categoría",
  sources.ui.includes("if (assignCategory.isPromotion && usesSupabaseMenu)")
    && sources.ui.includes("if (targetCategory?.isPromotion)")
    && sources.ui.includes("products: nextProducts"),
);

check(
  "la prueba remota cubre BOLA atomicidad cantidades y DML",
  sources.remote.includes("owner A creó un combo con cantidades mayores a 2")
    && sources.remote.includes("una composición inválida hace rollback")
    && sources.remote.includes("usuario A no puede crear promociones en B")
    && sources.remote.includes("DML directo de composición permanece bloqueado")
    && sources.remote.includes("menú A restaurado")
    && sources.remote.includes("menú B restaurado"),
);

const packageJson = JSON.parse(sources.package);
check(
  "las pruebas local y staging están integradas",
  packageJson.scripts?.["test:menu-promotions"]
    === "node scripts/menu-promotions-regression-tests.mjs"
    && packageJson.scripts?.["staging:test-menu-promotions"]
      === "node scripts/menu-promotions-staging-test.mjs"
    && packageJson.scripts?.["test:regression"]?.includes("test:menu-promotions"),
);

const manifestLines = sources.manifest.split(/\r?\n/u);
const migrationHash = createHash("sha256")
  .update(await readFile(files.migration))
  .digest("hex");
const rollbackHash = createHash("sha256")
  .update(await readFile(files.rollback))
  .digest("hex");
check(
  "el manifiesto protege migración y rollback 012",
  manifestLines.includes(`${migrationHash}  ${files.migration}`)
    && manifestLines.includes(`${rollbackHash}  ${files.rollback}`),
);

check(
  "la documentación fija 2x1 combos y única UI existente",
  sources.docs.includes("2x1")
    && sources.docs.includes("3x2")
    && sources.docs.includes("v2-menu-page.tsx")
    && sources.docs.includes("única interfaz")
    && sources.docs.includes("interfaz visual"),
);

for (const [key, source] of Object.entries(sources)) {
  check(
    `${key} sin whitespace accidental`,
    !source.split("\n").some((line) => /[ \t]+$/u.test(line)),
  );
}

console.log(
  `Todos los casos de promociones persistentes pasaron (${checks.length}).`,
);
