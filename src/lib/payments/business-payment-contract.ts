const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/u;

export type BusinessPaymentMethod =
  | "cash"
  | "card"
  | "mercado_pago"
  | "transfer";

export type BusinessPaymentInput = {
  method: BusinessPaymentMethod;
  amount: number;
};

export type BusinessCashSessionOpenInput = {
  businessDate: string;
  openingAmount: number;
  operationKey: string;
};

export type BusinessReservationPaymentInput = {
  reservationId: string;
  operationKey: string;
  payments: BusinessPaymentInput[];
};

export type BusinessCashSession = {
  id: string;
  businessDate: string;
  status: "open" | "closed";
  openingAmount: number;
  openedAt: string;
  closedAt: string | null;
  actualCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  notes: string;
  cashSalesSnapshot: number | null;
  cashExpensesSnapshot: number | null;
  cashMovementsSnapshot: number | null;
};

export type BusinessPayment = {
  id: string;
  method: BusinessPaymentMethod;
  amount: number;
  createdAt: string;
};

export type BusinessReservationPaymentResult = {
  operationId: string;
  cashSession: BusinessCashSession;
  order: {
    id: string;
    reservationId: string;
    status: "completed";
    revision: number;
    subtotal: number;
    createdAt: string;
    updatedAt: string;
  };
  reservation: {
    id: string;
    status: "completed";
    completedAt: string;
  };
  payments: BusinessPayment[];
  totalAmount: number;
};

function normalizeUuid(
  value: unknown,
  label: string,
) {
  if (
    typeof value !== "string"
    || !UUID_PATTERN.test(value)
  ) {
    throw new Error(`${label} no es válido.`);
  }

  return value.toLowerCase();
}

function normalizeOperationKey(
  value: unknown,
) {
  if (typeof value !== "string") {
    throw new Error(
      "La clave de operación es obligatoria.",
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length < 8
    || normalized.length > 120
  ) {
    throw new Error(
      "La clave de operación debe tener entre 8 y 120 caracteres.",
    );
  }

  return normalized;
}

function normalizeMoney(
  value: unknown,
  label: string,
  {
    allowZero = false,
  }: {
    allowZero?: boolean;
  } = {},
) {
  const amount =
    Number(value);

  if (
    !Number.isFinite(amount)
    || amount < 0
    || amount > 9999999999.99
    || (!allowZero && amount <= 0)
    || Math.abs(
      amount
      - Number(amount.toFixed(2)),
    ) > 0.0000001
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return Number(
    amount.toFixed(2),
  );
}

function normalizeNullableMoney(
  value: unknown,
  label: string,
) {
  if (
    value === null
    || value === undefined
  ) {
    return null;
  }

  return normalizeMoney(
    value,
    label,
    {
      allowZero: true,
    },
  );
}

function normalizeNullableSignedMoney(
  value: unknown,
  label: string,
) {
  if (
    value === null
    || value === undefined
  ) {
    return null;
  }

  const amount =
    Number(value);

  if (
    !Number.isFinite(amount)
    || Math.abs(amount) > 9999999999.99
    || Math.abs(
      amount
      - Number(amount.toFixed(2)),
    ) > 0.0000001
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return Number(
    amount.toFixed(2),
  );
}

function normalizeDate(
  value: unknown,
) {
  if (
    typeof value !== "string"
    || !DATE_PATTERN.test(value)
  ) {
    throw new Error(
      "La fecha de caja no es válida.",
    );
  }

  const parsed =
    new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(parsed.getTime())
    || parsed.toISOString().slice(0, 10)
      !== value
  ) {
    throw new Error(
      "La fecha de caja no es válida.",
    );
  }

  return value;
}

function normalizePaymentMethod(
  value: unknown,
): BusinessPaymentMethod {
  if (
    value !== "cash"
    && value !== "card"
    && value !== "mercado_pago"
    && value !== "transfer"
  ) {
    throw new Error(
      "El método de pago no es válido.",
    );
  }

  return value;
}

export function normalizeBusinessCashSessionOpenInput(
  value: unknown,
): BusinessCashSessionOpenInput {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "La apertura de caja recibida no es válida.",
    );
  }

  const source =
    value as Record<string, unknown>;

  return {
    businessDate:
      normalizeDate(
        source.businessDate,
      ),
    openingAmount:
      normalizeMoney(
        source.openingAmount,
        "El monto inicial",
        {
          allowZero: true,
        },
      ),
    operationKey:
      normalizeOperationKey(
        source.operationKey,
      ),
  };
}

