"use server";

import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { getBusinessStockHistoryForBusiness } from "@/lib/data/server/business-stock-history";
import { hasStaffAccess } from "@/lib/staff/staff-contract";
import type { StockHistoryEntry } from "@/lib/stock/stock-history-contract";

export type LoadBusinessStockHistoryResult =
  | {
      ok: true;
      entries: StockHistoryEntry[];
    }
  | {
      ok: false;
      error: string;
    };

export async function loadBusinessStockHistoryAction():
Promise<LoadBusinessStockHistoryResult> {
  const activeBusiness =
    await resolveActiveBusiness();

  if (activeBusiness.status !== "ready") {
    return {
      ok: false,
      error:
        "La sesión o el negocio activo ya no son válidos.",
    };
  }

  if (
    activeBusiness.membership.role === "staff"
    && (
      !hasStaffAccess(
        activeBusiness.membership.permissions,
        "history",
        "view",
      )
      || !hasStaffAccess(
        activeBusiness.membership.permissions,
        "stock",
        "view",
      )
    )
  ) {
    return {
      ok: false,
      error:
        "No tenés permisos para consultar la auditoría de Stock.",
    };
  }

  try {
    return {
      ok: true,
      entries:
        await getBusinessStockHistoryForBusiness(
          activeBusiness.membership.businessId,
        ),
    };
  } catch {
    return {
      ok: false,
      error:
        "No se pudo cargar la auditoría de Stock.",
    };
  }
}
