import { redirect } from "next/navigation";
import { V2ConfiguracionPage } from "./v2-configuracion-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinessHoursForBusiness } from "@/lib/data/server/business-hours";

export default async function Page() {
  if (getDataSource() !== "supabase") {
    return <V2ConfiguracionPage />;
  }

  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status === "unauthenticated") {
    redirect(buildLoginPath("/local/configuracion"));
  }

  if (activeBusiness.status === "selection_required") {
    redirect(
      "/auth/select-business?next=%2Flocal%2Fconfiguracion",
    );
  }

  if (activeBusiness.status === "membership_missing") {
    redirect("/auth/access-denied");
  }

  if (activeBusiness.status !== "ready") {
    throw new Error(
      "No se pudo resolver el negocio activo para configuración.",
    );
  }

  const initialBusinessHours = await getBusinessHoursForBusiness(
    activeBusiness.membership.businessId,
  );

  return (
    <V2ConfiguracionPage
      initialBusinessHours={initialBusinessHours}
      businessHoursPersistence="supabase"
    />
  );
}
