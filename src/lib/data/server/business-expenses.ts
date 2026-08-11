import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapBusinessExpenseRow,
  type BusinessExpense,
} from "@/lib/expenses/business-expense-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function getBusinessExpenses(
  businessId: string,
): Promise<BusinessExpense[]> {
  assertServerOnly(
    "getBusinessExpenses",
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
    .from("business_expenses")
    .select(
      "id, expense_date, due_date, description, provider, category, amount, status, payment_method, paid_at, archived_at, created_at, updated_at",
    )
    .eq(
      "business_id",
      businessId,
    )
    .is(
      "archived_at",
      null,
    )
    .order(
      "expense_date",
      {
        ascending: false,
      },
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .limit(1000);

  if (error) {
    console.error(
      "[business-expenses] read failed",
      {
        code:
          error.code ?? null,
      },
    );

    throw new Error(
      "No se pudieron leer los gastos persistentes.",
    );
  }

  return (
    data ?? []
  ).map(
    mapBusinessExpenseRow,
  );
}
