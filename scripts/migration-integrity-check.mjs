import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const manifestPath = "supabase/MIGRATIONS.sha256";

async function hashFile(path) {
  const content = await readFile(path);
  return createHash("sha256").update(content).digest("hex");
}

async function sqlFiles(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => (
      entry.isFile()
      && entry.name.endsWith(".sql")
    ))
    .map((entry) => join(directory, entry.name))
    .sort();
}

console.log("Verificando integridad de migraciones...");

const manifest = await readFile(manifestPath, "utf8");
const expected = new Map();

for (const rawLine of manifest.split(/\r?\n/u)) {
  const line = rawLine.trim();

  if (!line || line.startsWith("#")) {
    continue;
  }

  const match = /^([a-f0-9]{64})\s{2}(.+)$/u.exec(line);

  if (!match) {
    throw new Error(
      `Línea inválida en ${manifestPath}: ${line}`,
    );
  }

  expected.set(match[2], match[1]);
}

const actualFiles = [
  ...await sqlFiles("supabase/migrations"),
  ...await sqlFiles("supabase/rollbacks"),
].map((path) => path.replaceAll("\\", "/"));

const expectedFiles = [...expected.keys()].sort();

if (
  JSON.stringify(actualFiles)
  !== JSON.stringify(expectedFiles)
) {
  throw new Error(
    "El inventario SQL no coincide con el manifiesto.",
  );
}

for (const path of actualFiles) {
  const actualHash = await hashFile(path);
  const expectedHash = expected.get(path);

  if (actualHash !== expectedHash) {
    throw new Error(
      `La migración fue modificada sin actualizar el manifiesto: ${path}`,
    );
  }
}

console.log("✓ inventario SQL completo");
console.log("✓ hashes SHA-256 coinciden");
console.log(
  `Integridad de migraciones aprobada (${actualFiles.length} archivos).`,
);
