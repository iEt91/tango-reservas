"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import {
  mapBusinessReservationRow,
  normalizeBusinessReservation,
  normalizeBusinessReservationStatus,
  normalizeReservationId,
  normalizeReservationIdempotencyKey,
  toBusinessReservationRpcPayload,
  type BusinessReservationDatabaseRow,
  type BusinessReservationEditor,
  type BusinessReservationStatus,
} from "@/lib/reservations/business-reservation-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type BusinessReservationActionResult =
  | {
      ok: true;
      reservation: BusinessReservationEditor;
    }
  | {
      ok: false;
      error: string;
    };

function formatReservationMutationError(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
  fallback: string,
) {
  if (error?.code === "23505") {
    return "La operación ya fue registrada o generó un identificador duplicado.";
  }

  if (error?.code === "42501") {
    return "No tenés permisos para modificar esta reserva.";
  }

  if (error?.code === "22023") {
    return "Los datos o el cambio de estado de la reserva no son válidos.";
  }

  if (error?.code === "P0001") {
    const message = error.message?.toLowerCase() ?? "";

    if (message.includes("outside business hours")) {
      return "La reserva está fuera del horario configurado.";
    }

    if (message.includes("business is closed")) {
      return "El local está cerrado en la fecha seleccionada.";
    }

    if (message.includes("break")) {
      return "La reserva se cruza con una pausa del horario configurado.";
    }

    if (message.includes("capacity")) {
      return "La reserva supera la capacidad disponible del servicio o del horario.";
    }

    if (message.includes("overlapping active reservation")) {
      return "Este teléfono ya tiene una reserva activa que se superpone.";
    }

    if (message.includes("reservations are disabled")) {
      return "Las reservas están desactivadas desde Configuración.";
    }

    return "La reserva no cumple las reglas de disponibilidad configuradas.";
  }

  return fallback;
}

async function resolveReservationContext() {
  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status !== "ready") {
    return {
      ok: false as const,
      error: "La sesión o el negocio activo ya no son válidos.",
    };
  }

  if (
    !["owner", "admin", "staff"].includes(
      activeBusiness.membership.role,
    )
  ) {
    return {
      ok: false as const,
      error: "No tenés permisos para modificar reservas.",
    };
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return {
      ok: false as const,
      error: "No se pudo crear el cliente autenticado.",
    };
  }

  return {
    ok: true as const,
    businessId: activeBusiness.membership.businessId,
    supabase,
  };
}

function revalidateReservationViews() {
  revalidatePath("/local");
  revalidatePath("/local/reservas");
  revalidatePath("/local/clientes");
}

export async function saveBusinessReservationAction(
  input: unknown,
): Promise<BusinessReservationActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error("La reserva recibida es inválida.");
    }

    const data = input as Record<string, unknown>;
    const reservationId = normalizeReservationId(
      data.reservationId,
    );
    const reservation = normalizeBusinessReservation(
      data.reservation,
    );
    const idempotencyKey =
      normalizeReservationIdempotencyKey(
        data.idempotencyKey,
      );
    const context = await resolveReservationContext();

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } = await context.supabase.rpc(
      "save_business_reservation",
      {
        p_business_id: context.businessId,
        p_reservation_id: reservationId,
        p_reservation:
          toBusinessReservationRpcPayload(reservation),
        p_idempotency_key: idempotencyKey,
      },
    );

    if (error || !saved) {
      console.error("[business-reservations] save RPC failed", {
        code: error?.code ?? null,
      });

      return {
        ok: false,
        error: formatReservationMutationError(
          error,
          "No se pudo guardar la reserva en Supabase.",
        ),
      };
    }

    revalidateReservationViews();

    return {
      ok: true,
      reservation: mapBusinessReservationRow(
        saved as unknown as BusinessReservationDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la reserva.",
    };
  }
}

export async function setBusinessReservationStatusAction(
  input: unknown,
): Promise<BusinessReservationActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error("La actualización recibida es inválida.");
    }

    const data = input as Record<string, unknown>;
    const reservationId = normalizeReservationId(
      data.reservationId,
    );

    if (!reservationId) {
      throw new Error("La reserva es obligatoria.");
    }

    const status = normalizeBusinessReservationStatus(
      data.status,
    ) as BusinessReservationStatus;
    const context = await resolveReservationContext();

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } = await context.supabase.rpc(
      "set_business_reservation_status",
      {
        p_business_id: context.businessId,
        p_reservation_id: reservationId,
        p_status: status,
      },
    );

    if (error || !saved) {
      console.error("[business-reservations] status RPC failed", {
        code: error?.code ?? null,
      });

      return {
        ok: false,
        error: formatReservationMutationError(
          error,
          "No se pudo actualizar el estado de la reserva.",
        ),
      };
    }

    revalidateReservationViews();

    return {
      ok: true,
      reservation: mapBusinessReservationRow(
        saved as unknown as BusinessReservationDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la reserva.",
    };
  }
}
