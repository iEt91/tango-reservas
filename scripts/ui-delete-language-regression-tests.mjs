import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("src");
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

/*
 * Esta prueba controla únicamente la terminología española visible anterior.
 * "Eliminar" es la terminología CORRECTA y nunca debe considerarse un fallo.
 *
 * Los identificadores técnicos en inglés (archive, archived_at,
 * archiveBusiness..., etc.) quedan fuera de esta expresión.
 */
const forbiddenVisibleTerms =
  /(?<![\p{L}\p{N}_])(?:archivar(?:á|án|ía|ías|íamos|ían|emos)?|archivando|archivad[oa]s?|archiva|archivan|archivó|archivo lógico)(?![\p{L}\p{N}_])/giu;

async function collectFiles(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry);
    const info = await stat(absolute);

    if (info.isDirectory()) {
      files.push(...await collectFiles(absolute));
      continue;
    }

    if (allowedExtensions.has(path.extname(entry))) {
      files.push(absolute);
    }
  }

  return files;
}

console.log("Ejecutando regresión de lenguaje visible de eliminación...");

const files = await collectFiles(sourceRoot);
const findings = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  const lines = content.split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    forbiddenVisibleTerms.lastIndex = 0;

    for (const match of lines[index].matchAll(forbiddenVisibleTerms)) {
      findings.push(
        `${path.relative(process.cwd(), file)}:${index + 1}: ${match[0]}`,
      );
    }
  }
}

assert.deepEqual(
  findings,
  [],
  `La interfaz todavía contiene terminología visible anterior:\n${findings.join("\n")}`,
);

console.log("✓ Eliminar y sus variantes están permitidos");
console.log("✓ no queda terminología visible Archivar en src");
console.log("✓ archive y archived_at permanecen permitidos como identificadores técnicos");
console.log("Todos los casos de lenguaje visible pasaron (3).");
