import { redirect } from "next/navigation";
import { V2GastosPage } from "./v2-gastos-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinessExpenses } from "@/lib/data/server/business-expenses";
import { hasStaffAccess } from "@/lib/staff/staff-contract";

export default async function GastosPage() {
  if (getDataSource() !== "supabase") {
    return <V2GastosPage />;
  }

  const activeBusiness =
    await resolveActiveBusiness();

  if (activeBusiness.status === "unauthenticated") {
    redirect(
      buildLoginPath("/local/gastos"),
    );
  }

  if (activeBusiness.status === "selection_required") {
    redirect(
      "/auth/select-business?next=%2Flocal%2Fgastos",
    );
  }

  if (activeBusiness.status === "membership_missing") {
    redirect("/auth/access-denied");
  }

  if (activeBusiness.status !== "ready") {
    throw new Error(
      "No se pudo resolver el negocio activo para Gastos.",
    );
  }

  const initialBusinessExpenses =
    await getBusinessExpenses(
      activeBusiness.membership.businessId,
    );

  const privileged =
    activeBusiness.membership.role === "owner"
    || activeBusiness.membership.role === "admin";

  const canManageExpenses =
    privileged
    || (
      activeBusiness.membership.role === "staff"
      && hasStaffAccess(
        activeBusiness.membership.permissions,
        "expenses",
        "manage",
      )
    );

  const canFullExpenses =
    privileged
    || (
      activeBusiness.membership.role === "staff"
      && hasStaffAccess(
        activeBusiness.membership.permissions,
        "expenses",
        "full",
      )
    );

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

  return (
    <V2GastosPage
      initialBusinessExpenses={initialBusinessExpenses}
      expensePersistence="supabase"
      canManageExpenses={canManageExpenses}
      canFullExpenses={canFullExpenses}
      canManageCash={canManageCash}
    />
  );
}
