import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const SOURCE_ROOT = path.resolve("src");

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(fullPath)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

console.log("Ejecutando regresion de sincronizacion local...");

const sourceFiles = await collectSourceFiles(SOURCE_ROOT);
const genericStorageDispatches = [];

for (const filePath of sourceFiles) {
  const source = await readFile(filePath, "utf8");

  if (/dispatchEvent\s*\(\s*new Event\s*\(\s*["']storage["']\s*\)/.test(source)) {
    genericStorageDispatches.push(path.relative(process.cwd(), filePath));
  }
}

assert.deepEqual(genericStorageDispatches, []);
console.log("✓ las escrituras locales no simulan eventos genericos de storage");

const demoSeedSource = await readFile(
  path.join(SOURCE_ROOT, "lib", "demo-seed.ts"),
  "utf8",
);

assert.match(demoSeedSource, /V2_OPERATIONAL_EVENTS\.reservations/);
console.log("✓ la carga demo notifica el evento de reservas del dominio");
console.log("Todos los casos de sincronizacion local pasaron (2).");
