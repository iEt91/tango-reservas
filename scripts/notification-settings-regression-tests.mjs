import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const configPageSource = readFileSync(
  "src/app/local/configuracion/v2-configuracion-page.tsx",
  "utf8"
);
const dashboardSource = readFileSync("src/app/local/v2-local-page.tsx", "utf8");
const settingsSource = readFileSync("src/lib/notification-settings.ts", "utf8");
const packageSource = readFileSync("package.json", "utf8");

console.log("Ejecutando regresion de configuracion de notificaciones...");

assert.match(
  settingsSource,
  /export function normalizeNotificationSettings/,
  "la normalizacion de notificaciones debe vivir en un helper compartido"
);

assert.match(
  configPageSource,
  /@\/lib\/notification-settings/,
  "Configuracion debe usar el helper compartido de notificaciones"
);

assert.match(
  dashboardSource,
  /@\/lib\/notification-settings/,
  "Inicio debe usar el helper compartido de notificaciones"
);

assert.match(
  configPageSource,
  /V2_NOTIFICATION_OPTIONS\.map/,
  "Configuracion debe renderizar los toggles desde una unica lista compartida"
);

assert.match(
  dashboardSource,
  /normalizeNotificationSettings\(storedLocalConfig\)/,
  "Inicio debe completar defaults antes de calcular alertas"
);

assert.doesNotMatch(
  dashboardSource,
  /label:\s*"Alta",\s*label:\s*"Alta"/,
  "Inicio no debe duplicar propiedades de alerta"
);

assert.match(packageSource, /"test:notifications"/, "el QA debe incluir regresion de notificaciones");

assert.match(
  dashboardSource,
  /delivery-active-\$\{delivery\.id\}/,
  "Inicio debe mostrar pedidos activos cuando la notificacion de nuevos pedidos esta activa"
);

assert.match(
  dashboardSource,
  /reservation-active-\$\{reservation\.id\}/,
  "Inicio debe mostrar reservas confirmadas cuando la notificacion de nuevas reservas esta activa"
);

console.log("Todos los casos de notificaciones pasaron (9).");
