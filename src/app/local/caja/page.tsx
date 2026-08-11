import { redirect } from "next/navigation";
import { V2CajaPage } from "./v2-caja-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { hasStaffAccess } from "@/lib/staff/staff-contract";

export default async function CajaPage() {
  if (getDataSource() !== "supabase") {
    return <V2CajaPage />;
  }

  const activeBusiness =
    await resolveActiveBusiness();

  if (activeBusiness.status === "unauthenticated") {
    redirect(
      buildLoginPath("/local/caja"),
    );
  }

  if (activeBusiness.status === "selection_required") {
    redirect(
      "/auth/select-business?next=%2Flocal%2Fcaja",
    );
  }

  if (activeBusiness.status === "membership_missing") {
    redirect("/auth/access-denied");
  }

  if (activeBusiness.status !== "ready") {
    throw new Error(
      "No se pudo resolver el negocio activo para Caja.",
    );
  }

  const privileged =
    activeBusiness.membership.role === "owner"
    || activeBusiness.membership.role === "admin";

  const canManageCash =
    privileged
    || (
      activeBusiness.membership.role === "staff"
      && hasStaffAccess(
        activeBusiness.membership.permissions,
        "cash",
        "manage",
      )
    );

  const canFullCash =
    privileged
    || (
      activeBusiness.membership.role === "staff"
      && hasStaffAccess(
        activeBusiness.membership.permissions,
        "cash",
        "full",
      )
    );

  return (
    <V2CajaPage
      cashPersistence="supabase"
      canManageCash={canManageCash}
      canFullCash={canFullCash}
    />
  );
}
