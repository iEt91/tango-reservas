"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import {
  mapBusinessCustomerRow,
  normalizeBusinessCustomer,
  normalizeCustomerId,
  toBusinessCustomerRpcPayload,
  type BusinessCustomerDatabaseRow,
  type BusinessCustomerEditor,
} from "@/lib/customers/business-customer-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type BusinessCustomerActionResult =
  | {
      ok: true;
      customer: BusinessCustomerEditor;
    }
  | {
      ok: false;
      error: string;
    };

function formatBusinessCustomerMutationError(
  error: {
    code?: string | null;
  } | null,
  fallback: string,
) {
  if (error?.code === "23505") {
    return "Ya existe un cliente con ese teléfono o correo.";
  }

  if (error?.code === "42501") {
    return "No tenés permisos para modificar este cliente.";
  }

  if (error?.code === "22023") {
    return "Los datos del cliente no son válidos.";
  }

  return fallback;
}

async function resolveCustomerContext({
  allowStaff,
}: {
  allowStaff: boolean;
}) {
  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status !== "ready") {
    return {
      ok: false as const,
      error: "La sesión o el negocio activo ya no son válidos.",
    };
  }

  const allowedRoles = allowStaff
    ? ["owner", "admin", "staff"]
    : ["owner", "admin"];

  if (!allowedRoles.includes(activeBusiness.membership.role)) {
    return {
      ok: false as const,
      error: "No tenés permisos para modificar clientes.",
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

export async function saveBusinessCustomerAction(
  input: unknown,
): Promise<BusinessCustomerActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error("El cliente recibido es inválido.");
    }

    const data = input as Record<string, unknown>;
    const customerId = normalizeCustomerId(data.customerId);
    const customer = normalizeBusinessCustomer(data.customer);
    const context = await resolveCustomerContext({
      allowStaff: true,
    });

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } = await context.supabase.rpc(
      "save_business_customer",
      {
        p_business_id: context.businessId,
        p_customer_id: customerId,
        p_customer: toBusinessCustomerRpcPayload(customer),
      },
    );

    if (error || !saved) {
      console.error("[business-customers] save RPC failed", {
        code: error?.code ?? null,
      });

      return {
        ok: false,
        error: formatBusinessCustomerMutationError(
          error,
          "No se pudo guardar el cliente en Supabase.",
        ),
      };
    }

    revalidatePath("/local/clientes");

    return {
      ok: true,
      customer: mapBusinessCustomerRow(
        saved as unknown as BusinessCustomerDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el cliente.",
    };
  }
}

export async function setBusinessCustomerActiveAction(
  input: unknown,
): Promise<BusinessCustomerActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error("La actualización recibida es inválida.");
    }

    const data = input as Record<string, unknown>;
    const customerId = normalizeCustomerId(data.customerId);

    if (!customerId) {
      throw new Error("El cliente es obligatorio.");
    }

    if (typeof data.isActive !== "boolean") {
      throw new Error("El estado del cliente es inválido.");
    }

    const context = await resolveCustomerContext({
      allowStaff: false,
    });

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } = await context.supabase.rpc(
      "set_business_customer_active",
      {
        p_business_id: context.businessId,
        p_customer_id: customerId,
        p_is_active: data.isActive,
      },
    );

    if (error || !saved) {
      console.error("[business-customers] status RPC failed", {
        code: error?.code ?? null,
      });

      return {
        ok: false,
        error: formatBusinessCustomerMutationError(
          error,
          "No se pudo actualizar el estado del cliente.",
        ),
      };
    }

    revalidatePath("/local/clientes");

    return {
      ok: true,
      customer: mapBusinessCustomerRow(
        saved as unknown as BusinessCustomerDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el cliente.",
    };
  }
}
