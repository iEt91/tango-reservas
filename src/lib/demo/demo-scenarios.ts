export type DemoScenarioKey = "low" | "medium" | "high";

export type DemoReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show"
  | "special";

export type DemoTableStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "offline";

export type DemoCustomerSegment =
  | "Nuevo"
  | "Frecuente"
  | "VIP"
  | "Riesgo no-show"
  | "VIP · Frecuente";

export type DemoBusiness = {
  name: string;
  slug: string;
  ownerName: string;
  type: string;
  isOpen: boolean;
};

export type DemoTable = {
  id: number;
  name: string;
  seats: number;
  status: DemoTableStatus;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: "round" | "square" | "rect";
  zone: string;
};

export type DemoReservation = {
  id: number;
  customerId: number | null;
  customerName: string;
  phone: string;
  date: string;
  start: string;
  end: string;
  guests: number;
  tableId: number | null;
  tableName: string | null;
  status: DemoReservationStatus;
  source: "Web" | "WhatsApp" | "Instagram" | "Teléfono" | "Walk-in";
  notes?: string;
};

export type DemoCustomer = {
  id: number;
  name: string;
  initials: string;
  phone: string;
  email: string;
  segment: DemoCustomerSegment;
  lastVisit: string | null;
  nextReservation: string | null;
  visits: number;
  averageSpend: number;
  birthday?: string;
  allergies: string[];
  preferences: string[];
  favoriteTable?: string;
  favoriteWine?: string;
  favoriteMenu?: string;
  origin: "Instagram" | "WhatsApp" | "Web" | "Teléfono" | "Walk-in";
};

export type DemoReportSummary = {
  revenue: number;
  totalReservations: number;
  averageTicket: number;
  averageOccupancy: number;
  noShowRate: number;
  newCustomers: number;
  recurrentCustomers: number;
  averageReservationValue: number;
};

export type DemoCalendarDay = {
  date: string;
  reservations: number;
  covers: number;
  occupancy: number;
};

export type DemoScenario = {
  key: DemoScenarioKey;
  label: string;
  shortLabel: string;
  description: string;
  tone: "green" | "amber" | "red";
  business: DemoBusiness;
  tables: DemoTable[];
  reservations: DemoReservation[];
  customers: DemoCustomer[];
  reportSummary: DemoReportSummary;
  calendarDays: DemoCalendarDay[];
};

const business: DemoBusiness = {
  name: "Demuru",
  slug: "demuru",
  ownerName: "Mariano Demuru",
  type: "Restaurante de autor",
  isOpen: true,
};

const baseTables: DemoTable[] = [
  { id: 1, name: "Mesa 1", seats: 2, status: "available", x: 18, y: 18, width: 80, height: 80, shape: "round", zone: "Salón principal" },
  { id: 2, name: "Mesa 2", seats: 4, status: "available", x: 39, y: 18, width: 82, height: 82, shape: "rect", zone: "Salón principal" },
  { id: 3, name: "Mesa 3", seats: 4, status: "available", x: 58, y: 18, width: 78, height: 78, shape: "round", zone: "Salón principal" },
  { id: 4, name: "Mesa 4", seats: 6, status: "available", x: 77, y: 18, width: 130, height: 70, shape: "rect", zone: "Ventana" },
  { id: 5, name: "Mesa 5", seats: 2, status: "available", x: 15, y: 42, width: 78, height: 78, shape: "rect", zone: "Salón principal" },
  { id: 6, name: "Mesa 6", seats: 6, status: "available", x: 43, y: 42, width: 92, height: 92, shape: "round", zone: "Salón principal" },
  { id: 7, name: "Mesa 7", seats: 4, status: "available", x: 66, y: 44, width: 84, height: 84, shape: "round", zone: "Ventana" },
  { id: 8, name: "Mesa 8", seats: 8, status: "available", x: 18, y: 72, width: 175, height: 76, shape: "rect", zone: "Terraza" },
  { id: 9, name: "Mesa 9", seats: 4, status: "offline", x: 51, y: 72, width: 110, height: 70, shape: "rect", zone: "Salón principal" },
  { id: 10, name: "Mesa 10", seats: 8, status: "available", x: 76, y: 72, width: 175, height: 76, shape: "rect", zone: "Salón privado" },
];

