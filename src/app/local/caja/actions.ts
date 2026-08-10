"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import {
  mapBusinessCashSessionResult,
  normalizeBusinessCashSessionOpenInput,
  toBusinessCashSessionOpenRpcPayload,
  type BusinessCashSession,
} from "@/lib/payments/business-payment-contract";
import { hasStaffAccess } from "@/lib/staff/staff-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type BusinessCashSessionOpenActionResult =
  | {
      ok: true;
      session: BusinessCashSession;
    }
  | {
      ok: false;
      error: string;
    };

function formatCashSessionError(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
) {
  const message =
    error?.message?.toLowerCase() ?? "";

  if (error?.code === "42501") {
    return "No tenés permisos para operar la caja.";
  }

  if (error?.code === "22023") {
    return "La fecha, el monto inicial o la clave de apertura no son válidos.";
  }

  if (error?.code === "23505") {
    return "La apertura de caja ya existe con datos diferentes.";
  }

  if (error?.code === "P0001") {
    if (message.includes("closed")) {
      return "La caja de este día ya está cerrada.";
    }

    return "La caja de este día no se puede abrir en su estado actual.";
  }

  return "No se pudo abrir la caja persistente.";
}

async function resolveCashContext() {
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
        "No tenés permisos para operar la caja.",
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

export async function openBusinessCashSessionAction(
  input: unknown,
): Promise<BusinessCashSessionOpenActionResult> {
  try {
    const normalized =
      normalizeBusinessCashSessionOpenInput(
        input,
      );
    const context =
      await resolveCashContext();

    if (!context.ok) {
      return context;
    }

    const payload =
      toBusinessCashSessionOpenRpcPayload(
        normalized,
      );

    const {
      data,
      error,
    } = await context.supabase.rpc(
      "open_business_cash_session",
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
        "[cash] open session RPC failed",
        {
          code:
            error?.code ?? null,
        },
      );

      return {
        ok: false,
        error:
          formatCashSessionError(
            error,
          ),
      };
    }

    const session =
      mapBusinessCashSessionResult(
        data,
      );

    revalidatePath("/local");
    revalidatePath("/local/caja");
    revalidatePath("/local/reservas");

    return {
      ok: true,
      session,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la apertura de caja.",
    };
  }
}
