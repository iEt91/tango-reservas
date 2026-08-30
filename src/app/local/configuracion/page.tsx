import { redirect } from "next/navigation";
import { V2ConfiguracionPage } from "./v2-configuracion-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinessHoursForBusiness } from "@/lib/data/server/business-hours";
import { getBusinessServicesForBusiness } from "@/lib/data/server/business-services";
import { getBusinessStaffForBusiness } from "@/lib/data/server/business-staff";
import { getReservationSettingsForBusiness } from "@/lib/data/server/reservation-settings";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export default async function Page() {
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

  if (activeBusiness.membership.role !== "owner") {
    redirect("/auth/access-denied?reason=permission");
  }

  if (getDataSource() !== "supabase") {
    return <V2ConfiguracionPage />;
  }

  const businessId = activeBusiness.membership.businessId;
  const [
    initialBusinessHours,
    initialReservationSettings,
    initialBusinessServices,
    initialStaffSnapshot,
  ] = await Promise.all([
    getBusinessHoursForBusiness(businessId),
    getReservationSettingsForBusiness(businessId),
    getBusinessServicesForBusiness(businessId),
    getBusinessStaffForBusiness(businessId),
  ]);
  const supabase = await createSupabaseAuthServerClient();
  const { data: sandboxData } = supabase
    ? await supabase
        .from("business_sandboxes")
        .select("source_business_id, sandbox_business_id, seed_version, last_reset_at")
        .or(`source_business_id.eq.${businessId},sandbox_business_id.eq.${businessId}`)
        .maybeSingle()
    : { data: null };

  return (
    <V2ConfiguracionPage
      initialBusinessHours={initialBusinessHours}
      initialReservationSettings={initialReservationSettings}
      initialBusinessServices={initialBusinessServices}
      initialStaffSnapshot={initialStaffSnapshot}
      businessHoursPersistence="supabase"
      reservationSettingsPersistence="supabase"
      businessServicesPersistence="supabase"
      staffPersistence="supabase"
      canManageBusinessServices
      canManageStaff
      businessName={activeBusiness.membership.business.name}
      initialSandbox={sandboxData ? {
        businessId: sandboxData.sandbox_business_id,
        sourceBusinessId: sandboxData.source_business_id,
        isActiveSandbox: sandboxData.sandbox_business_id === businessId,
        seedVersion: sandboxData.seed_version,
        lastResetAt: sandboxData.last_reset_at,
      } : null}
    />
  );
}