const customers: DemoCustomer[] = [
  {
    id: 1,
    name: "Valeria del Mar",
    initials: "VD",
    phone: "+54 9 11 5678 9012",
    email: "valeria.delmar@gmail.com",
    segment: "VIP",
    lastVisit: "2026-05-15",
    nextReservation: "2026-05-22 13:00 · Mesa 5",
    visits: 8,
    averageSpend: 92300,
    birthday: "12 de agosto",
    allergies: ["Frutos secos", "Mariscos"],
    preferences: ["Vegetariana", "Sin gluten", "Aniversario"],
    favoriteTable: "Mesa 5 · Ventana",
    favoriteWine: "Malbec de la Casa",
    favoriteMenu: "Menú Degustación",
    origin: "Instagram",
  },
  {
    id: 2,
    name: "Juan Martín López",
    initials: "JM",
    phone: "+54 9 11 2345 6789",
    email: "juan.lopez@gmail.com",
    segment: "VIP · Frecuente",
    lastVisit: "2026-05-20",
    nextReservation: "2026-05-22 13:30 · Mesa 12",
    visits: 12,
    averageSpend: 78600,
    allergies: [],
    preferences: ["Vino tinto", "Terraza"],
    origin: "WhatsApp",
  },
  {
    id: 3,
    name: "Ana García",
    initials: "AG",
    phone: "+54 9 11 3456 7890",
    email: "ana.garcia@gmail.com",
    segment: "Frecuente",
    lastVisit: "2026-05-18",
    nextReservation: null,
    visits: 9,
    averageSpend: 56200,
    allergies: ["Lactosa"],
    preferences: ["Mesa tranquila"],
    origin: "Web",
  },
  {
    id: 4,
    name: "Carlos Rojas",
    initials: "CR",
    phone: "+54 9 11 4567 8901",
    email: "carlos.rojas@gmail.com",
    segment: "VIP",
    lastVisit: "2026-05-10",
    nextReservation: "2026-05-24 15:00 · Mesa 7",
    visits: 8,
    averageSpend: 88700,
    allergies: [],
    preferences: ["Menú degustación"],
    origin: "Teléfono",
  },
  {
    id: 5,
    name: "María Eugenia Ruiz",
    initials: "MR",
    phone: "+54 9 11 2233 4455",
    email: "maria.ruiz@gmail.com",
    segment: "Frecuente",
    lastVisit: "2026-05-16",
    nextReservation: null,
    visits: 5,
    averageSpend: 47900,
    allergies: [],
    preferences: ["Sin gluten"],
    origin: "Instagram",
  },
  {
    id: 6,
    name: "Roberto Álvarez",
    initials: "RA",
    phone: "+54 9 11 6677 8899",
    email: "roberto.alvarez@gmail.com",
    segment: "Riesgo no-show",
    lastVisit: "2026-05-02",
    nextReservation: "2026-05-25 20:00 · Mesa 3",
    visits: 3,
    averageSpend: 61300,
    allergies: [],
    preferences: ["Llega tarde"],
    origin: "Walk-in",
  },
  {
    id: 7,
    name: "Sofía Beltrán",
    initials: "SB",
    phone: "+54 9 11 5566 7788",
    email: "sofia.beltran@gmail.com",
    segment: "Nuevo",
    lastVisit: null,
    nextReservation: "2026-05-23 21:00 · Mesa 9",
    visits: 1,
    averageSpend: 72100,
    allergies: [],
    preferences: ["Cumpleaños"],
    origin: "Web",
  },
  {
    id: 8,
    name: "Federico Paredes",
    initials: "FP",
    phone: "+54 9 11 5678 9013",
    email: "fede.paredes@gmail.com",
    segment: "Frecuente",
    lastVisit: "2026-05-12",
    nextReservation: null,
    visits: 7,
    averageSpend: 64800,
    allergies: [],
    preferences: ["Ventana"],
    origin: "WhatsApp",
  },
  {
    id: 9,
    name: "Lucía Fernández",
    initials: "LF",
    phone: "+54 9 11 7788 9900",
    email: "lucia.fernandez@gmail.com",
    segment: "Frecuente",
    lastVisit: "2026-05-09",
    nextReservation: "2026-05-26 21:30 · Mesa 11",
    visits: 6,
    averageSpend: 58400,
    allergies: ["Maní"],
    preferences: ["Cócteles"],
    origin: "Instagram",
  },
  {
    id: 10,
    name: "Martín Sosa",
    initials: "MS",
    phone: "+54 9 11 9900 1122",
    email: "martin.sosa@gmail.com",
    segment: "VIP",
    lastVisit: "2026-05-14",
    nextReservation: null,
    visits: 10,
    averageSpend: 84900,
    allergies: [],
    preferences: ["Parrilla"],
    origin: "Teléfono",
  },
];

