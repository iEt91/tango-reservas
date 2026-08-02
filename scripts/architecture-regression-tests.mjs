import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "docs/ROADMAP-2026-09-24.md",
  "docs/DEFINITION-OF-DONE.md",
  "docs/DATA-MODEL.md",
  "docs/RELEASE-CHECKLIST.md",
  "docs/BACKEND-MIGRATION-PLAN.md",
  "supabase/schema.sql",
  "src/lib/supabase/client.ts",
  "src/lib/supabase/server.ts",
];

console.log("Ejecutando regresión de arquitectura y lanzamiento...");

for (const file of requiredFiles) {
  await access(file);
}
console.log("✓ los documentos y archivos base requeridos existen");

const roadmap = await readFile("docs/ROADMAP-2026-09-24.md", "utf8");
assert.match(roadmap, /24 de septiembre de 2026/i);
assert.match(roadmap, /Feature freeze:\s*13 de septiembre/i);
assert.match(roadmap, /P0[\s\S]*Autenticaci[oó]n/i);
assert.match(roadmap, /cliente.+web.+reserva.+panel.+mesa/is);
console.log("✓ el roadmap fija fecha, freeze, alcance y flujo crítico");

const definition = await readFile("docs/DEFINITION-OF-DONE.md", "utf8");
assert.match(definition, /Row Level Security|RLS/i);
assert.match(definition, /idempot/i);
assert.match(definition, /Cero defectos P0/i);
assert.match(definition, /restauraci[oó]n/i);
console.log("✓ la Definition of Done cubre seguridad, consistencia y release");

const dataModel = await readFile("docs/DATA-MODEL.md", "utf8");
for (const entity of [
  "business_members",
  "reservation_tables",
  "stock_movements",
  "payment_allocations",
  "audit_logs",
  "idempotency_keys",
]) {
  assert.match(dataModel, new RegExp(entity));
}
assert.match(dataModel, /localStorage/i);
console.log("✓ el modelo objetivo cubre tenancy, operaciones y migración local");

const migrationPlan = await readFile("docs/BACKEND-MIGRATION-PLAN.md", "utf8");
assert.match(migrationPlan, /m[oó]dulo por m[oó]dulo/i);
assert.match(migrationPlan, /service role/i);
assert.match(migrationPlan, /staging/i);
assert.match(migrationPlan, /rollback/i);
console.log("✓ la migración define cutover progresivo, entornos y rollback");

const releaseChecklist = await readFile("docs/RELEASE-CHECKLIST.md", "utf8");
assert.match(releaseChecklist, /acceso cruzado/i);
assert.match(releaseChecklist, /Pago mixto/i);
assert.match(releaseChecklist, /Backup y restauraci[oó]n/i);
assert.match(releaseChecklist, /Cero P0/i);
console.log("✓ el checklist cubre seguridad, pagos, recuperación y aprobación");

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(
  packageJson.scripts?.["test:architecture"],
  "node scripts/architecture-regression-tests.mjs",
);
assert.match(packageJson.scripts?.["test:regression"] ?? "", /test:architecture/);
console.log("✓ la regresión de arquitectura está integrada al QA");

console.log("Todos los casos de arquitectura pasaron (6).");
