import fs from "node:fs";

const files = {
  packageJson: "package.json",
  menu: "src/app/local/menu/v2-menu-page.tsx",
  home: "src/app/local/v2-local-page.tsx",
  reservations: "src/app/local/reservas/v2-reservas-page.tsx",
  shipping: "src/app/local/envios/v2-envios-page.tsx",
  sidebar: "src/components/v2/v2-sidebar-utilities.tsx",
};

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✓ ${message}`);
}

function asideSegment(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return "";
  const asideStart = source.lastIndexOf('<aside className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">', markerIndex);
  if (asideStart < 0) return "";
  const asideEnd = source.indexOf("</aside>", asideStart);
  if (asideEnd < 0) return "";
  return source.slice(asideStart, asideEnd + "</aside>".length);
}

console.log("Ejecutando E36: pulido UI de Menú, Inicio, Reservas y Envíos...");

const packageJson = JSON.parse(read(files.packageJson));
const menu = read(files.menu);
const home = read(files.home);
const reservations = read(files.reservations);
const shipping = read(files.shipping);
const sidebar = read(files.sidebar);

assert(
  packageJson.scripts?.["test:e36-ui-polish"] === "node scripts/e36-ui-polish-regression-tests.mjs",
  "E36 queda registrado como regresión propia",
);
assert(
  String(packageJson.scripts?.["test:regression"] ?? "").includes("npm run test:e36-ui-polish"),
  "E36 forma parte del QA global",
);

assert(!menu.includes("Importar imágenes"), "Menú elimina el botón Importar imágenes");
assert(!menu.includes("Menú sincronizado"), "Menú elimina el estado Menú sincronizado");
assert(!menu.includes("importProductsFromImageFolder"), "Menú elimina la importación heredada asociada");

assert(home.includes("function getAgendaRowToneClass"), "Inicio define colores de fondo por estado");
assert(home.includes("getAgendaRowToneClass(item)"), "Agenda operativa aplica el color de cada estado");
assert(home.includes("bg-blue-50/80"), "Activo conserva tono azul");
assert(home.includes("bg-orange-50/80"), "Pendiente conserva tono naranja");
assert(home.includes("bg-emerald-50/80"), "Confirmado conserva tono verde");

assert(
  reservations.includes('variant="primary"') &&
    reservations.includes("onClick={() => openOrderPopup(row)}"),
  "Reservas muestra + Consumo con estilo verde primario",
);
assert(
  reservations.includes('variant="dangerSolid"') &&
    reservations.includes("setOpenActionsReservationId(row.id)"),
  "Reservas muestra Acciones con estilo rojo",
);
assert(
  reservations.includes("descriptionAside={") &&
    reservations.includes("Duración estándar:") &&
    reservations.includes("Capacidad por horario:") &&
    reservations.includes("Horario del día:"),
  "Reservas integra la información operativa a la derecha del subtítulo",
);
assert(
  !reservations.includes('className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"'),
  "Reservas elimina la franja operativa separada",
);
assert(
  reservations.includes('aria-label="Cerrar detalle de reserva"') &&
    reservations.includes("isReservationDetailOpen && selectedReservation") &&
    reservations.includes("renderReservationDetailCell(row,"),
  "Detalle de reserva pasa a modal centrado y abre desde ID/cliente",
);
assert(
  !asideSegment(reservations, "Próximas acciones").includes("Detalle seleccionado"),
  "El lateral de Reservas conserva solo Próximas acciones",
);
assert(
  reservations.includes('<V2Card className="flex min-h-0 flex-1 flex-col overflow-hidden">') &&
    reservations.includes("Próximas acciones"),
  "Próximas acciones ocupa toda la altura lateral disponible",
);

assert(
  shipping.includes('aria-label="Cerrar detalle de pedido"') &&
    shipping.includes("isDeliveryDetailOpen && selectedDelivery") &&
    shipping.includes("renderDeliveryDetailCell(row,"),
  "Detalle de pedido pasa a modal centrado y abre desde ID/cliente",
);
assert(
  !asideSegment(shipping, "Envíos pendientes").includes("Pedido seleccionado"),
  "El lateral de Envíos conserva solo Envíos pendientes",
);
assert(
  shipping.includes('<V2Card className="flex min-h-0 flex-1 flex-col overflow-hidden">') &&
    shipping.includes("Envíos pendientes"),
  "Envíos pendientes ocupa toda la altura lateral disponible",
);

assert(
  sidebar.includes("const [hydrated, setHydrated] = useState(false);") &&
    sidebar.includes("return hydrated ? buildNotifications() : [];"),
  "E36 preserva el hotfix de hidratación de E35D",
);

if (process.exitCode) {
  console.error("E36 falló.");
  process.exit(process.exitCode);
}

console.log("Todos los casos E36 pasaron.");
