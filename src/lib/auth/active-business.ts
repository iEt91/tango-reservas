import { cookies } from "next/headers";
import { assertServerOnly } from "@/lib/security/server-only";
import {
  createFullStaffPermissions,
  createNoAccessStaffPermissions,
  isStaffAccessLevel,
  isStaffModuleKey,
  type StaffPermissionMap,
} from "@/lib/staff/staff-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import {
  ACTIVE_BUSINESS_COOKIE,
  chooseActiveBusinessMembership,
  type ActiveBusinessChoice,
  type ActiveBusinessMembership,
  type ActiveBusinessRole,
} from "./active-business-contract";

type MembershipRow = {
  business_id: string;
  role: string;
  status: string;
  staff_role_id: string | null;
};

type BusinessRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

type StaffRoleRow = {
  id: string;
  business_id: string;
  name: string;
};

type StaffPermissionRow = {
  business_id: string;
  role_id: string;
  module_key: string;
  access_level: string;
};

export type ActiveBusinessResolution =
  | {
      status: "config_missing";
    }
  | {
      status: "unauthenticated";
    }
  | {
      status: "membership_missing";
      userId: string;
      memberships: [];
    }
  | {
      status: "selection_required";
      userId: string;
      memberships: ActiveBusinessMembership[];
    }
  | {
      status: "ready";
      userId: string;
      membership: ActiveBusinessMembership;
      memberships: ActiveBusinessMembership[];
    };

function isActiveBusinessRole(value: string): value is ActiveBusinessRole {
  return value === "owner" || value === "admin" || value === "staff";
}

function attachUserId(
  userId: string,
  choice: ActiveBusinessChoice,
): ActiveBusinessResolution {
  return {
    ...choice,
    userId,
  } as ActiveBusinessResolution;
}

function getPermissionKey(businessId: string, roleId: string) {
  return `${businessId}:${roleId}`;
}

export async function resolveActiveBusiness(): Promise<ActiveBusinessResolution> {
  assertServerOnly("resolveActiveBusiness");

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return { status: "config_missing" };
  }

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();
  const userId =
    typeof claimsData?.claims?.sub === "string"
      ? claimsData.claims.sub
      : null;

  if (claimsError || !userId) {
    return { status: "unauthenticated" };
  }

  const {
    data: membershipData,
    error: membershipError,
  } = await supabase
    .from("business_members")
    .select("business_id, role, status, staff_role_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipError) {
    throw new Error("No se pudo resolver la membresía activa.");
  }

  const membershipRows = (
    (membershipData ?? []) as unknown
  ) as MembershipRow[];
  const businessIds = [
    ...new Set(membershipRows.map((membership) => membership.business_id)),
  ];

  if (businessIds.length === 0) {
    return {
      status: "membership_missing",
      userId,
      memberships: [],
    };
  }

  const {
    data: businessData,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("id, slug, name, status")
    .in("id", businessIds);

  if (businessError) {
    throw new Error("No se pudo resolver el negocio autorizado.");
  }

  const businessById = new Map(
    (((businessData ?? []) as unknown) as BusinessRow[]).map((business) => [
      business.id,
      business,
    ]),
  );

  const staffRoleIds = [
    ...new Set(
      membershipRows.flatMap((membership) =>
        membership.role === "staff" && membership.staff_role_id
          ? [membership.staff_role_id]
          : [],
      ),
    ),
  ];
  const staffRoleById = new Map<string, StaffRoleRow>();
  const permissionsByRole = new Map<string, StaffPermissionMap>();

  if (staffRoleIds.length > 0) {
    const [roleResult, permissionResult] = await Promise.all([
      supabase
        .from("staff_roles")
        .select("id, business_id, name")
        .in("id", staffRoleIds)
        .is("archived_at", null),
      supabase
        .from("staff_role_permissions")
        .select("business_id, role_id, module_key, access_level")
        .in("role_id", staffRoleIds),
    ]);

    if (roleResult.error || permissionResult.error) {
      throw new Error("No se pudieron resolver los permisos del Staff.");
    }

    for (const role of (
      ((roleResult.data ?? []) as unknown) as StaffRoleRow[]
    )) {
      staffRoleById.set(role.id, role);
    }

    for (const row of (
      ((permissionResult.data ?? []) as unknown) as StaffPermissionRow[]
    )) {
      if (
        !isStaffModuleKey(row.module_key)
        || !isStaffAccessLevel(row.access_level)
      ) {
        continue;
      }

      const key = getPermissionKey(row.business_id, row.role_id);
      const permissions =
        permissionsByRole.get(key)
        ?? createNoAccessStaffPermissions();
      permissions[row.module_key] = row.access_level;
      permissionsByRole.set(key, permissions);
    }
  }

  const memberships = membershipRows.flatMap<ActiveBusinessMembership>((membership) => {
    const business = businessById.get(membership.business_id);

    if (
      membership.status !== "active"
      || !isActiveBusinessRole(membership.role)
      || !business
    ) {
      return [];
    }

    if (membership.role === "owner" || membership.role === "admin") {
      return [{
        businessId: membership.business_id,
        role: membership.role,
        status: "active" as const,
        business,
        staffRoleId: null,
        staffRoleName: null,
        permissions: createFullStaffPermissions(),
      }];
    }

    const staffRoleId = membership.staff_role_id;
    const staffRole = staffRoleId
      ? staffRoleById.get(staffRoleId)
      : null;
    const permissions =
      staffRoleId && staffRole
        ? permissionsByRole.get(
            getPermissionKey(membership.business_id, staffRoleId),
          ) ?? createNoAccessStaffPermissions()
        : createNoAccessStaffPermissions();

    return [{
      businessId: membership.business_id,
      role: membership.role,
      status: "active" as const,
      business,
      staffRoleId: staffRole?.id ?? null,
      staffRoleName: staffRole?.name ?? null,
      permissions,
    }];
  });

  if (memberships.length !== businessIds.length) {
    throw new Error("La identidad del negocio no pudo verificarse por completo.");
  }

  const cookieStore = await cookies();
  const requestedBusinessId = cookieStore.get(
    ACTIVE_BUSINESS_COOKIE,
  )?.value;

  return attachUserId(
    userId,
    chooseActiveBusinessMembership(
      memberships,
      requestedBusinessId,
    ),
  );
}