const lowReservations: DemoReservation[] = [
  {
    id: 1,
    customerId: 7,
    customerName: "Sofía Beltrán",
    phone: "+54 9 11 5566 7788",
    date: "2026-05-22",
    start: "13:00",
    end: "14:30",
    guests: 2,
    tableId: 5,
    tableName: "Mesa 5",
    status: "confirmed",
    source: "Web",
  },
  {
    id: 2,
    customerId: 9,
    customerName: "Lucía Fernández",
    phone: "+54 9 11 7788 9900",
    date: "2026-05-22",
    start: "20:30",
    end: "22:00",
    guests: 2,
    tableId: 1,
    tableName: "Mesa 1",
    status: "pending",
    source: "Instagram",
  },
];

const mediumReservations: DemoReservation[] = [
  {
    id: 1,
    customerId: 1,
    customerName: "Valeria del Mar",
    phone: "+54 9 11 5678 9012",
    date: "2026-05-22",
    start: "13:00",
    end: "14:30",
    guests: 2,
    tableId: 5,
    tableName: "Mesa 5",
    status: "confirmed",
    source: "Web",
  },
  {
    id: 2,
    customerId: 2,
    customerName: "Juan Martín López",
    phone: "+54 9 11 2345 6789",
    date: "2026-05-22",
    start: "13:30",
    end: "15:30",
    guests: 4,
    tableId: 2,
    tableName: "Mesa 2",
    status: "pending",
    source: "WhatsApp",
  },
  {
    id: 3,
    customerId: 3,
    customerName: "Ana García",
    phone: "+54 9 11 3456 7890",
    date: "2026-05-22",
    start: "15:30",
    end: "17:30",
    guests: 6,
    tableId: 6,
    tableName: "Mesa 6",
    status: "pending",
    source: "Web",
  },
  {
    id: 4,
    customerId: 4,
    customerName: "Carlos Rojas",
    phone: "+54 9 11 4567 8901",
    date: "2026-05-22",
    start: "15:45",
    end: "17:45",
    guests: 4,
    tableId: 3,
    tableName: "Mesa 3",
    status: "confirmed",
    source: "Teléfono",
  },
  {
    id: 5,
    customerId: 5,
    customerName: "María Eugenia Ruiz",
    phone: "+54 9 11 2233 4455",
    date: "2026-05-22",
    start: "18:30",
    end: "20:30",
    guests: 8,
    tableId: 8,
    tableName: "Mesa 8",
    status: "special",
    source: "Instagram",
  },
  {
    id: 6,
    customerId: null,
    customerName: "Reserva sin mesa",
    phone: "+54 9 11 0000 0000",
    date: "2026-05-22",
    start: "21:00",
    end: "22:30",
    guests: 4,
    tableId: null,
    tableName: null,
    status: "pending",
    source: "WhatsApp",
  },
];

const highReservations: DemoReservation[] = [
  {
    id: 1,
    customerId: 1,
    customerName: "Valeria del Mar",
    phone: "+54 9 11 5678 9012",
    date: "2026-05-22",
    start: "12:00",
    end: "14:00",
    guests: 2,
    tableId: 1,
    tableName: "Mesa 1",
    status: "confirmed",
    source: "Web",
  },
  {
    id: 2,
    customerId: 2,
    customerName: "Juan Martín López",
    phone: "+54 9 11 2345 6789",
    date: "2026-05-22",
    start: "13:00",
    end: "15:30",
    guests: 4,
    tableId: 2,
    tableName: "Mesa 2",
    status: "confirmed",
    source: "WhatsApp",
  },
  {
    id: 3,
    customerId: 3,
    customerName: "Ana García",
    phone: "+54 9 11 3456 7890",
    date: "2026-05-22",
    start: "13:30",
    end: "16:30",
    guests: 4,
    tableId: 7,
    tableName: "Mesa 7",
    status: "pending",
    source: "Web",
  },
  {
    id: 4,
    customerId: 4,
    customerName: "Carlos Rojas",
    phone: "+54 9 11 4567 8901",
    date: "2026-05-22",
    start: "15:00",
    end: "18:00",
    guests: 4,
    tableId: 3,
    tableName: "Mesa 3",
    status: "confirmed",
    source: "Teléfono",
  },
  {
    id: 5,
    customerId: 5,
    customerName: "María Eugenia Ruiz",
    phone: "+54 9 11 2233 4455",
    date: "2026-05-22",
    start: "14:00",
    end: "17:30",
    guests: 6,
    tableId: 6,
    tableName: "Mesa 6",
    status: "special",
    source: "Instagram",
  },
  {
    id: 6,
    customerId: 6,
    customerName: "Roberto Álvarez",
    phone: "+54 9 11 6677 8899",
    date: "2026-05-22",
    start: "15:30",
    end: "19:00",
    guests: 8,
    tableId: 10,
    tableName: "Mesa 10",
    status: "confirmed",
    source: "Walk-in",
  },
  {
    id: 7,
    customerId: 8,
    customerName: "Federico Paredes",
    phone: "+54 9 11 5678 9013",
    date: "2026-05-22",
    start: "18:00",
    end: "21:30",
    guests: 8,
    tableId: 8,
    tableName: "Mesa 8",
    status: "confirmed",
    source: "WhatsApp",
  },
  {
    id: 8,
    customerId: 10,
    customerName: "Martín Sosa",
    phone: "+54 9 11 9900 1122",
    date: "2026-05-22",
    start: "19:00",
    end: "22:30",
    guests: 6,
    tableId: 4,
    tableName: "Mesa 4",
    status: "confirmed",
    source: "Teléfono",
  },
  {
    id: 9,
    customerId: null,
    customerName: "Lista de espera",
    phone: "+54 9 11 0000 0001",
    date: "2026-05-22",
    start: "20:00",
    end: "22:00",
    guests: 4,
    tableId: null,
    tableName: null,
    status: "pending",
    source: "WhatsApp",
  },
  {
    id: 10,
    customerId: null,
    customerName: "Walk-in terraza",
    phone: "+54 9 11 0000 0002",
    date: "2026-05-22",
    start: "20:30",
    end: "22:30",
    guests: 6,
    tableId: null,
    tableName: null,
    status: "pending",
    source: "Instagram",
  },
];

