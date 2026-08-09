import { redirect } from "next/navigation";
import { V2ProductosPage } from "../productos/v2-productos-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinessStockForBusiness } from "@/lib/data/server/business-stock";
import { hasStaffAccess } from "@/lib/staff/staff-contract";

export default async function StockPage() {
  if (getDataSource() !== "supabase") {
    return <V2ProductosPage />;
  }

  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status === "unauthenticated") {
    redirect(buildLoginPath("/local/stock"));
  }

  if (activeBusiness.status === "selection_required") {
    redirect(
      "/auth/select-business?next=%2Flocal%2Fstock",
    );
  }

  if (activeBusiness.status === "membership_missing") {
    redirect("/auth/access-denied");
  }

  if (activeBusiness.status !== "ready") {
    throw new Error(
      "No se pudo resolver el negocio activo para Stock.",
    );
  }

  const initialBusinessStock =
    await getBusinessStockForBusiness(
      activeBusiness.membership.businessId,
    );

  const canManageStock =
    activeBusiness.membership.role === "owner"
    || activeBusiness.membership.role === "admin"
    || (
      activeBusiness.membership.role === "staff"
      && hasStaffAccess(
        activeBusiness.membership.permissions,
        "stock",
        "manage",
      )
    );

  return (
    <V2ProductosPage
      initialBusinessStock={initialBusinessStock}
      stockPersistence="supabase"
      canManageStock={canManageStock}
    />
  );
}
