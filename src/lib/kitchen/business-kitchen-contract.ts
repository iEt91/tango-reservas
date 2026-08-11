const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/u;

export const BUSINESS_KITCHEN_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "completed",
] as const;

export type BusinessKitchenStatus =
  (typeof BUSINESS_KITCHEN_STATUSES)[number];

export type BusinessKitchenCommandItem = {
  menuItemId: string;
  name: string;
  quantity: number;
};

export type BusinessKitchenCommand = {
  id: string;
  orderId: string;
  reservationId: string;
  ticketId: string | null;
  source: "reservation";
  sourceLabel: string;
  client: string;
  time: string;
  note: string;
  items: BusinessKitchenCommandItem[];
  status: BusinessKitchenStatus;
  targetSeconds: number;
  enteredAt: string;
  startedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  isAddition: boolean;
};

export type BusinessKitchenSnapshot = {
  businessDate: string;
  commands: BusinessKitchenCommand[];
};

export type BusinessKitchenStatusMutationInput = {
  orderId: string;
  ticketId?: string | null;
  status: BusinessKitchenStatus;
  operationKey: string;
};

export type BusinessKitchenStatusMutation = {
  orderId: string;
  ticketId: string | null;
  status: BusinessKitchenStatus;
  targetSeconds: number;
  startedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
};

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

function normalizeNullableUuid(
  value: unknown,
  label: string,
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
    label,
  );
}

function normalizeStatus(
  value: unknown,
): BusinessKitchenStatus {
  if (
    typeof value !== "string"
    || !BUSINESS_KITCHEN_STATUSES.includes(
      value as BusinessKitchenStatus,
    )
  ) {
    throw new Error(
      "El estado de Cocina no es válido.",
    );
  }

  return value as BusinessKitchenStatus;
}

function normalizeOperationKey(
  value: unknown,
): string {
  if (typeof value !== "string") {
    throw new Error(
      "La clave de operación de Cocina es obligatoria.",
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length < 8
    || normalized.length > 120
  ) {
    throw new Error(
      "La clave de operación de Cocina debe tener entre 8 y 120 caracteres.",
    );
  }

  return normalized;
}

function normalizeTimestamp(
  value: unknown,
  label: string,
  options: {
    nullable?: boolean;
  } = {},
): string | null {
  if (
    options.nullable
    && (
      value === null
      || value === undefined
      || value === ""
    )
  ) {
    return null;
  }

  if (
    typeof value !== "string"
    || !Number.isFinite(
      Date.parse(value),
    )
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }

  return value;
}

function normalizeTargetSeconds(
  value: unknown,
): number {
  const seconds =
    Number(value);

  if (
    !Number.isInteger(seconds)
    || seconds < 1
    || seconds > 86400
  ) {
    throw new Error(
      "El tiempo objetivo de Cocina no es válido.",
    );
  }

  return seconds;
}

export function normalizeBusinessKitchenDate(
  value: unknown,
): string {
  if (
    typeof value !== "string"
    || !DATE_PATTERN.test(value)
  ) {
    throw new Error(
      "La fecha de Cocina no es válida.",
    );
  }

  const parsed =
    new Date(`${value}T12:00:00Z`);

  if (
    Number.isNaN(parsed.getTime())
    || parsed.toISOString().slice(0, 10)
      !== value
  ) {
    throw new Error(
      "La fecha de Cocina no es válida.",
    );
  }

  return value;
}

export function normalizeBusinessKitchenStatusMutationInput(
  value: unknown,
): BusinessKitchenStatusMutationInput {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "La operación de Cocina no es válida.",
    );
  }

  const source =
    value as Record<string, unknown>;

  return {
    orderId:
      normalizeUuid(
        source.orderId,
        "El pedido",
      ),
    ticketId:
      normalizeNullableUuid(
        source.ticketId,
        "La comanda agregada",
      ),
    status:
      normalizeStatus(
        source.status,
      ),
    operationKey:
      normalizeOperationKey(
        source.operationKey,
      ),
  };
}

export function toBusinessKitchenStatusRpcPayload(
  input: BusinessKitchenStatusMutationInput,
) {
  const normalized =
    normalizeBusinessKitchenStatusMutationInput(
      input,
    );

  return {
    p_order_id:
      normalized.orderId,
    p_ticket_id:
      normalized.ticketId,
    p_status:
      normalized.status,
    p_operation_key:
      normalized.operationKey,
  };
}

