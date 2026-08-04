"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import {
  mapBusinessFloorPlanSettingsRow,
  mapBusinessFloorTableRow,
  mapBusinessReservationTableAssignment,
  normalizeBusinessFloorPlanSettings,
  normalizeBusinessFloorTable,
  normalizeBusinessFloorTableIds,
  normalizeFloorPlanUuid,
  toBusinessFloorPlanSettingsRpcPayload,
  toBusinessFloorTableRpcPayload,
  type BusinessFloorPlanSettingsDatabaseRow,
  type BusinessFloorTableDatabaseRow,
} from "@/lib/floor-plan/business-floor-plan-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

type FloorPlanActionError = {
  ok: false;
  error: string;
};

type FloorTableActionSuccess = {
  ok: true;
  table: ReturnType<typeof mapBusinessFloorTableRow>;
};

type FloorPlanSettingsActionSuccess = {
  ok: true;
  settings: ReturnType<
    typeof mapBusinessFloorPlanSettingsRow
  >;
};

type ReservationTableAssignmentActionSuccess = {
  ok: true;
  assignment: ReturnType<
    typeof mapBusinessReservationTableAssignment
  >;
};

export type FloorTableActionResult =
  | FloorTableActionSuccess
  | FloorPlanActionError;

export type FloorPlanSettingsActionResult =
  | FloorPlanSettingsActionSuccess
  | FloorPlanActionError;

export type ReservationTableAssignmentActionResult =
  | ReservationTableAssignmentActionSuccess
  | FloorPlanActionError;

function formatFloorPlanMutationError(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
  fallback: string,
) {
  if (error?.code === "23505") {
    return "Ya existe una mesa activa con ese nombre.";
  }

  if (error?.code === "42501") {
    return "No tenés permisos para modificar este plano.";
  }

  if (error?.code === "22023") {
    return "Los datos del plano o de la asignación no son válidos.";
  }

  if (error?.code === "P0001") {
    const message = error.message?.toLowerCase() ?? "";

    if (message.includes("enough seats")) {
      return "Las mesas seleccionadas no tienen capacidad suficiente.";
    }

    if (message.includes("overlapping reservation")) {
      return "Una de las mesas ya tiene una reserva superpuesta.";
    }

    if (message.includes("unavailable")) {
      return "Una de las mesas seleccionadas no está disponible.";
    }

    if (message.includes("combinations are disabled")) {
      return "Las combinaciones de mesas están desactivadas en Configuración.";
    }

    if (message.includes("cannot be joined")) {
      return "Una de las mesas seleccionadas no admite combinaciones.";
    }

    if (message.includes("active reservation assignment")) {
      return "La mesa tiene una reserva activa y no puede archivarse.";
    }

    return "La operación no cumple las reglas de disponibilidad del plano.";
  }

  return fallback;
}

