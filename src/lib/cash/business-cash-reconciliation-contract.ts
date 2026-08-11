import {
  mapBusinessCashSessionResult,
  type BusinessCashSession,
} from "@/lib/payments/business-payment-contract";

export type BusinessCashMovementType =
  | "income"
  | "withdrawal";

export type BusinessCashMovement = {
  id: string;
  cashSessionId: string;
  type: BusinessCashMovementType;
  amount: number;
  reason: string;
  createdAt: string;
  voidedAt: string | null;
};

export type BusinessCashPaymentTotals = {
  cash: number;
  card: number;
  mercadoPago: number;
  transfer: number;
};

export type BusinessCashReconciliation = {
  session: BusinessCashSession | null;
  paymentTotals: BusinessCashPaymentTotals;
  cashExpenses: number;
  movementNet: number;
  expectedCash: number;
  liveExpectedCash: number;
  movements: BusinessCashMovement[];
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
      "Los datos de Caja no son válidos.",
    );
  }

  return value as Record<
    string,
    unknown
  >;
}

function uuid(
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

function operationKey(
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

function money(
  value: unknown,
  allowZero = false,
): number {
  const numeric =
    Number(value);

  if (
    !Number.isFinite(numeric)
    || numeric < (
      allowZero
        ? 0
        : Number.EPSILON
    )
    || numeric > 9_999_999_999.99
  ) {
    throw new Error(
      "El importe de Caja no es válido.",
    );
  }

  const normalized =
    Number(
      numeric.toFixed(2),
    );

  if (
    Math.abs(
      numeric
      - normalized,
    ) > Number.EPSILON
  ) {
    throw new Error(
      "El importe de Caja no es válido.",
    );
  }

  return normalized;
}

function date(
  value: unknown,
): string {
  if (
    typeof value !== "string"
    || !DATE_PATTERN.test(value)
  ) {
    throw new Error(
      "La fecha de Caja no es válida.",
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
      "La fecha de Caja no es válida.",
    );
  }

  return value;
}

export function normalizeBusinessCashReconciliationInput(
  value: unknown,
) {
  const input =
    asRecord(value);

  return {
    businessDate:
      date(
        input.businessDate,
      ),
  };
}

export function normalizeBusinessCashMovementInput(
  value: unknown,
) {
  const input =
    asRecord(value);

  if (
    input.type !== "income"
    && input.type !== "withdrawal"
  ) {
    throw new Error(
      "El tipo de movimiento no es válido.",
    );
  }

  if (
    typeof input.reason !== "string"
  ) {
    throw new Error(
      "El motivo del movimiento es obligatorio.",
    );
  }

  const reason =
    input.reason
      .trim()
      .replace(
        /\s+/gu,
        " ",
      );

  if (
    reason.length < 1
    || reason.length > 240
  ) {
    throw new Error(
      "El motivo del movimiento no es válido.",
    );
  }

  return {
    cashSessionId:
      uuid(
        input.cashSessionId,
        "La sesión de Caja",
      ),
    type:
      input.type,
    amount:
      money(
        input.amount,
      ),
    reason,
    operationKey:
      operationKey(
        input.operationKey,
      ),
  };
}

export function normalizeBusinessCashMovementVoidInput(
  value: unknown,
) {
  const input =
    asRecord(value);

  return {
    movementId:
      uuid(
        input.movementId,
        "El movimiento",
      ),
    operationKey:
      operationKey(
        input.operationKey,
      ),
  };
}

export function normalizeBusinessCashCloseInput(
  value: unknown,
) {
  const input =
    asRecord(value);

  const notes =
    typeof input.notes
      === "string"
      ? input.notes.trim()
      : "";

  if (
    notes.length > 4000
  ) {
    throw new Error(
      "Las notas de cierre son demasiado largas.",
    );
  }

  return {
    cashSessionId:
      uuid(
        input.cashSessionId,
        "La sesión de Caja",
      ),
    actualCash:
      money(
        input.actualCash,
        true,
      ),
    notes,
    operationKey:
      operationKey(
        input.operationKey,
      ),
  };
}

export function normalizeBusinessCashReopenInput(
  value: unknown,
) {
  const input =
    asRecord(value);

  return {
    cashSessionId:
      uuid(
        input.cashSessionId,
        "La sesión de Caja",
      ),
    operationKey:
      operationKey(
        input.operationKey,
      ),
  };
}

function mapPaymentTotals(
  value: unknown,
): BusinessCashPaymentTotals {
  const totals =
    asRecord(value);

  return {
    cash:
      Number(totals.cash) || 0,
    card:
      Number(totals.card) || 0,
    mercadoPago:
      Number(
        totals.mercadoPago,
      ) || 0,
    transfer:
      Number(
        totals.transfer,
      ) || 0,
  };
}

export function mapBusinessCashMovement(
  value: unknown,
): BusinessCashMovement {
  const row =
    asRecord(value);

  const type =
    row.movement_type;

  if (
    type !== "income"
    && type !== "withdrawal"
  ) {
    throw new Error(
      "El movimiento persistente no es válido.",
    );
  }

  return {
    id:
      uuid(
        row.id,
        "El movimiento persistente",
      ),
    cashSessionId:
      uuid(
        row.cash_session_id,
        "La sesión del movimiento",
      ),
    type,
    amount:
      money(
        Number(row.amount),
      ),
    reason:
      typeof row.reason
        === "string"
        ? row.reason
        : "",
    createdAt:
      typeof row.created_at
        === "string"
        ? row.created_at
        : "",
    voidedAt:
      typeof row.voided_at
        === "string"
        ? row.voided_at
        : null,
  };
}

export function mapBusinessCashReconciliationResult(
  value: unknown,
): BusinessCashReconciliation {
  const result =
    asRecord(value);

  const session =
    result.session === null
      || result.session === undefined
      ? null
      : mapBusinessCashSessionResult(
          result.session,
        );

  const movements =
    Array.isArray(
      result.movements,
    )
      ? result.movements.map(
          mapBusinessCashMovement,
        )
      : [];

  return {
    session,
    paymentTotals:
      mapPaymentTotals(
        result.paymentTotals,
      ),
    cashExpenses:
      Number(
        result.cashExpenses,
      ) || 0,
    movementNet:
      Number(
        result.movementNet,
      ) || 0,
    expectedCash:
      Number(
        result.expectedCash,
      ) || 0,
    liveExpectedCash:
      Number(
        result.liveExpectedCash,
      ) || 0,
    movements,
  };
}
