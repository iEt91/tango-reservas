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

const payload = [
  ["monday", false, "12:00", "00:00", null, null],
  ["tuesday", true, "19:00", "00:30", null, null],
  ["wednesday", true, "12:00", "23:00", "16:00", "19:00"],
  ["thursday", true, "19:00", "01:00", null, null],
  ["friday", true, "19:00", "02:00", null, null],
  ["saturday", true, "19:00", "02:00", null, null],
  ["sunday", true, "12:00", "16:00", null, null],
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

async function snapshotHours(businessId) {
  const { data, error } = await admin
    .from("business_hours")
    .select("*")
    .eq("business_id", businessId)
    .order("day_of_week", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function restoreHours(businessId, snapshot) {
  const { error: deleteError } = await admin
    .from("business_hours")
    .delete()
    .eq("business_id", businessId);

  if (deleteError) {
    throw deleteError;
  }

  if (snapshot.length > 0) {
    const { error: insertError } = await admin
      .from("business_hours")
      .insert(snapshot);

    if (insertError) {
      throw insertError;
    }
  }
}

console.log("Ejecutando escritura real de horarios en staging...");

const snapshotA = await snapshotHours(fixture.businessAId);
const snapshotB = await snapshotHours(fixture.businessBId);

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
    anonymous.rpc("replace_business_hours", {
      p_business_id: fixture.businessAId,
      p_hours: payload,
    }),
    "anon no debe ejecutar la RPC",
  );
  console.log("✓ anon no puede ejecutar la RPC");

  const { data: saved, error: saveError } = await userA.rpc(
    "replace_business_hours",
    {
      p_business_id: fixture.businessAId,
      p_hours: payload,
    },
  );

  if (saveError) {
    throw saveError;
  }

  assert.equal(saved.length, 7);
  console.log("✓ owner A guardó exactamente siete días");

  const { data: ownRows, error: ownReadError } = await userA
    .from("business_hours")
    .select(
      "day_of_week, is_open, open_time, close_time, break_start_time, break_end_time",
    )
    .eq("business_id", fixture.businessAId);

  if (ownReadError) {
    throw ownReadError;
  }

  assert.equal(ownRows.length, 7);
  const splitDay = ownRows.find(
    (row) => row.day_of_week === "wednesday",
  );
  assert.equal(splitDay.break_start_time.slice(0, 5), "16:00");
  assert.equal(splitDay.break_end_time.slice(0, 5), "19:00");
  console.log("✓ un día con dos tramos conserva la pausa");

  await expectFailure(
    userA.rpc("replace_business_hours", {
      p_business_id: fixture.businessBId,
      p_hours: payload,
    }),
    "usuario A no puede escribir B",
  );
  console.log("✓ usuario A no puede escribir B");

  await expectFailure(
    userB.rpc("replace_business_hours", {
      p_business_id: fixture.businessAId,
      p_hours: payload,
    }),
    "usuario B no puede escribir A",
  );
  console.log("✓ usuario B no puede escribir A");

  await expectFailure(
    userA.from("business_hours").insert({
      business_id: fixture.businessAId,
      day_of_week: "monday",
      is_open: true,
      open_time: "09:00",
      close_time: "18:00",
    }),
    "DML directo sigue bloqueado",
  );
  console.log("✓ DML directo sigue bloqueado");

  const { data: rowsB, error: readBError } = await admin
    .from("business_hours")
    .select("*")
    .eq("business_id", fixture.businessBId)
    .order("day_of_week", { ascending: true });

  if (readBError) {
    throw readBError;
  }

  assert.deepEqual(rowsB, snapshotB);
  console.log("✓ la escritura de A no modificó B");
} finally {
  await restoreHours(fixture.businessAId, snapshotA);
  console.log("✓ business A restaurado");
  await restoreHours(fixture.businessBId, snapshotB);
  console.log("✓ business B restaurado");
  await userA.auth.signOut();
  await userB.auth.signOut();
  console.log("✓ las sesiones fueron cerradas");
}

console.log(
  "Escritura segura de horarios aprobada (11 controles).",
);
