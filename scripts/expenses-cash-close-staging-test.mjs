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

if (
  fixture.businessAId
  === fixture.businessBId
) {
  throw new Error(
    "Los negocios A/B del fixture deben ser diferentes.",
  );
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
  randomUUID();
const businessDate =
  "2098-12-30";
const openKey =
  `e32c-open-${suffix}`;
const expenseKey =
  `e32c-expense-${suffix}`;
const movementKey =
  `e32c-movement-${suffix}`;
const closeKey =
  `e32c-close-${suffix}`;
const reopenKey =
  `e32c-reopen-${suffix}`;

let sessionId = null;
let expenseId = null;

try {
  await admin
    .from("cash_sessions")
    .delete()
    .eq(
      "business_id",
      businessA,
    )
    .eq(
      "business_date",
      businessDate,
    );

  const {
    data: session,
    error: openError,
  } = await userA.rpc(
    "open_business_cash_session",
    {
      p_business_id:
        businessA,
      p_business_date:
        businessDate,
      p_opening_amount:
        1000,
      p_operation_key:
        openKey,
    },
  );

  if (openError) {
    throw openError;
  }

  sessionId =
    session.id;

  const {
    data: expense,
    error: expenseError,
  } = await userA.rpc(
    "save_business_expense",
    {
      p_business_id:
        businessA,
      p_expense_id:
        null,
      p_expense_date:
        businessDate,
      p_due_date:
        businessDate,
      p_description:
        "Gasto QA E32C",
      p_provider:
        "Proveedor QA",
      p_category:
        "Servicios",
      p_amount:
        200,
      p_status:
        "paid",
      p_payment_method:
        "cash",
      p_operation_key:
        expenseKey,
    },
  );

  if (expenseError) {
    throw expenseError;
  }

  expenseId =
    expense.id;

  const {
    data: replay,
    error: replayError,
  } = await userA.rpc(
    "save_business_expense",
    {
      p_business_id:
        businessA,
      p_expense_id:
        null,
      p_expense_date:
        businessDate,
      p_due_date:
        businessDate,
      p_description:
        "Gasto QA E32C",
      p_provider:
        "Proveedor QA",
      p_category:
        "Servicios",
      p_amount:
        200,
      p_status:
        "paid",
      p_payment_method:
        "cash",
      p_operation_key:
        expenseKey,
    },
  );

  if (replayError) {
    throw replayError;
  }

  assert.equal(
    replay.id,
    expenseId,
    "el alta de gasto debe ser idempotente",
  );

  const {
    data: crossTenantExpenses,
    error: crossTenantReadError,
  } = await userB
    .from(
      "business_expenses",
    )
    .select("id")
    .eq(
      "business_id",
      businessA,
    );

  if (crossTenantReadError) {
    throw crossTenantReadError;
  }

  assert.deepEqual(
    crossTenantExpenses,
    [],
    "RLS debe ocultar los Gastos del negocio A al usuario B",
  );

  await expectFailure(
    userB.rpc(
      "save_business_expense",
      {
        p_business_id:
          businessA,
        p_expense_id:
          null,
        p_expense_date:
          businessDate,
        p_due_date:
          null,
        p_description:
          "BOLA RPC",
        p_provider:
          "",
        p_category:
          "QA",
        p_amount:
          1,
        p_status:
          "pending",
        p_payment_method:
          "card",
        p_operation_key:
          `bola-expense-${suffix}`,
      },
    ),
    "la RPC de Gastos debe rechazar otro tenant",
  );

  await expectFailure(
    userB.rpc(
      "get_business_cash_reconciliation",
      {
        p_business_id:
          businessA,
        p_business_date:
          businessDate,
      },
    ),
    "la conciliación de Caja debe rechazar otro tenant",
  );

  await expectFailure(
    anonymous.rpc(
      "save_business_expense",
      {
        p_business_id:
          businessA,
        p_expense_id:
          null,
        p_expense_date:
          businessDate,
        p_due_date:
          null,
        p_description:
          "Anon",
        p_provider:
          "",
        p_category:
          "QA",
        p_amount:
          1,
        p_status:
          "pending",
        p_payment_method:
          "cash",
        p_operation_key:
          `anon-${suffix}`,
      },
    ),
    "anon no debe ejecutar Gastos",
  );

  const {
    data: movement,
    error: movementError,
  } = await userA.rpc(
    "add_business_cash_movement",
    {
      p_business_id:
        businessA,
      p_cash_session_id:
        sessionId,
      p_movement_type:
        "income",
      p_amount:
        50,
      p_reason:
        "Ajuste QA E32C",
      p_operation_key:
        movementKey,
    },
  );

  if (movementError) {
    throw movementError;
  }

  assert.equal(
    Number(movement.amount),
    50,
  );

  const {
    data: beforeClose,
    error: reconciliationError,
  } = await userA.rpc(
    "get_business_cash_reconciliation",
    {
      p_business_id:
        businessA,
      p_business_date:
        businessDate,
    },
  );

  if (reconciliationError) {
    throw reconciliationError;
  }

  assert.equal(
    Number(beforeClose.cashExpenses),
    200,
  );
  assert.equal(
    Number(beforeClose.movementNet),
    50,
  );
  assert.equal(
    Number(beforeClose.expectedCash),
    850,
  );

  const {
    data: closed,
    error: closeError,
  } = await userA.rpc(
    "close_business_cash_session",
    {
      p_business_id:
        businessA,
      p_cash_session_id:
        sessionId,
      p_actual_cash:
        850,
      p_notes:
        "Cierre QA E32C",
      p_operation_key:
        closeKey,
    },
  );

  if (closeError) {
    throw closeError;
  }

  assert.equal(
    closed.session.status,
    "closed",
  );
  assert.equal(
    Number(
      closed.session.expected_cash,
    ),
    850,
  );
  assert.equal(
    Number(
      closed.session.difference,
    ),
    0,
  );

  await expectFailure(
    userA.rpc(
      "save_business_expense",
      {
        p_business_id:
          businessA,
        p_expense_id:
          expenseId,
        p_expense_date:
          businessDate,
        p_due_date:
          businessDate,
        p_description:
          "Gasto QA E32C",
        p_provider:
          "Proveedor QA",
        p_category:
          "Servicios",
        p_amount:
          201,
        p_status:
          "paid",
        p_payment_method:
          "cash",
        p_operation_key:
          `blocked-${suffix}`,
      },
    ),
    "un gasto cash cerrado debe quedar congelado",
  );

  const {
    data: reopened,
    error: reopenError,
  } = await userA.rpc(
    "reopen_business_cash_session",
    {
      p_business_id:
        businessA,
      p_cash_session_id:
        sessionId,
      p_operation_key:
        reopenKey,
    },
  );

  if (reopenError) {
    throw reopenError;
  }

  assert.equal(
    reopened.session.status,
    "open",
  );

  await expectFailure(
    userA
      .from(
        "business_expenses",
      )
      .insert({
        business_id:
          businessA,
        expense_date:
          businessDate,
        description:
          "DML directo",
        category:
          "QA",
        amount:
          1,
        status:
          "pending",
        payment_method:
          "cash",
      }),
    "DML directo de Gastos debe fallar",
  );

  await expectFailure(
    userA
      .from(
        "business_expense_operations",
      )
      .select("id"),
    "tabla de idempotencia de Gastos debe ser privada",
  );

  console.log(
    "✓ staging E32C: Gastos, conciliación, cierre, reapertura, BOLA y DML pasaron",
  );
} finally {
  if (sessionId) {
    await admin
      .from(
        "cash_sessions",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .eq(
        "id",
        sessionId,
      );
  }

  if (expenseId) {
    await admin
      .from(
        "business_expenses",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .eq(
        "id",
        expenseId,
      );
  }
}

console.log(
  "E32C_STAGING_PASS",
);
