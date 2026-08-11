"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { getBusinessShippingSnapshot } from "@/lib/data/server/business-shipping";
import {
  mapBusinessShippingOrder,
  normalizeAcceptBusinessShippingOrderInput,
  normalizeBusinessShippingDate,
  normalizeCancelBusinessShippingOrderInput,
  normalizeCompleteBusinessShippingPaymentInput,
  normalizeSaveBusinessShippingOrderInput,
  normalizeSetBusinessShippingMilestoneInput,
  toBusinessShippingItemsRpcPayload,
  type BusinessShippingOrder,
  type BusinessShippingSnapshot,
} from "@/lib/shipping/business-shipping-contract";
import { hasStaffAccess } from "@/lib/staff/staff-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type BusinessShippingSnapshotActionResult =
  | { ok: true; snapshot: BusinessShippingSnapshot }
  | { ok: false; error: string };

export type BusinessShippingMutationActionResult =
  | { ok: true; shipping: BusinessShippingOrder }
  | { ok: false; error: string };

function formatShippingError(
  error: { code?: string | null } | null,
) {
  if (error?.code === "42501") {
    return "No tenés permisos suficientes en Envíos.";
  }

  if (error?.code === "22023") {
    return "Los datos de Envíos no son válidos.";
  }

  if (error?.code === "23503") {
    return "El pedido contiene datos que ya no están disponibles.";
  }

  if (error?.code === "23505") {
    return "La operación de Envíos ya existe con datos diferentes.";
  }

  if (error?.code === "23514") {
    return "El pedido no puede completarse con el Stock o los importes actuales.";
  }

  if (error?.code === "P0001") {
    return "Ese cambio de Envíos no está permitido en el estado actual.";
  }

  return "No se pudo actualizar el pedido persistente de Envíos.";
}

async function resolveShippingContext(
  requiredShippingAccess: "view" | "manage",
  options: { requireCashManage?: boolean } = {},
) {
  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status !== "ready") {
    return {
      ok: false as const,
      error: "La sesión o el negocio activo ya no son válidos.",
    };
  }

  if (
    activeBusiness.membership.role === "staff"
    && !hasStaffAccess(
      activeBusiness.membership.permissions,
      "shipping",
      requiredShippingAccess,
    )
  ) {
    return {
      ok: false as const,
      error: "No tenés permisos suficientes en Envíos.",
    };
  }

  if (
    options.requireCashManage
    && activeBusiness.membership.role === "staff"
    && !hasStaffAccess(
      activeBusiness.membership.permissions,
      "cash",
      "manage",
    )
  ) {
    return {
      ok: false as const,
      error: "No tenés permisos suficientes en Caja.",
    };
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return {
      ok: false as const,
      error: "No se pudo crear el cliente autenticado.",
    };
  }

  return {
    ok: true as const,
    businessId: activeBusiness.membership.businessId,
    supabase,
  };
}

function revalidateShippingPaths() {
  revalidatePath("/local");
  revalidatePath("/local/envios");
  revalidatePath("/local/cocina");
  revalidatePath("/local/stock");
  revalidatePath("/local/stock/historial");
  revalidatePath("/local/caja");
  revalidatePath("/local/historial");
  revalidatePath("/local/reportes");
}

export async function getBusinessShippingSnapshotAction(
  startDate: unknown,
  endDate: unknown,
): Promise<BusinessShippingSnapshotActionResult> {
  try {
    const normalizedStart = normalizeBusinessShippingDate(startDate);
    const normalizedEnd = normalizeBusinessShippingDate(endDate);
    const context = await resolveShippingContext("view");

    if (!context.ok) return context;

    const snapshot = await getBusinessShippingSnapshot(
      context.businessId,
      normalizedStart,
      normalizedEnd,
    );

    return { ok: true, snapshot };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error
        ? error.message
        : "No se pudieron leer los Envíos persistentes.",
    };
  }
}

