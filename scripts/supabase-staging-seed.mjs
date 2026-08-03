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
      createdAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log("✓ fixture local guardado sin claves ni contraseñas");
console.log("Fixture RLS preparado correctamente.");
