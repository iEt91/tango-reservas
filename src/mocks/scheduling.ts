import type {
  BusinessHours,
  DayOfWeek,
  ReservationRules,
  Service,
} from "@/data/types";

const dayOrder: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function buildHours({
  businessId,
  openDays,
  openTime,
  closeTime,
  breakStartTime,
  breakEndTime,
}: {
  businessId: string;
  openDays: DayOfWeek[];
  openTime: string;
  closeTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
}) {
  return dayOrder.map<BusinessHours>((dayOfWeek) => {
    const isOpen = openDays.includes(dayOfWeek);

    return {
      id: `${businessId}-${dayOfWeek}`,
      businessId,
      dayOfWeek,
      isOpen,
      openTime: isOpen ? openTime : "",
      closeTime: isOpen ? closeTime : "",
      breakStartTime: isOpen ? breakStartTime ?? null : null,
      breakEndTime: isOpen ? breakEndTime ?? null : null,
    };
  });
}

export const initialBusinessHours: BusinessHours[] = [
  ...buildHours({
    businessId: "biz_demuru",
    openDays: ["tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    openTime: "19:30",
    closeTime: "23:30",
    breakStartTime: "21:30",
    breakEndTime: "22:00",
  }),
  ...buildHours({
    businessId: "biz_barbados",
    openDays: dayOrder,
    openTime: "12:00",
    closeTime: "23:30",
    breakStartTime: "17:00",
    breakEndTime: "18:00",
  }),
  ...buildHours({
    businessId: "biz_cafe_demo",
    openDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    openTime: "08:00",
    closeTime: "18:00",
    breakStartTime: "13:00",
    breakEndTime: "14:00",
  }),
];

export const initialReservationRules: ReservationRules[] = [
  {
    id: "rules-demuru",
    businessId: "biz_demuru",
    slotDurationMinutes: 30,
    maxReservationsPerSlot: 5,
    minNoticeMinutes: 180,
    maxDaysAhead: 14,
    requiresConfirmation: true,
    allowCancellation: true,
    cancellationLimitHours: 6,
  },
  {
    id: "rules-barbados",
    businessId: "biz_barbados",
    slotDurationMinutes: 60,
    maxReservationsPerSlot: 8,
    minNoticeMinutes: 60,
    maxDaysAhead: 21,
    requiresConfirmation: true,
    allowCancellation: true,
    cancellationLimitHours: 3,
  },
  {
    id: "rules-cafe-demo",
    businessId: "biz_cafe_demo",
    slotDurationMinutes: 30,
    maxReservationsPerSlot: 4,
    minNoticeMinutes: 30,
    maxDaysAhead: 10,
    requiresConfirmation: false,
    allowCancellation: true,
    cancellationLimitHours: 2,
  },
];

export const initialServices: Service[] = [
  {
    id: "service-demuru-degustacion",
    businessId: "biz_demuru",
    name: "Menu degustacion",
    description: "Experiencia principal para cenas de autor.",
    durationMinutes: 120,
    capacity: 5,
    price: 78000,
    isActive: true,
  },
  {
    id: "service-demuru-chef-table",
    businessId: "biz_demuru",
    name: "Chef table",
    description: "Mesa premium con atencion personalizada.",
    durationMinutes: 150,
    capacity: 4,
    price: 98000,
    isActive: true,
  },
  {
    id: "service-demuru-vino",
    businessId: "biz_demuru",
    name: "Cena con maridaje",
    description: "Opcion extendida con vinos seleccionados.",
    durationMinutes: 180,
    capacity: 2,
    price: 125000,
    isActive: false,
  },
  {
    id: "service-barbados-sunset",
    businessId: "biz_barbados",
    name: "Mesa sunset",
    description: "Reserva base para grupos y after beach.",
    durationMinutes: 120,
    capacity: 8,
    price: 32000,
    isActive: true,
  },
  {
    id: "service-barbados-vip",
    businessId: "biz_barbados",
    name: "Deck VIP",
    description: "Sector destacado con mayor comodidad.",
    durationMinutes: 180,
    capacity: 4,
    price: 56000,
    isActive: true,
  },
  {
    id: "service-cafe-brunch",
    businessId: "biz_cafe_demo",
    name: "Brunch",
    description: "Reserva para desayuno largo o brunch.",
    durationMinutes: 60,
    capacity: 4,
    price: 18000,
    isActive: true,
  },
  {
    id: "service-cafe-cowork",
    businessId: "biz_cafe_demo",
    name: "Mesa cowork",
    description: "Mesa tranquila para cafe de especialidad.",
    durationMinutes: 90,
    capacity: 4,
    price: 22000,
    isActive: true,
  },
  {
    id: "service-cafe-takeaway",
    businessId: "biz_cafe_demo",
    name: "Retiro rapido",
    description: "Retiro agendado para pedidos grandes.",
    durationMinutes: 30,
    capacity: 2,
    price: null,
    isActive: false,
  },
];
