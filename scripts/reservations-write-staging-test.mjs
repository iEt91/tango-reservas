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
  throw new Error(
    "El fixture no pertenece al staging actual.",
  );
}

for (const key of [
  "serviceAId",
  "serviceBId",
  "customerAId",
  "customerBId",
  "reservationAId",
  "reservationBId",
]) {
  if (!fixture[key]) {
    throw new Error(
      `Falta ${key}. Ejecuta staging:seed-isolation después de aplicar la migración 009.`,
    );
  }
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

function nextWeekday(targetDay) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);

  const distance =
    (targetDay - date.getUTCDay() + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + distance);

  return date.toISOString().slice(0, 10);
}

const admin = client(context.serverSecret);
const userA = client();
const userB = client();
const anonymous = client();
const reservationDate = nextWeekday(1);
const idempotencyKey =
  `e18-reservation-${Date.now()}`;

const reservationPayload = {
  service_id: fixture.serviceAId,
  customer_id: fixture.customerAId,
  customer_name: "E18 Isolation Reservation",
  customer_phone: "+54 11 5555 0180",
  customer_email: "e18.reservation@example.com",
  reservation_date: reservationDate,
  reservation_time: "10:00",
  party_size: 2,
  notes: "Temporary secure reservation test",
  source: "manual",
  duration_minutes: 60,
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

async function snapshotReservations(businessId) {
  const { data, error } = await admin
    .from("reservations")
    .select("*")
    .eq("business_id", businessId)
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function restoreReservations(snapshot, createdReservationId) {
  if (snapshot.length > 0) {
    const { error: restoreError } = await admin
      .from("reservations")
      .upsert(snapshot, { onConflict: "id" });

    if (restoreError) {
      throw restoreError;
    }
  }

  if (!createdReservationId) {
    return;
  }

  const { error: deleteError } = await admin
    .from("reservations")
    .delete()
    .eq("id", createdReservationId);

  if (deleteError) {
    throw deleteError;
  }
}

console.log(
  "Ejecutando escritura segura de reservas en staging...",
);

const reservationsA = await snapshotReservations(
  fixture.businessAId,
);
const reservationsB = await snapshotReservations(
  fixture.businessBId,
);
let createdReservationId = null;

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
    anonymous.rpc("save_business_reservation", {
      p_business_id: fixture.businessAId,
      p_reservation_id: null,
      p_reservation: reservationPayload,
      p_idempotency_key: idempotencyKey,
    }),
    "anon no debe ejecutar la RPC",
  );
  console.log("✓ anon no puede ejecutar la RPC");

  await expectFailure(
    userA.rpc("save_business_reservation", {
      p_business_id: fixture.businessAId,
      p_reservation_id: null,
      p_reservation: {
        ...reservationPayload,
        customer_name: "",
      },
      p_idempotency_key: `${idempotencyKey}-invalid`,
    }),
    "el nombre vacío debe ser rechazado",
  );

  assert.deepEqual(
    await snapshotReservations(fixture.businessAId),
    reservationsA,
  );
  console.log("✓ la entrada inválida no cambió reservas");

  const { data: created, error: createError } =
    await userA.rpc("save_business_reservation", {
      p_business_id: fixture.businessAId,
      p_reservation_id: null,
      p_reservation: reservationPayload,
      p_idempotency_key: idempotencyKey,
    });

  if (createError) {
    throw createError;
  }

  assert.equal(created.business_id, fixture.businessAId);
  assert.equal(created.service_id, fixture.serviceAId);
  assert.equal(created.customer_id, fixture.customerAId);
  assert.equal(created.customer_phone, "541155550180");
  assert.equal(created.status, "pending");
  assert.match(created.public_code, /^RES-[A-Z0-9]{12}$/u);
  createdReservationId = created.id;
  console.log("✓ usuario A creó una reserva con contrato exacto");

  const { data: retried, error: retryError } =
    await userA.rpc("save_business_reservation", {
      p_business_id: fixture.businessAId,
      p_reservation_id: null,
      p_reservation: reservationPayload,
      p_idempotency_key: idempotencyKey,
    });

  if (retryError) {
    throw retryError;
  }

  assert.equal(retried.id, created.id);
  assert.equal(
    (await snapshotReservations(fixture.businessAId)).length,
    reservationsA.length + 1,
  );
  console.log("✓ el reintento idempotente devolvió la misma reserva");

  await expectFailure(
    userA.rpc("save_business_reservation", {
      p_business_id: fixture.businessAId,
      p_reservation_id: null,
      p_reservation: {
        ...reservationPayload,
        customer_name: "Overlapping duplicate",
        reservation_time: "10:30",
      },
      p_idempotency_key: `${idempotencyKey}-overlap`,
    }),
    "el teléfono superpuesto debe ser rechazado",
  );
  console.log("✓ el teléfono con solapamiento fue rechazado");

  await expectFailure(
    userA.rpc("save_business_reservation", {
      p_business_id: fixture.businessAId,
      p_reservation_id: null,
      p_reservation: {
        ...reservationPayload,
        customer_name: "Capacity overflow",
        customer_phone: "+54 11 5555 0181",
        customer_email: "capacity@example.com",
        party_size: 11,
        reservation_time: "12:00",
      },
      p_idempotency_key: `${idempotencyKey}-capacity`,
    }),
    "la capacidad del servicio debe ser respetada",
  );
  console.log("✓ la capacidad del servicio fue respetada");

  const { data: updated, error: updateError } =
    await userA.rpc("save_business_reservation", {
      p_business_id: fixture.businessAId,
      p_reservation_id: created.id,
      p_reservation: {
        ...reservationPayload,
        customer_name: "E18 Isolation Reservation Updated",
        customer_phone: "+54 11 5555 0182",
        customer_email: "e18.updated@example.com",
        reservation_time: "11:30",
        party_size: 3,
        notes: "Updated safely",
      },
      p_idempotency_key: null,
    });

  if (updateError) {
    throw updateError;
  }

  assert.equal(updated.id, created.id);
  assert.equal(
    updated.customer_name,
    "E18 Isolation Reservation Updated",
  );
  assert.equal(updated.customer_phone, "541155550182");
  assert.equal(updated.party_size, 3);
  console.log("✓ usuario A actualizó solo su reserva");

  await expectFailure(
    userA.rpc("save_business_reservation", {
      p_business_id: fixture.businessBId,
      p_reservation_id: null,
      p_reservation: {
        ...reservationPayload,
        service_id: fixture.serviceBId,
        customer_id: fixture.customerBId,
      },
      p_idempotency_key: `${idempotencyKey}-bola-create`,
    }),
    "usuario A no puede crear en B",
  );
  console.log("✓ usuario A no puede crear en B");

  await expectFailure(
    userB.rpc("save_business_reservation", {
      p_business_id: fixture.businessAId,
      p_reservation_id: created.id,
      p_reservation: reservationPayload,
      p_idempotency_key: null,
    }),
    "usuario B no puede actualizar A",
  );
  console.log("✓ usuario B no puede actualizar A");

  await expectFailure(
    userA.from("reservations").insert({
      business_id: fixture.businessAId,
      service_id: fixture.serviceAId,
      customer_name: "Blocked insert",
      customer_phone: "541100000180",
      reservation_date: reservationDate,
      reservation_time: "13:00",
      party_size: 2,
      source: "manual",
    }),
    "DML directo INSERT sigue bloqueado",
  );
  console.log("✓ DML directo INSERT sigue bloqueado");

  await expectFailure(
    userA.from("reservations").update({
      customer_name: "Blocked update",
    }).eq("id", created.id),
    "DML directo UPDATE sigue bloqueado",
  );
  console.log("✓ DML directo UPDATE sigue bloqueado");

  await expectFailure(
    userA.from("reservations").delete().eq("id", created.id),
    "DML directo DELETE sigue bloqueado",
  );
  console.log("✓ DML directo DELETE sigue bloqueado");

  const { data: confirmed, error: confirmError } =
    await userA.rpc("set_business_reservation_status", {
      p_business_id: fixture.businessAId,
      p_reservation_id: created.id,
      p_status: "confirmed",
    });

  if (confirmError) {
    throw confirmError;
  }

  assert.equal(confirmed.status, "confirmed");
  assert.ok(confirmed.confirmed_at);
  console.log("✓ la transición pendiente a confirmada fue válida");

  const { data: cancelled, error: cancelError } =
    await userA.rpc("set_business_reservation_status", {
      p_business_id: fixture.businessAId,
      p_reservation_id: created.id,
      p_status: "cancelled",
    });

  if (cancelError) {
    throw cancelError;
  }

  assert.equal(cancelled.status, "cancelled");
  assert.ok(cancelled.cancelled_at);

  await expectFailure(
    userA.rpc("set_business_reservation_status", {
      p_business_id: fixture.businessAId,
      p_reservation_id: created.id,
      p_status: "completed",
    }),
    "una reserva cancelada no debe reabrirse",
  );
  console.log("✓ las reservas terminales rechazaron nuevas transiciones");

  assert.deepEqual(
    await snapshotReservations(fixture.businessBId),
    reservationsB,
  );
  console.log("✓ las operaciones de A no modificaron B");
} finally {
  await restoreReservations(reservationsA, createdReservationId);
  await restoreReservations(reservationsB, null);
  console.log("✓ reservas A y B restauradas");
  await userA.auth.signOut();
  await userB.auth.signOut();
  console.log("✓ las sesiones fueron cerradas");
}

console.log(
  "Escritura segura de reservas aprobada (18 controles).",
);
