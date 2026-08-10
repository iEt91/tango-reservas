const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type BusinessOrderItemInput = {
  menuItemId: string;
  quantity: number;
};

export type BusinessReservationConsumptionInput = {
  reservationId: string;
  operationKey: string;
  items: BusinessOrderItemInput[];
};

export type BusinessOrderItem = {
  id: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type BusinessDineInOrder = {
  id: string;
  reservationId: string;
  status: "open" | "completed" | "cancelled";
  revision: number;
  subtotal: number;
  items: BusinessOrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type BusinessOrderDatabaseRow = {
  id?: unknown;
  reservation_id?: unknown;
  status?: unknown;
  revision?: unknown;
  subtotal?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

export type BusinessOrderItemDatabaseRow = {
  id?: unknown;
  menu_item_id?: unknown;
  name_snapshot?: unknown;
  unit_price_snapshot?: unknown;
  quantity?: unknown;
};

function normalizeUuid(
  value: unknown,
  label: string,
): string {
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
): string {
  if (typeof value !== "string") {
    throw new Error(
      "La clave de operación es obligatoria.",
    );
  }

  const normalized = value.trim();

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

function normalizeQuantity(
  value: unknown,
): number {
  const quantity = Number(value);

  if (
    !Number.isInteger(quantity)
    || quantity < 1
    || quantity > 9999
  ) {
    throw new Error(
      "La cantidad del plato debe ser un entero entre 1 y 9999.",
    );
  }

  return quantity;
}

export function normalizeBusinessReservationConsumptionInput(
  value: unknown,
): BusinessReservationConsumptionInput {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "El consumo recibido no es válido.",
    );
  }

  const source =
    value as Record<string, unknown>;
  const rawItems =
    source.items;

  if (!Array.isArray(rawItems)) {
    throw new Error(
      "Los platos del consumo no son válidos.",
    );
  }

  if (rawItems.length > 100) {
    throw new Error(
      "El consumo no puede superar 100 platos distintos.",
    );
  }

  const seen =
    new Set<string>();

  const items =
    rawItems.map((rawItem) => {
      if (
        !rawItem
        || typeof rawItem !== "object"
      ) {
        throw new Error(
          "Uno de los platos del consumo no es válido.",
        );
      }

      const item =
        rawItem as Record<string, unknown>;
      const menuItemId =
        normalizeUuid(
          item.menuItemId,
          "El plato",
        );

      if (seen.has(menuItemId)) {
        throw new Error(
          "El consumo contiene platos duplicados.",
        );
      }

      seen.add(menuItemId);

      return {
        menuItemId,
        quantity:
          normalizeQuantity(
            item.quantity,
          ),
      };
    })
    .sort(
      (first, second) =>
        first.menuItemId.localeCompare(
          second.menuItemId,
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
    items,
  };
}

export function toBusinessReservationConsumptionRpcPayload(
  input: BusinessReservationConsumptionInput,
) {
  const normalized =
    normalizeBusinessReservationConsumptionInput(
      input,
    );

  return {
    p_reservation_id:
      normalized.reservationId,
    p_operation_key:
      normalized.operationKey,
    p_items:
      normalized.items.map((item) => ({
        menu_item_id:
          item.menuItemId,
        quantity:
          item.quantity,
      })),
  };
}

function mapOrderItem(
  row: BusinessOrderItemDatabaseRow,
): BusinessOrderItem {
  const id =
    normalizeUuid(
      row.id,
      "El ítem del pedido",
    );
  const menuItemId =
    normalizeUuid(
      row.menu_item_id,
      "El plato del pedido",
    );
  const name =
    typeof row.name_snapshot === "string"
      ? row.name_snapshot.trim()
      : "";
  const unitPrice =
    Number(row.unit_price_snapshot);
  const quantity =
    Number(row.quantity);

  if (
    !name
    || !Number.isFinite(unitPrice)
    || unitPrice < 0
    || !Number.isInteger(quantity)
    || quantity < 1
  ) {
    throw new Error(
      "La respuesta del ítem persistente no es válida.",
    );
  }

  return {
    id,
    menuItemId,
    name,
    unitPrice,
    quantity,
    lineTotal:
      Number(
        (
          unitPrice
          * quantity
        ).toFixed(2),
      ),
  };
}

export function mapBusinessDineInOrder(
  orderRow: BusinessOrderDatabaseRow,
  itemRows: BusinessOrderItemDatabaseRow[],
): BusinessDineInOrder {
  const status =
    orderRow.status;

  if (
    status !== "open"
    && status !== "completed"
    && status !== "cancelled"
  ) {
    throw new Error(
      "El estado del pedido persistente no es válido.",
    );
  }

  const revision =
    Number(orderRow.revision);
  const subtotal =
    Number(orderRow.subtotal);

  if (
    !Number.isInteger(revision)
    || revision < 1
    || !Number.isFinite(subtotal)
    || subtotal < 0
  ) {
    throw new Error(
      "La respuesta del pedido persistente no es válida.",
    );
  }

  const items =
    itemRows.map(mapOrderItem);

  return {
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
    status,
    revision,
    subtotal,
    items,
    createdAt:
      typeof orderRow.created_at === "string"
        ? orderRow.created_at
        : "",
    updatedAt:
      typeof orderRow.updated_at === "string"
        ? orderRow.updated_at
        : "",
  };
}

export function mapBusinessReservationConsumptionResult(
  value: unknown,
): BusinessDineInOrder {
  if (
    !value
    || typeof value !== "object"
  ) {
    throw new Error(
      "La respuesta del consumo persistente no es válida.",
    );
  }

  const result =
    value as {
      order?: unknown;
      items?: unknown;
    };

  if (
    !result.order
    || typeof result.order !== "object"
    || !Array.isArray(result.items)
  ) {
    throw new Error(
      "La respuesta del consumo persistente está incompleta.",
    );
  }

  return mapBusinessDineInOrder(
    result.order as BusinessOrderDatabaseRow,
    result.items as BusinessOrderItemDatabaseRow[],
  );
}
