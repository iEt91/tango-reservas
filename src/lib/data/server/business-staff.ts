import { assertServerOnly } from "@/lib/security/server-only";
import {
  STAFF_MODULE_DEFINITIONS,
  createNoAccessStaffPermissions,
  isStaffAccessLevel,
  isStaffModuleKey,
  type BusinessStaffSnapshot,
  type StaffMemberEditor,
  type StaffRoleEditor,
} from "@/lib/staff/staff-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

type StaffRoleRow = {
  id: string;
  business_id: string;
  preset_key: string | null;
  name: string;
  is_preset: boolean;
};

type StaffPermissionRow = {
  business_id: string;
  role_id: string;
  module_key: string;
  access_level: string;
};

type StaffMemberRow = {
  id: string;
  business_id: string;
  user_id: string | null;
  email: string | null;
  invited_email: string | null;
  display_name: string;
  phone: string;
  staff_role_id: string | null;
  role: string;
  status: string;
};

type StaffMemberNoteRow = {
  business_id: string;
  member_id: string;
  notes: string;
};

export async function getBusinessStaffForBusiness(
  businessId: string,
): Promise<BusinessStaffSnapshot> {
  assertServerOnly("getBusinessStaffForBusiness");

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error("No se pudo crear el cliente autenticado.");
  }

  const [
    rolesResult,
    permissionsResult,
    membersResult,
    notesResult,
  ] = await Promise.all([
    supabase
      .from("staff_roles")
      .select(
        "id, business_id, preset_key, name, is_preset",
      )
      .eq("business_id", businessId)
      .is("archived_at", null)
      .order("is_preset", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("staff_role_permissions")
      .select(
        "business_id, role_id, module_key, access_level",
      )
      .eq("business_id", businessId)
      .order("module_key", { ascending: true }),
    supabase
      .from("business_members")
      .select(
        "id, business_id, user_id, email, invited_email, display_name, phone, staff_role_id, role, status",
      )
      .eq("business_id", businessId)
      .neq("status", "removed")
      .order("display_name", { ascending: true })
      .order("email", { ascending: true }),
    supabase
      .from("staff_member_notes")
      .select("business_id, member_id, notes")
      .eq("business_id", businessId),
  ]);

  if (
    rolesResult.error
    || permissionsResult.error
    || membersResult.error
    || notesResult.error
  ) {
    throw new Error(
      "No se pudo leer el Staff del negocio.",
    );
  }

  const permissionsByRole = new Map<
    string,
    ReturnType<typeof createNoAccessStaffPermissions>
  >();

  for (
    const row of (
      (permissionsResult.data ?? []) as unknown
    ) as StaffPermissionRow[]
  ) {
    if (
      !isStaffModuleKey(row.module_key)
      || !isStaffAccessLevel(row.access_level)
    ) {
      continue;
    }

    const permissions =
      permissionsByRole.get(row.role_id)
      ?? createNoAccessStaffPermissions();

    permissions[row.module_key] = row.access_level;
    permissionsByRole.set(row.role_id, permissions);
  }

  const roles: StaffRoleEditor[] = (
    ((rolesResult.data ?? []) as unknown) as StaffRoleRow[]
  ).map((role) => ({
    id: role.id,
    name: role.name,
    presetKey: role.preset_key,
    isPreset: role.is_preset,
    permissions:
      permissionsByRole.get(role.id)
      ?? createNoAccessStaffPermissions(),
  }));

  const roleIds = new Set(roles.map((role) => role.id));
  const notesByMember = new Map(
    (((notesResult.data ?? []) as unknown) as StaffMemberNoteRow[]).map(
      (note) => [note.member_id, note.notes ?? ""],
    ),
  );

  const members: StaffMemberEditor[] = (
    ((membersResult.data ?? []) as unknown) as StaffMemberRow[]
  ).flatMap((member) => {
    if (member.role === "owner") {
      return [];
    }

    if (
      member.status !== "active"
      && member.status !== "invited"
      && member.status !== "disabled"
    ) {
      return [];
    }

    const email =
      member.email?.trim().toLowerCase()
      || member.invited_email?.trim().toLowerCase()
      || "";

    if (!email) {
      return [];
    }

    return [{
      id: member.id,
      userId: member.user_id,
      email,
      displayName:
        member.display_name?.trim()
        || email.split("@")[0]
        || "Empleado",
      phone: member.phone ?? "",
      notes: notesByMember.get(member.id) ?? "",
      staffRoleId:
        member.staff_role_id
        && roleIds.has(member.staff_role_id)
          ? member.staff_role_id
          : null,
      status: member.status,
    } satisfies StaffMemberEditor];
  });

  for (const role of roles) {
    for (const { key } of STAFF_MODULE_DEFINITIONS) {
      role.permissions[key] ??= "none";
    }
  }

  return { roles, members };
}
