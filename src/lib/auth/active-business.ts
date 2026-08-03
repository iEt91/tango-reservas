import { cookies } from "next/headers";
import { assertServerOnly } from "@/lib/security/server-only";
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
};

type BusinessRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
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
    .select("business_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipError) {
    throw new Error("No se pudo resolver la membresía activa.");
  }

  const membershipRows = (membershipData ?? []) as MembershipRow[];
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
    ((businessData ?? []) as BusinessRow[]).map((business) => [
      business.id,
      business,
    ]),
  );

  const memberships = membershipRows.flatMap((membership) => {
    const business = businessById.get(membership.business_id);

    if (
      membership.status !== "active"
      || !isActiveBusinessRole(membership.role)
      || !business
    ) {
      return [];
    }

    return [
      {
        businessId: membership.business_id,
        role: membership.role,
        status: "active" as const,
        business,
      },
    ];
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
