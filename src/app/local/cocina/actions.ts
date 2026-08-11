"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { getBusinessKitchenSnapshot } from "@/lib/data/server/business-kitchen";
import {
  mapBusinessKitchenStatusMutation,
  normalizeBusinessKitchenDate,
  normalizeBusinessKitchenStatusMutationInput,
  toBusinessKitchenStatusRpcPayload,
  type BusinessKitchenSnapshot,
  type BusinessKitchenStatusMutation,
} from "@/lib/kitchen/business-kitchen-contract";
import {
  mapBusinessShippingKitchenSnapshot,
  type BusinessShippingKitchenSnapshot,
} from "@/lib/kitchen/business-shipping-kitchen-contract";
import { hasStaffAccess } from "@/lib/staff/staff-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type KitchenSnapshotActionResult =
  | {
      ok: true;
      snapshot: BusinessKitchenSnapshot;
    }
  | {
      ok: false;
      error: string;
    };

export type ShippingKitchenSnapshotActionResult =
  | {
      ok: true;
      snapshot: BusinessShippingKitchenSnapshot;
    }
  | {
      ok: false;
      error: string;
    };

export type KitchenStatusActionResult =
  | {
      ok: true;
      mutation: BusinessKitchenStatusMutation;
    }
  | {
      ok: false;
      error: string;
    };

function formatKitchenError(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
) {
  if (error?.code === "42501") {
    return "No tenés permisos suficientes en Cocina.";
  }

  if (error?.code === "22023") {
    return "Los datos de la operación de Cocina no son válidos.";
  }

  if (error?.code === "23505") {
    return "La operación de Cocina ya existe con datos diferentes.";
  }

  if (error?.code === "P0001") {
    return "Ese cambio de estado de Cocina no está permitido.";
  }

  return "No se pudo actualizar la comanda persistente.";
}

async function resolveKitchenContext(
  requiredAccess:
    | "view"
    | "manage",
) {
  const activeBusiness =
    await resolveActiveBusiness();

  if (
    activeBusiness.status
    !== "ready"
  ) {
    return {
      ok: false as const,
      error:
        "La sesión o el negocio activo ya no son válidos.",
    };
  }

  if (
    activeBusiness.membership.role
      === "staff"
    && !hasStaffAccess(
      activeBusiness.membership.permissions,
      "kitchen",
      requiredAccess,
    )
  ) {
    return {
      ok: false as const,
      error:
        "No tenés permisos suficientes en Cocina.",
    };
  }

  const supabase =
    await createSupabaseAuthServerClient();

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

function revalidateKitchenPaths() {
  revalidatePath("/local");
  revalidatePath("/local/cocina");
  revalidatePath("/local/reservas");
  revalidatePath("/local/historial");
  revalidatePath("/local/reportes");
}

export async function getBusinessShippingKitchenSnapshotAction(
  businessDate: unknown,
): Promise<ShippingKitchenSnapshotActionResult> {
  try {
    const date =
      normalizeBusinessKitchenDate(
        businessDate,
      );
    const context =
      await resolveKitchenContext(
        "view",
      );

    if (!context.ok) {
      return context;
    }

    const { data, error } =
      await context.supabase.rpc(
        "get_business_shipping_kitchen_snapshot",
        {
          p_business_id:
            context.businessId,
          p_business_date:
            date,
        },
      );

    if (error || !data) {
      return {
        ok: false,
        error:
          formatKitchenError(
            error,
          ),
      };
    }

    return {
      ok: true,
      snapshot:
        mapBusinessShippingKitchenSnapshot(
          data,
        ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron leer las comandas Shipping.",
    };
  }
}

export async function getBusinessKitchenSnapshotAction(
  businessDate: unknown,
): Promise<KitchenSnapshotActionResult> {
  try {
    const date =
      normalizeBusinessKitchenDate(
        businessDate,
      );
    const context =
      await resolveKitchenContext(
        "view",
      );

    if (!context.ok) {
      return context;
    }

    const snapshot =
      await getBusinessKitchenSnapshot(
        context.businessId,
        date,
      );

    return {
      ok: true,
      snapshot,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron leer las comandas persistentes.",
    };
  }
}

export async function setBusinessKitchenCommandStatusAction(
  input: unknown,
): Promise<KitchenStatusActionResult> {
  try {
    const normalized =
      normalizeBusinessKitchenStatusMutationInput(
        input,
      );
    const context =
      await resolveKitchenContext(
        "manage",
      );

    if (!context.ok) {
      return context;
    }

    const {
      data,
      error,
    } = await context.supabase.rpc(
      "set_business_kitchen_command_status",
      {
        p_business_id:
          context.businessId,
        ...toBusinessKitchenStatusRpcPayload(
          normalized,
        ),
      },
    );

    if (
      error
      || !data
    ) {
      console.error(
        "[kitchen] status RPC failed",
        {
          code:
            error?.code ?? null,
        },
      );

      return {
        ok: false,
        error:
          formatKitchenError(
            error,
          ),
      };
    }

    const mutation =
      mapBusinessKitchenStatusMutation(
        data,
      );

    revalidateKitchenPaths();

    return {
      ok: true,
      mutation,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la operación de Cocina.",
    };
  }
}


export async function setBusinessShippingKitchenCommandStatusAction(
  input: unknown,
): Promise<KitchenStatusActionResult> {
  try {
    const normalized =
      normalizeBusinessKitchenStatusMutationInput(
        input,
      );
    const context =
      await resolveKitchenContext(
        "manage",
      );

    if (!context.ok) {
      return context;
    }

    const { data, error } =
      await context.supabase.rpc(
        "set_business_shipping_kitchen_command_status",
        {
          p_business_id:
            context.businessId,
          ...toBusinessKitchenStatusRpcPayload(
            normalized,
          ),
        },
      );

    if (error || !data) {
      console.error(
        "[kitchen-shipping] status RPC failed",
        {
          code:
            error?.code ?? null,
        },
      );

      return {
        ok: false,
        error:
          formatKitchenError(
            error,
          ),
      };
    }

    const mutation =
      mapBusinessKitchenStatusMutation(
        data,
      );

    revalidateKitchenPaths();

    return {
      ok: true,
      mutation,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la operación Shipping de Cocina.",
    };
  }
}
