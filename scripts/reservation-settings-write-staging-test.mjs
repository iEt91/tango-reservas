import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { getStagingContext } from "./lib/staging-context.mjs";

const loaded = await loadLocalEnv();

if (!loaded) {
  throw new Error("No existe .env.staging.local.");
}

const context = getStagingContext({
  requireServerSecret: true,
  requireTestUsers: true,
});
const fixture = JSON.parse(
  await readFile(".tango/staging-isolation.json", "utf8"),
);

if (fixture.projectRef !== context.stagingProjectRef) {
  throw new Error("El fixture no pertenece al staging actual.");
}

function client(key = context.publicKey) {
  return createClient(context.url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

const admin = client(context.serverSecret);
const userA = client();
const userB = client();
const anonymous = client();

const hoursPayload = [
  ["monday", true, "10:00", "18:00", null, null],
  ["tuesday", true, "17:00", "02:00", null, null],
  ["wednesday", true, "12:00", "23:00", "16:00", "19:00"],
  ["thursday", true, "19:00", "01:00", null, null],
  ["friday", true, "19:00", "02:00", null, null],
  ["saturday", true, "19:00", "02:00", null, null],
  ["sunday", false, "12:00", "16:00", null, null],
].map(([
  day_of_week,
  is_open,
  open_time,
  close_time,
  break_start_time,
  break_end_time,
]) => ({
  day_of_week,
  is_open,
  open_time,
  close_time,
  break_start_time,
  break_end_time,
}));

const settingsPayload = {
  reservations_enabled: false,
  default_reservation_duration_minutes: 150,
  requires_confirmation: false,
  min_notice_minutes: 90,
  max_days_ahead: 45,
  max_people_per_slot: 72,
  allow_reservations_without_table: true,
  auto_assign_reservation_tables: false,
  allow_table_combinations: false,
};

async function signIn(target, email, password) {
  const { error } = await target.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }
}

async function expectFailure(promise, label) {
  const { error } = await promise;
  assert.ok(error, label);
  return error;
}

async function snapshotTable(table, businessId) {
  const query = admin
    .from(table)
    .select("*")
    .eq("business_id", businessId);
  const { data, error } = table === "business_hours"
    ? await query.order("day_of_week", { ascending: true })
    : await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function restoreTable(table, businessId, snapshot) {
  const { error: deleteError } = await admin
    .from(table)
    .delete()
    .eq("business_id", businessId);

  if (deleteError) {
    throw deleteError;
  }

  if (snapshot.length > 0) {
    const { error: insertError } = await admin
      .from(table)
      .insert(snapshot);

    if (insertError) {
      throw insertError;
    }
  }
}

console.log("Ejecutando reglas persistentes en staging...");

const hoursA = await snapshotTable(
  "business_hours",
  fixture.businessAId,
);
const hoursB = await snapshotTable(
  "business_hours",
  fixture.businessBId,
);
const rulesA = await snapshotTable(
  "reservation_rules",
  fixture.businessAId,
);
const rulesB = await snapshotTable(
  "reservation_rules",
  fixture.businessBId,
);

try {
  await signIn(
    userA,
    context.userAEmail,
    context.userAPassword,
  );
  await signIn(
    userB,
    context.userBEmail,
    context.userBPassword,
  );
  console.log("✓ ambos usuarios se autenticaron");

  await expectFailure(
    anonymous.rpc("save_reservation_configuration", {
      p_business_id: fixture.businessAId,
      p_hours: hoursPayload,
      p_settings: settingsPayload,
    }),
    "anon no debe ejecutar la RPC",
  );
  console.log("✓ anon no puede ejecutar la RPC");

  await expectFailure(
    userA.rpc("save_reservation_configuration", {
      p_business_id: fixture.businessAId,
      p_hours: hoursPayload,
      p_settings: {
        ...settingsPayload,
        max_people_per_slot: 0,
      },
    }),
    "la capacidad inválida debe abortar toda la transacción",
  );

  assert.deepEqual(
    await snapshotTable("business_hours", fixture.businessAId),
    hoursA,
  );
  assert.deepEqual(
    await snapshotTable("reservation_rules", fixture.businessAId),
    rulesA,
  );
  console.log("✓ la transacción inválida no cambió horarios ni reglas");

  const { data: saved, error: saveError } = await userA.rpc(
    "save_reservation_configuration",
    {
      p_business_id: fixture.businessAId,
      p_hours: hoursPayload,
      p_settings: settingsPayload,
    },
  );

  if (saveError) {
    throw saveError;
  }

  assert.equal(saved.business_hours.length, 7);
  assert.equal(
    saved.reservation_settings.max_people_per_slot,
    72,
  );
  console.log("✓ owner A guardó horarios y reglas en una operación");

  const { data: ownRules, error: ownRulesError } = await userA
    .from("reservation_rules")
    .select(
      "reservations_enabled, default_reservation_duration_minutes, requires_confirmation, min_notice_minutes, max_days_ahead, max_people_per_slot, allow_reservations_without_table, auto_assign_reservation_tables, allow_table_combinations",
    )
    .eq("business_id", fixture.businessAId)
    .single();

  if (ownRulesError) {
    throw ownRulesError;
  }

  assert.equal(ownRules.reservations_enabled, false);
  assert.equal(
    ownRules.default_reservation_duration_minutes,
    150,
  );
  assert.equal(ownRules.requires_confirmation, false);
  assert.equal(ownRules.min_notice_minutes, 90);
  assert.equal(ownRules.max_days_ahead, 45);
  assert.equal(ownRules.max_people_per_slot, 72);
  console.log("✓ las reglas remotas conservan el contrato exacto");

  await expectFailure(
    userA.rpc("save_reservation_configuration", {
      p_business_id: fixture.businessBId,
      p_hours: hoursPayload,
      p_settings: settingsPayload,
    }),
    "usuario A no puede escribir B",
  );
  console.log("✓ usuario A no puede escribir B");

  await expectFailure(
    userB.rpc("save_reservation_configuration", {
      p_business_id: fixture.businessAId,
      p_hours: hoursPayload,
      p_settings: settingsPayload,
    }),
    "usuario B no puede escribir A",
  );
  console.log("✓ usuario B no puede escribir A");

  await expectFailure(
    userA.from("business_hours").update({
      is_open: false,
    }).eq("business_id", fixture.businessAId),
    "DML directo de horarios sigue bloqueado",
  );
  console.log("✓ DML directo de horarios sigue bloqueado");

  await expectFailure(
    userA.from("reservation_rules").update({
      max_people_per_slot: 1,
    }).eq("business_id", fixture.businessAId),
    "DML directo de reglas sigue bloqueado",
  );
  console.log("✓ DML directo de reglas sigue bloqueado");

  assert.deepEqual(
    await snapshotTable("business_hours", fixture.businessBId),
    hoursB,
  );
  assert.deepEqual(
    await snapshotTable("reservation_rules", fixture.businessBId),
    rulesB,
  );
  console.log("✓ la escritura de A no modificó B");
} finally {
  await restoreTable(
    "business_hours",
    fixture.businessAId,
    hoursA,
  );
  console.log("✓ horarios A restaurados");
  await restoreTable(
    "reservation_rules",
    fixture.businessAId,
    rulesA,
  );
  console.log("✓ reglas A restauradas");
  await restoreTable(
    "business_hours",
    fixture.businessBId,
    hoursB,
  );
  console.log("✓ horarios B restaurados");
  await restoreTable(
    "reservation_rules",
    fixture.businessBId,
    rulesB,
  );
  console.log("✓ reglas B restauradas");
  await userA.auth.signOut();
  await userB.auth.signOut();
  console.log("✓ las sesiones fueron cerradas");
}

console.log(
  "Reglas persistentes aprobadas (15 controles).",
);
