import { redirect } from "next/navigation";
import { V2ReservasPage } from "./v2-reservas-page";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinessHoursForBusiness } from "@/lib/data/server/business-hours";
import { getBusinessPaymentsForReservations } from "@/lib/data/server/business-cash";
import { getBusinessMenuForBusiness } from "@/lib/data/server/business-menu";
import { getBusinessDineInOrdersForReservations } from "@/lib/data/server/business-orders";
import { getBusinessCustomersForBusiness } from "@/lib/data/server/business-customers";
import { getBusinessFloorPlanForBusiness } from "@/lib/data/server/business-floor-plan";
import { getBusinessReservationsForBusiness } from "@/lib/data/server/business-reservations";
import { getBusinessServicesForBusiness } from "@/lib/data/server/business-services";
import { getReservationSettingsForBusiness } from "@/lib/data/server/reservation-settings";
import { buildV2ReservationsSnapshot } from "@/lib/reservations/v2-reservations-cutover";
import { hasStaffAccess } from "@/lib/staff/staff-contract";

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);

  return parsed.toISOString().slice(0, 10);
}

export default async function ReservasPage() {
  if (getDataSource() !== "supabase") {
    return <V2ReservasPage />;
  }

  const activeBusiness = await resolveActiveBusiness();

  if (activeBusiness.status === "unauthenticated") {
    redirect(buildLoginPath("/local/reservas"));
  }

  if (activeBusiness.status === "selection_required") {
    redirect(
      "/auth/select-business?next=%2Flocal%2Freservas",
    );
  }

  if (activeBusiness.status === "membership_missing") {
    redirect("/auth/access-denied");
  }

  if (activeBusiness.status !== "ready") {
    throw new Error(
      "No se pudo resolver el negocio activo para reservas.",
    );
  }

  const businessId =
    activeBusiness.membership.businessId;
  const [
    businessHours,
    reservationSettings,
    services,
    customers,
    menu,
  ] = await Promise.all([
    getBusinessHoursForBusiness(businessId),
    getReservationSettingsForBusiness(businessId),
    getBusinessServicesForBusiness(businessId),
    getBusinessCustomersForBusiness(businessId),
    getBusinessMenuForBusiness(businessId),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const bookingWindowDays =
    reservationSettings?.bookingWindowDays ?? 14;
  const reservations =
    await getBusinessReservationsForBusiness(
      businessId,
      {
        fromDate: addDays(today, -31),
        toDate: addDays(
          today,
          Math.max(bookingWindowDays - 1, 0),
        ),
      },
    );
  const reservationIds = reservations
    .map((reservation) => reservation.id ?? "")
    .filter(Boolean);
  const [
    floorPlan,
    dineInOrders,
    persistentPayments,
  ] = await Promise.all([
    getBusinessFloorPlanForBusiness(
      businessId,
      {
        reservationIds,
      },
    ),
    getBusinessDineInOrdersForReservations(
      businessId,
      reservationIds,
    ),
    getBusinessPaymentsForReservations(
      businessId,
      reservationIds,
    ),
  ]);
  const snapshot = buildV2ReservationsSnapshot({
    reservations,
    services,
    customers,
    businessHours,
    reservationSettings,
    floorPlan,
  });
  const canManageReservations = [
    "owner",
    "admin",
    "staff",
  ].includes(activeBusiness.membership.role);
  const canManageCash =
    activeBusiness.membership.role !== "staff"
    || hasStaffAccess(
      activeBusiness.membership.permissions,
      "cash",
      "manage",
    );
  const persistentMenuItems = menu.items
    .filter(
      (item) =>
        item.status === "available"
        && item.isVisible,
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category:
        item.categoryId
        || "sin-categoria",
    }))
    .sort((first, second) =>
      first.name.localeCompare(
        second.name,
        "es",
      ),
    );
  const categoryIdsWithItems = new Set(
    persistentMenuItems.map(
      (item) => item.category,
    ),
  );
  const persistentMenuCategories = [
    {
      id: "all",
      label: "Todos",
    },
    ...(categoryIdsWithItems.has(
      "sin-categoria",
    )
      ? [
          {
            id: "sin-categoria",
            label: "Sin categoría",
          },
        ]
      : []),
    ...menu.categories
      .filter(
        (category) =>
          category.isVisible
          && category.isActive
          && categoryIdsWithItems.has(
            category.id,
          ),
      )
      .sort((first, second) =>
        first.name.localeCompare(
          second.name,
          "es",
        ),
      )
      .map((category) => ({
        id: category.id,
        label: category.name,
      })),
  ];

  return (
    <V2ReservasPage
      {...snapshot}
      reservationPersistence="supabase"
      canManageReservations={canManageReservations}
      persistentMenuItems={persistentMenuItems}
      persistentMenuCategories={persistentMenuCategories}
      initialPersistentOrders={dineInOrders}
      initialPersistentPayments={persistentPayments}
      canManageCash={canManageCash}
    />
  );
}
