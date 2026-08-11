import { redirect } from "next/navigation";
import { V2EnviosPage } from "./v2-envios-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinessMenuForBusiness } from "@/lib/data/server/business-menu";
import { hasStaffAccess } from "@/lib/staff/staff-contract";

export default async function EnviosPage() {
  if (getDataSource() !== "supabase") {
    return <V2EnviosPage />;
  }

  const activeBusiness =
    await resolveActiveBusiness();

  if (
    activeBusiness.status
    === "unauthenticated"
  ) {
    redirect(
      buildLoginPath(
        "/local/envios",
      ),
    );
  }

  if (
    activeBusiness.status
    === "selection_required"
  ) {
    redirect(
      "/auth/select-business?next=%2Flocal%2Fenvios",
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
      "No se pudo resolver el negocio activo para Envíos.",
    );
  }

  const privileged =
    activeBusiness.membership.role
      === "owner"
    || activeBusiness.membership.role
      === "admin";

  const canViewShipping =
    privileged
    || (
      activeBusiness.membership.role
        === "staff"
      && hasStaffAccess(
        activeBusiness.membership.permissions,
        "shipping",
        "view",
      )
    );

  if (!canViewShipping) {
    redirect(
      "/auth/access-denied",
    );
  }

  const canManageShipping =
    privileged
    || (
      activeBusiness.membership.role
        === "staff"
      && hasStaffAccess(
        activeBusiness.membership.permissions,
        "shipping",
        "manage",
      )
    );

  const canManageCash =
    privileged
    || (
      activeBusiness.membership.role
        === "staff"
      && hasStaffAccess(
        activeBusiness.membership.permissions,
        "cash",
        "manage",
      )
    );

  const menu =
    await getBusinessMenuForBusiness(
      activeBusiness.membership.businessId,
    );

  return (
    <V2EnviosPage
      shippingPersistence="supabase"
      canManageShipping={canManageShipping}
      canManageCash={canManageCash}
      initialMenuCategories={menu.categories}
      initialMenuItems={menu.items}
    />
  );
}
