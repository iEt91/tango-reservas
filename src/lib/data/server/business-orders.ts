import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapBusinessDineInOrder,
  type BusinessOrderDatabaseRow,
  type BusinessOrderItemDatabaseRow,
} from "@/lib/orders/business-order-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function getBusinessDineInOrderForReservation(
  businessId: string,
  reservationId: string,
) {
  assertServerOnly(
    "getBusinessDineInOrderForReservation",
  );

  const supabase =
    await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error(
      "No se pudo crear el cliente autenticado.",
    );
  }

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from("business_orders")
    .select(
      "id, reservation_id, status, revision, subtotal, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .eq("reservation_id", reservationId)
    .eq("order_kind", "dine_in")
    .maybeSingle();

  if (orderError) {
    console.error(
      "[business-orders] reservation order read failed",
      {
        code: orderError.code ?? null,
      },
    );

    throw new Error(
      "No se pudo leer el consumo persistente de la reserva.",
    );
  }

  if (!order) {
    return null;
  }

  const {
    data: items,
    error: itemsError,
  } = await supabase
    .from("business_order_items")
    .select(
      "id, menu_item_id, name_snapshot, unit_price_snapshot, quantity",
    )
    .eq("business_id", businessId)
    .eq("order_id", order.id)
    .eq("order_kind", "dine_in")
    .order("name_snapshot", {
      ascending: true,
    });

  if (itemsError) {
    console.error(
      "[business-orders] reservation items read failed",
      {
        code: itemsError.code ?? null,
      },
    );

    throw new Error(
      "No se pudieron leer los platos del consumo persistente.",
    );
  }

  return mapBusinessDineInOrder(
    order as BusinessOrderDatabaseRow,
    (items ?? []) as BusinessOrderItemDatabaseRow[],
  );
}

export async function getBusinessDineInOrdersForReservations(
  businessId: string,
  reservationIds: string[],
) {
  assertServerOnly(
    "getBusinessDineInOrdersForReservations",
  );

  const uniqueReservationIds = [
    ...new Set(
      reservationIds.filter(Boolean),
    ),
  ];

  if (uniqueReservationIds.length === 0) {
    return [];
  }

  if (uniqueReservationIds.length > 500) {
    throw new Error(
      "La lectura de consumo supera el límite operativo.",
    );
  }

  const supabase =
    await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error(
      "No se pudo crear el cliente autenticado.",
    );
  }

  const {
    data: orders,
    error: ordersError,
  } = await supabase
    .from("business_orders")
    .select(
      "id, reservation_id, status, revision, subtotal, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .eq("order_kind", "dine_in")
    .in("reservation_id", uniqueReservationIds)
    .order("created_at", {
      ascending: true,
    });

  if (ordersError) {
    console.error(
      "[business-orders] reservation orders batch read failed",
      {
        code: ordersError.code ?? null,
      },
    );

    throw new Error(
      "No se pudieron leer los consumos persistentes.",
    );
  }

  const orderRows =
    (orders ?? []) as BusinessOrderDatabaseRow[];
  const orderIds = orderRows
    .map((order) =>
      typeof order.id === "string"
        ? order.id
        : "",
    )
    .filter(Boolean);

  if (orderIds.length === 0) {
    return [];
  }

  const {
    data: items,
    error: itemsError,
  } = await supabase
    .from("business_order_items")
    .select(
      "id, order_id, menu_item_id, name_snapshot, unit_price_snapshot, quantity",
    )
    .eq("business_id", businessId)
    .eq("order_kind", "dine_in")
    .in("order_id", orderIds)
    .order("name_snapshot", {
      ascending: true,
    });

  if (itemsError) {
    console.error(
      "[business-orders] reservation order items batch read failed",
      {
        code: itemsError.code ?? null,
      },
    );

    throw new Error(
      "No se pudieron leer los platos persistentes.",
    );
  }

  const itemsByOrderId = new Map<
    string,
    BusinessOrderItemDatabaseRow[]
  >();

  for (const rawItem of items ?? []) {
    const item =
      rawItem as BusinessOrderItemDatabaseRow & {
        order_id?: unknown;
      };
    const orderId =
      typeof item.order_id === "string"
        ? item.order_id
        : "";

    if (!orderId) continue;

    const current =
      itemsByOrderId.get(orderId)
      ?? [];
    current.push(item);
    itemsByOrderId.set(
      orderId,
      current,
    );
  }

  return orderRows.map((order) =>
    mapBusinessDineInOrder(
      order,
      itemsByOrderId.get(
        String(order.id ?? ""),
      ) ?? [],
    ),
  );
}
