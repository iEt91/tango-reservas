"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { getBusinessExpenses } from "@/lib/data/server/business-expenses";
import {
  mapBusinessExpenseRow,
  normalizeBusinessExpenseArchiveInput,
  normalizeBusinessExpenseSaveInput,
  toBusinessExpenseSaveRpcPayload,
  type BusinessExpense,
} from "@/lib/expenses/business-expense-contract";
import { hasStaffAccess } from "@/lib/staff/staff-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

type ExpenseActionResult =
  | {
      ok: true;
      expense: BusinessExpense;
    }
  | {
      ok: false;
      error: string;
    };

export type ExpenseListActionResult =
  | {
      ok: true;
      expenses: BusinessExpense[];
    }
  | {
      ok: false;
      error: string;
    };

function formatExpenseError(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
) {
  const message =
    error?.message?.toLowerCase() ?? "";

  if (error?.code === "42501") {
    return "No tenés permisos suficientes para modificar Gastos o Caja.";
  }

  if (error?.code === "22023") {
    return "Los datos del gasto no son válidos.";
  }

  if (error?.code === "23505") {
    return "La operación de gasto ya existe con datos diferentes.";
  }

  if (error?.code === "P0001") {
    if (
      message.includes(
        "cash session",
      )
    ) {
      return "La caja del día debe estar abierta para modificar este gasto en efectivo.";
    }

    if (
      message.includes(
        "archived",
      )
    ) {
      return "El gasto eliminado ya no se puede modificar.";
    }

    return "El gasto no se puede modificar en su estado actual.";
  }

  return "No se pudo guardar el gasto persistente.";
}

async function resolveExpenseContext(
  requiredAccess:
    | "view"
    | "manage"
    | "full",
) {
  const activeBusiness =
    await resolveActiveBusiness();

  if (
    activeBusiness.status
    !== "ready"
  ) {
    return {
      ok: false as const,
      error:
        "La sesión o el negocio activo ya no son válidos.",
    };
  }

  if (
    activeBusiness.membership.role
      === "staff"
    && !hasStaffAccess(
      activeBusiness.membership.permissions,
      "expenses",
      requiredAccess,
    )
  ) {
    return {
      ok: false as const,
      error:
        "No tenés permisos suficientes en Gastos.",
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

function revalidateExpensePaths() {
  revalidatePath("/local");
  revalidatePath("/local/gastos");
  revalidatePath("/local/caja");
  revalidatePath("/local/historial");
  revalidatePath("/local/reportes");
}

export async function getBusinessExpensesAction(): Promise<ExpenseListActionResult> {
  try {
    const context =
      await resolveExpenseContext(
        "view",
      );

    if (!context.ok) {
      return context;
    }

    const expenses =
      await getBusinessExpenses(
        context.businessId,
      );

    return {
      ok: true,
      expenses,
    };
  } catch {
    return {
      ok: false,
      error:
        "No se pudieron leer los gastos persistentes.",
    };
  }
}

export async function saveBusinessExpenseAction(
  input: unknown,
): Promise<ExpenseActionResult> {
  try {
    const normalized =
      normalizeBusinessExpenseSaveInput(
        input,
      );
    const context =
      await resolveExpenseContext(
        "manage",
      );

    if (!context.ok) {
      return context;
    }

    const {
      data,
      error,
    } = await context.supabase.rpc(
      "save_business_expense",
      {
        p_business_id:
          context.businessId,
        ...toBusinessExpenseSaveRpcPayload(
          normalized,
        ),
      },
    );

    if (
      error
      || !data
    ) {
      console.error(
        "[expenses] save RPC failed",
        {
          code:
            error?.code ?? null,
        },
      );

      return {
        ok: false,
        error:
          formatExpenseError(
            error,
          ),
      };
    }

    const expense =
      mapBusinessExpenseRow(
        data,
      );

    revalidateExpensePaths();

    return {
      ok: true,
      expense,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el gasto.",
    };
  }
}

export async function archiveBusinessExpenseAction(
  input: unknown,
): Promise<ExpenseActionResult> {
  try {
    const normalized =
      normalizeBusinessExpenseArchiveInput(
        input,
      );
    const context =
      await resolveExpenseContext(
        "full",
      );

    if (!context.ok) {
      return context;
    }

    const {
      data,
      error,
    } = await context.supabase.rpc(
      "archive_business_expense",
      {
        p_business_id:
          context.businessId,
        p_expense_id:
          normalized.expenseId,
        p_operation_key:
          normalized.operationKey,
      },
    );

    if (
      error
      || !data
    ) {
      console.error(
        "[expenses] archive RPC failed",
        {
          code:
            error?.code ?? null,
        },
      );

      return {
        ok: false,
        error:
          formatExpenseError(
            error,
          ),
      };
    }

    const expense =
      mapBusinessExpenseRow(
        data,
      );

    revalidateExpensePaths();

    return {
      ok: true,
      expense,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la eliminación del gasto.",
    };
  }
}
