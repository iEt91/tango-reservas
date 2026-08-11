"use server";

import { revalidatePath } from "next/cache";
import {
  mapBusinessCashReconciliationResult,
  mapBusinessCashMovement,
  normalizeBusinessCashCloseInput,
  normalizeBusinessCashMovementInput,
  normalizeBusinessCashMovementVoidInput,
  normalizeBusinessCashReconciliationInput,
  normalizeBusinessCashReopenInput,
  type BusinessCashMovement,
  type BusinessCashReconciliation,
} from "@/lib/cash/business-cash-reconciliation-contract";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import {
  getBusinessCashSessionForDate,
  getBusinessClosedCashSessions,
  getBusinessPaymentsForCashSession,
} from "@/lib/data/server/business-cash";
import {
  mapBusinessCashSessionResult,
  normalizeBusinessCashSessionOpenInput,
  toBusinessCashSessionOpenRpcPayload,
  type BusinessCashSession,
  type BusinessPayment,
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

export type BusinessCashSnapshotActionResult =
  | {
      ok: true;
      session: BusinessCashSession | null;
      payments: BusinessPayment[];
    }
  | {
      ok: false;
      error: string;
    };

export type BusinessCashHistoryActionResult =
  | {
      ok: true;
      sessions: BusinessCashSession[];
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

async function resolveCashContext(
  requiredAccess: "view" | "manage" | "full",
) {
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
      requiredAccess,
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

export async function getBusinessCashSnapshotAction(
  input: unknown,
): Promise<BusinessCashSnapshotActionResult> {
  try {
    if (
      !input
      || typeof input !== "object"
    ) {
      return {
        ok: false,
        error:
          "La fecha de caja no es válida.",
      };
    }

    const businessDate =
      (
        input as Record<string, unknown>
      ).businessDate;

    if (
      typeof businessDate !== "string"
      || !/^\d{4}-\d{2}-\d{2}$/u.test(
        businessDate,
      )
    ) {
      return {
        ok: false,
        error:
          "La fecha de caja no es válida.",
      };
    }

    const parsedDate =
      new Date(
        `${businessDate}T00:00:00Z`,
      );

    if (
      Number.isNaN(parsedDate.getTime())
      || parsedDate
        .toISOString()
        .slice(0, 10)
        !== businessDate
    ) {
      return {
        ok: false,
        error:
          "La fecha de caja no es válida.",
      };
    }

    const context =
      await resolveCashContext(
        "view",
      );

    if (!context.ok) {
      return context;
    }

    const session =
      await getBusinessCashSessionForDate(
        context.businessId,
        businessDate,
      );
    const payments =
      session
        ? await getBusinessPaymentsForCashSession(
            context.businessId,
            session.id,
          )
        : [];

    return {
      ok: true,
      session,
      payments,
    };
  } catch {
    return {
      ok: false,
      error:
        "No se pudo leer la caja persistente.",
    };
  }
}

export async function getBusinessCashHistoryAction(): Promise<BusinessCashHistoryActionResult> {
  try {
    const context =
      await resolveCashContext(
        "view",
      );

    if (!context.ok) {
      return context;
    }

    const sessions =
      await getBusinessClosedCashSessions(
        context.businessId,
      );

    return {
      ok: true,
      sessions,
    };
  } catch {
    return {
      ok: false,
      error:
        "No se pudo leer el historial persistente de Caja.",
    };
  }
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
      await resolveCashContext(
        "manage",
      );

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


export type BusinessCashReconciliationActionResult =
  | {
      ok: true;
      reconciliation: BusinessCashReconciliation;
    }
  | {
      ok: false;
      error: string;
    };

export type BusinessCashMovementActionResult =
  | {
      ok: true;
      movement: BusinessCashMovement;
    }
  | {
      ok: false;
      error: string;
    };

function formatCashReconciliationError(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
) {
  const message =
    error?.message?.toLowerCase() ?? "";

  if (error?.code === "42501") {
    return "No tenés permisos suficientes para operar la caja.";
  }

  if (error?.code === "22023") {
    return "Los datos de Caja no son válidos.";
  }

  if (error?.code === "23505") {
    return "La operación de Caja ya existe con datos diferentes.";
  }

  if (error?.code === "P0001") {
    if (message.includes("not open")) {
      return "La caja debe estar abierta para realizar esta operación.";
    }

    if (message.includes("not closed")) {
      return "La caja debe estar cerrada para reabrirla.";
    }

    return "La Caja no se puede modificar en su estado actual.";
  }

  return "No se pudo completar la operación persistente de Caja.";
}

function revalidateCashPaths() {
  revalidatePath("/local");
  revalidatePath("/local/caja");
  revalidatePath("/local/gastos");
  revalidatePath("/local/reservas");
  revalidatePath("/local/historial");
  revalidatePath("/local/reportes");
}

export async function getBusinessCashReconciliationAction(
  input: unknown,
): Promise<BusinessCashReconciliationActionResult> {
  try {
    const normalized =
      normalizeBusinessCashReconciliationInput(
        input,
      );
    const context =
      await resolveCashContext(
        "view",
      );

    if (!context.ok) {
      return context;
    }

    const {
      data,
      error,
    } = await context.supabase.rpc(
      "get_business_cash_reconciliation",
      {
        p_business_id:
          context.businessId,
        p_business_date:
          normalized.businessDate,
      },
    );

    if (error || !data) {
      console.error(
        "[cash] reconciliation RPC failed",
        {
          code:
            error?.code ?? null,
        },
      );

      return {
        ok: false,
        error:
          formatCashReconciliationError(
            error,
          ),
      };
    }

    return {
      ok: true,
      reconciliation:
        mapBusinessCashReconciliationResult(
          data,
        ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la conciliación de Caja.",
    };
  }
}

export async function addBusinessCashMovementAction(
  input: unknown,
): Promise<BusinessCashMovementActionResult> {
  try {
    const normalized =
      normalizeBusinessCashMovementInput(
        input,
      );
    const context =
      await resolveCashContext(
        "manage",
      );

    if (!context.ok) {
      return context;
    }

    const {
      data,
      error,
    } = await context.supabase.rpc(
      "add_business_cash_movement",
      {
        p_business_id:
          context.businessId,
        p_cash_session_id:
          normalized.cashSessionId,
        p_movement_type:
          normalized.type,
        p_amount:
          normalized.amount,
        p_reason:
          normalized.reason,
        p_operation_key:
          normalized.operationKey,
      },
    );

    if (error || !data) {
      return {
        ok: false,
        error:
          formatCashReconciliationError(
            error,
          ),
      };
    }

    const movement =
      mapBusinessCashMovement(
        data,
      );

    revalidateCashPaths();

    return {
      ok: true,
      movement,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el movimiento de Caja.",
    };
  }
}

export async function voidBusinessCashMovementAction(
  input: unknown,
): Promise<BusinessCashMovementActionResult> {
  try {
    const normalized =
      normalizeBusinessCashMovementVoidInput(
        input,
      );
    const context =
      await resolveCashContext(
        "full",
      );

    if (!context.ok) {
      return context;
    }

    const {
      data,
      error,
    } = await context.supabase.rpc(
      "void_business_cash_movement",
      {
        p_business_id:
          context.businessId,
        p_movement_id:
          normalized.movementId,
        p_operation_key:
          normalized.operationKey,
      },
    );

    if (error || !data) {
      return {
        ok: false,
        error:
          formatCashReconciliationError(
            error,
          ),
      };
    }

    const movement =
      mapBusinessCashMovement(
        data,
      );

    revalidateCashPaths();

    return {
      ok: true,
      movement,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la anulación del movimiento.",
    };
  }
}

export async function closeBusinessCashSessionAction(
  input: unknown,
): Promise<BusinessCashReconciliationActionResult> {
  try {
    const normalized =
      normalizeBusinessCashCloseInput(
        input,
      );
    const context =
      await resolveCashContext(
        "manage",
      );

    if (!context.ok) {
      return context;
    }

    const {
      data,
      error,
    } = await context.supabase.rpc(
      "close_business_cash_session",
      {
        p_business_id:
          context.businessId,
        p_cash_session_id:
          normalized.cashSessionId,
        p_actual_cash:
          normalized.actualCash,
        p_notes:
          normalized.notes,
        p_operation_key:
          normalized.operationKey,
      },
    );

    if (error || !data) {
      return {
        ok: false,
        error:
          formatCashReconciliationError(
            error,
          ),
      };
    }

    const reconciliation =
      mapBusinessCashReconciliationResult(
        data,
      );

    revalidateCashPaths();

    return {
      ok: true,
      reconciliation,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el cierre de Caja.",
    };
  }
}

export async function reopenBusinessCashSessionAction(
  input: unknown,
): Promise<BusinessCashReconciliationActionResult> {
  try {
    const normalized =
      normalizeBusinessCashReopenInput(
        input,
      );
    const context =
      await resolveCashContext(
        "full",
      );

    if (!context.ok) {
      return context;
    }

    const {
      data,
      error,
    } = await context.supabase.rpc(
      "reopen_business_cash_session",
      {
        p_business_id:
          context.businessId,
        p_cash_session_id:
          normalized.cashSessionId,
        p_operation_key:
          normalized.operationKey,
      },
    );

    if (error || !data) {
      return {
        ok: false,
        error:
          formatCashReconciliationError(
            error,
          ),
      };
    }

    const resultRecord =
      data as Record<string, unknown>;
    const reconciliation =
      await context.supabase.rpc(
        "get_business_cash_reconciliation",
        {
          p_business_id:
            context.businessId,
          p_business_date:
            typeof (
              resultRecord.session as Record<string, unknown> | undefined
            )?.business_date === "string"
              ? (
                  resultRecord.session as Record<string, unknown>
                ).business_date as string
              : "",
        },
      );

    if (
      reconciliation.error
      || !reconciliation.data
    ) {
      return {
        ok: false,
        error:
          formatCashReconciliationError(
            reconciliation.error,
          ),
      };
    }

    revalidateCashPaths();

    return {
      ok: true,
      reconciliation:
        mapBusinessCashReconciliationResult(
          reconciliation.data,
        ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la reapertura de Caja.",
    };
  }
}
