import { redirect } from "next/navigation";
import { V2MenuPage } from "./v2-menu-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinessMenuForBusiness } from "@/lib/data/server/business-menu";

export default async function MenuPage() {
  if (getDataSource() !== "supabase") {
    return <V2MenuPage />;
  }

  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status === "unauthenticated") {
    redirect(buildLoginPath("/local/menu"));
  }

  if (activeBusiness.status === "selection_required") {
    redirect("/auth/select-business?next=%2Flocal%2Fmenu");
  }

  if (activeBusiness.status === "membership_missing") {
    redirect("/auth/access-denied");
  }

  if (activeBusiness.status !== "ready") {
    throw new Error(
      "No se pudo resolver el negocio activo para el menú.",
    );
  }

  const initialMenu = await getBusinessMenuForBusiness(
    activeBusiness.membership.businessId,
  );
  const canManageMenu =
    activeBusiness.membership.role === "owner"
    || activeBusiness.membership.role === "admin";

  return (
    <V2MenuPage
      initialCategories={initialMenu.categories}
      initialItems={initialMenu.items}
      menuPersistence="supabase"
      canManageMenu={canManageMenu}
    />
  );
}
