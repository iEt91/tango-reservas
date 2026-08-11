export const BUSINESS_EXPENSE_STATUSES = [
  "pending",
  "paid",
] as const;

export const BUSINESS_EXPENSE_PAYMENT_METHODS = [
  "cash",
  "card",
  "mercado_pago",
  "transfer",
] as const;

export type BusinessExpenseStatus =
  (typeof BUSINESS_EXPENSE_STATUSES)[number];

export type BusinessExpensePaymentMethod =
  (typeof BUSINESS_EXPENSE_PAYMENT_METHODS)[number];

export type BusinessExpense = {
  id: string;
  expenseDate: string;
  dueDate: string | null;
  description: string;
  provider: string;
  category: string;
  amount: number;
  status: BusinessExpenseStatus;
  paymentMethod: BusinessExpensePaymentMethod;
  paidAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BusinessExpenseSaveInput = {
  expenseId: string | null;
  expenseDate: string;
  dueDate: string | null;
  description: string;
  provider: string;
  category: string;
  amount: number;
  status: BusinessExpenseStatus;
  paymentMethod: BusinessExpensePaymentMethod;
  operationKey: string;
};

export type BusinessExpenseArchiveInput = {
  expenseId: string;
  operationKey: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/u;

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw new Error(
      "Los datos del gasto no son válidos.",
    );
  }

  return value as Record<
    string,
    unknown
  >;
}

function normalizeUuid(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string"
    || !UUID_PATTERN.test(value)
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return value.toLowerCase();
}

function normalizeOptionalUuid(
  value: unknown,
): string | null {
  if (
    value === null
    || value === undefined
    || value === ""
  ) {
    return null;
  }

  return normalizeUuid(
    value,
    "El gasto",
  );
}

function normalizeDate(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string"
    || !DATE_PATTERN.test(value)
  ) {
    throw new Error(
      `${label} no es válida.`,
    );
  }

  const parsed =
    new Date(
      `${value}T00:00:00Z`,
    );

  if (
    Number.isNaN(parsed.getTime())
    || parsed
      .toISOString()
      .slice(0, 10)
      !== value
  ) {
    throw new Error(
      `${label} no es válida.`,
    );
  }

  return value;
}

function normalizeOptionalDate(
  value: unknown,
): string | null {
  if (
    value === null
    || value === undefined
    || value === ""
  ) {
    return null;
  }

  return normalizeDate(
    value,
    "La fecha de vencimiento",
  );
}

function normalizeText(
  value: unknown,
  label: string,
  minLength: number,
  maxLength: number,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  const normalized =
    value.trim().replace(
      /\s+/gu,
      " ",
    );

  if (
    normalized.length < minLength
    || normalized.length > maxLength
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return normalized;
}

function normalizeAmount(
  value: unknown,
): number {
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || value <= 0
    || value > 9_999_999_999.99
    || Math.abs(
      value
      - Number(
        value.toFixed(2),
      )
    ) > Number.EPSILON
  ) {
    throw new Error(
      "El importe del gasto no es válido.",
    );
  }

  return Number(
    value.toFixed(2),
  );
}

function normalizeOperationKey(
  value: unknown,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new Error(
      "La clave de operación no es válida.",
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length < 8
    || normalized.length > 120
  ) {
    throw new Error(
      "La clave de operación no es válida.",
    );
  }

  return normalized;
}

function normalizeStatus(
  value: unknown,
): BusinessExpenseStatus {
  if (
    typeof value !== "string"
    || !BUSINESS_EXPENSE_STATUSES.includes(
      value as BusinessExpenseStatus,
    )
  ) {
    throw new Error(
      "El estado del gasto no es válido.",
    );
  }

  return value as BusinessExpenseStatus;
}

function normalizePaymentMethod(
  value: unknown,
): BusinessExpensePaymentMethod {
  if (
    typeof value !== "string"
    || !BUSINESS_EXPENSE_PAYMENT_METHODS.includes(
      value as BusinessExpensePaymentMethod,
    )
  ) {
    throw new Error(
      "El medio de pago no es válido.",
    );
  }

  return value as BusinessExpensePaymentMethod;
}

export function normalizeBusinessExpenseSaveInput(
  value: unknown,
): BusinessExpenseSaveInput {
  const input =
    asRecord(value);

  return {
    expenseId:
      normalizeOptionalUuid(
        input.expenseId,
      ),
    expenseDate:
      normalizeDate(
        input.expenseDate,
        "La fecha del gasto",
      ),
    dueDate:
      normalizeOptionalDate(
        input.dueDate,
      ),
    description:
      normalizeText(
        input.description,
        "La descripción",
        1,
        240,
      ),
    provider:
      typeof input.provider
        === "string"
        ? input.provider
          .trim()
          .replace(
            /\s+/gu,
            " ",
          )
          .slice(0, 160)
        : "",
    category:
      normalizeText(
        input.category,
        "La categoría",
        1,
        80,
      ),
    amount:
      normalizeAmount(
        input.amount,
      ),
    status:
      normalizeStatus(
        input.status,
      ),
    paymentMethod:
      normalizePaymentMethod(
        input.paymentMethod,
      ),
    operationKey:
      normalizeOperationKey(
        input.operationKey,
      ),
  };
}

export function normalizeBusinessExpenseArchiveInput(
  value: unknown,
): BusinessExpenseArchiveInput {
  const input =
    asRecord(value);

  return {
    expenseId:
      normalizeUuid(
        input.expenseId,
        "El gasto",
      ),
    operationKey:
      normalizeOperationKey(
        input.operationKey,
      ),
  };
}

export function toBusinessExpenseSaveRpcPayload(
  input: BusinessExpenseSaveInput,
) {
  return {
    p_expense_id:
      input.expenseId,
    p_expense_date:
      input.expenseDate,
    p_due_date:
      input.dueDate,
    p_description:
      input.description,
    p_provider:
      input.provider,
    p_category:
      input.category,
    p_amount:
      input.amount,
    p_status:
      input.status,
    p_payment_method:
      input.paymentMethod,
    p_operation_key:
      input.operationKey,
  };
}

export function mapBusinessExpenseRow(
  value: unknown,
): BusinessExpense {
  const row =
    asRecord(value);

  return {
    id:
      normalizeUuid(
        row.id,
        "El gasto persistente",
      ),
    expenseDate:
      normalizeDate(
        row.expense_date,
        "La fecha persistente",
      ),
    dueDate:
      normalizeOptionalDate(
        row.due_date,
      ),
    description:
      normalizeText(
        row.description,
        "La descripción persistente",
        1,
        240,
      ),
    provider:
      typeof row.provider
        === "string"
        ? row.provider
        : "",
    category:
      normalizeText(
        row.category,
        "La categoría persistente",
        1,
        80,
      ),
    amount:
      normalizeAmount(
        Number(row.amount),
      ),
    status:
      normalizeStatus(
        row.status,
      ),
    paymentMethod:
      normalizePaymentMethod(
        row.payment_method,
      ),
    paidAt:
      typeof row.paid_at
        === "string"
        ? row.paid_at
        : null,
    archivedAt:
      typeof row.archived_at
        === "string"
        ? row.archived_at
        : null,
    createdAt:
      typeof row.created_at
        === "string"
        ? row.created_at
        : "",
    updatedAt:
      typeof row.updated_at
        === "string"
        ? row.updated_at
        : "",
  };
}
