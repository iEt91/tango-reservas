export const ACTIVE_BUSINESS_COOKIE = "tango_active_business";
export const ACTIVE_BUSINESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type ActiveBusinessRole = "owner" | "admin" | "staff";

export type ActiveBusinessSummary = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

export type ActiveBusinessMembership = {
  businessId: string;
  role: ActiveBusinessRole;
  status: "active";
  business: ActiveBusinessSummary;
};

export type ActiveBusinessChoice =
  | {
      status: "membership_missing";
      memberships: [];
    }
  | {
      status: "selection_required";
      memberships: ActiveBusinessMembership[];
    }
  | {
      status: "ready";
      membership: ActiveBusinessMembership;
      memberships: ActiveBusinessMembership[];
    };

export function isValidBusinessId(value: unknown): value is string {
  return (
    typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  );
}

export function chooseActiveBusinessMembership(
  memberships: ActiveBusinessMembership[],
  requestedBusinessId: string | null | undefined,
): ActiveBusinessChoice {
  const seenBusinessIds = new Set<string>();
  const activeMemberships = memberships.filter((membership) => {
    if (
      membership.status !== "active"
      || membership.businessId !== membership.business.id
      || seenBusinessIds.has(membership.businessId)
    ) {
      return false;
    }

    seenBusinessIds.add(membership.businessId);
    return true;
  });

  const requestedMembership = activeMemberships.find(
    (membership) => membership.businessId === requestedBusinessId,
  );

  if (requestedMembership) {
    return {
      status: "ready",
      membership: requestedMembership,
      memberships: activeMemberships,
    };
  }

  if (activeMemberships.length === 1) {
    return {
      status: "ready",
      membership: activeMemberships[0],
      memberships: activeMemberships,
    };
  }

  if (activeMemberships.length === 0) {
    return {
      status: "membership_missing",
      memberships: [],
    };
  }

  return {
    status: "selection_required",
    memberships: activeMemberships,
  };
}
