"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import {
  mapBusinessStockMovementRow,
  mapBusinessStockProductRow,
  normalizeBusinessStockMovement,
  normalizeBusinessStockProductId,
  toBusinessStockProductRpcPayload,
  type BusinessStockMovement,
  type BusinessStockMovementDatabaseRow,
  type BusinessStockProduct,
  type BusinessStockProductDatabaseRow,
} from "@/lib/stock/business-stock-contract";
import { hasStaffAccess } from "@/lib/staff/staff-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type BusinessStockProductActionResult =
  | {
      ok: true;
      product: BusinessStockProduct;
    }
  | {
      ok: false;
      error: string;
    };

export type BusinessStockMovementActionResult =
  | {
      ok: true;
      movement: BusinessStockMovement;
    }
  | {
      ok: false;
      error: string;
    };

function formatStockMutationError(
  error: {
    code?: string | null;
  } | null,
  fallback: string,
) {
  if (error?.code === "23505") {
    return "La operación entra en conflicto con un insumo o movimiento existente.";
  }

  if (error?.code === "23514") {
    return "La operación dejaría un stock inválido.";
  }

  if (error?.code === "42501") {
    return "No tenés permisos para modificar el stock de este local.";
  }

  if (error?.code === "22023") {
    return "Los datos de stock recibidos no son válidos.";
  }

  return fallback;
}

async function resolveStockContext(
  minimum: "manage" | "full",
) {
  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status !== "ready") {
    return {
      ok: false as const,
      error:
        "La sesión o el negocio activo ya no son válidos.",
    };
  }

  if (
    activeBusiness.membership.role === "staff"
    && !hasStaffAccess(
      activeBusiness.membership.permissions,
      "stock",
      minimum,
    )
  ) {
    return {
      ok: false as const,
      error:
        "No tenés permisos para modificar el stock de este local.",
    };
  }

  const supabase = await createSupabaseAuthServerClient();

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

function revalidateStockPaths() {
  revalidatePath("/local/stock");
  revalidatePath("/local/productos");
  revalidatePath("/local/stock/historial");
}

export async function saveBusinessStockProductAction(
  input: unknown,
): Promise<BusinessStockProductActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error("El insumo recibido es inválido.");
    }

    const data = input as Record<string, unknown>;
    const productId =
      normalizeBusinessStockProductId(
        data.productId,
      );
    const product =
      toBusinessStockProductRpcPayload(
        data.product,
      );
    const context =
      await resolveStockContext("manage");

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "save_business_stock_product",
        {
          p_business_id: context.businessId,
          p_product_id: productId,
          p_product: product,
        },
      );

    if (error || !saved) {
      console.error(
        "[business-stock] product save RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatStockMutationError(
          error,
          "No se pudo guardar el insumo en Supabase.",
        ),
      };
    }

    revalidateStockPaths();

    return {
      ok: true,
      product: mapBusinessStockProductRow(
        saved as unknown as BusinessStockProductDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el insumo.",
    };
  }
}

export async function recordBusinessStockMovementAction(
  input: unknown,
): Promise<BusinessStockMovementActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error(
        "El movimiento recibido es inválido.",
      );
    }

    const data = input as Record<string, unknown>;
    const productId =
      normalizeBusinessStockProductId(
        data.productId,
      );

    if (!productId) {
      throw new Error(
        "El insumo del movimiento es obligatorio.",
      );
    }

    const movement =
      normalizeBusinessStockMovement(
        data.movement,
      );
    const context =
      await resolveStockContext("manage");

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "record_business_stock_movement",
        {
          p_business_id: context.businessId,
          p_product_id: productId,
          p_movement: movement,
        },
      );

    if (error || !saved) {
      console.error(
        "[business-stock] movement RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatStockMutationError(
          error,
          "No se pudo registrar el movimiento de stock.",
        ),
      };
    }

    revalidateStockPaths();

    return {
      ok: true,
      movement: mapBusinessStockMovementRow(
        saved as unknown as BusinessStockMovementDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el movimiento.",
    };
  }
}

export async function archiveBusinessStockProductAction(
  input: unknown,
): Promise<BusinessStockProductActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error(
        "La eliminación recibida es inválida.",
      );
    }

    const data = input as Record<string, unknown>;
    const productId =
      normalizeBusinessStockProductId(
        data.productId,
      );

    if (!productId) {
      throw new Error(
        "El insumo es obligatorio.",
      );
    }

    const context =
      await resolveStockContext("full");

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "archive_business_stock_product",
        {
          p_business_id: context.businessId,
          p_product_id: productId,
        },
      );

    if (error || !saved) {
      console.error(
        "[business-stock] product archive RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatStockMutationError(
          error,
          "No se pudo eliminar el insumo.",
        ),
      };
    }

    revalidateStockPaths();

    return {
      ok: true,
      product: mapBusinessStockProductRow(
        saved as unknown as BusinessStockProductDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la eliminación.",
    };
  }
}
