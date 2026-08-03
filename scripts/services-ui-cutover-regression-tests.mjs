import assert from "node:assert/strict";
import {
  access,
  readFile,
} from "node:fs/promises";

const pagePath =
  "src/app/local/configuracion/page.tsx";
const clientPagePath =
  "src/app/local/configuracion/v2-configuracion-page.tsx";
const actionPath =
  "src/app/local/configuracion/service-actions.ts";
const readerPath =
  "src/lib/data/server/business-services.ts";
const contractPath =
  "src/lib/services/business-service-contract.ts";
const documentationPath =
  "docs/database/SERVICES-UI-CUTOVER.md";

const requiredFiles = [
  pagePath,
  clientPagePath,
  actionPath,
  readerPath,
  contractPath,
  documentationPath,
];

console.log("Ejecutando regresión de servicios en Configuración V2...");

for (const path of requiredFiles) {
  await access(path);
}
console.log("✓ existen UI, acciones, lectura, contrato y documentación");

const page = await readFile(pagePath, "utf8");
const clientPage = await readFile(
  clientPagePath,
  "utf8",
);
const action = await readFile(actionPath, "utf8");
const reader = await readFile(readerPath, "utf8");
const contract = await readFile(contractPath, "utf8");
const documentation = await readFile(
  documentationPath,
  "utf8",
);

assert.match(
  page,
  /getBusinessServicesForBusiness/u,
);
assert.match(
  page,
  /Promise\.all\(\[[\s\S]+getBusinessServicesForBusiness\(businessId\)/u,
);
assert.match(
  page,
  /initialBusinessServices=\{initialBusinessServices\}/u,
);
console.log("✓ la página servidor carga servicios por negocio");

assert.match(
  page,
  /businessServicesPersistence="supabase"/u,
);
assert.match(
  page,
  /membership\.role === "owner"[\s\S]+membership\.role === "admin"/u,
);
assert.match(
  page,
  /canManageBusinessServices=\{canManageBusinessServices\}/u,
);
console.log("✓ el servidor deriva persistencia y permisos");

assert.match(
  clientPage,
  /type BusinessServiceEditor/u,
);
assert.match(
  clientPage,
  /initialBusinessServices\?: BusinessServiceEditor\[\] \| null/u,
);
assert.match(
  clientPage,
  /businessServicesPersistence\?: "local" \| "supabase"/u,
);
console.log("✓ la UI recibe un contrato explícito");

assert.match(
  clientPage,
  /useState<BusinessServiceEditor\[\]>/u,
);
assert.match(
  clientPage,
  /setBusinessServices\([\s\S]+initialBusinessServices/u,
);
assert.match(
  clientPage,
  /activeBusinessServiceCount/u,
);
console.log("✓ el snapshot servidor hidrata el estado React");

assert.match(
  clientPage,
  /normalizeBusinessService\(serviceEditor\)/u,
);
assert.match(
  clientPage,
  /saveBusinessServiceAction/u,
);
assert.match(
  clientPage,
  /setBusinessServiceActiveAction/u,
);
console.log("✓ alta, edición y estado usan Server Actions");

assert.match(clientPage, /<V2Modal/u);
assert.match(clientPage, /"Editar servicio"/u);
assert.match(clientPage, /"Servicio nuevo"/u);
assert.match(
  clientPage,
  /Nombre del servicio/u,
);
assert.match(
  clientPage,
  /Duración en minutos/u,
);
assert.match(
  clientPage,
  /Capacidad/u,
);
assert.match(
  clientPage,
  /Precio opcional/u,
);
console.log("✓ el modal edita el contrato completo");

assert.match(
  clientPage,
  /id="config-servicios"/u,
);
assert.match(
  clientPage,
  /Catálogo de servicios/u,
);
assert.match(
  clientPage,
  /Servicios activos/u,
);
assert.match(
  clientPage,
  /Sin precio/u,
);
console.log("✓ la tarjeta V2 lista y resume servicios");

assert.match(
  clientPage,
  /canManageBusinessServices[\s\S]+Nuevo servicio/u,
);
assert.match(
  clientPage,
  /Modo de solo lectura/u,
);
assert.match(
  clientPage,
  /businessServicesPersistence !== "supabase"/u,
);
console.log("✓ la interfaz respeta permisos y falla cerrado");

assert.doesNotMatch(
  clientPage,
  /localStorage[\s\S]{0,300}businessServices|businessServices[\s\S]{0,300}localStorage/u,
);
assert.doesNotMatch(
  clientPage,
  /deleteBusinessService|deleteSupabaseService/u,
);
assert.match(
  clientPage,
  /setBusinessServiceActiveAction/u,
);
console.log("✓ servicios no usan localStorage ni eliminación física");

assert.match(
  action,
  /formatBusinessServiceMutationError/u,
);
assert.match(
  action,
  /error\?\.code === "23505"/u,
);
assert.match(
  action,
  /error\?\.code === "42501"/u,
);
assert.match(
  action,
  /error\?\.code === "22023"/u,
);
console.log("✓ las acciones traducen errores operativos seguros");

assert.match(
  reader,
  /\.eq\("business_id", businessId\)/u,
);
assert.match(
  reader,
  /\.order\("sort_order"/u,
);
assert.doesNotMatch(
  reader,
  /service_role|SERVICE_ROLE|localStorage/u,
);
assert.match(
  contract,
  /normalizeBusinessService/u,
);
console.log("✓ lectura y validación conservan aislamiento");

assert.match(
  documentation,
  /No agrega una migración nueva/u,
);
assert.match(
  documentation,
  /No existe eliminación física/u,
);
assert.match(
  documentation,
  /no se mezcla con la configuración guardada en[\s\S]+localStorage/u,
);
console.log("✓ la documentación fija alcance y límites");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:services-ui-cutover"],
  "node scripts/services-ui-cutover-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:services-ui-cutover/u,
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
  "Todos los casos de servicios V2 pasaron (13).",
);
