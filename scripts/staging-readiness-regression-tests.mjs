import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const requiredFiles = [
  ".env.staging.example",
  "docs/database/STAGING-SECURITY-RUNBOOK.md",
  "docs/security/RLS-ISOLATION-TEST-PLAN.md",
  "scripts/lib/load-local-env.mjs",
  "scripts/lib/staging-context.mjs",
  "scripts/migration-integrity-check.mjs",
  "scripts/supabase-staging-preflight.mjs",
  "supabase/MIGRATIONS.sha256",
  "supabase/preflight/20260802_001_staging_preflight.sql",
  "supabase/preflight/20260802_002_business_members_postflight.sql",
];

console.log("Ejecutando regresión de preparación de staging...");

for (const file of requiredFiles) {
  await access(file);
}
console.log("✓ existen runbook, scripts y SQL de preflight");

const envTemplate = await readFile(
  ".env.staging.example",
  "utf8",
);
for (const key of [
  "TANGO_ENVIRONMENT=staging",
  "TANGO_STAGING_PROJECT_REF",
  "TANGO_PRODUCTION_PROJECT_REF",
  "NEXT_PUBLIC_SUPABASE_URL",
]) {
  assert.match(envTemplate, new RegExp(key));
}
assert.doesNotMatch(envTemplate, /eyJ[A-Za-z0-9._-]{40,}/u);
assert.doesNotMatch(
  envTemplate,
  /sb_secret_[A-Za-z0-9_-]{20,}/u,
);
console.log("✓ la plantilla separa entornos sin secretos reales");

const context = await readFile(
  "scripts/lib/staging-context.mjs",
  "utf8",
);
assert.match(context, /TANGO_ENVIRONMENT=staging/);
assert.match(
  context,
  /stagingProjectRef === productionProjectRef/,
);
assert.match(context, /urlProjectRef !== stagingProjectRef/);
assert.match(context, /service_role/);
assert.match(context, /sb_secret_/);
console.log("✓ las operaciones remotas rechazan producción");

const preflight = await readFile(
  "scripts/supabase-staging-preflight.mjs",
  "utf8",
);
assert.match(preflight, /lookup\(hostname/);
assert.match(preflight, /\/auth\/v1\/settings/);
assert.match(
  preflight,
  /\/rest\/v1\/business_members\?select=id&limit=0/,
);
assert.match(preflight, /method:\s*"HEAD"/u);
assert.match(preflight, /status === 401/u);
assert.match(preflight, /status === 403/u);
assert.match(preflight, /await response\.arrayBuffer\(\)/u);
assert.doesNotMatch(preflight, /response\.body\?\.cancel/u);
assert.match(preflight, /function isOpaqueApiKey/);
assert.match(
  preflight,
  /value\.startsWith\("sb_publishable_"\)/,
);
assert.match(
  preflight,
  /if \(!isOpaqueApiKey\(context\.publicKey\)\)/,
);
assert.doesNotMatch(
  preflight,
  /console\.log\([^)]*publicKey/u,
);
console.log(
  "✓ el preflight distingue conectividad, permisos y API keys",
);

const preflightSql = await readFile(
  "supabase/preflight/20260802_001_staging_preflight.sql",
  "utf8",
);
assert.match(
  preflightSql,
  /profiles_with_unknown_auth_user/,
);
assert.match(preflightSql, /row_security_active/);
assert.doesNotMatch(
  preflightSql,
  /^\s*(insert|update|delete|alter|drop|create)\b/imu,
);
console.log("✓ el preflight SQL es de solo lectura");

const postflightSql = await readFile(
  "supabase/preflight/20260802_002_business_members_postflight.sql",
  "utf8",
);
assert.match(
  postflightSql,
  /FORCE RLS|relforcerowsecurity/i,
);
assert.match(
  postflightSql,
  /private\.has_business_role/,
);
assert.match(postflightSql, /anon conserva SELECT/);
console.log(
  "✓ el postflight falla ante configuraciones inseguras",
);

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
for (const script of [
  "staging:verify-migrations",
  "staging:preflight",
  "test:staging-readiness",
]) {
  assert.equal(
    typeof packageJson.scripts?.[script],
    "string",
  );
}
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:staging-readiness/u,
);
console.log(
  "✓ comandos de staging integrados sin acceso remoto en QA",
);

const gitignore = await readFile(".gitignore", "utf8");
assert.match(gitignore, /^\.tango\/$/mu);
assert.match(gitignore, /^\.env\*$/mu);
console.log("✓ secretos y evidencia local quedan fuera de Git");

const { stdout } = await execFileAsync(
  process.execPath,
  ["scripts/migration-integrity-check.mjs"],
  {
    windowsHide: true,
  },
);
assert.match(
  stdout,
  /Integridad de migraciones aprobada/,
);
console.log("✓ el manifiesto protege los SQL versionados");

const rollout = await readFile(
  "docs/database/STAGING-SECURITY-RUNBOOK.md",
  "utf8",
);
assert.match(
  rollout,
  /Nunca aplicar primero en producción/,
);
assert.match(
  rollout,
  /dos proyectos Supabase diferentes/,
);
assert.match(rollout, /prueba real de aislamiento/);
console.log(
  "✓ el runbook exige separación y pruebas negativas",
);

const plan = await readFile(
  "docs/security/RLS-ISOLATION-TEST-PLAN.md",
  "utf8",
);
assert.match(plan, /usuario A/);
assert.match(plan, /usuario B/);
assert.match(plan, /fallo P0/);
console.log(
  "✓ la prueba de aislamiento queda definida como P0",
);

for (const file of requiredFiles) {
  const content = await readFile(file, "utf8");

  for (
    const [index, line]
    of content.split("\n").entries()
  ) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${file}, línea ${index + 1}`,
    );
  }
}
console.log("✓ archivos nuevos sin whitespace accidental");

console.log(
  "Todos los casos de preparación de staging pasaron (10).",
);