export function normalizeBusinessReservationPaymentInput(
  value: unknown,
): BusinessReservationPaymentInput {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "El cobro recibido no es válido.",
    );
  }

  const source =
    value as Record<string, unknown>;
  const rawPayments =
    source.payments;

  if (!Array.isArray(rawPayments)) {
    throw new Error(
      "Los medios de pago no son válidos.",
    );
  }

  if (rawPayments.length > 4) {
    throw new Error(
      "El cobro no puede superar cuatro medios de pago.",
    );
  }

  const seen =
    new Set<BusinessPaymentMethod>();

  const payments =
    rawPayments
      .map((rawPayment) => {
        if (
          !rawPayment
          || typeof rawPayment !== "object"
        ) {
          throw new Error(
            "Uno de los medios de pago no es válido.",
          );
        }

        const payment =
          rawPayment as Record<string, unknown>;
        const method =
          normalizePaymentMethod(
            payment.method,
          );

        if (seen.has(method)) {
          throw new Error(
            "El cobro contiene medios de pago duplicados.",
          );
        }

        seen.add(method);

        return {
          method,
          amount:
            normalizeMoney(
              payment.amount,
              "El importe del pago",
            ),
        };
      })
      .sort(
        (first, second) =>
          first.method.localeCompare(
            second.method,
          ),
      );

  return {
    reservationId:
      normalizeUuid(
        source.reservationId,
        "La reserva",
      ),
    operationKey:
      normalizeOperationKey(
        source.operationKey,
      ),
    payments,
  };
}

export function toBusinessCashSessionOpenRpcPayload(
  input: BusinessCashSessionOpenInput,
) {
  const normalized =
    normalizeBusinessCashSessionOpenInput(
      input,
    );

  return {
    p_business_date:
      normalized.businessDate,
    p_opening_amount:
      normalized.openingAmount,
    p_operation_key:
      normalized.operationKey,
  };
}

export function toBusinessReservationPaymentRpcPayload(
  input: BusinessReservationPaymentInput,
) {
  const normalized =
    normalizeBusinessReservationPaymentInput(
      input,
    );

  return {
    p_reservation_id:
      normalized.reservationId,
    p_operation_key:
      normalized.operationKey,
    p_payments:
      normalized.payments,
  };
}

function mapCashSession(
  value: unknown,
): BusinessCashSession {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "La respuesta de la caja persistente no es válida.",
    );
  }

  const row =
    value as Record<string, unknown>;
  const status =
    row.status;

  if (
    status !== "open"
    && status !== "closed"
  ) {
    throw new Error(
      "El estado de la caja persistente no es válido.",
    );
  }

  const businessDate =
    typeof row.business_date === "string"
      ? row.business_date
      : typeof row.businessDate === "string"
        ? row.businessDate
        : "";

  const openedAt =
    typeof row.opened_at === "string"
      ? row.opened_at
      : typeof row.openedAt === "string"
        ? row.openedAt
        : "";

  if (!openedAt) {
    throw new Error(
      "La apertura de la caja persistente está incompleta.",
    );
  }

  return {
    id:
      normalizeUuid(
        row.id,
        "La sesión de caja",
      ),
    businessDate:
      normalizeDate(
        businessDate,
      ),
    status,
    openingAmount:
      normalizeMoney(
        row.opening_amount
          ?? row.openingAmount,
        "El monto inicial",
        {
          allowZero: true,
        },
      ),
    openedAt,
    closedAt:
      typeof (
        row.closed_at
        ?? row.closedAt
      ) === "string"
        ? (
            row.closed_at
            ?? row.closedAt
          ) as string
        : null,
    actualCash:
      normalizeNullableMoney(
        row.actual_cash
          ?? row.actualCash,
        "El efectivo contado",
      ),
    expectedCash:
      normalizeNullableMoney(
        row.expected_cash
          ?? row.expectedCash,
        "El efectivo esperado",
      ),
    difference:
      normalizeNullableSignedMoney(
        row.difference,
        "La diferencia de caja",
      ),
    notes:
      typeof row.notes === "string"
        ? row.notes
        : "",
    cashSalesSnapshot:
      normalizeNullableMoney(
        row.cash_sales_snapshot
          ?? row.cashSalesSnapshot,
        "El snapshot de cobros en efectivo",
      ),
    cashExpensesSnapshot:
      normalizeNullableMoney(
        row.cash_expenses_snapshot
          ?? row.cashExpensesSnapshot,
        "El snapshot de gastos en efectivo",
      ),
    cashMovementsSnapshot:
      normalizeNullableSignedMoney(
        row.cash_movements_snapshot
          ?? row.cashMovementsSnapshot,
        "El snapshot de movimientos",
      ),
  };
}

