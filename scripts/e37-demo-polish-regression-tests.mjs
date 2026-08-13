import fs from "node:fs";

const files = {
  packageJson: "package.json",
  reservations: "src/app/local/reservas/v2-reservas-page.tsx",
  menu: "src/app/local/menu/v2-menu-page.tsx",
  reports: "src/app/local/reportes/page.tsx",
  menuRegression: "scripts/menu-ui-cutover-regression-tests.mjs",
};

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(condition, label) {
  if (!condition) {
    console.error(`x ${label}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${label}`);
}

const pkg = JSON.parse(read(files.packageJson));
const reservations = read(files.reservations);
const menu = read(files.menu);
const reports = read(files.reports);
const menuRegression = read(files.menuRegression);

console.log("Ejecutando E37: modal, Menu y Reportes conciliados...");

check(
  String(pkg.scripts?.["test:regression"] ?? "").includes("npm run test:e37-demo-polish")
    && pkg.scripts?.["test:e37-demo-polish"] === "node scripts/e37-demo-polish-regression-tests.mjs",
  "E37 forma parte del QA global",
);

check(
  reservations.includes("setIsReservationDetailOpen(false);")
    && /setIsReservationDetailOpen\(false\);[\s\S]{0,120}openReservationEditor\(selectedReservation\)/u.test(reservations),
  "Editar reserva cierra el detalle antes de abrir el editor",
);

check(
  !menu.includes("Vincular imágenes")
    && !menu.includes("linkGeneratedMenuImages")
    && !menu.includes("Importar imágenes")
    && !menu.includes("Menú sincronizado"),
  "Menu elimina los controles heredados solicitados",
);

check(
  menuRegression.includes('!sources.ui.includes("Vincular imágenes")'),
  "Regresion heredada de Menu queda alineada con E37",
);

check(
  reports.includes('type ReportDetailTab = "payments" | "products" | "ingredients";')
    && reports.includes('["payments", "Ingresos por método"]')
    && reports.includes('["products", "Rentabilidad por producto"]')
    && reports.includes('["ingredients", "Insumos consumidos"]'),
  "Reportes usa una unica tarjeta con tres accesos directos",
);

check(
  !reports.includes('xl:grid-cols-[1fr_1.25fr]')
    && reports.includes('className="mt-3 min-h-0 flex-1"'),
  "Reportes elimina la grilla de dos tarjetas",
);

check(
  reports.includes('a.name.localeCompare(b.name, "es", { sensitivity: "base" })')
    && reports.includes('a.description ?? a.provider ?? a.category ?? ""'),
  "Listas financieras quedan ordenadas alfabeticamente",
);

check(
  reports.includes("const paidReservations = closedReservations.filter(isReservationSettled);")
    && reports.includes("const paidDeliveries = closedDeliveries.filter(isDeliverySettled);")
    && reports.includes("...paidReservations.flatMap")
    && reports.includes("...paidDeliveries.flatMap"),
  "Rentabilidad usa solo operaciones cobradas",
);

check(
  reports.includes("const productRevenue = products.reduce")
    && reports.includes("const deliveryFees = paidDeliveries.reduce")
    && reports.includes("const reconciliationDifference = revenue - productRevenue - deliveryFees;")
    && reports.includes("Conciliación de ventas"),
  "Facturacion expone conciliacion entre productos, cargos y cobros",
);

check(
  reports.includes("function isInventoryPurchase")
    && reports.includes('category === "insumos"')
    && reports.includes('category === "bebidas"')
    && reports.includes("const stockPurchaseItems = paidExpenseItems")
    && reports.includes("const operationalExpenseItems = paidExpenseItems"),
  "Compras de stock y gastos operativos se separan",
);

check(
  reports.includes("Gastos operativos pagados")
    && reports.includes("Compras de stock pagadas")
    && reports.includes("pendiente de cobro"),
  "Reportes explica gastos y operaciones pendientes de cobro",
);

for (const [label, source] of Object.entries({
  reservations,
  menu,
  reports,
  menuRegression,
})) {
  check(
    !source.split("\n").some((line) => /[ \t]+$/u.test(line)),
    `${label} sin trailing whitespace`,
  );
}

if (process.exitCode) {
  console.error("E37 fallo.");
  process.exit(process.exitCode);
}

console.log("Todos los casos E37 pasaron.");
