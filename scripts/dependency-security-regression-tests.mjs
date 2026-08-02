import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const MINIMUM_POSTCSS_VERSION = [8, 5, 18];

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)/u.exec(value ?? "");

  if (!match) {
    throw new Error(`Versión inválida: ${value}`);
  }

  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }

  return 0;
}

console.log("Ejecutando regresión de dependencias de seguridad...");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
const packageLock = JSON.parse(
  await readFile("package-lock.json", "utf8"),
);

assert.equal(
  packageJson.dependencies?.postcss,
  "8.5.18",
  "PostCSS debe ser una dependencia exacta",
);
assert.equal(
  packageJson.overrides?.postcss,
  "$postcss",
  "el override global debe referenciar la dependencia directa",
);
assert.notEqual(
  packageJson.overrides?.next?.postcss,
  "8.5.18",
  "no debe persistir el override anidado de Next.js",
);
console.log("✓ package.json aplica una única política global");

const postcssPackages = Object.entries(
  packageLock.packages ?? {},
)
  .filter(([path]) => (
    path === "node_modules/postcss"
    || path.endsWith("/node_modules/postcss")
  ))
  .map(([path, metadata]) => ({
    path,
    version: metadata?.version,
  }));

assert.ok(
  postcssPackages.length > 0,
  "package-lock.json debe resolver PostCSS",
);

for (const item of postcssPackages) {
  assert.ok(
    compareVersions(
      parseVersion(item.version),
      MINIMUM_POSTCSS_VERSION,
    ) >= 0,
    `${item.path} usa PostCSS vulnerable ${item.version}`,
  );
}

console.log(
  "✓ el lockfile no contiene PostCSS inferior a 8.5.18",
);

const vulnerableNestedCopy = postcssPackages.find(
  ({ path, version }) => (
    path === "node_modules/next/node_modules/postcss"
    && compareVersions(
      parseVersion(version),
      MINIMUM_POSTCSS_VERSION,
    ) < 0
  ),
);

assert.equal(
  vulnerableNestedCopy,
  undefined,
  "Next.js conserva una copia vulnerable de PostCSS",
);
console.log(
  "✓ Next.js no conserva una copia transitiva vulnerable",
);

assert.equal(
  packageJson.scripts?.["test:dependency-security"],
  "node scripts/dependency-security-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:dependency-security/u,
);
console.log("✓ la verificación permanece integrada al QA");

console.log(
  "Todos los casos de dependencias de seguridad pasaron (4).",
);
