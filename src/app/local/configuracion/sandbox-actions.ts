"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type BusinessSandboxResult =
  | {
      ok: true;
      sandboxBusinessId: string;
      sandboxName: string;
      seedVersion: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function createOrResetBusinessSandboxAction(
  confirmation: string,
): Promise<BusinessSandboxResult> {
  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status !== "ready") {
    return { ok: false, error: "La sesión o el negocio activo ya no son válidos." };
  }

  if (activeBusiness.membership.role !== "owner") {
    return { ok: false, error: "Solo el dueño puede crear o reiniciar la simulación." };
  }

  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) {
    return { ok: false, error: "No se pudo crear el cliente autenticado." };
  }

  const { data, error } = await supabase.rpc(
    "create_or_reset_business_sandbox",
    {
      p_source_business_id: activeBusiness.membership.businessId,
      p_confirmation: confirmation,
    },
  );

  if (error || !data || typeof data !== "object") {
    console.error("[business-sandbox] RPC failed", { code: error?.code ?? null });
    return { ok: false, error: "No se pudo crear la simulación. Revisá la confirmación e intentá de nuevo." };
  }

  const result = data as Record<string, unknown>;
  if (
    typeof result.sandboxBusinessId !== "string"
    || typeof result.sandboxName !== "string"
    || typeof result.seedVersion !== "string"
  ) {
    return { ok: false, error: "La simulación se creó con una respuesta inválida." };
  }

  const { error: gridError } = await supabase.rpc(
    "seed_business_sandbox_reservation_grid",
    { p_sandbox_business_id: result.sandboxBusinessId },
  );

  if (gridError) {
    console.error("[business-sandbox] reservation grid failed", { code: gridError.code ?? null });
    return { ok: false, error: "La simulación se creó, pero no se pudo completar su agenda de práctica." };
  }

  const { error: showcaseError } = await supabase.rpc(
    "seed_business_sandbox_showcase",
    { p_sandbox_business_id: result.sandboxBusinessId },
  );

  if (showcaseError) {
    console.error("[business-sandbox] showcase seed failed", { code: showcaseError.code ?? null });
    return { ok: false, error: "La simulación se creó, pero no se pudo completar su operación de práctica." };
  }

  revalidatePath("/local/configuracion");
  revalidatePath("/auth/select-business");

  return {
    ok: true,
    sandboxBusinessId: result.sandboxBusinessId,
    sandboxName: result.sandboxName,
    seedVersion: "v4",
  };
}
