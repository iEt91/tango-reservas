import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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

async function signIn(target, email, password) {
  const { error } = await target.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

function nextWeekday(targetDay) {
  const now = new Date();
  const days = (targetDay - now.getDay() + 7) % 7 || 7;
  const result = new Date(Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + days,
  ));
  return result.toISOString().slice(0, 10);
}

const admin = client(context.serverSecret);
const anonymous = client();
const userA = client();
const userB = client();
const suffix = randomUUID().slice(0, 8);
const reservationDate = nextWeekday(1);
const requestKeys = [];
const fingerprints = [];

await signIn(userA, context.userAEmail, context.userAPassword);
await signIn(userB, context.userBEmail, context.userBPassword);

function payload(overrides = {}) {
  const requestKey = overrides.p_request_key ?? `web:${randomUUID()}`;
  const fingerprint = overrides.p_fingerprint ?? `e39-${randomUUID()}`;
  requestKeys.push(requestKey);
  fingerprints.push(fingerprint);
  return {
    p_slug: fixture.businessASlug,
    p_client_name: `STAGING Reserva Pública ${suffix}`,
    p_client_phone: `54911${Date.now().toString().slice(-8)}`,
    p_client_email: `staging-${suffix}@example.com`,
    p_reservation_date: reservationDate,
    p_reservation_time: "10:00:00",
    p_party_size: 2,
    p_note: "Fixture E2E público identificable",
    p_request_key: requestKey,
    p_fingerprint: fingerprint,
    ...overrides,
  };
}

async function createReservation(input) {
  return admin.rpc("service_create_public_reservation", input);
}

try {
  const anonAttempt = await anonymous.rpc(
    "service_create_public_reservation",
    payload(),
  );
  assert.ok(anonAttempt.error, "anon no debe ejecutar la escritura privilegiada");
  console.log("✓ anon no ejecuta la RPC de escritura");

  const invalidEmail = await createReservation(payload({
    p_client_email: "correo-invalido",
  }));
  assert.equal(invalidEmail.error?.code, "22023");
  console.log("✓ correo inválido es rechazado");

  const invalidDate = await createReservation(payload({
    p_reservation_date: "2000-01-01",
  }));
  assert.ok(invalidDate.error, "una fecha pasada debe rechazarse");
  console.log("✓ fecha fuera de ventana es rechazada");

  const invalidBusiness = await createReservation(payload({
    p_slug: `missing-${suffix}`,
  }));
  assert.equal(invalidBusiness.error?.code, "P0002");
  console.log("✓ slug inexistente no crea ni enumera negocios");

  const canonical = payload({
    p_client_phone: `54912${Date.now().toString().slice(-8)}`,
  });
  const first = await createReservation(canonical);
  if (first.error) throw first.error;
  assert.match(first.data.reservationCode, /^RES-[A-Z0-9]{12}$/u);
  assert.equal(first.data.date, reservationDate);
  assert.equal(first.data.people, 2);

  const replay = await createReservation(canonical);
  if (replay.error) throw replay.error;
  assert.deepEqual(replay.data, first.data);
  console.log("✓ creación pública persiste y el reintento es idempotente");

  const { data: persisted, error: persistedError } = await admin
    .from("reservations")
    .select("id, business_id, source, status, customer_name, customer_phone, idempotency_key")
    .eq("business_id", fixture.businessAId)
    .eq("idempotency_key", canonical.p_request_key)
    .single();
  if (persistedError) throw persistedError;
  assert.equal(persisted.business_id, fixture.businessAId);
  assert.equal(persisted.source, "web");
  assert.equal(persisted.customer_name, canonical.p_client_name);

  const visibleA = await userA
    .from("reservations")
    .select("id")
    .eq("id", persisted.id);
  const hiddenB = await userB
    .from("reservations")
    .select("id")
    .eq("id", persisted.id);
  assert.equal(visibleA.error, null);
  assert.equal(visibleA.data.length, 1);
  assert.equal(hiddenB.error, null);
  assert.equal(hiddenB.data.length, 0);
  console.log("✓ panel A ve la reserva persistida y negocio B no puede verla");

  const doubleKey = `web:${randomUUID()}`;
  const doubleFingerprint = `e39-double-${randomUUID()}`;
  const doublePayload = payload({
    p_client_name: `STAGING Doble Click ${suffix}`,
    p_client_phone: `54913${Date.now().toString().slice(-8)}`,
    p_reservation_time: "11:00:00",
    p_request_key: doubleKey,
    p_fingerprint: doubleFingerprint,
  });
  const doubleResults = await Promise.all([
    createReservation(doublePayload),
    createReservation(doublePayload),
  ]);
  assert.equal(doubleResults[0].error, null);
  assert.equal(doubleResults[1].error, null);
  assert.deepEqual(doubleResults[0].data, doubleResults[1].data);
  console.log("✓ doble submit simultáneo crea una sola reserva lógica");

  const collisionPhone = `54914${Date.now().toString().slice(-8)}`;
  const collisionResults = await Promise.all([
    createReservation(payload({
      p_client_name: `STAGING Concurrente 1 ${suffix}`,
      p_client_phone: collisionPhone,
      p_reservation_time: "12:00:00",
    })),
    createReservation(payload({
      p_client_name: `STAGING Concurrente 2 ${suffix}`,
      p_client_phone: collisionPhone,
      p_reservation_time: "12:00:00",
    })),
  ]);
  assert.equal(
    collisionResults.filter((result) => result.error === null).length,
    1,
  );
  assert.equal(
    collisionResults.filter((result) => result.error?.code === "P0001").length,
    1,
  );
  console.log("✓ concurrencia evita reservas solapadas del mismo cliente");

  console.log("PUBLIC_RESERVATION_STAGING_PASS");
} finally {
  if (requestKeys.length > 0) {
    await admin
      .from("reservations")
      .delete()
      .eq("business_id", fixture.businessAId)
      .in("idempotency_key", [...new Set(requestKeys)]);
  }
  if (fingerprints.length > 0) {
    await admin
      .from("business_public_request_limits")
      .delete()
      .eq("business_id", fixture.businessAId)
      .in("scope_hash", [...new Set(fingerprints)]);
  }
  await Promise.allSettled([
    userA.auth.signOut(),
    userB.auth.signOut(),
  ]);
  console.log("✓ fixtures públicos creados por esta prueba fueron limpiados");
}
