import { redirect } from "next/navigation";
import { V2ClientesPage } from "./v2-clientes-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinessCustomersForBusiness } from "@/lib/data/server/business-customers";

export default async function ClientesPage() {
  if (getDataSource() !== "supabase") {
    return <V2ClientesPage />;
  }

  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status === "unauthenticated") {
    redirect(buildLoginPath("/local/clientes"));
  }

  if (activeBusiness.status === "selection_required") {
    redirect(
      "/auth/select-business?next=%2Flocal%2Fclientes",
    );
  }

  if (activeBusiness.status === "membership_missing") {
    redirect("/auth/access-denied");
  }

  if (activeBusiness.status !== "ready") {
    throw new Error(
      "No se pudo resolver el negocio activo para clientes.",
    );
  }

  const initialBusinessCustomers =
    await getBusinessCustomersForBusiness(
      activeBusiness.membership.businessId,
    );
  const canWriteBusinessCustomers = [
    "owner",
    "admin",
    "staff",
  ].includes(activeBusiness.membership.role);
  const canArchiveBusinessCustomers =
    activeBusiness.membership.role === "owner"
    || activeBusiness.membership.role === "admin";

  return (
    <V2ClientesPage
      initialBusinessCustomers={initialBusinessCustomers}
      businessCustomersPersistence="supabase"
      canWriteBusinessCustomers={canWriteBusinessCustomers}
      canArchiveBusinessCustomers={canArchiveBusinessCustomers}
    />
  );
}
