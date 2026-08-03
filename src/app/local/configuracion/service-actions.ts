"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import {
  mapBusinessServiceRow,
  normalizeBusinessService,
  normalizeServiceId,
  toBusinessServiceRpcPayload,
  type BusinessServiceDatabaseRow,
  type BusinessServiceEditor,
} from "@/lib/services/business-service-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type BusinessServiceActionResult =
  | {
      ok: true;
      service: BusinessServiceEditor;
    }
  | {
      ok: false;
      error: string;
    };

function formatBusinessServiceMutationError(
  error: {
    code?: string | null;
  } | null,
  fallback: string,
) {
  if (error?.code === "23505") {
    return "Ya existe un servicio con ese nombre.";
  }

  if (error?.code === "42501") {
    return "No tenés permisos para modificar este servicio.";
  }

  if (error?.code === "22023") {
    return "Los datos del servicio no son válidos.";
  }

  return fallback;
}

async function resolveAuthorizedServiceContext() {
  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status !== "ready") {
    return {
      ok: false as const,
      error: "La sesión o el negocio activo ya no son válidos.",
    };
  }

  if (
    activeBusiness.membership.role !== "owner"
    && activeBusiness.membership.role !== "admin"
  ) {
    return {
      ok: false as const,
      error:
        "Solo el dueño o un administrador pueden cambiar servicios.",
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

export async function saveBusinessServiceAction(
  input: unknown,
): Promise<BusinessServiceActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error("El servicio recibido es inválido.");
    }

    const data = input as Record<string, unknown>;
    const serviceId = normalizeServiceId(data.serviceId);
    const service = normalizeBusinessService(data.service);
    const context = await resolveAuthorizedServiceContext();

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } = await context.supabase.rpc(
      "save_business_service",
      {
        p_business_id: context.businessId,
        p_service_id: serviceId,
        p_service: toBusinessServiceRpcPayload(service),
      },
    );

    if (error || !saved) {
      console.error("[business-services] save RPC failed", {
        code: error?.code ?? null,
      });

      return {
        ok: false,
        error: formatBusinessServiceMutationError(
          error,
          "No se pudo guardar el servicio en Supabase.",
        ),
      };
    }

    revalidatePath("/local/configuracion");

    return {
      ok: true,
      service: mapBusinessServiceRow(
        saved as unknown as BusinessServiceDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el servicio.",
    };
  }
}

export async function setBusinessServiceActiveAction(
  input: unknown,
): Promise<BusinessServiceActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error("La actualización recibida es inválida.");
    }

    const data = input as Record<string, unknown>;
    const serviceId = normalizeServiceId(data.serviceId);

    if (!serviceId) {
      throw new Error("El servicio es obligatorio.");
    }

    if (typeof data.isActive !== "boolean") {
      throw new Error("El estado del servicio es inválido.");
    }

    const context = await resolveAuthorizedServiceContext();

    if (!context.ok) {
      return context;
    }

    const { data: saved, error } = await context.supabase.rpc(
      "set_business_service_active",
      {
        p_business_id: context.businessId,
        p_service_id: serviceId,
        p_is_active: data.isActive,
      },
    );

    if (error || !saved) {
      console.error("[business-services] status RPC failed", {
        code: error?.code ?? null,
      });

      return {
        ok: false,
        error: formatBusinessServiceMutationError(
          error,
          "No se pudo actualizar el estado del servicio.",
        ),
      };
    }

    revalidatePath("/local/configuracion");

    return {
      ok: true,
      service: mapBusinessServiceRow(
        saved as unknown as BusinessServiceDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el servicio.",
    };
  }
}
