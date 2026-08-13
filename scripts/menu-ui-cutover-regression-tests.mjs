import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const files = {
  page: "src/app/local/menu/page.tsx",
  ui: "src/app/local/menu/v2-menu-page.tsx",
  actions: "src/app/local/menu/actions.ts",
  reader: "src/lib/data/server/business-menu.ts",
  contract: "src/lib/menu/business-menu-contract.ts",
  package: "package.json",
  docs: "docs/database/MENU-UI-CUTOVER.md",
};

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

console.log("Ejecutando regresión del Menú V2 persistente sobre UI original...");

check(
  "v2-menu-page es la única interfaz del Menú",
  sources.page.includes('import { V2MenuPage } from "./v2-menu-page"')
    && !sources.page.includes("V2PersistentMenuPage"),
);

let persistentPageExists = true;
try {
  await access("src/app/local/menu/v2-persistent-menu-page.tsx");
} catch {
  persistentPageExists = false;
}
check(
  "no existe una segunda página visual persistente",
  !persistentPageExists,
);

check(
  "la estética V2 original permanece como fuente visual",
  sources.ui.includes("<V2DataTable")
    && sources.ui.includes("Gestionar recetas")
    && !sources.ui.includes("Vincular imágenes")
    && !sources.ui.includes("Importar imágenes")
    && !sources.ui.includes("Menú sincronizado")
    && sources.ui.includes("md:grid-cols-3 xl:grid-cols-6")
    && sources.ui.includes('xl:grid-cols-[1fr_340px]')
    && sources.ui.includes("Categorías del menú"),
);

check(
  "la misma V2MenuPage conserva fallback local y recibe Supabase",
  sources.page.includes('getDataSource() !== "supabase"')
    && sources.page.includes("return <V2MenuPage />")
    && sources.page.includes('menuPersistence="supabase"')
    && sources.ui.includes('menuPersistence?: "local" | "supabase"'),
);

check(
  "la página servidor falla cerrado para sesión y membresía",
  sources.page.includes('activeBusiness.status === "unauthenticated"')
    && sources.page.includes('activeBusiness.status === "selection_required"')
    && sources.page.includes('activeBusiness.status === "membership_missing"'),
);

check(
  "el servidor carga el snapshot del tenant activo",
  sources.page.includes("getBusinessMenuForBusiness")
    && sources.page.includes("activeBusiness.membership.businessId")
    && sources.page.includes("initialCategories={initialMenu.categories}")
    && sources.page.includes("initialItems={initialMenu.items}")
    && sources.reader.includes('.eq("business_id", businessId)'),
);

check(
  "owner y admin administran mientras otros roles fallan cerrado",
  sources.page.includes('activeBusiness.membership.role === "owner"')
    && sources.page.includes('activeBusiness.membership.role === "admin"')
    && sources.ui.includes("requireManagePermission")
    && sources.ui.includes("Tu rol permite consultar el menú, pero no modificarlo."),
);

check(
  "la UI original usa las Server Actions existentes",
  sources.ui.includes("saveBusinessMenuCategoryAction")
    && sources.ui.includes("saveBusinessMenuItemAction")
    && sources.ui.includes("archiveBusinessMenuCategoryAction")
    && sources.ui.includes("archiveBusinessMenuItemAction")
    && sources.ui.includes("reorderBusinessMenuCategoriesAction")
    && sources.ui.includes("saveBusinessMenuQuickChangesAction"),
);

check(
  "el componente cliente no crea Supabase ni ejecuta DML directo",
  !sources.ui.includes("createClient(")
    && !sources.ui.includes("createSupabase")
    && !sources.ui.includes('.from("')
    && !sources.ui.includes(".insert(")
    && !sources.ui.includes(".update(")
    && !sources.ui.includes(".delete(")
    && !sources.ui.includes(".rpc("),
);

check(
  "localStorage queda limitado al fallback local",
  sources.ui.includes("if (usesSupabaseMenu) return;")
    && sources.ui.includes("if (usesSupabaseMenu || !hasLoadedStoredMenu) return;")
    && sources.ui.includes("writeToStorage(MENU_ITEMS_STORAGE_KEY, menuItems)")
    && sources.ui.includes("writeToStorage(MENU_CATEGORIES_STORAGE_KEY, categories)"),
);

check(
  "altas y ediciones adoptan filas canónicas de PostgreSQL",
  sources.ui.includes("mapPersistentItemToDraft(result.item)")
    && sources.ui.includes("mapPersistentCategoryToDraft(result.category)"),
);

check(
  "los cambios rápidos se guardan mediante la RPC atómica",
  sources.ui.includes("saveBusinessMenuQuickChangesAction(")
    && sources.actions.includes('"save_business_menu_item_quick_changes"'),
);

check(
  "el estado disponible o pausado se persiste por Server Action",
  sources.ui.includes("async function toggleItemStatus")
    && sources.ui.includes("status: nextStatus")
    && sources.ui.includes("saveBusinessMenuItemAction"),
);

check(
  "el orden drag and drop se persiste como lista completa",
  sources.ui.includes("async function reorderCategories")
    && sources.ui.includes("reorderBusinessMenuCategoriesAction")
    && sources.ui.includes("reordered.map((category) => category.id)"),
);

check(
  "eliminar usa baja lógica y conserva identificadores técnicos archive",
  sources.ui.includes("archiveBusinessMenuItemAction")
    && sources.ui.includes("archiveBusinessMenuCategoryAction")
    && sources.ui.includes("La eliminación es lógica y conserva el historial")
    && !sources.ui.includes("DELETE FROM"),
);

check(
  "una categoría con productos no se elimina en persistencia",
  sources.ui.includes("Antes de eliminar la categoría")
    && sources.ui.includes("menuItems.some((item) => item.categoryId === category.id)"),
);

check(
  "promociones y combos usan la misma UI y persistencia segura",
  sources.ui.includes("isPromotion: Boolean(sanitizedCategory.isPromotion)")
    && sources.ui.includes("products: sanitizedCategory.isPromotion")
    && sources.ui.includes("max={9999}")
    && !sources.ui.includes("Promociones, combos y descuentos de categoría quedan fuera")
    && sources.actions.includes("save_business_menu_category_details")
    && sources.reader.includes("menu_category_products")
    && sources.docs.includes("2x1"),
);

check(
  "el contrato mantiene precio estado visibilidad destacado e URL",
  sources.contract.includes("price: number")
    && sources.contract.includes("isVisible: boolean")
    && sources.contract.includes("isFeatured: boolean")
    && sources.contract.includes("imageUrl: string"),
);

check(
  "las mutaciones bloquean dobles envíos en modo persistente",
  sources.ui.includes("const isBusy = pendingAction !== null")
    && sources.ui.includes("|| isBusy) return"),
);

check(
  "la regresión E27 continúa integrada al QA",
  sources.package.includes(
    '"test:menu-ui-cutover": "node scripts/menu-ui-cutover-regression-tests.mjs"',
  )
    && sources.package.includes("npm run test:menu-ui-cutover"),
);

check(
  "la documentación prohíbe duplicar la página visual",
  sources.docs.includes("es la única interfaz visual del Menú V2")
    && sources.docs.toLowerCase().includes("no crear una segunda página visual"),
);

for (const [key, source] of Object.entries(sources)) {
  check(
    `${key} sin whitespace accidental`,
    !source.split("\n").some((line) => /[ \t]+$/u.test(line)),
  );
}

console.log(
  `Todos los casos del Menú V2 sobre UI original pasaron (${checks.length}).`,
);
