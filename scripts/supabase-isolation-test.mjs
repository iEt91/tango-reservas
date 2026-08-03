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

async function assertOnlyOwnMembershipBusiness(
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
      `El usuario ${session.label} recibió membresías de otro negocio.`,
    );
  }
}

async function assertOwnBusinessRow(
  session,
  businessId,
  businessSlug,
) {
  const { data, error } = await session.supabase
    .from("businesses")
    .select("id, slug, name, status");

  if (error) {
    throw error;
  }

  if (
    data.length !== 1
    || data[0].id !== businessId
    || data[0].slug !== businessSlug
  ) {
    throw new Error(
      `El usuario ${session.label} no recibió exactamente su negocio.`,
    );
  }
}

async function assertOwnProfileRow(
  session,
  businessId,
) {
  const { data, error } = await session.supabase
    .from("profiles")
    .select("business_id, auth_user_id, full_name, role");

  if (error) {
    throw error;
  }

  if (
    data.length !== 1
    || data[0].business_id !== businessId
    || data[0].auth_user_id !== session.user.id
    || data[0].role !== "owner"
  ) {
    throw new Error(
      `El usuario ${session.label} no recibió exactamente su perfil.`,
    );
  }
}

async function assertCrossRowHidden(
  session,
  table,
  column,
  otherId,
) {
  const { data, error } = await session.supabase
    .from(table)
    .select("id")
    .eq(column, otherId);

  if (error) {
    throw error;
  }

  if (data.length !== 0) {
    throw new Error(
      `El usuario ${session.label} pudo leer una fila cruzada en ${table}.`,
    );
  }
}

async function assertMembershipWritesDenied(
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

async function assertBusinessIdentityWritesDenied(
  session,
  ownBusinessId,
) {
  await expectPermissionDenied(
    () => session.supabase
      .from("businesses")
      .update({ name: "Cambio bloqueado" })
      .eq("id", ownBusinessId),
    `El usuario ${session.label} pudo editar businesses.`,
  );

  await expectPermissionDenied(
    () => session.supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("auth_user_id", session.user.id),
    `El usuario ${session.label} pudo editar profiles.`,
  );

  await expectPermissionDenied(
    () => session.supabase
      .from("profiles")
      .delete()
      .eq("auth_user_id", session.user.id),
    `El usuario ${session.label} pudo eliminar profiles.`,
  );
}

console.log("Ejecutando prueba real de aislamiento RLS...");

const anonymous = publicClient();

for (const table of [
  "business_members",
  "businesses",
  "profiles",
]) {
  await expectPermissionDenied(
    () => anonymous
      .from(table)
      .select("id")
      .limit(1),
    `Una solicitud anónima pudo consultar ${table}.`,
  );
}
console.log("✓ anon no puede consultar identidad ni membresías");

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

await assertOwnMembership(sessionA, fixture.businessAId);
await assertOwnMembership(sessionB, fixture.businessBId);
console.log("✓ cada usuario ve su membresía owner");

await assertOnlyOwnMembershipBusiness(
  sessionA,
  fixture.businessAId,
);
await assertOnlyOwnMembershipBusiness(
  sessionB,
  fixture.businessBId,
);
console.log("✓ la consulta de membresías devuelve solo el tenant propio");

await assertOwnBusinessRow(
  sessionA,
  fixture.businessAId,
  fixture.businessASlug,
);
await assertOwnBusinessRow(
  sessionB,
  fixture.businessBId,
  fixture.businessBSlug,
);
console.log("✓ cada usuario ve exactamente su negocio");

await assertOwnProfileRow(sessionA, fixture.businessAId);
await assertOwnProfileRow(sessionB, fixture.businessBId);
console.log("✓ cada usuario ve exactamente su perfil");

await assertCrossRowHidden(
  sessionA,
  "business_members",
  "business_id",
  fixture.businessBId,
);
await assertCrossRowHidden(
  sessionB,
  "business_members",
  "business_id",
  fixture.businessAId,
);
await assertCrossRowHidden(
  sessionA,
  "businesses",
  "id",
  fixture.businessBId,
);
await assertCrossRowHidden(
  sessionB,
  "businesses",
  "id",
  fixture.businessAId,
);
await assertCrossRowHidden(
  sessionA,
  "profiles",
  "auth_user_id",
  fixture.userBId,
);
await assertCrossRowHidden(
  sessionB,
  "profiles",
  "auth_user_id",
  fixture.userAId,
);
console.log("✓ membresías, negocios y perfiles cruzados devuelven cero filas");

await assertMembershipWritesDenied(
  sessionA,
  fixture.businessAId,
);
await assertMembershipWritesDenied(
  sessionB,
  fixture.businessBId,
);
console.log("✓ las escrituras de membresías siguen bloqueadas");

await assertBusinessIdentityWritesDenied(
  sessionA,
  fixture.businessAId,
);
await assertBusinessIdentityWritesDenied(
  sessionB,
  fixture.businessBId,
);
console.log("✓ las escrituras de businesses y profiles están bloqueadas");

for (const [session, table] of [
  [sessionA, "services"],
  [sessionB, "reservations"],
]) {
  await expectPermissionDenied(
    () => session.supabase
      .from(table)
      .select("id")
      .limit(1),
    `El usuario ${session.label} pudo consultar ${table} antes de su política.`,
  );
}
console.log("✓ las tablas operativas restantes siguen default deny");

await sessionA.supabase.auth.signOut();
await sessionB.supabase.auth.signOut();
console.log("✓ las sesiones fueron cerradas");

console.log("Aislamiento multiempresa aprobado (12 controles).");
