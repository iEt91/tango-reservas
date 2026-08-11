import { redirect } from "next/navigation";
import { V2CocinaPage } from "./v2-cocina-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { hasStaffAccess } from "@/lib/staff/staff-contract";

export default async function CocinaPage() {
  if (getDataSource() !== "supabase") {
    return <V2CocinaPage />;
  }

  const activeBusiness =
    await resolveActiveBusiness();

  if (
    activeBusiness.status
    === "unauthenticated"
  ) {
    redirect(
      buildLoginPath(
        "/local/cocina",
      ),
    );
  }

  if (
    activeBusiness.status
    === "selection_required"
  ) {
    redirect(
      "/auth/select-business?next=%2Flocal%2Fcocina",
    );
  }

  if (
    activeBusiness.status
    === "membership_missing"
  ) {
    redirect(
      "/auth/access-denied",
    );
  }

  if (
    activeBusiness.status
    !== "ready"
  ) {
    throw new Error(
      "No se pudo resolver el negocio activo para Cocina.",
    );
  }

  const privileged =
    activeBusiness.membership.role
      === "owner"
    || activeBusiness.membership.role
      === "admin";

  const canViewKitchen =
    privileged
    || (
      activeBusiness.membership.role
        === "staff"
      && hasStaffAccess(
        activeBusiness.membership.permissions,
        "kitchen",
        "view",
      )
    );

  if (!canViewKitchen) {
    redirect(
      "/auth/access-denied",
    );
  }

  const canManageKitchen =
    privileged
    || (
      activeBusiness.membership.role
        === "staff"
      && hasStaffAccess(
        activeBusiness.membership.permissions,
        "kitchen",
        "manage",
      )
    );

  return (
    <V2CocinaPage
      kitchenPersistence="supabase"
      canManageKitchen={canManageKitchen}
    />
  );
}
