import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

const files = {
  sidebar: "src/components/v2/v2-sidebar.tsx",
  utilities: "src/components/v2/v2-sidebar-utilities.tsx",
  menu: "src/app/local/menu/v2-menu-page.tsx",
  imageUpload: "src/app/api/menu-image-upload/route.ts",
  package: "package.json",
};
const sources = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([key, file]) => [
      key,
      await readFile(file, "utf8"),
    ]),
  ),
);

console.log("Ejecutando E35D: notificaciones globales e imágenes de Menú...");

assert.doesNotMatch(sources.sidebar, /\/local\/seguridad/u);
assert.doesNotMatch(sources.sidebar, /Sesión activa/u);
assert.match(sources.sidebar, /V2SidebarUtilities/u);
assert.match(sources.utilities, /Abrir notificaciones/u);
assert.match(sources.utilities, /action="\/auth\/logout"/u);
assert.match(sources.utilities, /Pedido pendiente de aceptación/u);
assert.match(sources.utilities, /Reserva pendiente por confirmar/u);
assert.match(sources.utilities, /Stock bajo/u);
assert.match(sources.utilities, /tango-v2-system-notifications-v1/u);
assert.match(sources.utilities, /Todo leído/u);
console.log("✓ sidebar centraliza notificaciones y logout sin exponer Seguridad");

assert.match(sources.menu, /MENU_IMAGE_UPLOAD_API_PATH/u);
assert.match(sources.menu, /uploadLocalMenuImage/u);
assert.match(sources.menu, /const imageUrl =\s*await uploadLocalMenuImage/u);
assert.doesNotMatch(sources.menu, /imageUrl: compressedImage/u);
assert.match(sources.menu, /console\.warn\(/u);
console.log("✓ Menú deja de persistir imágenes base64 dentro de localStorage");

assert.match(sources.imageUpload, /export async function POST/u);
assert.match(sources.imageUpload, /NODE_ENV !== "development"/u);
assert.match(sources.imageUpload, /NEXT_PUBLIC_DATA_SOURCE === "supabase"/u);
assert.match(sources.imageUpload, /data:image\/webp;base64/u);
assert.match(sources.imageUpload, /MAX_UPLOAD_BYTES/u);
assert.match(sources.imageUpload, /writeFile/u);
console.log("✓ carga binaria local limitada a desarrollo/demo y con tamaño validado");

const pkg = JSON.parse(sources.package);
assert.equal(
  pkg.scripts?.["test:e35d-polish"],
  "node scripts/demo-notifications-menu-images-regression-tests.mjs",
);
const commands = pkg.scripts?.["test:regression"]?.split(" && ").filter(Boolean) ?? [];
assert.equal(
  commands.filter((command) => command === "npm run test:e35d-polish").length,
  1,
);
assert.ok(
  commands.indexOf("npm run test:demuru-demo-readiness")
  < commands.indexOf("npm run test:e35d-polish"),
);
console.log("✓ E35D queda integrado una sola vez después de E35C");

for (const [label, source] of Object.entries(sources)) {
  assert.doesNotMatch(source, /[ \t]+\n/u, `${label} contiene whitespace accidental`);
}

console.log("Todos los casos E35D pasaron.");
