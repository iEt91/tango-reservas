import { redirect } from "next/navigation";
import { V2ConfiguracionPage } from "./v2-configuracion-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinessHoursForBusiness } from "@/lib/data/server/business-hours";
import { getBusinessServicesForBusiness } from "@/lib/data/server/business-services";
import { getReservationSettingsForBusiness } from "@/lib/data/server/reservation-settings";

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

  const businessId = activeBusiness.membership.businessId;
  const [
    initialBusinessHours,
    initialReservationSettings,
    initialBusinessServices,
  ] = await Promise.all([
    getBusinessHoursForBusiness(businessId),
    getReservationSettingsForBusiness(businessId),
    getBusinessServicesForBusiness(businessId),
  ]);

  const canManageBusinessServices =
    activeBusiness.membership.role === "owner"
    || activeBusiness.membership.role === "admin";

  return (
    <V2ConfiguracionPage
      initialBusinessHours={initialBusinessHours}
      initialReservationSettings={initialReservationSettings}
      initialBusinessServices={initialBusinessServices}
      businessHoursPersistence="supabase"
      reservationSettingsPersistence="supabase"
      businessServicesPersistence="supabase"
      canManageBusinessServices={canManageBusinessServices}
    />
  );
}