export async function saveBusinessShippingOrderAction(
  input: unknown,
): Promise<BusinessShippingMutationActionResult> {
  try {
    const normalized = normalizeSaveBusinessShippingOrderInput(input);
    const context = await resolveShippingContext("manage");

    if (!context.ok) return context;

    const { data, error } = await context.supabase.rpc(
      "save_business_shipping_order",
      {
        p_business_id: context.businessId,
        p_shipping_id: normalized.shippingId,
        p_business_date: normalized.businessDate,
        p_scheduled_time: normalized.time,
        p_order_kind: normalized.deliveryType,
        p_client_name: normalized.client,
        p_client_phone: normalized.phone,
        p_address: normalized.address,
        p_note: normalized.note ?? "",
        p_source: normalized.source ?? "manual",
        p_needs_acceptance: normalized.needsAcceptance ?? false,
        p_preferred_payment_method: normalized.preferredPaymentMethod,
        p_items: toBusinessShippingItemsRpcPayload(normalized.items),
        p_operation_key: normalized.operationKey,
      },
    );

    if (error || !data) {
      console.error("[shipping] save RPC failed", {
        code: error?.code ?? null,
      });
      return { ok: false, error: formatShippingError(error) };
    }

    const shipping = mapBusinessShippingOrder(data);
    revalidateShippingPaths();
    return { ok: true, shipping };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error
        ? error.message
        : "No se pudo validar el pedido de Envíos.",
    };
  }
}

export async function acceptBusinessShippingOrderAction(
  input: unknown,
): Promise<BusinessShippingMutationActionResult> {
  try {
    const normalized = normalizeAcceptBusinessShippingOrderInput(input);
    const context = await resolveShippingContext("manage");

    if (!context.ok) return context;

    const { data, error } = await context.supabase.rpc(
      "accept_business_shipping_order",
      {
        p_business_id: context.businessId,
        p_shipping_id: normalized.shippingId,
        p_eta_minutes: normalized.etaMinutes,
        p_operation_key: normalized.operationKey,
      },
    );

    if (error || !data) {
      return { ok: false, error: formatShippingError(error) };
    }

    const shipping = mapBusinessShippingOrder(data);
    revalidateShippingPaths();
    return { ok: true, shipping };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error
        ? error.message
        : "No se pudo aceptar el pedido de Envíos.",
    };
  }
}

export async function setBusinessShippingMilestoneAction(
  input: unknown,
): Promise<BusinessShippingMutationActionResult> {
  try {
    const normalized = normalizeSetBusinessShippingMilestoneInput(input);
    const context = await resolveShippingContext("manage");

    if (!context.ok) return context;

    const { data, error } = await context.supabase.rpc(
      "set_business_shipping_milestone",
      {
        p_business_id: context.businessId,
        p_shipping_id: normalized.shippingId,
        p_milestone: normalized.milestone,
        p_operation_key: normalized.operationKey,
      },
    );

    if (error || !data) {
      return { ok: false, error: formatShippingError(error) };
    }

    const shipping = mapBusinessShippingOrder(data);
    revalidateShippingPaths();
    return { ok: true, shipping };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error
        ? error.message
        : "No se pudo actualizar el estado operativo de Envíos.",
    };
  }
}

export async function cancelBusinessShippingOrderAction(
  input: unknown,
): Promise<BusinessShippingMutationActionResult> {
  try {
    const normalized = normalizeCancelBusinessShippingOrderInput(input);
    const context = await resolveShippingContext("manage");

    if (!context.ok) return context;

    const { data, error } = await context.supabase.rpc(
      "cancel_business_shipping_order",
      {
        p_business_id: context.businessId,
        p_shipping_id: normalized.shippingId,
        p_return_stock: normalized.returnStock,
        p_operation_key: normalized.operationKey,
      },
    );

    if (error || !data) {
      return { ok: false, error: formatShippingError(error) };
    }

    const shipping = mapBusinessShippingOrder(data);
    revalidateShippingPaths();
    return { ok: true, shipping };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error
        ? error.message
        : "No se pudo cancelar el pedido de Envíos.",
    };
  }
}

export async function completeBusinessShippingPaymentAction(
  input: unknown,
): Promise<BusinessShippingMutationActionResult> {
  try {
    const normalized = normalizeCompleteBusinessShippingPaymentInput(input);
    const context = await resolveShippingContext("manage", {
      requireCashManage: true,
    });

    if (!context.ok) return context;

    const { data, error } = await context.supabase.rpc(
      "complete_business_shipping_payment",
      {
        p_business_id: context.businessId,
        p_shipping_id: normalized.shippingId,
        p_payments: normalized.payments,
        p_operation_key: normalized.operationKey,
      },
    );

    if (error || !data || typeof data !== "object") {
      return { ok: false, error: formatShippingError(error) };
    }

    const shipping = mapBusinessShippingOrder(
      (data as { shipping?: unknown }).shipping,
    );
    revalidateShippingPaths();
    return { ok: true, shipping };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error
        ? error.message
        : "No se pudo completar el pago del pedido de Envíos.",
    };
  }
}
