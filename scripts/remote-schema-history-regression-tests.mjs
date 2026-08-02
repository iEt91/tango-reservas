import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const initialPath =
  "supabase/migrations/20260802_001_initial_schema_lockdown.sql";
const membersPath =
  "supabase/migrations/20260802_002_business_members_and_rls.sql";

const initial = await readFile(initialPath, "utf8");
const members = await readFile(membersPath, "utf8");

const tables = [
  "businesses",
  "business_profiles",
  "business_sections",
  "business_images",
  "profiles",
  "business_hours",
  "reservation_rules",
  "services",
  "customers",
  "reservations",
];

console.log("Ejecutando regresión del historial remoto...");

for (const table of tables) {
  assert.match(
    initial,
    new RegExp(
      `alter table public\\.${table} enable row level security`,
      "u",
    ),
  );
  assert.match(
    initial,
    new RegExp(
      `alter table public\\.${table} force row level security`,
      "u",
    ),
  );
  assert.match(
    initial,
    new RegExp(
      `revoke all on table public\\.${table} from anon, authenticated`,
      "u",
    ),
  );
}

console.log("✓ las tablas iniciales nacen bloqueadas");

assert.match(
  initial,
  /auth_user_id uuid unique\s+references auth\.users\(id\)/u,
);
assert.match(
  initial,
  /role text not null default 'owner'\s+check \(role in \('owner', 'admin', 'staff'\)\)/u,
);

console.log("✓ profiles referencia Auth y restringe roles");

assert.match(
  members,
  /create schema if not exists private/u,
);
assert.match(
  members,
  /function private\.has_business_role/u,
);
assert.match(
  members,
  /security definer\s+set search_path = ''/u,
);
assert.match(
  members,
  /force row level security/u,
);
assert.match(
  members,
  /grant select on table public\.business_members to authenticated/u,
);
assert.doesNotMatch(
  members,
  /create or replace function public\.has_business_role/u,
);

console.log("✓ membresías usan helper privado y RLS");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);

assert.equal(
  packageJson.scripts?.["test:remote-schema-history"],
  "node scripts/remote-schema-history-regression-tests.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:remote-schema-history/u,
);

console.log("✓ el historial remoto forma parte del QA");
console.log("Todos los casos del historial remoto pasaron (4).");
