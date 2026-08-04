import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { getStagingContext } from "./lib/staging-context.mjs";

const loaded = await loadLocalEnv();

if (!loaded) {
  throw new Error(
    "No existe .env.staging.local. Ejecuta primero el instalador.",
  );
}

const context = getStagingContext({
  requireServerSecret: true,
  requireTestUsers: true,
});

const admin = createClient(
  context.url,
  context.serverSecret,
  {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  },
);

const FIXTURE_IDS = {
  businessHourA: "20000000-0000-4000-8000-00000000000a",
  businessHourB: "20000000-0000-4000-8000-00000000000b",
  reservationRuleA: "30000000-0000-4000-8000-00000000000a",
  reservationRuleB: "30000000-0000-4000-8000-00000000000b",
  serviceA: "40000000-0000-4000-8000-00000000000a",
  serviceB: "40000000-0000-4000-8000-00000000000b",
  customerA: "50000000-0000-4000-8000-00000000000a",
  customerB: "50000000-0000-4000-8000-00000000000b",
};

async function findUserByEmail(email) {
  let page = 1;

  while (page <= 20) {
    const { data, error } =
      await admin.auth.admin.listUsers({
        page,
        perPage: 100,
      });

    if (error) {
      throw error;
    }

    const user = data.users.find(
      (candidate) =>
        candidate.email?.toLowerCase()
        === email.toLowerCase(),
    );

    if (user) {
      return user;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }

  throw new Error(
    "La búsqueda de usuarios superó el límite de seguridad.",
  );
}

async function ensureUser(label, email, password) {
  const existing = await findUserByEmail(email);

  if (existing) {
    const { data, error } =
      await admin.auth.admin.updateUserById(
        existing.id,
        {
          password,
          email_confirm: true,
          user_metadata: {
            purpose: "tango-rls-isolation",
            label,
          },
        },
      );

    if (error || !data.user) {
      throw error ?? new Error(
        `No se pudo actualizar el usuario ${label}.`,
      );
    }

    console.log(`✓ usuario ${label} actualizado`);
    return data.user;
  }

  const { data, error } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        purpose: "tango-rls-isolation",
        label,
      },
    });

  if (error || !data.user) {
    throw error ?? new Error(
      `No se pudo crear el usuario ${label}.`,
    );
  }

  console.log(`✓ usuario ${label} creado`);
  return data.user;
}

async function ensureBusiness(slug, name) {
  const { data, error } = await admin
    .from("businesses")
    .upsert(
      {
        slug,
        name,
        category: "restaurant",
        city: "Staging",
        status: "draft",
      },
      {
        onConflict: "slug",
      },
    )
    .select("id, slug")
    .single();

  if (error || !data) {
    throw error ?? new Error(
      `No se pudo preparar el negocio ${slug}.`,
    );
  }

  return data;
}

async function ensureProfile(user, business, label) {
  const { error } = await admin
    .from("profiles")
    .upsert(
      {
        auth_user_id: user.id,
        business_id: business.id,
        full_name: `Security Owner ${label}`,
        role: "owner",
      },
      {
        onConflict: "auth_user_id",
      },
    );

  if (error) {
    throw error;
  }
}

async function ensureBusinessHour({
  id,
  businessId,
  dayOfWeek,
  openTime,
  closeTime,
}) {
  const { data, error } = await admin
    .from("business_hours")
    .upsert(
      {
        id,
        business_id: businessId,
        day_of_week: dayOfWeek,
        is_open: true,
        open_time: openTime,
        close_time: closeTime,
        break_start_time: null,
        break_end_time: null,
      },
      {
        onConflict: "id",
      },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error(
      `No se pudo preparar business_hours ${id}.`,
    );
  }

  return data.id;
}

async function ensureReservationRule({
  id,
  businessId,
  slotDurationMinutes,
  maxReservationsPerSlot,
}) {
  const { data, error } = await admin
    .from("reservation_rules")
    .upsert(
      {
        id,
        business_id: businessId,
        slot_duration_minutes: slotDurationMinutes,
        max_reservations_per_slot: maxReservationsPerSlot,
        min_notice_minutes: 30,
        max_days_ahead: 14,
        requires_confirmation: true,
        allow_cancellation: true,
        cancellation_limit_hours: 4,
      },
      {
        onConflict: "id",
      },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error(
      `No se pudo preparar reservation_rules ${id}.`,
    );
  }

  return data.id;
}

async function ensureService({
  id,
  businessId,
  name,
  durationMinutes,
  capacity,
  price,
}) {
  const { data, error } = await admin
    .from("services")
    .upsert(
      {
        id,
        business_id: businessId,
        name,
        description: "Fixture de aislamiento multiempresa",
        duration_minutes: durationMinutes,
        capacity,
        price,
        is_active: true,
      },
      {
        onConflict: "id",
      },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error(
      `No se pudo preparar services ${id}.`,
    );
  }

  return data.id;
}

