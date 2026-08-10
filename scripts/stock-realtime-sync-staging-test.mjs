import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { getStagingContext } from "./lib/staging-context.mjs";

const loaded =
  await loadLocalEnv();

if (!loaded) {
  throw new Error(
    "No existe .env.staging.local.",
  );
}

const context =
  getStagingContext({
    requireServerSecret: true,
    requireTestUsers: true,
  });

function client(
  key = context.publicKey,
) {
  return createClient(
    context.url,
    key,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

async function signIn(
  target,
  email,
  password,
) {
  const {
    data,
    error,
  } =
    await target.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw error;
  }

  const accessToken =
    data.session?.access_token;

  if (!accessToken) {
    throw new Error(
      "La sesión de staging no entregó access_token.",
    );
  }

  await target.realtime.setAuth(
    accessToken,
  );
}

function wait(ms) {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms),
  );
}

function subscribeToBusinessStock(
  target,
  businessId,
  onInsert,
  label,
) {
  let channelJoined = false;
  let postgresReady = false;
  let settled = false;
  let lastPostgresSystem =
    "sin evento system postgres_changes";
  let resolveReady;
  let rejectReady;

  const ready =
    new Promise((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

  let timeout = null;

  function finishIfReady() {
    if (
      settled
      || !channelJoined
      || !postgresReady
    ) {
      return;
    }

    settled = true;

    if (timeout) {
      clearTimeout(timeout);
    }

    resolveReady();
  }

  function failReady(message) {
    if (settled) {
      return;
    }

    settled = true;

    if (timeout) {
      clearTimeout(timeout);
    }

    rejectReady(
      new Error(message),
    );
  }

  const channel =
    target
      .channel(
        `e31b-v17-${label}-${randomUUID()}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stock_movements",
          filter:
            `business_id=eq.${businessId}`,
        },
        (payload) => {
          onInsert(payload.new);
        },
      )
      .on(
        "system",
        {},
        (payload) => {
          if (
            payload?.extension
            !== "postgres_changes"
          ) {
            return;
          }

          lastPostgresSystem =
            `${payload.status}: ${payload.message}`;

          console.log(
            `  ${label} postgres_changes -> ${lastPostgresSystem}`,
          );

          if (
            payload.status === "ok"
            && payload.message
              === "Subscribed to PostgreSQL"
          ) {
            postgresReady = true;
            finishIfReady();
          }
        },
      );

  timeout =
    setTimeout(
      () => {
        failReady(
          `${label} no confirmó postgres_changes dentro del timeout. Último system: ${lastPostgresSystem}`,
        );
      },
      15000,
    );

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      channelJoined = true;
      finishIfReady();
      return;
    }

    if (
      status === "CHANNEL_ERROR"
      || status === "TIMED_OUT"
      || status === "CLOSED"
    ) {
      failReady(
        `${label} falló Realtime: ${status}. Último system: ${lastPostgresSystem}`,
      );
    }
  });

  return {
    channel,
    ready,
  };
}

const admin =
  client(context.serverSecret);
const userA =
  client();
const userB =
  client();

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

console.log(
  "✓ sesiones A/B entregaron JWT explícito a Realtime",
);

const {
  data: memberships,
  error: membershipsError,
} =
  await admin
    .from("business_members")
    .select("business_id, user_id, role, status")
    .eq("status", "active");

if (membershipsError) {
  throw membershipsError;
}

const {
  data: userAAuth,
} =
  await userA.auth.getUser();
const {
  data: userBAuth,
} =
  await userB.auth.getUser();

const userAId =
  userAAuth.user?.id;
const userBId =
  userBAuth.user?.id;

if (!userAId || !userBId) {
  throw new Error(
    "No se pudieron resolver los usuarios de staging.",
  );
}

const membershipA =
  memberships.find(
    (membership) =>
      membership.user_id === userAId,
  );
const membershipB =
  memberships.find(
    (membership) =>
      membership.user_id === userBId,
  );

if (
  !membershipA?.business_id
  || !membershipB?.business_id
  || membershipA.business_id
    === membershipB.business_id
) {
  throw new Error(
    "Los usuarios A/B no tienen tenants separados.",
  );
}

const businessAId =
  membershipA.business_id;

const suffix =
  randomUUID();
let productId = null;
let movementId = null;
let eventA = null;
let eventB = null;
let eventLatencyMs = null;
let mutationStartedAt = 0;

const subscriptionA =
  subscribeToBusinessStock(
    userA,
    businessAId,
    (row) => {
      if (
        row?.product_id === productId
      ) {
        eventA = row;
        eventLatencyMs =
          Date.now()
          - mutationStartedAt;
      }
    },
    "user-a",
  );

const subscriptionB =
  subscribeToBusinessStock(
    userB,
    businessAId,
    (row) => {
      if (
        row?.product_id === productId
      ) {
        eventB = row;
      }
    },
    "user-b-cross-tenant",
  );

try {
  await Promise.all([
    subscriptionA.ready,
    subscriptionB.ready,
  ]);

  console.log(
    "✓ canales A/B y postgres_changes confirmados por Realtime",
  );

  const {
    data: savedProduct,
    error: productError,
  } =
    await userA.rpc(
      "save_business_stock_product",
      {
        p_business_id:
          businessAId,
        p_product_id:
          null,
        p_product: {
          name:
            `E31B V6 Realtime ${suffix}`,
          category:
            "QA Realtime",
          supplier: "",
          unit: "kg",
          unit_cost: 1000,
          alert_below: 0,
          note:
            "Temporal QA E31B V6",
          is_active: true,
        },
      },
    );

  if (productError) {
    throw productError;
  }

  productId =
    savedProduct.id;

  mutationStartedAt =
    Date.now();

  const {
    data: movement,
    error: movementError,
  } =
    await userA.rpc(
      "record_business_stock_movement",
      {
        p_business_id:
          businessAId,
        p_product_id:
          productId,
        p_movement: {
          movement_type:
            "replenishment",
          origin: "manual",
          quantity_delta:
            1.234,
          operation_key:
            null,
          reference_id:
            null,
          label:
            "QA Realtime E31B V6",
          detail:
            "Temporal",
          unit_cost:
            null,
        },
      },
    );

  if (movementError) {
    throw movementError;
  }

  movementId =
    movement.id;

  const [
    {
      data: visibleForA,
      error: visibleForAError,
    },
    {
      data: visibleForB,
      error: visibleForBError,
    },
  ] =
    await Promise.all([
      userA
        .from("stock_movements")
        .select("id")
        .eq("id", movementId)
        .maybeSingle(),
      userB
        .from("stock_movements")
        .select("id")
        .eq("id", movementId)
        .maybeSingle(),
    ]);

  if (visibleForAError) {
    throw visibleForAError;
  }

  if (visibleForBError) {
    throw visibleForBError;
  }

  assert.equal(
    visibleForA?.id,
    movementId,
    "A debe poder leer el movimiento canónico.",
  );
  assert.equal(
    visibleForB,
    null,
    "B no debe poder leer el movimiento del tenant A.",
  );

  console.log(
    "✓ RLS REST confirma A visible / B aislado antes de evaluar Realtime",
  );

  const deadline =
    Date.now() + 8000;

  while (
    !eventA
    && Date.now() < deadline
  ) {
    await wait(20);
  }

  assert.ok(
    eventA,
    "A debe recibir el INSERT de stock_movements por Realtime.",
  );

  assert.equal(
    eventA.id,
    movementId,
  );
  assert.equal(
    eventA.business_id,
    businessAId,
  );
  assert.equal(
    eventA.product_id,
    productId,
  );
  assert.equal(
    eventA.movement_type,
    "replenishment",
  );
  assert.equal(
    Number(eventA.quantity_delta),
    1.234,
  );

  console.log(
    `✓ A recibió el movimiento canónico por Realtime en ${eventLatencyMs} ms`,
  );

  await wait(1200);

  assert.equal(
    eventB,
    null,
    "B no debe recibir movimientos del tenant A.",
  );

  console.log(
    "✓ RLS impide que B reciba el evento de A",
  );

  const {
    data: persistedMovement,
    error: persistedError,
  } =
    await userA
      .from("stock_movements")
      .select(
        "id, business_id, product_id, quantity_delta",
      )
      .eq("id", movementId)
      .single();

  if (persistedError) {
    throw persistedError;
  }

  assert.equal(
    persistedMovement.id,
    eventA.id,
  );
  assert.equal(
    Number(
      persistedMovement.quantity_delta,
    ),
    Number(
      eventA.quantity_delta,
    ),
  );

  console.log(
    "✓ el evento coincide con la fila persistida y no es un dato optimista",
  );

  console.log(
    "Stock Realtime E31B V17 aprobado en staging: handshake PostgreSQL confirmado.",
  );
} finally {
  if (movementId) {
    await admin
      .from("stock_movements")
      .delete()
      .eq("id", movementId);
  }

  if (productId) {
    await admin
      .from("stock_products")
      .delete()
      .eq("id", productId);
  }

  await Promise.allSettled([
    userA.removeChannel(
      subscriptionA.channel,
    ),
    userB.removeChannel(
      subscriptionB.channel,
    ),
    userA.auth.signOut(),
    userB.auth.signOut(),
  ]);

  console.log(
    "✓ datos temporales, canales y sesiones Realtime fueron limpiados",
  );
}
