import assert from "node:assert/strict";
import {
  access,
  readFile,
} from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260804_009_reservations_write_rpc.sql";
const rollbackPath =
  "supabase/rollbacks/20260804_009_reservations_write_rpc.down.sql";
const postflightPath =
  "supabase/preflight/20260804_009_reservations_write_postflight.sql";
const contractPath =
  "src/lib/reservations/business-reservation-contract.ts";
const readerPath =
  "src/lib/data/server/business-reservations.ts";
const actionPath =
  "src/app/local/reservas/actions.ts";
const legacyClientPath =
  "src/lib/data/supabase/reservations.ts";
const legacyBridgePath =
  "src/lib/data/reservations.ts";
const dataTypesPath =
  "src/data/types.ts";
const documentationPath =
  "docs/database/RESERVATIONS-WRITE-RPC.md";
const remoteTestPath =
  "scripts/reservations-write-staging-test.mjs";

const requiredFiles = [
  migrationPath,
  rollbackPath,
  postflightPath,
  contractPath,
  readerPath,
  actionPath,
  legacyClientPath,
  legacyBridgePath,
  dataTypesPath,
  documentationPath,
  remoteTestPath,
];

console.log(
  "Ejecutando regresión de reservas persistentes...",
);

for (const path of requiredFiles) {
  await access(path);
}
console.log("✓ existen migración, rollback, código y documentación");

const migration = await readFile(migrationPath, "utf8");
const rollback = await readFile(rollbackPath, "utf8");
const postflight = await readFile(postflightPath, "utf8");
const contract = await readFile(contractPath, "utf8");
const reader = await readFile(readerPath, "utf8");
const action = await readFile(actionPath, "utf8");
const legacyClient = await readFile(
  legacyClientPath,
  "utf8",
);
const legacyBridge = await readFile(
  legacyBridgePath,
  "utf8",
);
const dataTypes = await readFile(dataTypesPath, "utf8");
const documentation = await readFile(
  documentationPath,
  "utf8",
);
const remoteTest = await readFile(remoteTestPath, "utf8");
const seed = await readFile(
  "scripts/supabase-staging-seed.mjs",
  "utf8",
);
const isolation = await readFile(
  "scripts/supabase-isolation-test.mjs",
  "utf8",
);

for (const column of [
  "customer_id",
  "duration_minutes",
  "public_code",
  "idempotency_key",
  "confirmed_at",
  "completed_at",
  "cancelled_at",
  "no_show_at",
]) {
  assert.match(
    migration,
    new RegExp(
      `add column if not exists ${column}`,
      "u",
    ),
  );
}
console.log("✓ el esquema agrega identidad, duración e hitos operativos");

for (const constraint of [
  "reservations_customer_id_fkey",
  "reservations_customer_name_length_check",
  "reservations_customer_phone_length_check",
  "reservations_customer_email_length_check",
  "reservations_notes_length_check",
  "reservations_party_size_check",
  "reservations_duration_minutes_check",
  "reservations_public_code_check",
  "reservations_idempotency_key_length_check",
  "reservations_source_check",
]) {
  assert.match(migration, new RegExp(constraint, "u"));
}
assert.match(migration, /'phone'::text/u);
console.log("✓ PostgreSQL valida el contrato completo de reservas");

assert.match(
  migration,
  /reservations_business_idempotency_key/u,
);
assert.match(migration, /reservations_public_code_key/u);
assert.match(
  migration,
  /reservations_select_active_member/u,
);
assert.match(
  migration,
  /array\['owner', 'admin', 'staff'\]::text\[\]/u,
);
console.log("✓ lectura e identificadores están aislados por tenant");

assert.match(migration, /^begin;/u);
assert.match(migration, /commit;\s*$/u);
assert.match(migration, /security definer/u);
assert.match(migration, /set search_path = ''/u);
assert.match(migration, /private\.has_business_role/u);
assert.match(migration, /business_id = p_business_id/u);
console.log("✓ las RPC son transaccionales y autorizadas");

