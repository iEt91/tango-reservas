import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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

async function signIn(
  target,
  email,
  password,
) {
  const { error } =
    await target.auth.signInWithPassword({
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
  const { error } = await promise;
  assert.ok(error, label);
  return error;
}

const suffix = randomUUID();
const productName = `E29A Stock ${suffix}`;
const operationKey =
  `e29a-reservation-${suffix}`;

const productPayload = {
  name: productName,
  category: "QA E29A",
  supplier: "Proveedor QA",
  unit: "kg",
  unit_cost: 1500,
  alert_below: 2,
  note: "Temporal, se elimina al finalizar.",
  is_active: true,
};

let productId = null;

console.log(
  "Ejecutando backend persistente de Stock en staging...",
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
    "✓ ambos usuarios se autenticaron",
  );

  await expectFailure(
    anonymous.rpc(
      "save_business_stock_product",
      {
        p_business_id: fixture.businessAId,
        p_product_id: null,
        p_product: productPayload,
      },
    ),
    "anon no debe guardar productos",
  );
  console.log(
    "✓ anon no puede ejecutar RPC de Stock",
  );

  const {
    data: product,
    error: productError,
  } = await userA.rpc(
    "save_business_stock_product",
    {
      p_business_id: fixture.businessAId,
      p_product_id: null,
      p_product: productPayload,
    },
  );

  if (productError) {
    throw productError;
  }

  productId = product.id;
  assert.equal(
    product.business_id,
    fixture.businessAId,
  );
  assert.equal(product.name, productName);
  console.log(
    "✓ owner A creó un insumo",
  );

  const {
    data: ownRead,
    error: ownReadError,
  } = await userA
    .from("stock_products")
    .select("id, business_id, name")
    .eq("id", productId);

  if (ownReadError) {
    throw ownReadError;
  }

  assert.equal(ownRead.length, 1);
  console.log(
    "✓ RLS permite leer el insumo propio",
  );

  const {
    data: bolaRead,
    error: bolaReadError,
  } = await userB
    .from("stock_products")
    .select("id")
    .eq("id", productId);

  if (bolaReadError) {
    throw bolaReadError;
  }

  assert.deepEqual(bolaRead, []);
  console.log(
    "✓ RLS oculta el insumo de A al usuario B",
  );

  await expectFailure(
    userA
      .from("stock_products")
      .insert({
        business_id: fixture.businessAId,
        name: `DML ${suffix}`,
        category: "QA",
        unit: "kg",
      }),
    "DML directo de productos debe fallar",
  );

  await expectFailure(
    userA
      .from("stock_movements")
      .insert({
        business_id: fixture.businessAId,
        product_id: productId,
        movement_type: "opening",
        origin: "manual",
        quantity_delta: 1,
        product_name_snapshot: productName,
        unit_snapshot: "kg",
        unit_cost_snapshot: 1500,
        label: "DML",
      }),
    "DML directo de movimientos debe fallar",
  );
  console.log(
    "✓ DML directo permanece bloqueado",
  );

  await expectFailure(
    userB.rpc(
      "save_business_stock_product",
      {
        p_business_id: fixture.businessAId,
        p_product_id: productId,
        p_product: {
          ...productPayload,
          name: `BOLA ${suffix}`,
        },
      },
    ),
    "B no debe modificar A",
  );
  console.log(
    "✓ usuario B no puede modificar el Stock de A",
  );

  const {
    data: opening,
    error: openingError,
  } = await userA.rpc(
    "record_business_stock_movement",
    {
      p_business_id: fixture.businessAId,
      p_product_id: productId,
      p_movement: {
        movement_type: "opening",
        origin: "manual",
        quantity_delta: 10,
        operation_key: null,
        reference_id: null,
        label: "Stock inicial QA",
        detail: "",
        unit_cost: 1500,
      },
    },
  );

  if (openingError) {
    throw openingError;
  }

  assert.equal(Number(opening.quantity_delta), 10);
  console.log(
    "✓ stock inicial se registró en el ledger",
  );

  await expectFailure(
    userA.rpc(
      "record_business_stock_movement",
      {
        p_business_id: fixture.businessAId,
        p_product_id: productId,
        p_movement: {
          movement_type: "opening",
          origin: "manual",
          quantity_delta: 1,
          operation_key: null,
          reference_id: null,
          label: "Segundo opening",
          detail: "",
          unit_cost: 1500,
        },
      },
    ),
    "no debe aceptar un segundo opening",
  );
  console.log(
    "✓ opening solo puede ser el primer movimiento",
  );

  const consumptionPayload = {
    movement_type: "consumption",
    origin: "reservation",
    quantity_delta: -3,
    operation_key: operationKey,
    reference_id: `reservation-${suffix}`,
    label: "Consumo reserva QA",
    detail: "",
    unit_cost: 1500,
  };

  const {
    data: consumption,
    error: consumptionError,
  } = await userA.rpc(
    "record_business_stock_movement",
    {
      p_business_id: fixture.businessAId,
      p_product_id: productId,
      p_movement: consumptionPayload,
    },
  );

  if (consumptionError) {
    throw consumptionError;
  }

  const {
    data: retried,
    error: retryError,
  } = await userA.rpc(
    "record_business_stock_movement",
    {
      p_business_id: fixture.businessAId,
      p_product_id: productId,
      p_movement: consumptionPayload,
    },
  );

  if (retryError) {
    throw retryError;
  }

  assert.equal(retried.id, consumption.id);
  console.log(
    "✓ reintento idempotente devuelve el mismo movimiento",
  );

  await expectFailure(
    userA.rpc(
      "record_business_stock_movement",
      {
        p_business_id: fixture.businessAId,
        p_product_id: productId,
        p_movement: {
          ...consumptionPayload,
          quantity_delta: -2,
        },
      },
    ),
    "misma operation_key con datos distintos debe fallar",
  );
  console.log(
    "✓ operation_key rechaza payload contradictorio",
  );

  await expectFailure(
    userA.rpc(
      "record_business_stock_movement",
      {
        p_business_id: fixture.businessAId,
        p_product_id: productId,
        p_movement: {
          movement_type: "consumption",
          origin: "reservation",
          quantity_delta: -1,
          operation_key: null,
          reference_id: "sin-idempotencia",
          label: "Sin clave",
          detail: "",
          unit_cost: 1500,
        },
      },
    ),
    "reserva sin operation_key debe fallar",
  );
  console.log(
    "✓ movimientos operativos exigen idempotencia",
  );

  await expectFailure(
    userA.rpc(
      "record_business_stock_movement",
      {
        p_business_id: fixture.businessAId,
        p_product_id: productId,
        p_movement: {
          movement_type: "consumption",
          origin: "manual",
          quantity_delta: -100,
          operation_key: null,
          reference_id: null,
          label: "Sobreconsumo",
          detail: "",
          unit_cost: 1500,
        },
      },
    ),
    "no debe permitir stock negativo",
  );
  console.log(
    "✓ una operación no puede dejar stock negativo",
  );

  await expectFailure(
    userA.rpc(
      "archive_business_stock_product",
      {
        p_business_id: fixture.businessAId,
        p_product_id: productId,
      },
    ),
    "no debe archivar con saldo",
  );
  console.log(
    "✓ no se elimina un insumo con saldo restante",
  );

  const {
    error: zeroError,
  } = await userA.rpc(
    "record_business_stock_movement",
    {
      p_business_id: fixture.businessAId,
      p_product_id: productId,
      p_movement: {
        movement_type: "adjustment",
        origin: "manual",
        quantity_delta: -7,
        operation_key: null,
        reference_id: null,
        label: "Ajuste a cero QA",
        detail: "",
        unit_cost: 1500,
      },
    },
  );

  if (zeroError) {
    throw zeroError;
  }

  const {
    data: archived,
    error: archiveError,
  } = await userA.rpc(
    "archive_business_stock_product",
    {
      p_business_id: fixture.businessAId,
      p_product_id: productId,
    },
  );

  if (archiveError) {
    throw archiveError;
  }

  assert.ok(archived.archived_at);
  console.log(
    "✓ baja lógica funciona cuando el saldo es cero",
  );

  const {
    data: bRows,
    error: bRowsError,
  } = await admin
    .from("stock_products")
    .select("id")
    .eq("business_id", fixture.businessBId)
    .ilike("name", "E29A Stock %");

  if (bRowsError) {
    throw bRowsError;
  }

  assert.equal(bRows.length, 0);
  console.log(
    "✓ la prueba no alteró el Stock del local B",
  );

  console.log(
    "Stock persistente aprobado en staging (14 controles).",
  );
} finally {
  if (productId) {
    const {
      error: movementCleanupError,
    } = await admin
      .from("stock_movements")
      .delete()
      .eq("business_id", fixture.businessAId)
      .eq("product_id", productId);

    if (movementCleanupError) {
      console.error(
        "No se pudieron limpiar movimientos E29A:",
        movementCleanupError.message,
      );
    }

    const {
      error: productCleanupError,
    } = await admin
      .from("stock_products")
      .delete()
      .eq("business_id", fixture.businessAId)
      .eq("id", productId);

    if (productCleanupError) {
      console.error(
        "No se pudo limpiar producto E29A:",
        productCleanupError.message,
      );
    }
  }

  await Promise.allSettled([
    userA.auth.signOut(),
    userB.auth.signOut(),
  ]);

  console.log(
    "✓ datos temporales y sesiones de Stock fueron limpiados",
  );
}