function mapCommandItem(
  value: unknown,
): BusinessKitchenCommandItem {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "Uno de los platos de Cocina no es válido.",
    );
  }

  const source =
    value as Record<string, unknown>;
  const name =
    typeof source.name === "string"
      ? source.name.trim()
      : "";
  const quantity =
    Number(source.quantity);

  if (
    !name
    || name.length > 160
    || !Number.isInteger(quantity)
    || quantity < 1
    || quantity > 9999
  ) {
    throw new Error(
      "Uno de los platos de Cocina no es válido.",
    );
  }

  return {
    menuItemId:
      normalizeUuid(
        source.menuItemId,
        "El plato de Cocina",
      ),
    name,
    quantity,
  };
}

function mapCommand(
  value: unknown,
): BusinessKitchenCommand {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "Una comanda persistente no es válida.",
    );
  }

  const source =
    value as Record<string, unknown>;
  const rawItems =
    source.items;

  if (
    !Array.isArray(rawItems)
    || rawItems.length === 0
    || rawItems.length > 100
  ) {
    throw new Error(
      "Los platos de la comanda persistente no son válidos.",
    );
  }

  const sourceType =
    source.source;

  if (sourceType !== "reservation") {
    throw new Error(
      "El origen de la comanda persistente no es válido.",
    );
  }

  const id =
    typeof source.id === "string"
      ? source.id.trim()
      : "";
  const sourceLabel =
    typeof source.sourceLabel === "string"
      ? source.sourceLabel.trim()
      : "";
  const client =
    typeof source.client === "string"
      ? source.client.trim()
      : "";
  const time =
    typeof source.time === "string"
      ? source.time.trim()
      : "";
  const note =
    typeof source.note === "string"
      ? source.note.trim()
      : "";

  if (
    !id
    || !sourceLabel
    || !client
    || !/^\d{2}:\d{2}$/u.test(time)
    || note.length > 2000
  ) {
    throw new Error(
      "La respuesta de la comanda persistente está incompleta.",
    );
  }

  return {
    id,
    orderId:
      normalizeUuid(
        source.orderId,
        "El pedido de Cocina",
      ),
    reservationId:
      normalizeUuid(
        source.reservationId,
        "La reserva de Cocina",
      ),
    ticketId:
      normalizeNullableUuid(
        source.ticketId,
        "La comanda agregada",
      ),
    source:
      sourceType,
    sourceLabel,
    client,
    time,
    note,
    items:
      rawItems.map(
        mapCommandItem,
      ),
    status:
      normalizeStatus(
        source.status,
      ),
    targetSeconds:
      normalizeTargetSeconds(
        source.targetSeconds,
      ),
    enteredAt:
      normalizeTimestamp(
        source.enteredAt,
        "El ingreso a Cocina",
      ) as string,
    startedAt:
      normalizeTimestamp(
        source.startedAt,
        "El inicio de Cocina",
        {
          nullable: true,
        },
      ),
    readyAt:
      normalizeTimestamp(
        source.readyAt,
        "La finalización de preparación",
        {
          nullable: true,
        },
      ),
    completedAt:
      normalizeTimestamp(
        source.completedAt,
        "La entrega de Cocina",
        {
          nullable: true,
        },
      ),
    isAddition:
      source.isAddition === true,
  };
}

export function mapBusinessKitchenSnapshot(
  value: unknown,
): BusinessKitchenSnapshot {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "La respuesta de Cocina persistente no es válida.",
    );
  }

  const source =
    value as Record<string, unknown>;
  const commands =
    source.commands;

  if (!Array.isArray(commands)) {
    throw new Error(
      "Las comandas persistentes no son válidas.",
    );
  }

  return {
    businessDate:
      normalizeBusinessKitchenDate(
        source.businessDate,
      ),
    commands:
      commands.map(
        mapCommand,
      ),
  };
}

export function mapBusinessKitchenStatusMutation(
  value: unknown,
): BusinessKitchenStatusMutation {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "La respuesta del cambio de Cocina no es válida.",
    );
  }

  const source =
    value as Record<string, unknown>;

  return {
    orderId:
      normalizeUuid(
        source.orderId,
        "El pedido de Cocina",
      ),
    ticketId:
      normalizeNullableUuid(
        source.ticketId,
        "La comanda agregada",
      ),
    status:
      normalizeStatus(
        source.status,
      ),
    targetSeconds:
      normalizeTargetSeconds(
        source.targetSeconds,
      ),
    startedAt:
      normalizeTimestamp(
        source.startedAt,
        "El inicio de Cocina",
        {
          nullable: true,
        },
      ),
    readyAt:
      normalizeTimestamp(
        source.readyAt,
        "La finalización de preparación",
        {
          nullable: true,
        },
      ),
    completedAt:
      normalizeTimestamp(
        source.completedAt,
        "La entrega de Cocina",
        {
          nullable: true,
        },
      ),
  };
}
