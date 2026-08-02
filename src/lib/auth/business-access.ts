export const BUSINESS_ROLES = ["owner", "admin", "staff"] as const;

export type BusinessRole = (typeof BUSINESS_ROLES)[number];

export const BUSINESS_MEMBER_STATUSES = [
  "active",
  "invited",
  "disabled",
] as const;

export type BusinessMemberStatus =
  (typeof BUSINESS_MEMBER_STATUSES)[number];

const ROLE_PRIORITY: Record<BusinessRole, number> = {
  owner: 3,
  admin: 2,
  staff: 1,
};

export function isBusinessRole(value: unknown): value is BusinessRole {
  return (
    typeof value === "string"
    && BUSINESS_ROLES.includes(value as BusinessRole)
  );
}

export function normalizeBusinessRole(
  value: unknown,
  fallback: BusinessRole = "staff",
): BusinessRole {
  return isBusinessRole(value) ? value : fallback;
}

export function hasMinimumBusinessRole(
  currentRole: BusinessRole,
  requiredRole: BusinessRole,
): boolean {
  return ROLE_PRIORITY[currentRole] >= ROLE_PRIORITY[requiredRole];
}

export function canManageBusinessMembers(role: BusinessRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageBusinessSettings(role: BusinessRole): boolean {
  return role === "owner" || role === "admin";
}

export function canOperateBusiness(role: BusinessRole): boolean {
  return BUSINESS_ROLES.includes(role);
}
