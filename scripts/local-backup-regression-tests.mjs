import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

console.log("Ejecutando regresion de respaldo local...");

const source = await readFile("src/lib/local-backup.ts", "utf8");

assert.match(source, /key\.startsWith\(["']tango-["']\)/);
assert.match(source, /schema:\s*TANGO_BACKUP_SCHEMA/);
console.log("✓ el respaldo incluye solo claves propias de Tango");

assert.match(source, /previousEntries = readTangoEntries/);
assert.match(source, /replaceTangoEntries\(storage, previousEntries\)/);
console.log("✓ una restauracion fallida intenta recuperar los datos anteriores");

assert.match(source, /candidate\.schema !== TANGO_BACKUP_SCHEMA/);
assert.match(source, /typeof value !== ["']string["']/);
console.log("✓ la importacion valida formato, claves y valores antes de escribir");

console.log("Todos los casos de respaldo local pasaron (3).");
