import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "src/lib/auth/active-business-contract.ts",
  "src/lib/auth/active-business.ts",
  "src/components/auth/active-business-provider.tsx",
  "src/app/local/layout.tsx",
  "src/app/auth/select-business/page.tsx",
  "src/app/auth/select-business/activate/route.ts",
  "src/app/auth/access-denied/page.tsx",
  "scripts/sync-staging-public-env.mjs",
  "docs/database/ACTIVE-BUSINESS-SESSION.md",
];

console.log("Ejecutando regresión de negocio activo...");

for (const file of requiredFiles) {
  await access(file);
}
console.log("✓ existen contrato, resolución, selector y documentación");

const contract = await readFile(
  "src/lib/auth/active-business-contract.ts",
  "utf8",
);
for (const status of [
  "membership_missing",
  "selection_required",
  "ready",
]) {
  assert.match(contract, new RegExp(`status: "${status}"`, "u"));
}
assert.match(contract, /ACTIVE_BUSINESS_COOKIE/u);
assert.match(contract, /isValidBusinessId/u);
console.log("✓ el contrato representa estados cerrados y UUID validado");

assert.match(contract, /membership\.status !== "active"/u);
assert.match(contract, /seenBusinessIds/u);
assert.match(contract, /membership\.businessId !== membership\.business\.id/u);
console.log("✓ la selección descarta inactivos, duplicados y relaciones rotas");

assert.match(contract, /requestedMembership/u);
assert.match(contract, /activeMemberships\.length === 1/u);
assert.match(contract, /activeMemberships\.length === 0/u);
assert.match(contract, /status: "selection_required"/u);
console.log("✓ cookie válida, membresía única y selección múltiple están cubiertas");

const resolver = await readFile(
  "src/lib/auth/active-business.ts",
  "utf8",
);
assert.match(resolver, /auth\.getClaims\(\)/u);
assert.match(resolver, /\.eq\("user_id", userId\)/u);
assert.match(resolver, /\.eq\("status", "active"\)/u);
assert.doesNotMatch(resolver, /getSession\(\)/u);
console.log("✓ el resolver usa claims y consulta solo la membresía propia activa");

assert.match(resolver, /\.in\("id", businessIds\)/u);
assert.match(resolver, /memberships\.length !== businessIds\.length/u);
assert.match(resolver, /assertServerOnly/u);
assert.doesNotMatch(resolver, /SERVICE_ROLE/iu);
console.log("✓ los negocios se limitan a IDs autorizados sin clave privilegiada");

const layout = await readFile("src/app/local/layout.tsx", "utf8");
assert.match(layout, /config_missing/u);
assert.match(layout, /unauthenticated/u);
assert.match(layout, /membership_missing/u);
assert.match(layout, /selection_required/u);
assert.match(layout, /ActiveBusinessProvider/u);
console.log("✓ el layout de /local bloquea todos los estados no autorizados");

const activate = await readFile(
  "src/app/auth/select-business/activate/route.ts",
  "utf8",
);
assert.match(activate, /submittedOrigin !== requestOrigin/u);
assert.match(activate, /isValidBusinessId/u);
assert.match(activate, /\.maybeSingle\(\)/u);
assert.match(activate, /secure: process\.env\.NODE_ENV === "production"/u);
assert.match(activate, /sanitizeNextPath/u);
console.log("✓ el POST resiste CSRF, UUID ajenos y redirects externos");

const envSync = await readFile(
  "scripts/sync-staging-public-env.mjs",
  "utf8",
);
assert.match(envSync, /TANGO_ENVIRONMENT/u);
assert.match(envSync, /TANGO_STAGING_PROJECT_REF/u);
assert.match(envSync, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/u);
assert.match(envSync, /SUPABASE_SERVICE_ROLE_KEY/u);
assert.match(envSync, /env-local-before-staging-sync/u);
assert.doesNotMatch(envSync, /console\.log\([^)]*publicKey/u);
console.log("✓ la sincronización local copia solo configuración pública y respalda");

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(
  packageJson.scripts?.["test:active-business-auth"],
  "node scripts/active-business-auth-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:active-business-auth/u,
);
console.log("✓ la regresión de negocio activo forma parte del QA");

for (const file of requiredFiles) {
  const content = await readFile(file, "utf8");
  for (const [index, line] of content.split(/\r?\n/u).entries()) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${file}, línea ${index + 1}`,
    );
  }
}
console.log("✓ archivos nuevos sin whitespace accidental");

console.log("Todos los casos de negocio activo pasaron (11).");
