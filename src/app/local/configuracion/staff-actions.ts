"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { getBusinessStaffForBusiness } from "@/lib/data/server/business-staff";
import {
  normalizeStaffDisplayName,
  normalizeStaffEmail,
  normalizeStaffEntityId,
  normalizeStaffOptionalText,
  normalizeStaffPermissionMap,
  normalizeStaffRoleName,
  type BusinessStaffSnapshot,
  type StaffMemberStatus,
} from "@/lib/staff/staff-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type StaffActionResult =
  | {
      ok: true;
      snapshot: BusinessStaffSnapshot;
      message?: string;
    }
  | {
      ok: false;
      error: string;
    };

function formatStaffMutationError(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
  fallback: string,
) {
  if (error?.code === "23505") {
    return "Ya existe un empleado o rol con ese dato en este local.";
  }

  if (error?.code === "23503") {
    return "El rol ya no está disponible o todavía está asignado.";
  }

  if (error?.code === "42501") {
    return "Solo el dueño puede administrar el Staff.";
  }

  if (error?.code === "22023") {
    return "Los datos de Staff no son válidos.";
  }

  if (error?.code === "P0002") {
    return "El registro de Staff ya no está disponible.";
  }

  return fallback;
}

async function resolveOwnerStaffContext() {
  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status !== "ready") {
    return {
      ok: false as const,
      error:
        "La sesión o el local activo ya no son válidos.",
    };
  }

  if (activeBusiness.membership.role !== "owner") {
    return {
      ok: false as const,
      error:
        "Solo el dueño puede administrar el Staff.",
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
    businessId: activeBusiness.membership.businessId,
    supabase,
  };
}

async function refreshedSnapshot(
  businessId: string,
  message?: string,
): Promise<StaffActionResult> {
  revalidatePath("/local");
  revalidatePath("/local/configuracion");

  return {
    ok: true,
    snapshot: await getBusinessStaffForBusiness(
      businessId,
    ),
    message,
  };
}

export async function saveBusinessStaffRoleAction(
  input: unknown,
): Promise<StaffActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error("El rol recibido no es válido.");
    }

    const data = input as Record<string, unknown>;
    const roleId = normalizeStaffEntityId(
      data.roleId,
      "El rol",
      { nullable: true },
    );
    const name = normalizeStaffRoleName(data.name);
    const permissions =
      normalizeStaffPermissionMap(data.permissions);
    const context = await resolveOwnerStaffContext();

    if (!context.ok) {
      return context;
    }

    const { error } = await context.supabase.rpc(
      "save_business_staff_role",
      {
        p_business_id: context.businessId,
        p_role_id: roleId,
        p_name: name,
        p_permissions: permissions,
      },
    );

    if (error) {
      console.error(
        "[staff] save role RPC failed",
        { code: error.code ?? null },
      );

      return {
        ok: false,
        error: formatStaffMutationError(
          error,
          "No se pudo guardar el rol.",
        ),
      };
    }

    return refreshedSnapshot(
      context.businessId,
      roleId
        ? "Rol actualizado."
        : "Rol creado.",
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el rol.",
    };
  }
}

export async function removeBusinessStaffRoleAction(
  input: unknown,
): Promise<StaffActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error("El rol recibido no es válido.");
    }

    const data = input as Record<string, unknown>;
    const roleId = normalizeStaffEntityId(
      data.roleId,
      "El rol",
    );

    if (!roleId) {
      throw new Error("El rol es obligatorio.");
    }

    const context = await resolveOwnerStaffContext();

    if (!context.ok) {
      return context;
    }

    const { error } = await context.supabase.rpc(
      "archive_business_staff_role",
      {
        p_business_id: context.businessId,
        p_role_id: roleId,
      },
    );

    if (error) {
      return {
        ok: false,
        error: formatStaffMutationError(
          error,
          "No se pudo eliminar el rol.",
        ),
      };
    }

    return refreshedSnapshot(
      context.businessId,
      "Rol eliminado.",
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el rol.",
    };
  }
}

async function resolveAuthUserByEmail(
  businessId: string,
  email: string,
  supabase: Awaited<
    ReturnType<typeof createSupabaseAuthServerClient>
  >,
) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "resolve_staff_auth_user",
    {
      p_business_id: businessId,
      p_email: email,
    },
  );

  if (error) {
    throw error;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  const userId = normalizeStaffEntityId(
    record.user_id,
    "El usuario",
    { nullable: true },
  );

  if (!userId) {
    return null;
  }

  return {
    userId,
    confirmed: record.confirmed === true,
  };
}

async function getInviteRedirectTo() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (!origin) {
    return undefined;
  }

  let parsedOrigin: URL;

  try {
    parsedOrigin = new URL(origin);
  } catch {
    return undefined;
  }

  if (
    parsedOrigin.protocol !== "https:"
    && parsedOrigin.protocol !== "http:"
  ) {
    return undefined;
  }

  return `${parsedOrigin.origin}/auth/update-password`;
}

