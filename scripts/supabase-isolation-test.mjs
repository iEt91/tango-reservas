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

for (const key of [
  "businessHourAId",
  "businessHourBId",
  "reservationRuleAId",
  "reservationRuleBId",
  "serviceAId",
  "serviceBId",
  "customerAId",
  "customerBId",
  "reservationAId",
  "reservationBId",
]) {
  if (!fixture[key]) {
    throw new Error(
      `El fixture local no contiene ${key}. Ejecuta staging:seed-isolation.`,
    );
  }
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

async function assertSingleConfigurationRow({
  session,
  table,
  businessId,
  expectedId,
  select,
}) {
  const { data, error } = await session.supabase
    .from(table)
    .select(select);

  if (error) {
    throw error;
  }

  if (
    data.length !== 1
    || data[0].id !== expectedId
    || data[0].business_id !== businessId
  ) {
    throw new Error(
      `El usuario ${session.label} no recibió exactamente su fila de ${table}.`,
    );
  }

  return data[0];
}

async function assertTenantCollectionFixtureRow({
  session,
  table,
  businessId,
  expectedId,
  select,
}) {
  const { data, error } = await session.supabase
    .from(table)
    .select(select);

  if (error) {
    throw error;
  }

  const expected = data.find(
    (row) =>
      row.id === expectedId
      && row.business_id === businessId,
  );

  if (
    !expected
    || data.length < 1
    || data.some(
      (row) => row.business_id !== businessId,
    )
  ) {
    throw new Error(
      `El usuario ${session.label} no recibió su fixture y solo filas propias de ${table}.`,
    );
  }

  return expected;
}

async function assertBusinessHoursRows({
  session,
  businessId,
  expectedId,
  expectedDay,
}) {
  const { data, error } = await session.supabase
    .from("business_hours")
    .select(
      "id, business_id, day_of_week, open_time, close_time",
    );

  if (error) {
    throw error;
  }

  const uniqueDays = new Set(
    data.map((row) => row.day_of_week),
  );
  const includesFixtureRow = data.some(
    (row) => (
      row.id === expectedId
      && row.business_id === businessId
      && row.day_of_week === expectedDay
    ),
  );

  if (
    data.length < 1
    || data.length > 7
    || uniqueDays.size !== data.length
    || data.some(
      (row) => row.business_id !== businessId,
    )
    || !includesFixtureRow
  ) {
    throw new Error(
      `El usuario ${session.label} no recibió solo sus horarios válidos.`,
    );
  }

  return data;
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

async function assertCustomerWritesDenied({
  session,
  businessId,
  customerId,
}) {
  await expectPermissionDenied(
    () => session.supabase
      .from("customers")
      .insert({
        business_id: businessId,
        full_name: `Blocked Customer ${session.label}`,
      }),
    `El usuario ${session.label} pudo insertar customers.`,
  );

  await expectPermissionDenied(
    () => session.supabase
      .from("customers")
      .update({ full_name: "Blocked update" })
      .eq("id", customerId),
    `El usuario ${session.label} pudo editar customers.`,
  );

  await expectPermissionDenied(
    () => session.supabase
      .from("customers")
      .delete()
      .eq("id", customerId),
    `El usuario ${session.label} pudo eliminar customers.`,
  );
}

async function assertReservationWritesDenied({
  session,
  businessId,
  reservationId,
  serviceId,
}) {
  await expectPermissionDenied(
    () => session.supabase
      .from("reservations")
      .insert({
        business_id: businessId,
        service_id: serviceId,
        customer_name: `Blocked Reservation ${session.label}`,
        customer_phone: "541100009999",
        reservation_date: "2099-01-01",
        reservation_time: "12:00",
        party_size: 2,
        source: "manual",
      }),
    `El usuario ${session.label} pudo insertar reservations.`,
  );

  await expectPermissionDenied(
    () => session.supabase
      .from("reservations")
      .update({ customer_name: "Blocked update" })
      .eq("id", reservationId),
    `El usuario ${session.label} pudo editar reservations.`,
  );

  await expectPermissionDenied(
    () => session.supabase
      .from("reservations")
      .delete()
      .eq("id", reservationId),
    `El usuario ${session.label} pudo eliminar reservations.`,
  );
}

async function assertReservationConfigWritesDenied({
  session,
  businessId,
  businessHourId,
  reservationRuleId,
}) {
  await expectPermissionDenied(
    () => session.supabase
      .from("services")
      .insert({
        business_id: businessId,
        name: `Blocked Service ${session.label}`,
        duration_minutes: 30,
        capacity: 1,
        is_active: true,
      }),
    `El usuario ${session.label} pudo insertar services.`,
  );

  await expectPermissionDenied(
    () => session.supabase
      .from("business_hours")
      .update({ close_time: "23:59" })
      .eq("id", businessHourId),
    `El usuario ${session.label} pudo editar business_hours.`,
  );

  await expectPermissionDenied(
    () => session.supabase
      .from("reservation_rules")
      .delete()
      .eq("id", reservationRuleId),
    `El usuario ${session.label} pudo eliminar reservation_rules.`,
  );
}

console.log("Ejecutando prueba real de aislamiento RLS...");

const anonymous = publicClient();

for (const table of [
  "business_members",
  "businesses",
  "profiles",
  "business_hours",
  "reservation_rules",
  "services",
  "customers",
  "reservations",
]) {
  await expectPermissionDenied(
    () => anonymous
      .from(table)
      .select("id")
      .limit(1),
    `Una solicitud anónima pudo consultar ${table}.`,
  );
}
console.log("✓ anon no puede consultar identidad ni configuración");

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

for (const [session, table, column, otherId] of [
  [sessionA, "business_members", "business_id", fixture.businessBId],
  [sessionB, "business_members", "business_id", fixture.businessAId],
  [sessionA, "businesses", "id", fixture.businessBId],
  [sessionB, "businesses", "id", fixture.businessAId],
  [sessionA, "profiles", "auth_user_id", fixture.userBId],
  [sessionB, "profiles", "auth_user_id", fixture.userAId],
]) {
  await assertCrossRowHidden(
    session,
    table,
    column,
    otherId,
  );
}
console.log("✓ identidad cruzada devuelve cero filas");

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
console.log("✓ las escrituras de identidad siguen bloqueadas");

await assertBusinessHoursRows({
  session: sessionA,
  businessId: fixture.businessAId,
  expectedId: fixture.businessHourAId,
  expectedDay: "monday",
});
await assertBusinessHoursRows({
  session: sessionB,
  businessId: fixture.businessBId,
  expectedId: fixture.businessHourBId,
  expectedDay: "tuesday",
});
console.log("✓ cada usuario ve solo sus horarios propios");

const ruleA = await assertSingleConfigurationRow({
  session: sessionA,
  table: "reservation_rules",
  businessId: fixture.businessAId,
  expectedId: fixture.reservationRuleAId,
  select: "id, business_id, slot_duration_minutes, max_reservations_per_slot",
});
const ruleB = await assertSingleConfigurationRow({
  session: sessionB,
  table: "reservation_rules",
  businessId: fixture.businessBId,
  expectedId: fixture.reservationRuleBId,
  select: "id, business_id, slot_duration_minutes, max_reservations_per_slot",
});

if (
  ruleA.slot_duration_minutes !== 30
  || ruleB.slot_duration_minutes !== 45
) {
  throw new Error("Las reglas no coinciden con el fixture esperado.");
}
console.log("✓ cada usuario ve exactamente sus reglas de reserva");

const serviceA = await assertSingleConfigurationRow({
  session: sessionA,
  table: "services",
  businessId: fixture.businessAId,
  expectedId: fixture.serviceAId,
  select: "id, business_id, name, duration_minutes, capacity",
});
const serviceB = await assertSingleConfigurationRow({
  session: sessionB,
  table: "services",
  businessId: fixture.businessBId,
  expectedId: fixture.serviceBId,
  select: "id, business_id, name, duration_minutes, capacity",
});

if (
  serviceA.name !== "Isolation Service A"
  || serviceB.name !== "Isolation Service B"
) {
  throw new Error("Los servicios no coinciden con el fixture esperado.");
}
console.log("✓ cada usuario ve exactamente su servicio");

const customerA = await assertTenantCollectionFixtureRow({
  session: sessionA,
  table: "customers",
  businessId: fixture.businessAId,
  expectedId: fixture.customerAId,
  select: "id, business_id, full_name, email, phone, is_active",
});
const customerB = await assertTenantCollectionFixtureRow({
  session: sessionB,
  table: "customers",
  businessId: fixture.businessBId,
  expectedId: fixture.customerBId,
  select: "id, business_id, full_name, email, phone, is_active",
});

if (
  customerA.full_name !== "Isolation Customer A"
  || customerB.full_name !== "Isolation Customer B"
  || customerA.is_active !== true
  || customerB.is_active !== true
) {
  throw new Error(
    "Los clientes no coinciden con el fixture esperado.",
  );
}
console.log(
  "✓ cada usuario ve su cliente fixture y solo clientes propios",
);

const reservationA = await assertTenantCollectionFixtureRow({
  session: sessionA,
  table: "reservations",
  businessId: fixture.businessAId,
  expectedId: fixture.reservationAId,
  select: "id, business_id, service_id, customer_id, customer_name, status, public_code",
});
const reservationB = await assertTenantCollectionFixtureRow({
  session: sessionB,
  table: "reservations",
  businessId: fixture.businessBId,
  expectedId: fixture.reservationBId,
  select: "id, business_id, service_id, customer_id, customer_name, status, public_code",
});

if (
  reservationA.service_id !== fixture.serviceAId
  || reservationB.service_id !== fixture.serviceBId
  || reservationA.customer_id !== fixture.customerAId
  || reservationB.customer_id !== fixture.customerBId
  || reservationA.status !== "pending"
  || reservationB.status !== "pending"
) {
  throw new Error(
    "Las reservas no coinciden con el fixture esperado.",
  );
}
console.log(
  "✓ cada usuario ve su reserva fixture y solo reservas propias",
);

for (const [session, businessId] of [
  [sessionA, fixture.businessAId],
  [sessionB, fixture.businessBId],
]) {
  for (const table of [
    "business_hours",
    "reservation_rules",
    "services",
    "customers",
    "reservations",
  ]) {
    const { data, error } = await session.supabase
      .from(table)
      .select("business_id");

    if (error) {
      throw error;
    }

    const expectsSingleRow =
      table === "reservation_rules"
      || table === "services";
    const exceedsExpectedRows =
      table === "business_hours"
        ? data.length > 7
        : expectsSingleRow && data.length > 1;

    if (
      data.length < 1
      || exceedsExpectedRows
      || data.some(
        (row) => row.business_id !== businessId,
      )
    ) {
      throw new Error(
        `El usuario ${session.label} recibió configuración de otro tenant en ${table}.`,
      );
    }
  }
}
console.log("✓ las consultas amplias de configuración y reservas devuelven solo el tenant propio");

for (const [session, otherBusinessId] of [
  [sessionA, fixture.businessBId],
  [sessionB, fixture.businessAId],
]) {
  for (const table of [
    "business_hours",
    "reservation_rules",
    "services",
    "customers",
    "reservations",
  ]) {
    await assertCrossRowHidden(
      session,
      table,
      "business_id",
      otherBusinessId,
    );
  }
}
console.log("✓ la configuración y las reservas cruzadas devuelven cero filas");

await assertReservationConfigWritesDenied({
  session: sessionA,
  businessId: fixture.businessAId,
  businessHourId: fixture.businessHourAId,
  reservationRuleId: fixture.reservationRuleAId,
});
await assertReservationConfigWritesDenied({
  session: sessionB,
  businessId: fixture.businessBId,
  businessHourId: fixture.businessHourBId,
  reservationRuleId: fixture.reservationRuleBId,
});
console.log("✓ INSERT, UPDATE y DELETE de configuración están bloqueados");

await assertCustomerWritesDenied({
  session: sessionA,
  businessId: fixture.businessAId,
  customerId: fixture.customerAId,
});
await assertCustomerWritesDenied({
  session: sessionB,
  businessId: fixture.businessBId,
  customerId: fixture.customerBId,
});
console.log("✓ INSERT, UPDATE y DELETE de clientes están bloqueados");

await assertReservationWritesDenied({
  session: sessionA,
  businessId: fixture.businessAId,
  reservationId: fixture.reservationAId,
  serviceId: fixture.serviceAId,
});
await assertReservationWritesDenied({
  session: sessionB,
  businessId: fixture.businessBId,
  reservationId: fixture.reservationBId,
  serviceId: fixture.serviceBId,
});
console.log("✓ INSERT, UPDATE y DELETE de reservas están bloqueados");

for (const session of [sessionA, sessionB]) {
  for (const table of [
    "business_profiles",
    "business_sections",
    "business_images",
  ]) {
    await expectPermissionDenied(
      () => session.supabase
        .from(table)
        .select("id")
        .limit(1),
      `El usuario ${session.label} pudo consultar ${table} antes de su política.`,
    );
  }
}
console.log("✓ las tablas restantes siguen default deny");

await sessionA.supabase.auth.signOut();
await sessionB.supabase.auth.signOut();
console.log("✓ las sesiones fueron cerradas");

console.log("Aislamiento multiempresa aprobado (21 controles).");
