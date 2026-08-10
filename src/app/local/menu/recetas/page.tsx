import { redirect } from "next/navigation";
import { V2RecipesPage } from "./v2-recipes-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinessMenuForBusiness } from "@/lib/data/server/business-menu";
import { getBusinessRecipesForBusiness } from "@/lib/data/server/business-recipes";
import { getBusinessStockForBusiness } from "@/lib/data/server/business-stock";
import { hasStaffAccess } from "@/lib/staff/staff-contract";

export default async function MenuRecetasPage() {
  if (getDataSource() !== "supabase") {
    return <V2RecipesPage />;
  }

  const activeBusiness =
    await resolveActiveBusiness();

  if (
    activeBusiness.status
    === "unauthenticated"
  ) {
    redirect(
      buildLoginPath(
        "/local/menu/recetas",
      ),
    );
  }

  if (
    activeBusiness.status
    === "selection_required"
  ) {
    redirect(
      "/auth/select-business?next=%2Flocal%2Fmenu%2Frecetas",
    );
  }

  if (
    activeBusiness.status
    === "membership_missing"
  ) {
    redirect("/auth/access-denied");
  }

  if (
    activeBusiness.status
    !== "ready"
  ) {
    throw new Error(
      "No se pudo resolver el negocio activo para Recetas.",
    );
  }

  const {
    membership,
  } = activeBusiness;

  const canViewRecipes =
    membership.role !== "staff"
    || hasStaffAccess(
      membership.permissions,
      "recipes",
      "view",
    );

  if (!canViewRecipes) {
    redirect("/auth/access-denied");
  }

  const canManageRecipes =
    membership.role !== "staff"
    || hasStaffAccess(
      membership.permissions,
      "recipes",
      "manage",
    );

  const canViewStock =
    membership.role !== "staff"
    || hasStaffAccess(
      membership.permissions,
      "stock",
      "view",
    );

  const canCreateMenuItems =
    membership.role === "owner"
    || membership.role === "admin";

  const businessId =
    membership.businessId;

  const stockPromise = canViewStock
    ? getBusinessStockForBusiness(
        businessId,
      )
    : Promise.resolve({
        products: [],
        movements: [],
      });

  const [
    menu,
    recipes,
    stock,
  ] = await Promise.all([
    getBusinessMenuForBusiness(
      businessId,
    ),
    getBusinessRecipesForBusiness(
      businessId,
    ),
    stockPromise,
  ]);

  return (
    <V2RecipesPage
      initialMenuItems={menu.items}
      initialMenuCategories={
        menu.categories
      }
      initialRecipes={recipes}
      initialStockProducts={
        stock.products.filter(
          (product) =>
            product.isActive,
        )
      }
      recipePersistence="supabase"
      canManageRecipes={
        canManageRecipes
      }
      canCreateMenuItems={
        canCreateMenuItems
      }
      canViewStock={canViewStock}
    />
  );
}
