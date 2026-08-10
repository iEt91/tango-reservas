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
  "serviceAId",
  "customerAId",
  "floorTableAId",
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
  } =
    await target.auth
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
  } =
    await promise;

  assert.ok(
    error,
    label,
  );

  return error;
}

function nextMonday() {
  const date =
    new Date();

  date.setUTCHours(
    12,
    0,
    0,
    0,
  );

  const distance =
    (
      1
      - date.getUTCDay()
      + 7
    ) % 7 || 7;

  date.setUTCDate(
    date.getUTCDate()
      + distance,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function menuPayload(
  name,
) {
  return {
    category_id: null,
    name,
    description:
      "Temporal QA E32A",
    price: 1250,
    status: "available",
    is_visible: true,
    is_featured: false,
    image_url: "",
  };
}

function paymentPayload(
  reservationId,
  operationKey,
  payments,
) {
  return {
    p_reservation_id:
      reservationId,
    p_operation_key:
      operationKey,
    p_payments:
      payments,
  };
}

const suffix =
  randomUUID();
const reservationDate =
  nextMonday();

let menuItemAId = null;
let reservationId = null;
let orderId = null;
let cashSessionId = null;
let paymentOperationId = null;

console.log(
  "Ejecutando backend Caja/Pagos E32A en staging...",
);

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
  console.log(
    "✓ usuarios A/B autenticados",
  );

  const {
    data: menuItem,
    error: menuError,
  } =
    await userA.rpc(
      "save_business_menu_item",
      {
        p_business_id:
          fixture.businessAId,
        p_menu_item_id:
          null,
        p_menu_item:
          menuPayload(
            `E32A Plato ${suffix}`,
          ),
      },
    );

  if (menuError) {
    throw menuError;
  }

  menuItemAId =
    menuItem.id;

  const {
    data: reservation,
    error: reservationError,
  } =
    await userA.rpc(
      "save_business_reservation",
      {
        p_business_id:
          fixture.businessAId,
        p_reservation_id:
          null,
        p_reservation: {
          service_id:
            fixture.serviceAId,
          customer_id:
            fixture.customerAId,
          customer_name:
            "E32A Temporary Payment",
          customer_phone:
            `5411${Date.now()
              .toString()
              .slice(-8)}`,
          customer_email:
            `e32a.${suffix}@example.com`,
          reservation_date:
            reservationDate,
          reservation_time:
            "10:00",
          party_size: 2,
          notes:
            "Temporal QA E32A",
          source: "manual",
          duration_minutes: 60,
        },
        p_idempotency_key:
          `e32a-res-${suffix}`,
      },
    );

  if (reservationError) {
    throw reservationError;
  }

  reservationId =
    reservation.id;

  const {
    error: confirmError,
  } =
    await userA.rpc(
      "set_business_reservation_status",
      {
        p_business_id:
          fixture.businessAId,
        p_reservation_id:
          reservationId,
        p_status:
          "confirmed",
      },
    );

  if (confirmError) {
    throw confirmError;
  }

  const {
    error: tableError,
  } =
    await userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id:
          fixture.businessAId,
        p_reservation_id:
          reservationId,
        p_table_ids: [
          fixture.floorTableAId,
        ],
      },
    );

  if (tableError) {
    throw tableError;
  }

  const {
    data: insertedOrder,
    error: orderError,
  } =
    await admin
      .from("business_orders")
      .insert({
        business_id:
          fixture.businessAId,
        order_kind:
          "dine_in",
        reservation_id:
          reservationId,
        status:
          "open",
        revision: 1,
        subtotal: 2500,
      })
      .select("id")
      .single();

  if (orderError) {
    throw orderError;
  }

  orderId =
    insertedOrder.id;

  const {
    error: itemError,
  } =
    await admin
      .from("business_order_items")
      .insert({
        business_id:
          fixture.businessAId,
        order_id:
          orderId,
        order_kind:
          "dine_in",
        menu_item_id:
          menuItemAId,
        name_snapshot:
          "E32A Plato canónico",
        unit_price_snapshot:
          1250,
        quantity: 2,
      });

  if (itemError) {
    throw itemError;
  }

  console.log(
    "✓ reserva confirmada y pedido canónico de $2500 preparados",
  );

  await expectFailure(
    userA.rpc(
      "complete_business_reservation_payment",
      {
        p_business_id:
          fixture.businessAId,
        ...paymentPayload(
          reservationId,
          `e32a-no-cash-${suffix}`,
          [
            {
              method: "cash",
              amount: 2500,
            },
          ],
        ),
      },
    ),
    "el cobro debe requerir caja abierta",
  );
  console.log(
    "✓ no se puede cobrar sin caja abierta para la fecha",
  );

  await expectFailure(
    anonymous.rpc(
      "open_business_cash_session",
      {
        p_business_id:
          fixture.businessAId,
        p_business_date:
          reservationDate,
        p_opening_amount:
          5000,
        p_operation_key:
          `e32a-anon-open-${suffix}`,
      },
    ),
    "anon no debe abrir caja",
  );

  await expectFailure(
    userB.rpc(
      "open_business_cash_session",
      {
        p_business_id:
          fixture.businessAId,
        p_business_date:
          reservationDate,
        p_opening_amount:
          5000,
        p_operation_key:
          `e32a-bola-open-${suffix}`,
      },
    ),
    "B no debe abrir caja de A",
  );
  console.log(
    "✓ anon y usuario B no pueden abrir la caja de A",
  );

  const openKey =
    `e32a-open-${suffix}`;
  const openPayload = {
    p_business_id:
      fixture.businessAId,
    p_business_date:
      reservationDate,
    p_opening_amount:
      5000,
    p_operation_key:
      openKey,
  };

  const {
    data: opened,
    error: openError,
  } =
    await userA.rpc(
      "open_business_cash_session",
      openPayload,
    );

  if (openError) {
    throw openError;
  }

  cashSessionId =
    opened.id;

  assert.equal(
    opened.status,
    "open",
  );
  assert.equal(
    Number(
      opened.opening_amount,
    ),
    5000,
  );

  const {
    data: openReplay,
    error: openReplayError,
  } =
    await userA.rpc(
      "open_business_cash_session",
      openPayload,
    );

  if (openReplayError) {
    throw openReplayError;
  }

  assert.equal(
    openReplay.id,
    cashSessionId,
  );
  console.log(
    "✓ apertura de caja es idempotente",
  );

  await expectFailure(
    userA.rpc(
      "open_business_cash_session",
      {
        ...openPayload,
        p_opening_amount:
          5001,
      },
    ),
    "misma key de apertura con otro monto debe fallar",
  );
  console.log(
    "✓ clave de apertura conflictiva no cambia el monto",
  );

  const {
    data: ownSession,
    error: ownSessionError,
  } =
    await userA
      .from("cash_sessions")
      .select(
        "id, business_date, status, opening_amount",
      )
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "id",
        cashSessionId,
      );

  if (ownSessionError) {
    throw ownSessionError;
  }

  const {
    data: foreignSession,
    error: foreignSessionError,
  } =
    await userB
      .from("cash_sessions")
      .select("id")
      .eq(
        "id",
        cashSessionId,
      );

  if (foreignSessionError) {
    throw foreignSessionError;
  }

  assert.equal(
    ownSession.length,
    1,
  );
  assert.deepEqual(
    foreignSession,
    [],
  );
  console.log(
    "✓ RLS muestra la caja a A y la oculta frente a B",
  );

  await expectFailure(
    userA
      .from("cash_sessions")
      .update({
        opening_amount:
          1,
      })
      .eq(
        "id",
        cashSessionId,
      ),
    "DML directo de caja debe fallar",
  );
  console.log(
    "✓ navegador no puede modificar cash_sessions directamente",
  );

  await expectFailure(
    anonymous.rpc(
      "complete_business_reservation_payment",
      {
        p_business_id:
          fixture.businessAId,
        ...paymentPayload(
          reservationId,
          `e32a-anon-pay-${suffix}`,
          [
            {
              method: "cash",
              amount: 2500,
            },
          ],
        ),
      },
    ),
    "anon no debe cobrar",
  );

  await expectFailure(
    userB.rpc(
      "complete_business_reservation_payment",
      {
        p_business_id:
          fixture.businessAId,
        ...paymentPayload(
          reservationId,
          `e32a-bola-pay-${suffix}`,
          [
            {
              method: "cash",
              amount: 2500,
            },
          ],
        ),
      },
    ),
    "B no debe cobrar reserva de A",
  );
  console.log(
    "✓ anon y usuario B no pueden cobrar la reserva de A",
  );

  const mismatchKey =
    `e32a-mismatch-${suffix}`;

  await expectFailure(
    userA.rpc(
      "complete_business_reservation_payment",
      {
        p_business_id:
          fixture.businessAId,
        ...paymentPayload(
          reservationId,
          mismatchKey,
          [
            {
              method: "cash",
              amount: 2499,
            },
          ],
        ),
      },
    ),
    "total distinto del pedido debe fallar",
  );

  const {
    data: orderAfterMismatch,
    error: orderAfterMismatchError,
  } =
    await userA
      .from("business_orders")
      .select("status, subtotal")
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "id",
        orderId,
      )
      .single();

  if (orderAfterMismatchError) {
    throw orderAfterMismatchError;
  }

  assert.equal(
    orderAfterMismatch.status,
    "open",
  );
  assert.equal(
    Number(
      orderAfterMismatch.subtotal,
    ),
    2500,
  );

  const {
    data: failedOperations,
    error: failedOperationsError,
  } =
    await admin
      .from(
        "business_payment_operations",
      )
      .select("id")
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "operation_key",
        mismatchKey,
      );

  if (failedOperationsError) {
    throw failedOperationsError;
  }

  assert.deepEqual(
    failedOperations,
    [],
  );
  console.log(
    "✓ total incorrecto revierte sin cerrar pedido ni crear operación",
  );

  const paymentKey =
    `e32a-pay-${suffix}`;
  const mixedPayments = [
    {
      method:
        "cash",
      amount: 1000,
    },
    {
      method:
        "card",
      amount: 500,
    },
    {
      method:
        "mercado_pago",
      amount: 500,
    },
    {
      method:
        "transfer",
      amount: 500,
    },
  ];
  const validPaymentPayload = {
    p_business_id:
      fixture.businessAId,
    ...paymentPayload(
      reservationId,
      paymentKey,
      mixedPayments,
    ),
  };

  const {
    data: completed,
    error: completedError,
  } =
    await userA.rpc(
      "complete_business_reservation_payment",
      validPaymentPayload,
    );

  if (completedError) {
    throw completedError;
  }

  paymentOperationId =
    completed.operation_id;

  assert.equal(
    completed.order.status,
    "completed",
  );
  assert.equal(
    completed.reservation.status,
    "completed",
  );
  assert.equal(
    Number(
      completed.total_amount,
    ),
    2500,
  );
  assert.equal(
    completed.payments.length,
    4,
  );

  const returnedMethods =
    new Set(
      completed.payments.map(
        (payment) =>
          payment.method,
      ),
    );

  assert.deepEqual(
    returnedMethods,
    new Set([
      "cash",
      "card",
      "mercado_pago",
      "transfer",
    ]),
  );
  console.log(
    "✓ cobro mixto persiste cuatro componentes y completa pedido + reserva",
  );

  const {
    data: replay,
    error: replayError,
  } =
    await userA.rpc(
      "complete_business_reservation_payment",
      validPaymentPayload,
    );

  if (replayError) {
    throw replayError;
  }

  assert.equal(
    replay.operation_id,
    paymentOperationId,
  );

  const {
    data: operationRows,
    error: operationRowsError,
  } =
    await admin
      .from(
        "business_payment_operations",
      )
      .select("id")
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "operation_key",
        paymentKey,
      );

  if (operationRowsError) {
    throw operationRowsError;
  }

  assert.equal(
    operationRows.length,
    1,
  );
  console.log(
    "✓ reintento del cobro no duplica la operación",
  );

  await expectFailure(
    userA.rpc(
      "complete_business_reservation_payment",
      {
        p_business_id:
          fixture.businessAId,
        ...paymentPayload(
          reservationId,
          paymentKey,
          [
            {
              method: "cash",
              amount: 2500,
            },
          ],
        ),
      },
    ),
    "misma key con desglose diferente debe fallar",
  );
  console.log(
    "✓ misma clave con desglose distinto devuelve conflicto",
  );

  const {
    data: ownPayments,
    error: ownPaymentsError,
  } =
    await userA
      .from("business_payments")
      .select(
        "id, payment_method, amount, cash_session_id",
      )
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "reservation_id",
        reservationId,
      );

  if (ownPaymentsError) {
    throw ownPaymentsError;
  }

  const {
    data: foreignPayments,
    error: foreignPaymentsError,
  } =
    await userB
      .from("business_payments")
      .select("id")
      .eq(
        "reservation_id",
        reservationId,
      );

  if (foreignPaymentsError) {
    throw foreignPaymentsError;
  }

  assert.equal(
    ownPayments.length,
    4,
  );
  assert.ok(
    ownPayments.every(
      (payment) =>
        payment.cash_session_id
        === cashSessionId,
    ),
  );
  assert.deepEqual(
    foreignPayments,
    [],
  );
  console.log(
    "✓ pagos quedan vinculados a la caja y aislados por tenant",
  );

  const cashRows =
    ownPayments.filter(
      (payment) =>
        payment.payment_method
        === "cash",
    );

  assert.equal(
    cashRows.length,
    1,
  );
  assert.equal(
    Number(
      cashRows[0].amount,
    ),
    1000,
  );
  console.log(
    "✓ componente efectivo queda separado de tarjeta/MP/transferencia",
  );

  await expectFailure(
    userA
      .from("business_payments")
      .update({
        amount:
          1,
      })
      .eq(
        "reservation_id",
        reservationId,
      ),
    "DML directo de pagos debe fallar",
  );

  await expectFailure(
    userA
      .from(
        "business_payment_operations",
      )
      .select("id"),
    "tabla técnica de idempotencia no debe ser legible",
  );
  console.log(
    "✓ pagos son inmutables desde navegador y la tabla técnica permanece privada",
  );

  const {
    data: finalReservation,
    error: finalReservationError,
  } =
    await userA
      .from("reservations")
      .select(
        "status, completed_at",
      )
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "id",
        reservationId,
      )
      .single();

  if (finalReservationError) {
    throw finalReservationError;
  }

  assert.equal(
    finalReservation.status,
    "completed",
  );
  assert.ok(
    finalReservation.completed_at,
  );
  console.log(
    "✓ cierre financiero deja la reserva en estado terminal canónico",
  );

  console.log(
    "Backend Caja/Pagos E32A aprobado en staging (17 controles).",
  );
} finally {
  if (reservationId) {
    await admin
      .from("business_payments")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "reservation_id",
        reservationId,
      );

    await admin
      .from(
        "business_payment_operations",
      )
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "reservation_id",
        reservationId,
      );
  }

  if (orderId) {
    await admin
      .from("business_order_items")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "order_id",
        orderId,
      );

    await admin
      .from("business_orders")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "id",
        orderId,
      );
  }

  if (cashSessionId) {
    await admin
      .from("cash_sessions")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "id",
        cashSessionId,
      );
  }

  if (reservationId) {
    await admin
      .from(
        "reservation_table_assignments",
      )
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "reservation_id",
        reservationId,
      );

    await admin
      .from("reservations")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "id",
        reservationId,
      );
  }

  if (menuItemAId) {
    await admin
      .from("menu_items")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "id",
        menuItemAId,
      );
  }

  await Promise.allSettled([
    userA.auth.signOut(),
    userB.auth.signOut(),
  ]);

  console.log(
    "✓ datos temporales y sesiones E32A fueron limpiados",
  );
}
