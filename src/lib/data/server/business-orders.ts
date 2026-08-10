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
