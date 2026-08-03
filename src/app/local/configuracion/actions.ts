"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import {
  normalizeBusinessHoursEditor,
  toBusinessHoursRpcPayload,
  type BusinessHourEditorDay,
} from "@/lib/configuration/business-hours-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type SaveBusinessHoursResult =
  | {
      ok: true;
      businessHours: BusinessHourEditorDay[];
    }
  | {
      ok: false;
      error: string;
    };

export async function saveBusinessHoursAction(
  input: unknown,
): Promise<SaveBusinessHoursResult> {
  try {
    const activeBusiness = await resolveActiveBusiness();

    if (activeBusiness.status !== "ready") {
      return {
        ok: false,
        error: "La sesión o el negocio activo ya no son válidos.",
      };
    }

    if (
      activeBusiness.membership.role !== "owner"
      && activeBusiness.membership.role !== "admin"
    ) {
      return {
        ok: false,
        error: "Solo el dueño o un administrador pueden cambiar horarios.",
      };
    }

    const normalized = normalizeBusinessHoursEditor(input);
    const payload = toBusinessHoursRpcPayload(normalized);
    const supabase = await createSupabaseAuthServerClient();

    if (!supabase) {
      return {
        ok: false,
        error: "No se pudo crear el cliente autenticado.",
      };
    }

    const { error } = await supabase.rpc(
      "replace_business_hours",
      {
        p_business_id: activeBusiness.membership.businessId,
        p_hours: payload,
      },
    );

    if (error) {
      console.error("[business-hours] RPC failed", {
        code: error.code ?? null,
      });

      return {
        ok: false,
        error: "No se pudieron guardar los horarios en Supabase.",
      };
    }

    revalidatePath("/local/configuracion");

    return {
      ok: true,
      businessHours: normalized,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron validar los horarios.",
    };
  }
}