export function mapBusinessPaymentRow(
  value: unknown,
): BusinessPayment {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "La respuesta de un pago persistente no es válida.",
    );
  }

  const row =
    value as Record<string, unknown>;
  const createdAt =
    typeof row.created_at === "string"
      ? row.created_at
      : typeof row.createdAt === "string"
        ? row.createdAt
        : "";

  if (!createdAt) {
    throw new Error(
      "La respuesta del pago persistente está incompleta.",
    );
  }

  return {
    id:
      normalizeUuid(
        row.id,
        "El pago",
      ),
    method:
      normalizePaymentMethod(
        row.method
          ?? row.payment_method,
      ),
    amount:
      normalizeMoney(
        row.amount,
        "El importe persistente",
      ),
    createdAt,
  };
}

export function mapBusinessCashSessionResult(
  value: unknown,
) {
  return mapCashSession(
    value,
  );
}

export function mapBusinessReservationPaymentResult(
  value: unknown,
): BusinessReservationPaymentResult {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "La respuesta del cobro persistente no es válida.",
    );
  }

  const result =
    value as Record<string, unknown>;
  const order =
    result.order;
  const reservation =
    result.reservation;
  const payments =
    result.payments;

  if (
    !order
    || typeof order !== "object"
    || !reservation
    || typeof reservation !== "object"
    || !Array.isArray(payments)
  ) {
    throw new Error(
      "La respuesta del cobro persistente está incompleta.",
    );
  }

  const orderRow =
    order as Record<string, unknown>;
  const reservationRow =
    reservation as Record<string, unknown>;

  if (
    orderRow.status !== "completed"
    || reservationRow.status !== "completed"
  ) {
    throw new Error(
      "El cobro persistente no cerró el pedido y la reserva.",
    );
  }

  const revision =
    Number(orderRow.revision);
  const subtotal =
    normalizeMoney(
      orderRow.subtotal,
      "El subtotal canónico",
      {
        allowZero: true,
      },
    );
  const totalAmount =
    normalizeMoney(
      result.total_amount
        ?? result.totalAmount,
      "El total cobrado",
      {
        allowZero: true,
      },
    );

  if (
    !Number.isInteger(revision)
    || revision < 1
    || subtotal !== totalAmount
  ) {
    throw new Error(
      "Los totales del cobro persistente no son consistentes.",
    );
  }

  const createdAt =
    typeof orderRow.created_at === "string"
      ? orderRow.created_at
      : "";
  const updatedAt =
    typeof orderRow.updated_at === "string"
      ? orderRow.updated_at
      : "";
  const completedAt =
    typeof reservationRow.completed_at === "string"
      ? reservationRow.completed_at
      : "";

  if (
    !createdAt
    || !updatedAt
    || !completedAt
  ) {
    throw new Error(
      "Los hitos del cobro persistente están incompletos.",
    );
  }

  return {
    operationId:
      normalizeUuid(
        result.operation_id
          ?? result.operationId,
        "La operación de cobro",
      ),
    cashSession:
      mapCashSession(
        result.cash_session
          ?? result.cashSession,
      ),
    order: {
      id:
        normalizeUuid(
          orderRow.id,
          "El pedido",
        ),
      reservationId:
        normalizeUuid(
          orderRow.reservation_id,
          "La reserva del pedido",
        ),
      status: "completed",
      revision,
      subtotal,
      createdAt,
      updatedAt,
    },
    reservation: {
      id:
        normalizeUuid(
          reservationRow.id,
          "La reserva",
        ),
      status: "completed",
      completedAt,
    },
    payments:
      payments.map(mapBusinessPaymentRow),
    totalAmount,
  };
}
