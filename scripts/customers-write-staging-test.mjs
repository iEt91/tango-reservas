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

for (const key of ["customerAId", "customerBId"]) {
  if (!fixture[key]) {
    throw new Error(
      `Falta ${key}. Ejecuta staging:seed-isolation después de aplicar la migración 008.`,
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

const admin = client(context.serverSecret);
const userA = client();
const userB = client();
const anonymous = client();

const customerPayload = {
  full_name: "E16 Isolation Customer",
  email: "e16.customer@example.com",
  phone: "+54 11 5555 0160",
  birth_date: "1991-06-15",
  notes: "Temporary secure customer test",
  preferences: "Mesa tranquila",
  tags: ["qa", "staging"],
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

async function snapshotCustomers(businessId) {
  const { data, error } = await admin
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function restoreCustomers(businessId, snapshot) {
  const { error: deleteError } = await admin
    .from("customers")
    .delete()
    .eq("business_id", businessId);

  if (deleteError) {
    throw deleteError;
  }

  if (snapshot.length > 0) {
    const { error: insertError } = await admin
      .from("customers")
      .insert(snapshot);

    if (insertError) {
      throw insertError;
    }
  }
}

console.log("Ejecutando escritura segura de clientes en staging...");

const customersA = await snapshotCustomers(fixture.businessAId);
const customersB = await snapshotCustomers(fixture.businessBId);

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
    anonymous.rpc("save_business_customer", {
      p_business_id: fixture.businessAId,
      p_customer_id: null,
      p_customer: customerPayload,
    }),
    "anon no debe ejecutar la RPC",
  );
  console.log("✓ anon no puede ejecutar la RPC");

  await expectFailure(
    userA.rpc("save_business_customer", {
      p_business_id: fixture.businessAId,
      p_customer_id: null,
      p_customer: {
        ...customerPayload,
        full_name: "",
      },
    }),
    "el nombre vacío debe ser rechazado",
  );

  assert.deepEqual(
    await snapshotCustomers(fixture.businessAId),
    customersA,
  );
  console.log("✓ la entrada inválida no cambió clientes");

  const { data: created, error: createError } =
    await userA.rpc("save_business_customer", {
      p_business_id: fixture.businessAId,
      p_customer_id: null,
      p_customer: customerPayload,
    });

  if (createError) {
    throw createError;
  }

  assert.equal(created.business_id, fixture.businessAId);
  assert.equal(created.full_name, customerPayload.full_name);
  assert.equal(created.phone, "541155550160");
  assert.equal(created.email, customerPayload.email);
  assert.deepEqual(created.tags, ["qa", "staging"]);
  console.log("✓ usuario A creó un cliente con contrato exacto");

  await expectFailure(
    userA.rpc("save_business_customer", {
      p_business_id: fixture.businessAId,
      p_customer_id: null,
      p_customer: {
        ...customerPayload,
        full_name: "Duplicate customer",
        email: "another@example.com",
      },
    }),
    "el teléfono duplicado debe ser rechazado",
  );
  console.log("✓ el teléfono duplicado fue rechazado");

  const { data: updated, error: updateError } =
    await userA.rpc("save_business_customer", {
      p_business_id: fixture.businessAId,
      p_customer_id: created.id,
      p_customer: {
        ...customerPayload,
        full_name: "E16 Isolation Customer Updated",
        email: "e16.updated@example.com",
        phone: "+54 11 5555 0161",
        notes: "Updated safely",
        tags: ["updated"],
      },
    });

  if (updateError) {
    throw updateError;
  }

  assert.equal(updated.id, created.id);
  assert.equal(updated.full_name, "E16 Isolation Customer Updated");
  assert.equal(updated.phone, "541155550161");
  assert.deepEqual(updated.tags, ["updated"]);
  console.log("✓ usuario A actualizó solo su cliente");

  await expectFailure(
    userA.rpc("save_business_customer", {
      p_business_id: fixture.businessBId,
      p_customer_id: null,
      p_customer: customerPayload,
    }),
    "usuario A no puede crear en B",
  );
  console.log("✓ usuario A no puede crear en B");

  await expectFailure(
    userB.rpc("save_business_customer", {
      p_business_id: fixture.businessAId,
      p_customer_id: created.id,
      p_customer: customerPayload,
    }),
    "usuario B no puede actualizar A",
  );
  console.log("✓ usuario B no puede actualizar A");

  await expectFailure(
    userA.from("customers").insert({
      business_id: fixture.businessAId,
      full_name: "Blocked insert",
    }),
    "DML directo INSERT sigue bloqueado",
  );
  console.log("✓ DML directo INSERT sigue bloqueado");

  await expectFailure(
    userA.from("customers").update({
      full_name: "Blocked update",
    }).eq("id", created.id),
    "DML directo UPDATE sigue bloqueado",
  );
  console.log("✓ DML directo UPDATE sigue bloqueado");

  await expectFailure(
    userA.from("customers").delete().eq("id", created.id),
    "DML directo DELETE sigue bloqueado",
  );
  console.log("✓ DML directo DELETE sigue bloqueado");

  const { data: archived, error: archiveError } =
    await userA.rpc("set_business_customer_active", {
      p_business_id: fixture.businessAId,
      p_customer_id: created.id,
      p_is_active: false,
    });

  if (archiveError) {
    throw archiveError;
  }

  assert.equal(archived.is_active, false);
  console.log("✓ owner A archivó el cliente sin eliminarlo");

  assert.deepEqual(
    await snapshotCustomers(fixture.businessBId),
    customersB,
  );
  console.log("✓ las operaciones de A no modificaron B");
} finally {
  await restoreCustomers(fixture.businessAId, customersA);
  console.log("✓ clientes A restaurados");
  await restoreCustomers(fixture.businessBId, customersB);
  console.log("✓ clientes B restaurados");
  await userA.auth.signOut();
  await userB.auth.signOut();
  console.log("✓ las sesiones fueron cerradas");
}

console.log(
  "Escritura segura de clientes aprobada (16 controles).",
);