async function resolveFloorPlanContext(
  allowedRoles: Array<"owner" | "admin" | "staff">,
) {
  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status !== "ready") {
    return {
      ok: false as const,
      error: "La sesión o el negocio activo ya no son válidos.",
    };
  }

  if (
    !allowedRoles.includes(
      activeBusiness.membership.role,
    )
  ) {
    return {
      ok: false as const,
      error: "No tenés permisos para modificar el plano.",
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

function revalidateFloorPlanViews() {
  revalidatePath("/local");
  revalidatePath("/local/plano");
  revalidatePath("/local/reservas");
}

export async function saveBusinessFloorPlanSettingsAction(
  input: unknown,
): Promise<FloorPlanSettingsActionResult> {
  try {
    const settings =
      normalizeBusinessFloorPlanSettings(input);
    const context = await resolveFloorPlanContext([
      "owner",
      "admin",
    ]);

    if (!context.ok) {
      return {
        ok: false,
        error: context.error,
      };
    }

    const { data, error } = await context.supabase.rpc(
      "save_business_floor_plan_settings",
      {
        p_business_id: context.businessId,
        p_settings:
          toBusinessFloorPlanSettingsRpcPayload(
            settings,
          ),
      },
    );

    if (error || !data) {
      console.error(
        "[business-floor-plan] settings RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatFloorPlanMutationError(
          error,
          "No se pudo guardar la configuración del plano.",
        ),
      };
    }

    revalidateFloorPlanViews();

    return {
      ok: true,
      settings: mapBusinessFloorPlanSettingsRow(
        data as unknown as BusinessFloorPlanSettingsDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la configuración del plano.",
    };
  }
}

export async function saveBusinessFloorTableAction(
  input: unknown,
): Promise<FloorTableActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error("La mesa recibida es inválida.");
    }

    const data = input as Record<string, unknown>;
    const tableId = normalizeFloorPlanUuid(
      data.tableId,
      "La mesa",
      {
        optional: true,
      },
    );
    const table = normalizeBusinessFloorTable(
      data.table,
    );
    const context = await resolveFloorPlanContext([
      "owner",
      "admin",
    ]);

    if (!context.ok) {
      return {
        ok: false,
        error: context.error,
      };
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "save_business_floor_table",
        {
          p_business_id: context.businessId,
          p_table_id: tableId,
          p_table:
            toBusinessFloorTableRpcPayload(table),
        },
      );

    if (error || !saved) {
      console.error(
        "[business-floor-plan] table RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatFloorPlanMutationError(
          error,
          "No se pudo guardar la mesa.",
        ),
      };
    }

    revalidateFloorPlanViews();

    return {
      ok: true,
      table: mapBusinessFloorTableRow(
        saved as unknown as BusinessFloorTableDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la mesa.",
    };
  }
}

export async function setBusinessFloorTableActiveAction(
  input: unknown,
): Promise<FloorTableActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error("La actualización recibida es inválida.");
    }

    const data = input as Record<string, unknown>;
    const tableId = normalizeFloorPlanUuid(
      data.tableId,
      "La mesa",
    );

    if (typeof data.isActive !== "boolean") {
      throw new Error("El estado de la mesa es inválido.");
    }

    const context = await resolveFloorPlanContext([
      "owner",
      "admin",
    ]);

    if (!context.ok) {
      return {
        ok: false,
        error: context.error,
      };
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "set_business_floor_table_active",
        {
          p_business_id: context.businessId,
          p_table_id: tableId,
          p_is_active: data.isActive,
        },
      );

    if (error || !saved) {
      console.error(
        "[business-floor-plan] active RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatFloorPlanMutationError(
          error,
          "No se pudo actualizar la mesa.",
        ),
      };
    }

    revalidateFloorPlanViews();

    return {
      ok: true,
      table: mapBusinessFloorTableRow(
        saved as unknown as BusinessFloorTableDatabaseRow,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la actualización.",
    };
  }
}

export async function setBusinessReservationTablesAction(
  input: unknown,
): Promise<ReservationTableAssignmentActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error("La asignación recibida es inválida.");
    }

    const data = input as Record<string, unknown>;
    const reservationId = normalizeFloorPlanUuid(
      data.reservationId,
      "La reserva",
    );
    const tableIds = normalizeBusinessFloorTableIds(
      data.tableIds,
    );
    const context = await resolveFloorPlanContext([
      "owner",
      "admin",
      "staff",
    ]);

    if (!context.ok) {
      return {
        ok: false,
        error: context.error,
      };
    }

    const { data: saved, error } =
      await context.supabase.rpc(
        "set_business_reservation_tables",
        {
          p_business_id: context.businessId,
          p_reservation_id: reservationId,
          p_table_ids: tableIds,
        },
      );

    if (error || !saved) {
      console.error(
        "[business-floor-plan] assignment RPC failed",
        {
          code: error?.code ?? null,
        },
      );

      return {
        ok: false,
        error: formatFloorPlanMutationError(
          error,
          "No se pudieron asignar las mesas.",
        ),
      };
    }

    revalidateFloorPlanViews();

    return {
      ok: true,
      assignment:
        mapBusinessReservationTableAssignment(
          saved,
        ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar la asignación.",
    };
  }
}
