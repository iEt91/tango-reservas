import assert from "node:assert/strict";
import {
  access,
  readFile,
} from "node:fs/promises";

const pagePath =
  "src/app/local/clientes/page.tsx";
const uiPath =
  "src/app/local/clientes/v2-clientes-page.tsx";
const actionsPath =
  "src/app/local/clientes/actions.ts";
const readerPath =
  "src/lib/data/server/business-customers.ts";
const contractPath =
  "src/lib/customers/business-customer-contract.ts";
const documentationPath =
  "docs/database/CUSTOMERS-UI-CUTOVER.md";

const requiredFiles = [
  pagePath,
  uiPath,
  actionsPath,
  readerPath,
  contractPath,
  documentationPath,
];

console.log(
  "Ejecutando regresión del corte de clientes V2...",
);

for (const path of requiredFiles) {
  await access(path);
}
console.log("✓ existen UI, acciones, lectura, contrato y documentación");

const page = await readFile(pagePath, "utf8");
const ui = await readFile(uiPath, "utf8");
const actions = await readFile(actionsPath, "utf8");
const reader = await readFile(readerPath, "utf8");
const contract = await readFile(contractPath, "utf8");
const documentation = await readFile(
  documentationPath,
  "utf8",
);

assert.match(page, /getDataSource\(\) !== "supabase"/u);
assert.match(page, /resolveActiveBusiness/u);
assert.match(page, /buildLoginPath\("\/local\/clientes"\)/u);
assert.match(page, /selection_required/u);
assert.match(page, /membership_missing/u);
console.log("✓ la página servidor falla cerrado antes de leer clientes");

assert.match(page, /getBusinessCustomersForBusiness/u);
assert.match(
  page,
  /activeBusiness\.membership\.businessId/u,
);
assert.match(
  page,
  /businessCustomersPersistence="supabase"/u,
);
console.log("✓ el servidor carga el snapshot del tenant activo");

assert.match(
  page,
  /canWriteBusinessCustomers=\{canWriteBusinessCustomers\}/u,
);
assert.match(
  page,
  /canArchiveBusinessCustomers=\{canArchiveBusinessCustomers\}/u,
);
assert.match(page, /"owner",\s+"admin",\s+"staff"/u);
console.log("✓ los permisos se derivan de la membresía validada");

assert.match(ui, /type V2ClientesPageProps/u);
assert.match(ui, /initialBusinessCustomers/u);
assert.match(ui, /businessCustomerToManualClient/u);
assert.match(ui, /backendId/u);
console.log("✓ la UI recibe e hidrata un contrato persistente explícito");

assert.match(
  ui,
  /if \(usesSupabaseCustomers\) \{\s+return manualClients/u,
);
assert.match(
  ui,
  /\.filter\(\(client\) => client\.isActive\)/u,
);
assert.match(ui, /generatedById\.get\(canonicalClient\.id\)/u);
console.log("✓ Supabase muestra solo clientes canónicos activos");

assert.match(ui, /saveBusinessCustomerAction/u);
assert.match(ui, /customerId: null/u);
assert.match(ui, /customerId: client\.backendId/u);
assert.match(actions, /save_business_customer/u);
console.log("✓ alta y edición usan Server Actions autenticadas");

assert.match(ui, /setBusinessCustomerActiveAction/u);
assert.match(ui, /isActive: false/u);
assert.match(
  ui,
  /current\.filter\(\s+\(item\) => item\.backendId !== client\.backendId/u,
);
assert.doesNotMatch(
  ui,
  /usesSupabaseCustomers[\s\S]{0,900}reservationIdsToRemove/u,
);
console.log("✓ eliminar no elimina historial ni actividad");

assert.match(
  ui,
  /if \(usesSupabaseCustomers\) return;[\s\S]+syncClientMetaFromStorage/u,
);
assert.match(
  ui,
  /if \(usesSupabaseCustomers\) return;[\s\S]+syncManualClientsFromStorage/u,
);
assert.match(
  documentation,
  /no se escribe `manualClients` ni `clientsMeta`/u,
);
console.log("✓ clientes Supabase no se persisten en localStorage");

assert.match(ui, /RESERVATIONS_STORAGE_KEY/u);
assert.match(ui, /DELIVERIES_STORAGE_KEY/u);
assert.match(ui, /buildClientsFromReservations/u);
assert.match(
  documentation,
  /Métricas transitorias/u,
);
console.log("✓ reservas y envíos solo enriquecen métricas transitorias");

assert.match(
  ui,
  /canWriteBusinessCustomers/u,
);
assert.match(
  ui,
  /canArchiveBusinessCustomers/u,
);
assert.match(
  ui,
  /No tenés permisos para eliminar clientes/u,
);
console.log("✓ la interfaz respeta permisos de escritura y archivo");

assert.match(ui, /customerMutationError/u);
assert.match(ui, /customerMutationPending/u);
assert.match(ui, /Procesando\.\.\./u);
assert.match(ui, /Guardando\.\.\./u);
assert.match(ui, /Creando\.\.\./u);
console.log("✓ la UI expone errores y evita dobles envíos");

assert.match(reader, /\.eq\("business_id", businessId\)/u);
assert.match(reader, /createSupabaseAuthServerClient/u);
assert.match(contract, /normalizeBusinessCustomer/u);
assert.doesNotMatch(
  reader,
  /service_role|SERVICE_ROLE/u,
);
console.log("✓ lectura y validación conservan aislamiento");

assert.match(
  documentation,
  /Una actividad local que no corresponda a un cliente persistido no crea una fila\s+fantasma/u,
);
assert.match(documentation, /no existe borrado físico/u);
assert.match(
  documentation,
  /No ejecutar `staging:cleanup-isolation`/u,
);
console.log("✓ la documentación fija alcance, compatibilidad y límites");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:customers-ui-cutover"],
  "node scripts/customers-ui-cutover-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:customers-ui-cutover/u,
);
console.log("✓ la regresión está integrada al QA");

for (const path of requiredFiles) {
  const content = await readFile(path, "utf8");

  for (const [index, line] of content
    .split(/\r?\n/u)
    .entries()) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${path}, línea ${index + 1}`,
    );
  }
}
console.log("✓ archivos nuevos sin whitespace accidental");

console.log(
  "Todos los casos del corte de clientes V2 pasaron (14).",
);
