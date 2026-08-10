"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import {
  mapBusinessReservationPaymentResult,
  normalizeBusinessReservationPaymentInput,
  toBusinessReservationPaymentRpcPayload,
  type BusinessReservationPaymentResult,
} from "@/lib/payments/business-payment-contract";
import { hasStaffAccess } from "@/lib/staff/staff-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type BusinessReservationPaymentActionResult =
  | {
      ok: true;
      payment: BusinessReservationPaymentResult;
    }
  | {
      ok: false;
      error: string;
    };

function formatReservationPaymentError(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
) {
  const message =
    error?.message?.toLowerCase() ?? "";

  if (error?.code === "42501") {
    return "No tenés permisos de Caja para registrar este cobro.";
  }

  if (error?.code === "22023") {
    return "Los medios de pago o sus importes no son válidos.";
  }

  if (error?.code === "23505") {
    return "La operación de cobro ya existe con datos diferentes.";
  }

  if (error?.code === "23514") {
    if (message.includes("canonical order subtotal")) {
      return "El total cobrado debe coincidir exactamente con el consumo persistente.";
    }

    if (message.includes("zero-total")) {
      return "Un consumo sin saldo no debe incluir importes de pago.";
    }

    return "El cobro no cumple el contrato persistente.";
  }

  if (error?.code === "P0001") {
    if (message.includes("cash session")) {
      return "Abrí la caja correspondiente a la fecha de la reserva antes de cobrar.";
    }

    if (message.includes("confirmed")) {
      return "La reserva debe estar confirmada antes de cobrar.";
    }

    if (message.includes("order")) {
      return "El consumo persistente no está abierto para cobrar.";
    }

    return "La reserva no está en condiciones de registrar el cobro.";
  }

  return "No se pudo registrar el cobro persistente.";
}

async function resolveReservationPaymentContext() {
  const activeBusiness =
    await resolveActiveBusiness();

  if (activeBusiness.status !== "ready") {
    return {
      ok: false as const,
      error:
        "La sesión o el negocio activo ya no son válidos.",
    };
  }

  if (
    activeBusiness.membership.role === "staff"
    && !hasStaffAccess(
      activeBusiness.membership.permissions,
      "cash",
      "manage",
    )
  ) {
    return {
      ok: false as const,
      error:
        "No tenés permisos de Caja para registrar este cobro.",
    };
  }

  const supabase =
    await createSupabaseAuthServerClient();

  if (!supabase) {
    return {
      ok: false as const,
      error:
        "No se pudo crear el cliente autenticado.",
    };
  }

  return {
    ok: true as const,
    businessId:
      activeBusiness.membership.businessId,
    supabase,
  };
}

export async function completeBusinessReservationPaymentAction(
  input: unknown,
): Promise<BusinessReservationPaymentActionResult> {
  try {
    const normalized =
      normalizeBusinessReservationPaymentInput(
        input,
      );
    const context =
      await resolveReservationPaymentContext();

    if (!context.ok) {
      return context;
    }

    const payload =
      toBusinessReservationPaymentRpcPayload(
        normalized,
      );

    const {
      data,
      error,
    } = await context.supabase.rpc(
      "complete_business_reservation_payment",
      {
        p_business_id:
          context.businessId,
        ...payload,
      },
    );

    if (
      error
      || !data
    ) {
      console.error(
        "[reservation-payment] complete RPC failed",
        {
          code:
            error?.code ?? null,
        },
      );

      return {
        ok: false,
        error:
          formatReservationPaymentError(
            error,
          ),
      };
    }

    const payment =
      mapBusinessReservationPaymentResult(
        data,
      );

    revalidatePath("/local");
    revalidatePath("/local/reservas");
    revalidatePath("/local/caja");
    revalidatePath("/local/historial");

    return {
      ok: true,
      payment,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el cobro.",
    };
  }
}
