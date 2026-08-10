import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapBusinessCashSessionResult,
  mapBusinessPaymentRow,
  type BusinessCashSession,
  type BusinessPayment,
} from "@/lib/payments/business-payment-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function getBusinessCashSessionForDate(
  businessId: string,
  businessDate: string,
): Promise<BusinessCashSession | null> {
  assertServerOnly(
    "getBusinessCashSessionForDate",
  );

  const supabase =
    await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error(
      "No se pudo crear el cliente autenticado.",
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("cash_sessions")
    .select(
      "id, business_date, status, opening_amount, opened_at",
    )
    .eq(
      "business_id",
      businessId,
    )
    .eq(
      "business_date",
      businessDate,
    )
    .maybeSingle();

  if (error) {
    console.error(
      "[business-cash] session read failed",
      {
        code:
          error.code ?? null,
      },
    );

    throw new Error(
      "No se pudo leer la caja persistente.",
    );
  }

  return data
    ? mapBusinessCashSessionResult(
        data,
      )
    : null;
}

export async function getBusinessPaymentsForReservations(
  businessId: string,
  reservationIds: string[],
): Promise<
  Array<{
    reservationId: string;
    payment: BusinessPayment;
  }>
> {
  assertServerOnly(
    "getBusinessPaymentsForReservations",
  );

  const uniqueReservationIds =
    [
      ...new Set(
        reservationIds.filter(Boolean),
      ),
    ];

  if (uniqueReservationIds.length === 0) {
    return [];
  }

  if (uniqueReservationIds.length > 500) {
    throw new Error(
      "La lectura de pagos supera el límite operativo.",
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
    data,
    error,
  } = await supabase
    .from("business_payments")
    .select(
      "id, reservation_id, payment_method, amount, created_at",
    )
    .eq(
      "business_id",
      businessId,
    )
    .in(
      "reservation_id",
      uniqueReservationIds,
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (error) {
    console.error(
      "[business-cash] payments read failed",
      {
        code:
          error.code ?? null,
      },
    );

    throw new Error(
      "No se pudieron leer los pagos persistentes.",
    );
  }

  return (
    data ?? []
  ).map((row) => {
    const reservationId =
      typeof row.reservation_id === "string"
        ? row.reservation_id
        : "";

    if (!reservationId) {
      throw new Error(
        "La relación del pago persistente no es válida.",
      );
    }

    return {
      reservationId,
      payment:
        mapBusinessPaymentRow(
          row,
        ),
    };
  });
}