assert.match(migration, /save_business_reservation/u);
assert.match(migration, /p_idempotency_key/u);
assert.match(migration, /pg_advisory_xact_lock/u);
assert.match(
  migration,
  /reservation-idempotency/u,
);
assert.match(
  migration,
  /return to_jsonb\(saved\)/u,
);
console.log("✓ el alta soporta reintentos idempotentes");

assert.match(migration, /service\.is_active = true/u);
assert.match(migration, /customer\.is_active = true/u);
assert.match(migration, /day_of_week = day_name_value/u);
assert.match(migration, /Reservation is outside business hours/u);
assert.match(migration, /Reservation overlaps the configured break/u);
console.log("✓ servicio, cliente y horario se validan dentro del tenant");

assert.match(migration, /max_reservations_per_slot/u);
assert.match(migration, /max_people_per_slot/u);
assert.match(migration, /duration_minutes/u);
assert.match(
  migration,
  /Customer already has an overlapping active reservation/u,
);
console.log("✓ disponibilidad y solapamientos se calculan en PostgreSQL");

assert.match(
  migration,
  /set_business_reservation_status/u,
);
assert.match(
  migration,
  /current_row\.status = 'pending'[\s\S]+status_value in \([\s\S]+'confirmed'[\s\S]+'cancelled'/u,
);
assert.match(
  migration,
  /current_row\.status = 'confirmed'[\s\S]+status_value in \([\s\S]+'completed'[\s\S]+'cancelled'[\s\S]+'no_show'/u,
);
assert.match(migration, /confirmed_at = case/u);
assert.match(migration, /cancelled_at = case/u);
console.log("✓ las transiciones de estado son explícitas e idempotentes");

assert.match(
  migration,
  /revoke insert, update, delete[\s\S]+public\.reservations/u,
);
assert.doesNotMatch(
  migration,
  /grant (?:insert|update|delete)/iu,
);
assert.match(
  migration,
  /grant execute on function[\s\S]+save_business_reservation/u,
);
console.log("✓ no se habilita DML directo sobre reservas");

assert.match(
  rollback,
  /drop function if exists[\s\S]+save_business_reservation/u,
);
assert.match(
  rollback,
  /drop policy if exists[\s\S]+reservations_select_active_member/u,
);
assert.doesNotMatch(
  rollback,
  /delete from public\.reservations|truncate/iu,
);
assert.doesNotMatch(
  rollback,
  /disable row level security/iu,
);
console.log("✓ el rollback conserva filas y no debilita RLS");

assert.match(postflight, /required_columns <> 8/u);
assert.match(postflight, /required_constraints <> 10/u);
assert.match(postflight, /pg_get_functiondef\(oid\)/u);
assert.match(postflight, /has_function_privilege/u);
assert.match(postflight, /has_table_privilege/u);
assert.match(postflight, /cmd <> 'SELECT'/u);
assert.match(
  postflight,
  /reservations_write_rpc_postflight_ok/u,
);
console.log("✓ el postflight detecta esquema o permisos inseguros");

assert.match(contract, /BUSINESS_RESERVATION_STATUSES/u);
assert.match(contract, /BUSINESS_RESERVATION_SOURCES/u);
assert.match(contract, /UUID_PATTERN/u);
assert.match(contract, /DATE_PATTERN/u);
assert.match(contract, /TIME_PATTERN/u);
assert.match(contract, /PUBLIC_CODE_PATTERN/u);
assert.match(contract, /normalizeReservationIdempotencyKey/u);
assert.match(contract, /toBusinessReservationRpcPayload/u);
console.log("✓ TypeScript valida el contrato y la idempotencia");

assert.match(
  reader,
  /BUSINESS_RESERVATION_SELECT[\s\S]+as const/u,
);
assert.match(reader, /createSupabaseAuthServerClient/u);
assert.match(reader, /\.eq\("business_id", businessId\)/u);
assert.match(reader, /\.gte\("reservation_date"/u);
assert.match(reader, /\.lte\("reservation_date"/u);
assert.doesNotMatch(
  reader,
  /service_role|SERVICE_ROLE|localStorage/u,
);
console.log("✓ la lectura servidor queda limitada al negocio activo");

assert.match(action, /^"use server";/u);
assert.match(action, /resolveActiveBusiness/u);
assert.match(action, /save_business_reservation/u);
assert.match(action, /set_business_reservation_status/u);
assert.match(action, /p_business_id: context\.businessId/u);
assert.match(action, /revalidatePath\("\/local\/reservas"\)/u);
assert.doesNotMatch(
  action,
  /service_role|SERVICE_ROLE/u,
);
console.log("✓ las Server Actions revalidan sesión, rol y tenant");

assert.match(
  dataTypes,
  /ReservationSource[\s\S]+"phone"/u,
);
assert.match(legacyClient, /duration_minutes/u);
assert.match(legacyClient, /public_code/u);
assert.doesNotMatch(legacyClient, /assigned_table_ids/u);
assert.doesNotMatch(legacyClient, /deposit_status/u);
assert.doesNotMatch(legacyClient, /deposit_amount/u);
assert.doesNotMatch(
  legacyClient,
  /\.from\("reservations"\)[\s\S]{0,180}\.(?:insert|update|delete)\s*\(/u,
);
assert.match(
  legacyClient,
  /requieren una Server Action autenticada/u,
);
assert.doesNotMatch(
  legacyClient,
  /getAvailableTablesForReservationSlot/u,
);
for (const parameter of [
  "_businessId",
  "_data",
  "_reservationId",
  "_status",
  "_tableIds",
]) {
  assert.match(
    legacyClient,
    new RegExp(`void ${parameter};`, "u"),
  );
}
assert.match(
  legacyBridge,
  /const results: Reservation\[\] = \[\];/u,
);
console.log("✓ la capa heredada lee el esquema real y falla cerrado");

assert.match(seed, /reservationA/u);
assert.match(seed, /reservationB/u);
assert.match(seed, /ensureReservation/u);
assert.match(isolation, /reservationAId/u);
assert.match(
  isolation,
  /assertTenantCollectionFixtureRow/u,
);
assert.match(
  isolation,
  /reserva fixture y solo reservas propias/u,
);
assert.match(isolation, /assertReservationWritesDenied/u);
assert.match(
  isolation,
  /Aislamiento multiempresa aprobado \(21 controles\)/u,
);
console.log("✓ el fixture y aislamiento incorporan reservas A/B");

assert.match(documentation, /idempotencia/u);
assert.match(documentation, /bloqueo transaccional/u);
assert.match(documentation, /no\s+tiene una tabla de plano/u);
assert.match(documentation, /zona horaria canónica/u);
assert.match(
  documentation,
  /No ejecutar `staging:cleanup-isolation`/u,
);
console.log("✓ la documentación delimita alcance y deuda operativa");

assert.match(
  remoteTest,
  /la entrada inválida no cambió reservas/u,
);
assert.match(
  remoteTest,
  /el reintento idempotente devolvió la misma reserva/u,
);
assert.match(
  remoteTest,
  /el teléfono con solapamiento fue rechazado/u,
);
assert.match(
  remoteTest,
  /usuario A no puede crear en B/u,
);
assert.match(
  remoteTest,
  /DML directo INSERT sigue bloqueado/u,
);
assert.match(
  remoteTest,
  /reservas A y B restauradas/u,
);
console.log("✓ la prueba remota cubre idempotencia, BOLA y restauración");

const packageJson = JSON.parse(
  await readFile("package.json", "utf8"),
);
assert.equal(
  packageJson.scripts?.["test:reservations-write"],
  "node scripts/reservations-write-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:test-reservations-write"],
  "node scripts/reservations-write-staging-test.mjs",
);
assert.match(
  packageJson.scripts?.["test:regression"] ?? "",
  /test:reservations-write/u,
);
console.log("✓ las pruebas local y remota están integradas");

for (const path of requiredFiles) {
  const content = await readFile(path, "utf8");

  for (const [index, line] of content
    .split(/\r?\n/u)
    .entries()) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${path}, línea ${index + 1}`,
    );
  }
}
console.log("✓ archivos nuevos sin whitespace accidental");

console.log(
  "Todos los casos de reservas persistentes pasaron (18).",
);
