import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
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

const fixture =
  JSON.parse(
    await readFile(
      ".tango/staging-isolation.json",
      "utf8",
    ),
  );

if (
  fixture.projectRef
  !== context.stagingProjectRef
) {
  throw new Error(
    "El fixture no pertenece al staging actual.",
  );
}

for (const key of [
  "businessAId",
  "businessBId",
]) {
  if (!fixture[key]) {
    throw new Error(
      `Falta ${key} en el fixture de staging.`,
    );
  }
}

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

const admin =
  client(
    context.serverSecret,
  );
const userA =
  client();
const userB =
  client();
const anonymous =
  client();

async function signIn(
  target,
  email,
  password,
) {
  const {
    error,
  } = await target.auth
    .signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw error;
  }
}

async function expectFailure(
  promise,
  label,
) {
  const {
    error,
  } = await promise;

  assert.ok(
    error,
    label,
  );

  return error;
}

if (
  typeof context.userAEmail !== "string"
  || typeof context.userAPassword !== "string"
  || typeof context.userBEmail !== "string"
  || typeof context.userBPassword !== "string"
) {
  throw new Error(
    "El contrato de credenciales de staging no coincide con getStagingContext().",
  );
}

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
  "✓ usuarios A/B autenticados",
);

const businessA =
  fixture.businessAId;
const businessB =
  fixture.businessBId;
const suffix =
  randomUUID().replaceAll("-", "");
const businessDate =
  "2098-12-29";

let reservationId = null;
let orderId = null;

