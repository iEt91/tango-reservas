import { assertServerOnly } from "@/lib/security/server-only";
import {
  isBusinessStockMovementOrigin,
  isBusinessStockMovementType,
  isBusinessStockUnit,
} from "@/lib/stock/business-stock-contract";
import type {
  StockHistoryActorRole,
  StockHistoryEntry,
} from "@/lib/stock/stock-history-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

type StockHistoryMovementRow = {
  id: string;
  business_id: string;
  product_id: string;
  movement_type: string;
  origin: string;
  quantity_delta: string | number;
  product_name_snapshot: string;
  unit_snapshot: string;
  unit_cost_snapshot: string | number;
  operation_key: string | null;
  reference_id: string | null;
  label: string;
  detail: string;
  created_by: string | null;
  created_at: string;
};

type BusinessMemberIdentityRow = {
  user_id: string | null;
  email: string | null;
  display_name: string;
  role: string;
};

const STOCK_HISTORY_SELECT =
  "id, business_id, product_id, movement_type, origin, quantity_delta, product_name_snapshot, unit_snapshot, unit_cost_snapshot, operation_key, reference_id, label, detail, created_by, created_at" as const;

function normalizeRole(
  value: string,
): StockHistoryActorRole {
  if (
    value === "owner"
    || value === "admin"
    || value === "staff"
  ) {
    return value;
  }

  return "";
}

export async function getBusinessStockHistoryForBusiness(
  businessId: string,
): Promise<StockHistoryEntry[]> {
  assertServerOnly(
    "getBusinessStockHistoryForBusiness",
  );

  const supabase =
    await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error(
      "No se pudo crear el cliente autenticado.",
    );
  }

  const movementsResult = await supabase
    .from("stock_movements")
    .select(STOCK_HISTORY_SELECT)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (movementsResult.error) {
    throw new Error(
      "No se pudo leer el historial de Stock.",
    );
  }

  const movementRows = (
    movementsResult.data ?? []
  ) as unknown as StockHistoryMovementRow[];

  const creatorIds = Array.from(
    new Set(
      movementRows
        .map((row) => row.created_by)
        .filter(
          (value): value is string =>
            typeof value === "string"
            && value.length > 0,
        ),
    ),
  );

  let memberRows: BusinessMemberIdentityRow[] = [];

  if (creatorIds.length > 0) {
    const membersResult = await supabase
      .from("business_members")
      .select(
        "user_id, email, display_name, role",
      )
      .eq("business_id", businessId)
      .in("user_id", creatorIds);

    if (!membersResult.error) {
      memberRows = (
        membersResult.data ?? []
      ) as unknown as BusinessMemberIdentityRow[];
    }
  }

  const membersByUserId = new Map(
    memberRows.flatMap((member) =>
      member.user_id
        ? [[member.user_id, member] as const]
        : [],
    ),
  );

  return movementRows.flatMap(
    (row): StockHistoryEntry[] => {
      if (
        !isBusinessStockMovementType(
          row.movement_type,
        )
        || !isBusinessStockMovementOrigin(
          row.origin,
        )
        || !isBusinessStockUnit(
          row.unit_snapshot,
        )
      ) {
        return [];
      }

      const member = row.created_by
        ? membersByUserId.get(row.created_by)
        : undefined;

      const actorEmail =
        member?.email?.trim().toLowerCase()
        ?? "";
      const actorName =
        member?.display_name?.trim()
        || actorEmail
        || (
          row.created_by
            ? "Usuario del local"
            : "Sistema"
        );

      return [{
        id: row.id,
        productId: row.product_id,
        productName:
          row.product_name_snapshot,
        movementType:
          row.movement_type,
        origin: row.origin,
        quantityDelta:
          Number(row.quantity_delta) || 0,
        unit: row.unit_snapshot,
        unitCost:
          Number(row.unit_cost_snapshot) || 0,
        operationKey:
          row.operation_key ?? "",
        referenceId:
          row.reference_id ?? "",
        label: row.label,
        detail: row.detail ?? "",
        createdBy:
          row.created_by ?? "",
        actorName,
        actorEmail,
        actorRole:
          normalizeRole(member?.role ?? ""),
        createdAt: row.created_at,
      }];
    },
  );
}