async function ensureCustomer({
  id,
  businessId,
  fullName,
  email,
  phone,
}) {
  const { data, error } = await admin
    .from("customers")
    .upsert(
      {
        id,
        business_id: businessId,
        full_name: fullName,
        email,
        phone,
        birth_date: "1990-01-01",
        notes: "Fixture de aislamiento multiempresa",
        preferences: "Sin preferencias",
        tags: ["fixture"],
        is_active: true,
      },
      {
        onConflict: "id",
      },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error(
      `No se pudo preparar customers ${id}.`,
    );
  }

  return data.id;
}

console.log("Preparando fixture RLS exclusivamente en STAGING...");
console.log(`Proyecto: ${context.stagingProjectRef}`);

const userA = await ensureUser(
  "A",
  context.userAEmail,
  context.userAPassword,
);
const userB = await ensureUser(
  "B",
  context.userBEmail,
  context.userBPassword,
);

if (userA.id === userB.id) {
  throw new Error(
    "Los usuarios resolvieron al mismo UUID.",
  );
}

const businessA = await ensureBusiness(
  context.businessASlug,
  context.businessAName,
);
const businessB = await ensureBusiness(
  context.businessBSlug,
  context.businessBName,
);

if (businessA.id === businessB.id) {
  throw new Error(
    "Los negocios resolvieron al mismo UUID.",
  );
}

await ensureProfile(userA, businessA, "A");
await ensureProfile(userB, businessB, "B");

const { error: cleanupError } = await admin
  .from("business_members")
  .delete()
  .in("user_id", [userA.id, userB.id]);

if (cleanupError) {
  throw cleanupError;
}

const { error: membershipError } = await admin
  .from("business_members")
  .insert([
    {
      business_id: businessA.id,
      user_id: userA.id,
      role: "owner",
      status: "active",
      invited_email: null,
    },
    {
      business_id: businessB.id,
      user_id: userB.id,
      role: "owner",
      status: "active",
      invited_email: null,
    },
  ]);

if (membershipError) {
  throw membershipError;
}

console.log("✓ perfiles y membresías exclusivas preparados");

const businessHourAId = await ensureBusinessHour({
  id: FIXTURE_IDS.businessHourA,
  businessId: businessA.id,
  dayOfWeek: "monday",
  openTime: "09:00",
  closeTime: "18:00",
});
const businessHourBId = await ensureBusinessHour({
  id: FIXTURE_IDS.businessHourB,
  businessId: businessB.id,
  dayOfWeek: "tuesday",
  openTime: "10:00",
  closeTime: "20:00",
});

const reservationRuleAId = await ensureReservationRule({
  id: FIXTURE_IDS.reservationRuleA,
  businessId: businessA.id,
  slotDurationMinutes: 30,
  maxReservationsPerSlot: 4,
});
const reservationRuleBId = await ensureReservationRule({
  id: FIXTURE_IDS.reservationRuleB,
  businessId: businessB.id,
  slotDurationMinutes: 45,
  maxReservationsPerSlot: 6,
});

const serviceAId = await ensureService({
  id: FIXTURE_IDS.serviceA,
  businessId: businessA.id,
  name: "Isolation Service A",
  durationMinutes: 60,
  capacity: 10,
  price: 100,
});
const serviceBId = await ensureService({
  id: FIXTURE_IDS.serviceB,
  businessId: businessB.id,
  name: "Isolation Service B",
  durationMinutes: 90,
  capacity: 20,
  price: 200,
});

const customerAId = await ensureCustomer({
  id: FIXTURE_IDS.customerA,
  businessId: businessA.id,
  fullName: "Isolation Customer A",
  email: "isolation-customer-a@example.com",
  phone: "541100000001",
});
const customerBId = await ensureCustomer({
  id: FIXTURE_IDS.customerB,
  businessId: businessB.id,
  fullName: "Isolation Customer B",
  email: "isolation-customer-b@example.com",
  phone: "541100000002",
});

console.log("✓ horarios, reglas, servicios y clientes exclusivos preparados");

await mkdir(".tango", { recursive: true });
await writeFile(
  ".tango/staging-isolation.json",
  `${JSON.stringify(
    {
      projectRef: context.stagingProjectRef,
      userAId: userA.id,
      userBId: userB.id,
      businessAId: businessA.id,
      businessBId: businessB.id,
      businessASlug: businessA.slug,
      businessBSlug: businessB.slug,
      businessHourAId,
      businessHourBId,
      reservationRuleAId,
      reservationRuleBId,
      serviceAId,
      serviceBId,
      customerAId,
      customerBId,
      createdAt: new Date().toISOString(),
    },
    null,
    2,
  )}
`,
  "utf8",
);

console.log("✓ fixture local guardado sin claves ni contraseñas");
console.log("Fixture RLS preparado correctamente.");
