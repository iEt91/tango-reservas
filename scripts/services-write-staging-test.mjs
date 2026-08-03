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

const servicePayload = {
  name: "E14 Isolation Service",
  description: "Temporary secure service test",
  duration_minutes: 90,
  capacity: 24,
  price: 12500.5,
  is_active: true,
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

async function snapshotServices(businessId) {
  const { data, error } = await admin
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function restoreServices(businessId, snapshot) {
  const { error: deleteError } = await admin
    .from("services")
    .delete()
    .eq("business_id", businessId);

  if (deleteError) {
    throw deleteError;
  }

  if (snapshot.length > 0) {
    const { error: insertError } = await admin
      .from("services")
      .insert(snapshot);

    if (insertError) {
      throw insertError;
    }
  }
}

console.log("Ejecutando escritura segura de servicios en staging...");

const servicesA = await snapshotServices(fixture.businessAId);
const servicesB = await snapshotServices(fixture.businessBId);

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
    anonymous.rpc("save_business_service", {
      p_business_id: fixture.businessAId,
      p_service_id: null,
      p_service: servicePayload,
    }),
    "anon no debe ejecutar la RPC",
  );
  console.log("✓ anon no puede ejecutar la RPC");

  await expectFailure(
    userA.rpc("save_business_service", {
      p_business_id: fixture.businessAId,
      p_service_id: null,
      p_service: {
        ...servicePayload,
        capacity: 0,
      },
    }),
    "la capacidad inválida debe ser rechazada",
  );

  assert.deepEqual(
    await snapshotServices(fixture.businessAId),
    servicesA,
  );
  console.log("✓ la entrada inválida no cambió servicios");

  const { data: created, error: createError } =
    await userA.rpc("save_business_service", {
      p_business_id: fixture.businessAId,
      p_service_id: null,
      p_service: servicePayload,
    });

  if (createError) {
    throw createError;
  }

  assert.equal(created.business_id, fixture.businessAId);
  assert.equal(created.name, servicePayload.name);
  assert.equal(created.duration_minutes, 90);
  assert.equal(created.capacity, 24);
  assert.equal(Number(created.price), 12500.5);
  console.log("✓ owner A creó un servicio con contrato exacto");

  const { data: updated, error: updateError } =
    await userA.rpc("save_business_service", {
      p_business_id: fixture.businessAId,
      p_service_id: created.id,
      p_service: {
        ...servicePayload,
        name: "E14 Isolation Service Updated",
        duration_minutes: 120,
        capacity: 32,
        price: null,
      },
    });

  if (updateError) {
    throw updateError;
  }

  assert.equal(updated.id, created.id);
  assert.equal(updated.duration_minutes, 120);
  assert.equal(updated.capacity, 32);
  assert.equal(updated.price, null);
  console.log("✓ owner A actualizó solo su servicio");

  await expectFailure(
    userA.rpc("save_business_service", {
      p_business_id: fixture.businessBId,
      p_service_id: null,
      p_service: servicePayload,
    }),
    "usuario A no puede crear en B",
  );
  console.log("✓ usuario A no puede crear en B");

  await expectFailure(
    userB.rpc("save_business_service", {
      p_business_id: fixture.businessAId,
      p_service_id: created.id,
      p_service: servicePayload,
    }),
    "usuario B no puede actualizar A",
  );
  console.log("✓ usuario B no puede actualizar A");

  await expectFailure(
    userA.from("services").insert({
      business_id: fixture.businessAId,
      name: "Blocked insert",
      description: "",
      duration_minutes: 60,
      capacity: 1,
      is_active: true,
      sort_order: 999,
    }),
    "DML directo INSERT sigue bloqueado",
  );
  console.log("✓ DML directo INSERT sigue bloqueado");

  await expectFailure(
    userA.from("services").update({
      capacity: 1,
    }).eq("id", created.id),
    "DML directo UPDATE sigue bloqueado",
  );
  console.log("✓ DML directo UPDATE sigue bloqueado");

  await expectFailure(
    userA.from("services").delete().eq("id", created.id),
    "DML directo DELETE sigue bloqueado",
  );
  console.log("✓ DML directo DELETE sigue bloqueado");

  const { data: inactive, error: activeError } =
    await userA.rpc("set_business_service_active", {
      p_business_id: fixture.businessAId,
      p_service_id: created.id,
      p_is_active: false,
    });

  if (activeError) {
    throw activeError;
  }

  assert.equal(inactive.is_active, false);
  console.log("✓ owner A aplicó baja lógica");

  assert.deepEqual(
    await snapshotServices(fixture.businessBId),
    servicesB,
  );
  console.log("✓ las operaciones de A no modificaron B");
} finally {
  await restoreServices(fixture.businessAId, servicesA);
  console.log("✓ servicios A restaurados");
  await restoreServices(fixture.businessBId, servicesB);
  console.log("✓ servicios B restaurados");
  await userA.auth.signOut();
  await userB.auth.signOut();
  console.log("✓ las sesiones fueron cerradas");
}

console.log(
  "Escritura segura de servicios aprobada (16 controles).",
);
