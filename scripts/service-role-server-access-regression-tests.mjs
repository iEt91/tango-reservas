import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260905135030_grant_service_role_server_access.sql";
const source = await readFile(migrationPath, "utf8");

console.log("Verificando acceso server-only de service_role...");

assert.match(source, /grant usage on schema public to service_role/u);
assert.match(
  source,
  /grant all privileges on all tables in schema public to service_role/u,
);
assert.match(
  source,
  /grant all privileges on all sequences in schema public to service_role/u,
);
assert.doesNotMatch(source, /to anon/u);
assert.doesNotMatch(source, /to authenticated/u);

console.log("✓ service_role recibe acceso sólo para servidor");
