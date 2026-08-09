import { assertServerOnly } from "@/lib/security/server-only";
import {
  buildBusinessStockSnapshot,
  mapBusinessStockMovementRow,
  mapBusinessStockProductRow,
  type BusinessStockMovementDatabaseRow,
  type BusinessStockProductDatabaseRow,
} from "@/lib/stock/business-stock-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

const STOCK_PRODUCT_SELECT =
  "id, business_id, name, category, supplier, unit, unit_cost, alert_below, note, is_active, archived_at, created_at, updated_at" as const;

const STOCK_MOVEMENT_SELECT =
  "id, business_id, product_id, movement_type, origin, quantity_delta, product_name_snapshot, unit_snapshot, unit_cost_snapshot, operation_key, reference_id, label, detail, created_at" as const;

export async function getBusinessStockForBusiness(
  businessId: string,
) {
  assertServerOnly("getBusinessStockForBusiness");

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error(
      "No se pudo crear el cliente autenticado.",
    );
  }

  const [
    productsResult,
    movementsResult,
  ] = await Promise.all([
    supabase
      .from("stock_products")
      .select(STOCK_PRODUCT_SELECT)
      .eq("business_id", businessId)
      .is("archived_at", null)
      .order("is_active", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("stock_movements")
      .select(STOCK_MOVEMENT_SELECT)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (productsResult.error) {
    throw new Error(
      "No se pudieron leer los insumos del negocio.",
    );
  }

  if (movementsResult.error) {
    throw new Error(
      "No se pudieron leer los movimientos de stock.",
    );
  }

  const products = (productsResult.data ?? []).map(
    (row) =>
      mapBusinessStockProductRow(
        row as unknown as BusinessStockProductDatabaseRow,
      ),
  );

  const movements = (movementsResult.data ?? []).map(
    (row) =>
      mapBusinessStockMovementRow(
        row as unknown as BusinessStockMovementDatabaseRow,
      ),
  );

  return buildBusinessStockSnapshot(
    products,
    movements,
  );
}
