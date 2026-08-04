import { redirect } from "next/navigation";
import { V2PlanoPage } from "./v2-plano-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getBusinessHoursForBusiness } from "@/lib/data/server/business-hours";
import { getBusinessFloorPlanForBusiness } from "@/lib/data/server/business-floor-plan";
import { getBusinessReservationsForBusiness } from "@/lib/data/server/business-reservations";
import { getReservationSettingsForBusiness } from "@/lib/data/server/reservation-settings";
import { getDataSource } from "@/lib/data/dataSource";
import { buildV2FloorPlanSnapshot } from "@/lib/floor-plan/v2-floor-plan-cutover";

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);

  return parsed.toISOString().slice(0, 10);
}

export default async function PlanoPage() {
  if (getDataSource() !== "supabase") {
    return <V2PlanoPage />;
  }

  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status === "unauthenticated") {
    redirect(buildLoginPath("/local/plano"));
  }

  if (activeBusiness.status === "selection_required") {
    redirect(
      "/auth/select-business?next=%2Flocal%2Fplano",
    );
  }

  if (activeBusiness.status === "membership_missing") {
    redirect("/auth/access-denied");
  }

  if (activeBusiness.status !== "ready") {
    throw new Error(
      "No se pudo resolver el negocio activo para el plano.",
    );
  }

  const businessId = activeBusiness.membership.businessId;
  const [
    businessHours,
    reservationSettings,
  ] = await Promise.all([
    getBusinessHoursForBusiness(businessId),
    getReservationSettingsForBusiness(businessId),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const bookingWindowDays =
    reservationSettings?.bookingWindowDays ?? 14;
  const reservations =
    await getBusinessReservationsForBusiness(
      businessId,
      {
        fromDate: today,
        toDate: addDays(
          today,
          Math.max(bookingWindowDays - 1, 0),
        ),
      },
    );
  const floorPlan =
    await getBusinessFloorPlanForBusiness(
      businessId,
      {
        reservationIds: reservations.map(
          (reservation) => reservation.id ?? "",
        ).filter(Boolean),
      },
    );
  const snapshot = buildV2FloorPlanSnapshot({
    floorPlan,
    reservations,
    businessHours,
    reservationSettings,
  });
  const canAssignFloorPlan = [
    "owner",
    "admin",
    "staff",
  ].includes(activeBusiness.membership.role);

  return (
    <V2PlanoPage
      {...snapshot}
      floorPlanPersistence="supabase"
      canAssignFloorPlan={canAssignFloorPlan}
    />
  );
}