function buildCalendarDays(multiplier: number): DemoCalendarDay[] {
  const days = Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    const base = [6, 7, 5, 3, 4, 5, 6, 7, 10, 6, 4, 5, 6, 5, 8, 12, 7, 3, 4, 6, 5, 24, 11, 6, 3, 4, 5, 6, 7, 8, 5][index] ?? 5;
    const reservations = Math.max(1, Math.round(base * multiplier));
    const covers = reservations * (day % 3 === 0 ? 4 : 3);

    return {
      date: `2026-05-${String(day).padStart(2, "0")}`,
      reservations,
      covers,
      occupancy: Math.min(100, Math.round((covers / 108) * 100)),
    };
  });

  return days;
}

export const demoScenarios: Record<DemoScenarioKey, DemoScenario> = {
  low: {
    key: "low",
    label: "Ocupación baja",
    shortLabel: "Bajo",
    description: "Pocas reservas, salón tranquilo y alta disponibilidad.",
    tone: "green",
    business,
    tables: baseTables,
    reservations: lowReservations,
    customers: customers.slice(0, 6),
    reportSummary: {
      revenue: 2140000,
      totalReservations: 284,
      averageTicket: 5310,
      averageOccupancy: 22,
      noShowRate: 1.8,
      newCustomers: 74,
      recurrentCustomers: 210,
      averageReservationValue: 5380,
    },
    calendarDays: buildCalendarDays(0.45),
  },
  medium: {
    key: "medium",
    label: "Ocupación media",
    shortLabel: "Medio",
    description: "Servicio normal, buena ocupación y operación estable.",
    tone: "amber",
    business,
    tables: baseTables,
    reservations: mediumReservations,
    customers,
    reportSummary: {
      revenue: 8742300,
      totalReservations: 1248,
      averageTicket: 6998,
      averageOccupancy: 68,
      noShowRate: 4.3,
      newCustomers: 342,
      recurrentCustomers: 906,
      averageReservationValue: 7007,
    },
    calendarDays: buildCalendarDays(1),
  },
  high: {
    key: "high",
    label: "Ocupación alta",
    shortLabel: "Alto",
    description: "Pico de demanda, mesas llenas y presión operativa.",
    tone: "red",
    business,
    tables: baseTables,
    reservations: highReservations,
    customers,
    reportSummary: {
      revenue: 15480700,
      totalReservations: 2120,
      averageTicket: 8130,
      averageOccupancy: 91,
      noShowRate: 6.7,
      newCustomers: 488,
      recurrentCustomers: 1632,
      averageReservationValue: 8650,
    },
    calendarDays: buildCalendarDays(1.55),
  },
};

export const defaultDemoScenarioKey: DemoScenarioKey = "medium";

export function getDemoScenario(key: DemoScenarioKey) {
  return demoScenarios[key] ?? demoScenarios[defaultDemoScenarioKey];
}

export function timeToMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function isReservationActiveAtTime(reservation: DemoReservation, time: string) {
  const current = timeToMinutes(time);
  return current >= timeToMinutes(reservation.start) && current < timeToMinutes(reservation.end);
}
