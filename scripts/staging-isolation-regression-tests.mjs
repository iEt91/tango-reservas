import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  ".env.staging.example",
  "docs/database/STAGING-RLS-ISOLATION.md",
  "scripts/lib/staging-context.mjs",
  "scripts/supabase-staging-seed.mjs",
  "scripts/supabase-isolation-test.mjs",
  "scripts/supabase-isolation-cleanup.mjs",
];

console.log("Ejecutando regresión del fixture RLS...");

for (const path of requiredFiles) {
  await access(path);
}
console.log("✓ existen seed, prueba, cleanup y documentación");

const envTemplate = await readFile(
  ".env.staging.example",
  "utf8",
);
assert.match(
  envTemplate,
  /TANGO_STAGING_PROJECT_REF=yzkeugxygfdgzhlwdeek/u,
);
assert.match(
  envTemplate,
  /TANGO_PRODUCTION_PROJECT_REF=ekyfplzpbirsjwluktda/u,
);
assert.match(
  envTemplate,
  /TANGO_TEST_USER_A_PASSWORD/u,
);
assert.match(
  envTemplate,
  /TANGO_TEST_USER_B_PASSWORD/u,
);
assert.doesNotMatch(
  envTemplate,
  /sb_secret_[A-Za-z0-9_-]{20,}/u,
);
assert.doesNotMatch(
  envTemplate,
  /eyJ[A-Za-z0-9._-]{40,}/u,
);
console.log("✓ la plantilla fija staging sin incluir secretos");

const context = await readFile(
  "scripts/lib/staging-context.mjs",
  "utf8",
);
assert.match(context, /requireServerSecret = false/u);
assert.match(context, /requireTestUsers = false/u);
assert.match(context, /secret === publicKey/u);
assert.match(context, /payload\.role !== "service_role"/u);
assert.match(context, /secret\.startsWith\("sb_secret_"\)/u);
assert.match(context, /debe tener al menos 20 caracteres/u);
assert.match(context, /stagingProjectRef === productionProjectRef/u);
console.log("✓ el contexto rechaza claves, entornos y credenciales inválidas");

const seed = await readFile(
  "scripts/supabase-staging-seed.mjs",
  "utf8",
);
assert.match(seed, /auth\.admin\.createUser/u);
assert.match(seed, /auth\.admin\.updateUserById/u);
assert.match(seed, /email_confirm:\s*true/u);
assert.match(seed, /business_members/u);
assert.match(seed, /\.tango\/staging-isolation\.json/u);
assert.doesNotMatch(seed, /console\.log\([^)]*Password/u);
assert.doesNotMatch(seed, /console\.log\([^)]*serverSecret/u);
console.log("✓ el seed es idempotente y no imprime credenciales");

const isolation = await readFile(
  "scripts/supabase-isolation-test.mjs",
  "utf8",
);
assert.match(isolation, /signInWithPassword/u);
assert.match(isolation, /pudo leer otro negocio/u);
assert.match(isolation, /pudo insertar membresías/u);
assert.match(isolation, /pudo editar su rol/u);
assert.match(isolation, /pudo eliminar su membresía/u);
assert.match(isolation, /tablas operativas permanecen default deny/u);
assert.doesNotMatch(isolation, /SUPABASE_SERVICE_ROLE_KEY/u);
console.log("✓ la prueba usa sesiones públicas y cubre BOLA y escrituras");

const cleanup = await readFile(
  "scripts/supabase-isolation-cleanup.mjs",
  "utf8",
);
assert.match(cleanup, /auth\.admin\.deleteUser/u);
assert.match(
  cleanup,
  /fixture\.projectRef !== context\.stagingProjectRef/u,
);
assert.match(cleanup, /businesses/u);
console.log("✓ el cleanup está limitado al fixture del proyecto");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
for (const script of [
  "staging:seed-isolation",
  "staging:test-isolation",
  "staging:cleanup-isolation",
  "test:staging-isolation",
]) {
  assert.equal(
    typeof packageJson.scripts?.[script],
    "string",
  );
}
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:staging-isolation/u,
);
assert.doesNotMatch(
  packageJson.scripts?.qa ?? "",
  /staging:(seed|test|cleanup)-isolation/u,
);
console.log("✓ QA valida código sin ejecutar operaciones remotas");

const gitignore = await readFile(".gitignore", "utf8");
assert.match(gitignore, /^\.env\*$/mu);
assert.match(gitignore, /^\.tango\/$/mu);
console.log("✓ credenciales y fixture local están ignorados");

const documentation = await readFile(
  "docs/database/STAGING-RLS-ISOLATION.md",
  "utf8",
);
assert.match(
  documentation,
  /Nunca pegar la secret key en el chat/u,
);
assert.match(documentation, /staging:seed-isolation/u);
assert.match(documentation, /staging:test-isolation/u);
assert.match(documentation, /ocho controles/u);
console.log("✓ el runbook define manejo seguro y evidencia");

for (const path of requiredFiles) {
  const content = await readFile(path, "utf8");

  for (const [index, line] of content.split("\n").entries()) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${path}, línea ${index + 1}`,
    );
  }
}
console.log("✓ archivos nuevos sin whitespace accidental");

console.log("Todos los casos del fixture RLS pasaron (10).");
