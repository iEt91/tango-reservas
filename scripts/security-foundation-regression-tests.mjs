import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "SECURITY.md",
  ".env.example",
  ".github/workflows/security-gate.yml",
  ".github/dependabot.yml",
  ".github/CODEOWNERS",
  "docs/security/SECURITY-BASELINE.md",
  "docs/security/THREAT-MODEL.md",
  "docs/security/DATA-CLASSIFICATION.md",
  "docs/security/ACCESS-CONTROL-MATRIX.md",
  "docs/security/INCIDENT-RESPONSE.md",
  "docs/security/SECURITY-RELEASE-GATE.md",
  "docs/security/GITHUB-SECURITY-SETUP.md",
  "scripts/security-static-scan.mjs",
  "scripts/security-env-check.mjs",
  "src/lib/security/server-only.ts",
];

console.log("Ejecutando regresión de Security Foundation...");

for (const file of requiredFiles) {
  await access(file);
}
console.log("✓ existen políticas, controles, CI y documentación");

const gitignore = await readFile(".gitignore", "utf8");
assert.match(gitignore, /^\.env\*$/mu);
assert.match(gitignore, /^!\.env\.example$/mu);
assert.match(gitignore, /^\*\.pem$/mu);
assert.match(gitignore, /^secrets\/$/mu);
console.log("✓ Git ignora entornos, claves y directorios de secretos");

const envExample = await readFile(".env.example", "utf8");
assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL/);
assert.match(envExample, /SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(envExample, /eyJ[A-Za-z0-9._-]{40,}/);
console.log("✓ la plantilla de entorno no contiene credenciales reales");

const nextConfig = await readFile("next.config.ts", "utf8");
for (const header of [
  "Content-Security-Policy",
  "Referrer-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Permissions-Policy",
  "Strict-Transport-Security",
]) {
  assert.match(nextConfig, new RegExp(header));
}
assert.match(nextConfig, /poweredByHeader:\s*false/);
assert.match(nextConfig, /Cache-Control/);
assert.match(nextConfig, /X-Robots-Tag/);
console.log("✓ Next.js aplica headers y no-cache en rutas privadas");

const serverModule = await readFile(
  "src/lib/supabase/server.ts",
  "utf8",
);
assert.match(serverModule, /assertServerOnly/);
assert.match(serverModule, /SUPABASE_SERVICE_ROLE_KEY/);

const serverGuard = await readFile(
  "src/lib/security/server-only.ts",
  "utf8",
);
assert.match(serverGuard, /typeof window !== "undefined"/);
console.log("✓ el cliente privilegiado tiene una barrera explícita");

const workflow = await readFile(
  ".github/workflows/security-gate.yml",
  "utf8",
);
assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/u);
assert.match(workflow, /persist-credentials:\s*false/u);
assert.match(workflow, /npm ci/u);
assert.match(workflow, /npm run qa/u);
assert.match(workflow, /npm run security:audit/u);
assert.match(workflow, /node-version:\s*22/u);
console.log("✓ Security Gate usa permisos mínimos y QA reproducible");

const dependabot = await readFile(
  ".github/dependabot.yml",
  "utf8",
);
assert.match(dependabot, /package-ecosystem:\s*npm/u);
assert.match(dependabot, /package-ecosystem:\s*github-actions/u);
console.log("✓ Dependabot cubre npm y GitHub Actions");

const threatModel = await readFile(
  "docs/security/THREAT-MODEL.md",
  "utf8",
);
assert.match(threatModel, /Acceso cruzado entre negocios/);
assert.match(threatModel, /Exposición de service role/);
assert.match(threatModel, /RLS default deny/);
console.log("✓ el modelo prioriza aislamiento y secretos");

const dataClassification = await readFile(
  "docs/security/DATA-CLASSIFICATION.md",
  "utf8",
);
for (const level of [
  "Pública",
  "Interna",
  "Confidencial",
  "Restringida",
]) {
  assert.match(dataClassification, new RegExp(level));
}
assert.match(dataClassification, /números completos de tarjeta/);
console.log("✓ los datos tienen clasificación y exclusiones");

const accessMatrix = await readFile(
  "docs/security/ACCESS-CONTROL-MATRIX.md",
  "utf8",
);
for (const role of [
  "Anónimo",
  "Staff",
  "Admin",
  "Owner",
  "Soporte plataforma",
]) {
  assert.match(accessMatrix, new RegExp(role));
}
assert.match(accessMatrix, /MFA/);
console.log("✓ la matriz distingue roles y acciones sensibles");

const releaseGate = await readFile(
  "docs/security/SECURITY-RELEASE-GATE.md",
  "utf8",
);
assert.match(releaseGate, /bloqueada/);
assert.match(releaseGate, /prueba de acceso cruzado fallida/);
assert.match(releaseGate, /pentest/i);
console.log("✓ la puerta de release bloquea riesgos críticos");

const staticScan = await readFile(
  "scripts/security-static-scan.mjs",
  "utf8",
);
assert.match(staticScan, /PRIVATE KEY/);
assert.match(staticScan, /dangerouslySetInnerHTML/);
assert.match(staticScan, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(staticScan, /Access-Control-Allow-Origin/);

const envCheck = await readFile(
  "scripts/security-env-check.mjs",
  "utf8",
);
assert.match(envCheck, /NEXT_PUBLIC_/);
assert.match(envCheck, /service_role/);
assert.match(envCheck, /https:/);
console.log("✓ los escáneres cubren secretos, código y entorno");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["security:scan"],
  "node scripts/security-static-scan.mjs",
);
assert.equal(
  packageJson.scripts?.["security:env"],
  "node scripts/security-env-check.mjs",
);
assert.equal(
  packageJson.scripts?.["security:audit"],
  "npm audit --omit=dev --audit-level=high",
);
assert.match(
  packageJson.scripts?.qa ?? "",
  /security:scan[\s\S]+security:env/u,
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:security-foundation/u,
);
console.log("✓ los controles forman parte del QA y la regresión");

const codeowners = await readFile(
  ".github/CODEOWNERS",
  "utf8",
);
assert.match(codeowners, /\/src\/lib\/security\//);
assert.match(codeowners, /\/supabase\/migrations\//);
console.log("✓ las rutas sensibles tienen propietario");

for (const file of requiredFiles) {
  const content = await readFile(file, "utf8");

  for (const [index, line] of content.split("\n").entries()) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${file}, línea ${index + 1}`,
    );
  }
}
console.log("✓ los archivos nuevos no contienen whitespace accidental");

console.log("Todos los casos de Security Foundation pasaron (12).");