export async function saveBusinessStaffMemberAction(
  input: unknown,
): Promise<StaffActionResult> {
  let provisionalMemberId: string | null = null;

  try {
    if (!input || typeof input !== "object") {
      throw new Error(
        "El empleado recibido no es válido.",
      );
    }

    const data = input as Record<string, unknown>;
    const memberId = normalizeStaffEntityId(
      data.memberId,
      "El empleado",
      { nullable: true },
    );
    const email = normalizeStaffEmail(data.email);
    const displayName = normalizeStaffDisplayName(
      data.displayName,
    );
    const phone = normalizeStaffOptionalText(
      data.phone,
      60,
      "El teléfono",
    );
    const notes = normalizeStaffOptionalText(
      data.notes,
      2000,
      "Las notas",
    );
    const staffRoleId = normalizeStaffEntityId(
      data.staffRoleId,
      "El rol",
    );

    if (!staffRoleId) {
      throw new Error(
        "Tenés que asignar un rol al empleado.",
      );
    }

    const context = await resolveOwnerStaffContext();

    if (!context.ok) {
      return context;
    }

    if (memberId) {
      const { error } = await context.supabase.rpc(
        "save_business_staff_member",
        {
          p_business_id: context.businessId,
          p_member_id: memberId,
          p_user_id: null,
          p_email: email,
          p_display_name: displayName,
          p_phone: phone,
          p_notes: notes,
          p_staff_role_id: staffRoleId,
          p_status:
            data.status === "disabled"
              ? "disabled"
              : data.status === "invited"
                ? "invited"
                : "active",
        },
      );

      if (error) {
        return {
          ok: false,
          error: formatStaffMutationError(
            error,
            "No se pudo actualizar el empleado.",
          ),
        };
      }

      return refreshedSnapshot(
        context.businessId,
        "Empleado actualizado.",
      );
    }

    const existingUser = await resolveAuthUserByEmail(
      context.businessId,
      email,
      context.supabase,
    );

    if (existingUser) {
      const { error } = await context.supabase.rpc(
        "save_business_staff_member",
        {
          p_business_id: context.businessId,
          p_member_id: null,
          p_user_id: existingUser.userId,
          p_email: email,
          p_display_name: displayName,
          p_phone: phone,
          p_notes: notes,
          p_staff_role_id: staffRoleId,
          p_status:
            existingUser.confirmed
              ? "active"
              : "invited",
        },
      );

      if (error) {
        return {
          ok: false,
          error: formatStaffMutationError(
            error,
            "No se pudo agregar el empleado.",
          ),
        };
      }

      return refreshedSnapshot(
        context.businessId,
        existingUser.confirmed
          ? "Empleado agregado al local."
          : "Empleado asociado a una invitación pendiente.",
      );
    }

    const {
      data: provisionalData,
      error: provisionalError,
    } = await context.supabase.rpc(
      "save_business_staff_member",
      {
        p_business_id: context.businessId,
        p_member_id: null,
        p_user_id: null,
        p_email: email,
        p_display_name: displayName,
        p_phone: phone,
        p_notes: notes,
        p_staff_role_id: staffRoleId,
        p_status: "invited",
      },
    );

    if (provisionalError || !provisionalData) {
      return {
        ok: false,
        error: formatStaffMutationError(
          provisionalError,
          "No se pudo preparar la invitación.",
        ),
      };
    }

    provisionalMemberId = normalizeStaffEntityId(
      (provisionalData as Record<string, unknown>).id,
      "La invitación",
    );

    const admin = getSupabaseServerClient();

    if (!admin) {
      throw new Error(
        "Falta configurar el servicio seguro para enviar invitaciones.",
      );
    }

    const redirectTo = await getInviteRedirectTo();
    const { data: invitation, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(
        email,
        {
          ...(redirectTo ? { redirectTo } : {}),
          data: {
            full_name: displayName,
          },
        },
      );

    if (inviteError || !invitation.user?.id) {
      await context.supabase.rpc(
        "set_business_staff_member_status",
        {
          p_business_id: context.businessId,
          p_member_id: provisionalMemberId,
          p_status: "removed",
        },
      );

      return {
        ok: false,
        error:
          inviteError?.message
          || "No se pudo enviar la invitación.",
      };
    }

    const { error: linkError } =
      await context.supabase.rpc(
        "save_business_staff_member",
        {
          p_business_id: context.businessId,
          p_member_id: provisionalMemberId,
          p_user_id: invitation.user.id,
          p_email: email,
          p_display_name: displayName,
          p_phone: phone,
          p_notes: notes,
          p_staff_role_id: staffRoleId,
          p_status: "invited",
        },
      );

    if (linkError) {
      return {
        ok: false,
        error: formatStaffMutationError(
          linkError,
          "La invitación se envió, pero no pudo vincularse automáticamente. Volvé a guardar el empleado.",
        ),
      };
    }

    return refreshedSnapshot(
      context.businessId,
      "Invitación enviada.",
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo guardar el empleado.",
    };
  }
}

export async function setBusinessStaffMemberStatusAction(
  input: unknown,
): Promise<StaffActionResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new Error(
        "El empleado recibido no es válido.",
      );
    }

    const data = input as Record<string, unknown>;
    const memberId = normalizeStaffEntityId(
      data.memberId,
      "El empleado",
    );

    if (!memberId) {
      throw new Error("El empleado es obligatorio.");
    }

    const status = data.status;

    if (
      status !== "active"
      && status !== "disabled"
      && status !== "removed"
    ) {
      throw new Error(
        "El estado del empleado no es válido.",
      );
    }

    const context = await resolveOwnerStaffContext();

    if (!context.ok) {
      return context;
    }

    const { error } = await context.supabase.rpc(
      "set_business_staff_member_status",
      {
        p_business_id: context.businessId,
        p_member_id: memberId,
        p_status: status,
      },
    );

    if (error) {
      return {
        ok: false,
        error: formatStaffMutationError(
          error,
          "No se pudo cambiar el acceso del empleado.",
        ),
      };
    }

    const labelByStatus: Record<
      Exclude<StaffMemberStatus, "invited"> | "removed",
      string
    > = {
      active: "Acceso reactivado.",
      disabled: "Empleado suspendido.",
      removed: "Empleado eliminado del local.",
    };

    return refreshedSnapshot(
      context.businessId,
      labelByStatus[status],
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el acceso.",
    };
  }
}
