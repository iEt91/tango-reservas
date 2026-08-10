"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import {
  mapBusinessReservationConsumptionResult,
  normalizeBusinessReservationConsumptionInput,
  toBusinessReservationConsumptionRpcPayload,
  type BusinessDineInOrder,
} from "@/lib/orders/business-order-contract";
import { hasStaffAccess } from "@/lib/staff/staff-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type BusinessReservationConsumptionActionResult =
  | {
      ok: true;
      order: BusinessDineInOrder;
    }
  | {
      ok: false;
      error: string;
    };

function formatConsumptionMutationError(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
) {
  const message =
    error?.message?.toLowerCase() ?? "";

  if (error?.code === "42501") {
    return "No tenés permisos para modificar el consumo de esta reserva.";
  }

  if (error?.code === "23503") {
    return "El plato, la reserva o una relación necesaria ya no está disponible.";
  }

  if (error?.code === "23505") {
    return "La operación ya fue registrada con datos diferentes.";
  }

  if (error?.code === "23514") {
    if (message.includes("stock")) {
      return "No se pudo actualizar el consumo porque falta Stock suficiente o el historial de devolución no es consistente.";
    }

    return "La receta o la devolución del consumo no es válida.";
  }

  if (error?.code === "22023") {
    return "Los platos o las cantidades del consumo no son válidos.";
  }

  if (error?.code === "P0001") {
    if (message.includes("assigned table")) {
      return "Asigná una mesa a la reserva antes de cargar consumo.";
    }

    if (message.includes("confirmed")) {
      return "La reserva debe estar confirmada antes de cargar consumo.";
    }

    if (message.includes("open")) {
      return "El consumo persistente ya no está abierto.";
    }

    return "La reserva no está en condiciones de modificar su consumo.";
  }

  return "No se pudo guardar el consumo persistente.";
}

async function resolveReservationConsumptionContext() {
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
      "reservations",
      "manage",
    )
  ) {
    return {
      ok: false as const,
      error:
        "No tenés permisos para modificar el consumo de esta reserva.",
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

function revalidateReservationConsumptionViews() {
  revalidatePath("/local");
  revalidatePath("/local/reservas");
  revalidatePath("/local/cocina");
  revalidatePath("/local/stock");
  revalidatePath("/local/historial");
}

export async function saveBusinessReservationConsumptionAction(
  input: unknown,
): Promise<BusinessReservationConsumptionActionResult> {
  try {
    const normalized =
      normalizeBusinessReservationConsumptionInput(
        input,
      );
    const context =
      await resolveReservationConsumptionContext();

    if (!context.ok) {
      return context;
    }

    const payload =
      toBusinessReservationConsumptionRpcPayload(
        normalized,
      );

    const {
      data,
      error,
    } = await context.supabase.rpc(
      "save_business_reservation_consumption",
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
        "[reservation-consumption] save RPC failed",
        {
          code:
            error?.code ?? null,
        },
      );

      return {
        ok: false,
        error:
          formatConsumptionMutationError(
            error,
          ),
      };
    }

    const order =
      mapBusinessReservationConsumptionResult(
        data,
      );

    revalidateReservationConsumptionViews();

    return {
      ok: true,
      order,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el consumo.",
    };
  }
}
