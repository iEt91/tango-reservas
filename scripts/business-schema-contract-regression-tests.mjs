import assert from "node:assert/strict";
import {
  access,
  readFile,
} from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260802_001_initial_schema_lockdown.sql";
const adapterPath =
  "src/lib/data/supabase/businesses.ts";
const adminAdapterPath =
  "src/lib/data/admin-businesses.ts";
const publicWebPath =
  "src/lib/data/supabase/publicWeb.ts";
const reservationsPath =
  "src/lib/data/supabase/reservations.ts";
const reservationsWriteMigrationPath =
  "supabase/migrations/20260804_009_reservations_write_rpc.sql";
const documentationPath =
  "docs/database/BUSINESS-SCHEMA-CONTRACT.md";

const requiredFiles = [
  migrationPath,
  adapterPath,
  adminAdapterPath,
  publicWebPath,
  reservationsPath,
  reservationsWriteMigrationPath,
  documentationPath,
];

console.log("Ejecutando regresión del contrato businesses...");

for (const file of requiredFiles) {
  await access(file);
}
console.log("✓ existen esquema, adaptadores y documentación");

const migration = await readFile(migrationPath, "utf8");
const adapter = await readFile(adapterPath, "utf8");
const adminAdapter = await readFile(
  adminAdapterPath,
  "utf8",
);
const publicWeb = await readFile(publicWebPath, "utf8");
const reservations = await readFile(
  reservationsPath,
  "utf8",
);
const reservationsWriteMigration = await readFile(
  reservationsWriteMigrationPath,
  "utf8",
);

for (const column of [
  "google_maps_url",
  "logo_url",
  "cover_image_url",
  "primary_color",
  "secondary_color",
  "theme_id",
  "hero_title",
  "hero_subtitle",
  "about_title",
  "about_text",
  "menu_title",
  "reservation_title",
  "cta_label",
  "show_hero",
  "show_about",
  "show_gallery",
  "show_menu",
  "show_location",
  "show_reservation",
  "show_whatsapp_button",
]) {
  assert.match(
    migration,
    new RegExp(`\\b${column}\\b`, "u"),
  );
  assert.match(
    adapter,
    new RegExp(`\\b${column}\\b`, "u"),
  );
}
assert.match(adapter, /const BUSINESS_SELECT = ".+" as const;/u);
assert.doesNotMatch(adapter, /BUSINESS_SELECT = \[[\s\S]+\.join/u);
console.log("✓ el select literal usa las columnas reales versionadas");

for (const obsoleteColumn of [
  "google_maps_embed_url",
  "auto_confirm_reservations",
  "public_template_id",
]) {
  const obsoletePattern = new RegExp(obsoleteColumn, "u");

  assert.doesNotMatch(adapter, obsoletePattern);
  assert.doesNotMatch(publicWeb, obsoletePattern);
  assert.doesNotMatch(reservations, obsoletePattern);
}
assert.match(publicWeb, /businessRow\.theme_id/u);
assert.match(publicWeb, /mapThemeIdToPublicTemplateId/u);
assert.match(
  reservationsWriteMigration,
  /rule_row\.requires_confirmation/u,
);
console.log("✓ adaptador y consumidores no usan columnas inexistentes");

assert.match(
  adapter,
  /logo_url:\s*normalizeRequiredText\(data\.logoUrl\)/u,
);
assert.match(
  adapter,
  /cover_image_url:\s*normalizeRequiredText\(data\.coverImageUrl\)/u,
);
assert.match(
  adapter,
  /theme_id: normalizeThemeId\(data\.themeId\)/u,
);
assert.match(adapter, /show_reservation:/u);
console.log("✓ las escrituras mapean el contenido visual real");

assert.match(adapter, /normalizeRequiredText/u);
assert.doesNotMatch(adapter, /return trimmed \? trimmed : null/u);
console.log("✓ textos vacíos respetan columnas NOT NULL");

for (const property of [
  "row.logo_url",
  "row.cover_image_url",
  "row.primary_color",
  "row.secondary_color",
  "row.theme_id",
  "row.hero_title",
  "row.show_reservation",
]) {
  assert.match(
    adminAdapter,
    new RegExp(
      property.replace(".", "\\."),
      "u",
    ),
  );
}
console.log("✓ el panel preserva todos los campos del negocio");

assert.match(
  adminAdapter,
  /defaults\.autoConfirmReservations/u,
);
assert.doesNotMatch(
  adminAdapter,
  /row\.auto_confirm_reservations/u,
);
assert.match(
  reservationsWriteMigration,
  /when rule_row\.requires_confirmation[\s\S]+then 'pending'[\s\S]+else 'confirmed'/u,
);
assert.match(
  reservationsWriteMigration,
  /when rule_row\.requires_confirmation[\s\S]+then null[\s\S]+else now\(\)/u,
);
console.log("✓ auto confirm depende de reglas y falla en pendiente");

assert.match(
  adapter,
  /setSupabaseBusinessStatus[\s\S]+updated_at: nowIso\(\)/u,
);
assert.doesNotMatch(
  adapter,
  /google_maps_embed_url|public_template_id/u,
);
console.log("✓ cambios de estado usan un update mínimo");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:business-schema-contract"],
  "node scripts/business-schema-contract-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:business-schema-contract/u,
);
console.log("✓ la regresión forma parte del QA");

for (const file of requiredFiles) {
  const content = await readFile(file, "utf8");

  for (const [index, line] of content
    .split(/\r?\n/u)
    .entries()) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${file}, línea ${index + 1}`,
    );
  }
}
console.log("✓ archivos nuevos sin whitespace accidental");

console.log(
  "Todos los casos del contrato businesses pasaron (10).",
);
