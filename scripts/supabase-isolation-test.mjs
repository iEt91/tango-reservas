import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { getStagingContext } from "./lib/staging-context.mjs";

const loaded = await loadLocalEnv();

if (!loaded) {
  throw new Error(
    "No existe .env.staging.local.",
  );
}

const context = getStagingContext({
  requireTestUsers: true,
});

const fixture = JSON.parse(
  await readFile(
    ".tango/staging-isolation.json",
    "utf8",
  ),
);

if (fixture.projectRef !== context.stagingProjectRef) {
  throw new Error(
    "El fixture pertenece a otro proyecto Supabase.",
  );
}

function publicClient() {
  return createClient(
    context.url,
    context.publicKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

async function signIn(label, email, password) {
  const supabase = publicClient();
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error || !data.user || !data.session) {
    throw error ?? new Error(
      `No se pudo autenticar el usuario ${label}.`,
    );
  }

  return {
    label,
    supabase,
    user: data.user,
  };
}

async function expectPermissionDenied(
  operation,
  description,
) {
  const { error } = await operation();

  if (!error) {
    throw new Error(description);
  }
}

async function assertOwnMembership(
  session,
  businessId,
) {
  const { data, error } = await session.supabase
    .from("business_members")
    .select("business_id, user_id, role, status")
    .eq("business_id", businessId)
    .eq("user_id", session.user.id);

  if (error) {
    throw error;
  }

  if (
    data.length !== 1
    || data[0].role !== "owner"
    || data[0].status !== "active"
  ) {
    throw new Error(
      `El usuario ${session.label} no ve exactamente su membresía owner.`,
    );
  }
}

async function assertOnlyOwnBusiness(
  session,
  businessId,
) {
  const { data, error } = await session.supabase
    .from("business_members")
    .select("business_id, user_id");

  if (error) {
    throw error;
  }

  if (
    data.length !== 1
    || data[0].business_id !== businessId
  ) {
    throw new Error(
      `El usuario ${session.label} recibió filas de otro negocio.`,
    );
  }
}

async function assertCrossBusinessHidden(
  session,
  otherBusinessId,
) {
  const { data, error } = await session.supabase
    .from("business_members")
    .select("id")
    .eq("business_id", otherBusinessId);

  if (error) {
    throw error;
  }

  if (data.length !== 0) {
    throw new Error(
      `El usuario ${session.label} pudo leer otro negocio.`,
    );
  }
}

async function assertWritesDenied(
  session,
  ownBusinessId,
) {
  const marker =
    `blocked-${Date.now()}-${session.label}`
    + "@tango-resto.example";

  await expectPermissionDenied(
    () => session.supabase
      .from("business_members")
      .insert({
        business_id: ownBusinessId,
        invited_email: marker,
        role: "owner",
        status: "invited",
      }),
    `El usuario ${session.label} pudo insertar membresías.`,
  );

  await expectPermissionDenied(
    () => session.supabase
      .from("business_members")
      .update({ role: "admin" })
      .eq("business_id", ownBusinessId)
      .eq("user_id", session.user.id),
    `El usuario ${session.label} pudo editar su rol.`,
  );

  await expectPermissionDenied(
    () => session.supabase
      .from("business_members")
      .delete()
      .eq("business_id", ownBusinessId)
      .eq("user_id", session.user.id),
    `El usuario ${session.label} pudo eliminar su membresía.`,
  );
}

console.log("Ejecutando prueba real de aislamiento RLS...");

const anonymous = publicClient();

await expectPermissionDenied(
  () => anonymous
    .from("business_members")
    .select("id")
    .limit(1),
  "Una solicitud anónima pudo consultar membresías.",
);

await expectPermissionDenied(
  () => anonymous
    .from("businesses")
    .select("id")
    .limit(1),
  "Una solicitud anónima pudo consultar negocios.",
);

console.log("✓ anon no puede consultar tablas privadas");

const sessionA = await signIn(
  "A",
  context.userAEmail,
  context.userAPassword,
);
const sessionB = await signIn(
  "B",
  context.userBEmail,
  context.userBPassword,
);

if (
  sessionA.user.id !== fixture.userAId
  || sessionB.user.id !== fixture.userBId
) {
  throw new Error(
    "Los usuarios autenticados no coinciden con el fixture.",
  );
}

console.log("✓ ambos usuarios se autenticaron");

await assertOwnMembership(
  sessionA,
  fixture.businessAId,
);
await assertOwnMembership(
  sessionB,
  fixture.businessBId,
);
console.log("✓ cada usuario ve su membresía owner");

await assertOnlyOwnBusiness(
  sessionA,
  fixture.businessAId,
);
await assertOnlyOwnBusiness(
  sessionB,
  fixture.businessBId,
);
console.log("✓ la consulta amplia devuelve solo el negocio propio");

await assertCrossBusinessHidden(
  sessionA,
  fixture.businessBId,
);
await assertCrossBusinessHidden(
  sessionB,
  fixture.businessAId,
);
console.log("✓ la lectura cruzada devuelve cero filas");

await assertWritesDenied(
  sessionA,
  fixture.businessAId,
);
await assertWritesDenied(
  sessionB,
  fixture.businessBId,
);
console.log("✓ INSERT, UPDATE y DELETE están bloqueados");

await expectPermissionDenied(
  () => sessionA.supabase
    .from("businesses")
    .select("id")
    .limit(1),
  "Un usuario autenticado pudo consultar businesses antes de su política.",
);
await expectPermissionDenied(
  () => sessionB.supabase
    .from("profiles")
    .select("id")
    .limit(1),
  "Un usuario autenticado pudo consultar profiles antes de su política.",
);
console.log("✓ las tablas operativas permanecen default deny");

await sessionA.supabase.auth.signOut();
await sessionB.supabase.auth.signOut();
console.log("✓ las sesiones fueron cerradas");

console.log("Aislamiento multiempresa aprobado (8 controles).");