try {
  const {
    data: services,
    error: servicesError,
  } = await admin
    .from("services")
    .select("id")
    .eq("business_id", businessA)
    .limit(1);

  if (
    servicesError
    || !services?.[0]?.id
  ) {
    throw new Error(
      "El fixture necesita al menos un servicio en negocio A.",
    );
  }

  const {
    data: menuItems,
    error: menuError,
  } = await admin
    .from("menu_items")
    .select("id, name, price")
    .eq("business_id", businessA)
    .is("archived_at", null)
    .limit(1);

  if (
    menuError
    || !menuItems?.[0]?.id
  ) {
    throw new Error(
      "El fixture necesita al menos un plato en negocio A.",
    );
  }

  const menuItem =
    menuItems[0];

  const {
    data: reservation,
    error: reservationError,
  } = await admin
    .from("reservations")
    .insert({
      business_id:
        businessA,
      service_id:
        services[0].id,
      customer_name:
        "Kitchen QA",
      customer_phone:
        "+5491111111111",
      customer_email:
        `kitchen-${suffix}@example.test`,
      reservation_date:
        businessDate,
      reservation_time:
        "20:30:00",
      party_size:
        2,
      status:
        "confirmed",
      notes:
        "Sin sal",
      source:
        "manual",
      duration_minutes:
        120,
    })
    .select("id")
    .single();

  if (reservationError) {
    throw reservationError;
  }

  reservationId =
    reservation.id;

  const {
    data: order,
    error: orderError,
  } = await admin
    .from("business_orders")
    .insert({
      business_id:
        businessA,
      order_kind:
        "dine_in",
      reservation_id:
        reservationId,
      status:
        "open",
      revision:
        1,
      subtotal:
        Number(menuItem.price) * 2,
    })
    .select("id")
    .single();

  if (orderError) {
    throw orderError;
  }

  orderId =
    order.id;

  const {
    error: itemError,
  } = await admin
    .from("business_order_items")
    .insert({
      business_id:
        businessA,
      order_id:
        orderId,
      order_kind:
        "dine_in",
      menu_item_id:
        menuItem.id,
      name_snapshot:
        menuItem.name,
      unit_price_snapshot:
        menuItem.price,
      quantity:
        2,
    });

  if (itemError) {
    throw itemError;
  }

  const {
    data: initialSnapshot,
    error: initialSnapshotError,
  } = await userA.rpc(
    "get_business_kitchen_snapshot",
    {
      p_business_id:
        businessA,
      p_business_date:
        businessDate,
    },
  );

  if (initialSnapshotError) {
    throw initialSnapshotError;
  }

  const initialBase =
    initialSnapshot.commands.find(
      (command) =>
        command.orderId === orderId
        && command.ticketId === null,
    );

  assert.ok(
    initialBase,
    "la comanda base debe aparecer",
  );
  assert.equal(
    initialBase.status,
    "pending",
  );
  assert.equal(
    initialBase.items[0].quantity,
    2,
  );

  console.log(
    "✓ snapshot base usa pedidos canónicos",
  );

  const startKey =
    `e33a-base-start-${suffix}`;

  const {
    data: started,
    error: startError,
  } = await userA.rpc(
    "set_business_kitchen_command_status",
    {
      p_business_id:
        businessA,
      p_order_id:
        orderId,
      p_ticket_id:
        null,
      p_status:
        "preparing",
      p_operation_key:
        startKey,
    },
  );

  if (startError) {
    throw startError;
  }

  assert.equal(
    started.status,
    "preparing",
  );
  assert.ok(
    started.startedAt,
  );

  const {
    data: replay,
    error: replayError,
  } = await userA.rpc(
    "set_business_kitchen_command_status",
    {
      p_business_id:
        businessA,
      p_order_id:
        orderId,
      p_ticket_id:
        null,
      p_status:
        "preparing",
      p_operation_key:
        startKey,
    },
  );

  if (replayError) {
    throw replayError;
  }

  assert.deepEqual(
    replay,
    started,
  );

  console.log(
    "✓ cambio de estado es idempotente",
  );

  const {
    error: incrementError,
  } = await admin
    .from("business_order_items")
    .update({
      quantity:
        3,
    })
    .eq("business_id", businessA)
    .eq("order_id", orderId)
    .eq("menu_item_id", menuItem.id);

  if (incrementError) {
    throw incrementError;
  }

  const {
    data: addedSnapshot,
    error: addedSnapshotError,
  } = await userA.rpc(
    "get_business_kitchen_snapshot",
    {
      p_business_id:
        businessA,
      p_business_date:
        businessDate,
    },
  );

  if (addedSnapshotError) {
    throw addedSnapshotError;
  }

  const addedTicket =
    addedSnapshot.commands.find(
      (command) =>
        command.orderId === orderId
        && command.isAddition,
    );
  const baseAfterAdd =
    addedSnapshot.commands.find(
      (command) =>
        command.orderId === orderId
        && !command.isAddition,
    );

  assert.ok(
    addedTicket?.ticketId,
    "el incremento posterior debe crear ticket",
  );
  assert.equal(
    addedTicket.status,
    "pending",
  );
  assert.equal(
    addedTicket.items[0].quantity,
    1,
  );
  assert.equal(
    baseAfterAdd.items[0].quantity,
    2,
  );

  console.log(
    "✓ incremento posterior crea agregado sin duplicar base",
  );

  const ticketId =
    addedTicket.ticketId;

  for (const [status, label] of [
    ["preparing", "start"],
    ["ready", "ready"],
  ]) {
    const {
      error,
    } = await userA.rpc(
      "set_business_kitchen_command_status",
      {
        p_business_id:
          businessA,
        p_order_id:
          orderId,
        p_ticket_id:
          ticketId,
        p_status:
          status,
        p_operation_key:
          `e33a-ticket-${label}-${suffix}`,
      },
    );

    if (error) {
      throw error;
    }
  }

  const {
    error: reductionError,
  } = await admin
    .from("business_order_items")
    .update({
      quantity:
        2,
    })
    .eq("business_id", businessA)
    .eq("order_id", orderId)
    .eq("menu_item_id", menuItem.id);

  if (reductionError) {
    throw reductionError;
  }

  const {
    data: reducedSnapshot,
    error: reducedSnapshotError,
  } = await userA.rpc(
    "get_business_kitchen_snapshot",
    {
      p_business_id:
        businessA,
      p_business_date:
        businessDate,
    },
  );

  if (reducedSnapshotError) {
    throw reducedSnapshotError;
  }

  assert.equal(
    reducedSnapshot.commands.filter(
      (command) =>
        command.orderId === orderId
        && command.isAddition,
    ).length,
    0,
  );
  assert.equal(
    reducedSnapshot.commands.find(
      (command) =>
        command.orderId === orderId
        && !command.isAddition,
    ).items[0].quantity,
    2,
  );

  console.log(
    "✓ reducción consume agregado activo y lo anula si queda vacío",
  );

  const bolaRead =
    await expectFailure(
      userB.rpc(
        "get_business_kitchen_snapshot",
        {
          p_business_id:
            businessA,
          p_business_date:
            businessDate,
        },
      ),
      "usuario B no debe leer Cocina A",
    );

  assert.equal(
    bolaRead.code,
    "42501",
  );

  await expectFailure(
    anonymous.rpc(
      "get_business_kitchen_snapshot",
      {
        p_business_id:
          businessA,
        p_business_date:
          businessDate,
      },
    ),
    "anon no debe leer Cocina",
  );

  await expectFailure(
    userB.rpc(
      "set_business_kitchen_command_status",
      {
        p_business_id:
          businessA,
        p_order_id:
          orderId,
        p_ticket_id:
          null,
        p_status:
          "ready",
        p_operation_key:
          `e33a-bola-${suffix}`,
      },
    ),
    "usuario B no debe mutar Cocina A",
  );

  console.log(
    "✓ BOLA y anon quedan bloqueados",
  );

  await expectFailure(
    userA
      .from("business_kitchen_operations")
      .select("id")
      .limit(1),
    "operaciones técnicas no deben tener SELECT directo",
  );

  await expectFailure(
    userA
      .from("business_kitchen_tickets")
      .insert({
        business_id:
          businessA,
        order_id:
          orderId,
        order_kind:
          "dine_in",
        sequence:
          999,
        status:
          "pending",
        target_seconds:
          900,
      }),
    "cliente no debe insertar tickets",
  );

  await expectFailure(
    userA
      .from("business_orders")
      .update({
        kitchen_status:
          "completed",
      })
      .eq("business_id", businessA)
      .eq("id", orderId),
    "cliente no debe escribir kitchen_status directo",
  );

  console.log(
    "✓ DML técnico directo queda bloqueado",
  );

  const {
    error: readyError,
  } = await userA.rpc(
    "set_business_kitchen_command_status",
    {
      p_business_id:
        businessA,
      p_order_id:
        orderId,
      p_ticket_id:
        null,
      p_status:
        "ready",
      p_operation_key:
        `e33a-base-ready-${suffix}`,
    },
  );

  if (readyError) {
    throw readyError;
  }

  const {
    data: completed,
    error: completedError,
  } = await userA.rpc(
    "set_business_kitchen_command_status",
    {
      p_business_id:
        businessA,
      p_order_id:
        orderId,
      p_ticket_id:
        null,
      p_status:
        "completed",
      p_operation_key:
        `e33a-base-complete-${suffix}`,
    },
  );

  if (completedError) {
    throw completedError;
  }

  assert.equal(
    completed.status,
    "completed",
  );
  assert.ok(
    completed.completedAt,
  );

  console.log(
    "✓ flujo base llega a completed",
  );

  const businessBSnapshot =
    await userB.rpc(
      "get_business_kitchen_snapshot",
      {
        p_business_id:
          businessB,
        p_business_date:
          businessDate,
      },
    );

  assert.equal(
    businessBSnapshot.error,
    null,
  );

  console.log(
    "E33A_STAGING_PASS",
  );
} finally {
  if (orderId) {
    await admin
      .from("business_kitchen_operations")
      .delete()
      .eq("business_id", businessA)
      .eq("order_id", orderId);

    await admin
      .from("business_orders")
      .delete()
      .eq("business_id", businessA)
      .eq("id", orderId);
  }

  if (reservationId) {
    await admin
      .from("reservations")
      .delete()
      .eq("business_id", businessA)
      .eq("id", reservationId);
  }
}
