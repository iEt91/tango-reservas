import { createJoinedTable } from "@/data/joined-tables";
import { getFloorTablesByBusinessId } from "@/data/floor-plan";
import {
  deleteReservationsByIds,
  dedupeReservations,
  getReservations,
  normalizePhone,
} from "@/data/reservations";
import type { FloorTable, JoinedTable, Reservation, ReservationSource, ReservationStatus } from "@/data/types";
import { getBusinessServices } from "@/data/scheduling";
import { LOCAL_STORE_KEYS } from "@/lib/data/localStore";

const RESERVATIONS_STORAGE_KEY = LOCAL_STORE_KEYS.reservations;
const DEMO_BATCH = "commercial-2026-05";
const BUSINESS_IDS = ["biz_demuru", "biz_barbados", "biz_cafe_demo"] as const;
const ACTIVE_STATUSES: ReservationStatus[] = ["pending", "confirmed", "completed"];

type CustomerBias = "balanced" | "vip" | "risk";

type CustomerProfile = {
  name: string;
  phone: string;
  email: string | null;
  notes: string[];
  weight: number;
  partyMin: number;
  partyMax: number;
  bias: CustomerBias;
};

type DayPlan = {
  date: string;
  count: number;
};

type GeneratedReservation = Reservation & {
  __slotKey: string;
};

type PendingJoinedAssignment = {
  reservationIndex: number;
  businessId: string;
  tableIds: string[];
  reservationDate: string;
  reservationTime: string;
};

type DemoSeedResult = {
  inserted: number;
  perBusiness: Record<string, number>;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRng(seed: string) {
  let state = hashString(seed) || 1;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return (((value ^ (value >>> 14)) >>> 0) % 1_000_000) / 1_000_000;
  };
}

function randomInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function weightedPick<T>(
  rng: () => number,
  items: Array<{ value: T; weight: number }>,
) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) {
    return items[0]?.value ?? null;
  }

  const target = rng() * total;
  let cursor = 0;

  for (const item of items) {
    cursor += item.weight;
    if (target <= cursor) {
      return item.value;
    }
  }

  return items[items.length - 1]?.value ?? null;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(dateValue: string, days: number) {
  const date = parseDateValue(dateValue);
  if (!date) {
    return dateValue;
  }

  date.setDate(date.getDate() + days);
  return formatDateValue(date);
}

function buildDateRange(from: string, to: string) {
  const dates: string[] = [];
  let cursor = from;

  while (cursor <= to) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function toIso(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${timeValue}:00`).toISOString();
}

function createReservationId(businessId: string, dateValue: string, index: number) {
  const suffix = businessId.replace(/^biz_/, "");
  return `demo-${suffix}-${dateValue.replace(/-/g, "")}-${String(index).padStart(3, "0")}`;
}

function normalizeTimeList(times: string[]) {
  return [...new Set(times)].sort((left, right) => left.localeCompare(right));
}

function buildLabelFromTables(tables: FloorTable[]) {
  const labels = tables
    .map((table) => table.label)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  if (labels.length === 0) {
    return "Mesa unida";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  const parts = labels.map((label) => label.trim().split(/\s+/));
  const firstToken = parts[0]?.[0];
  const samePrefix = firstToken && parts.every((entry) => entry[0] === firstToken);

  if (samePrefix) {
    const suffixes = parts
      .map((entry) => entry.slice(1).join(" "))
      .filter(Boolean)
      .join("-");

    if (suffixes) {
      return `${firstToken} ${suffixes}`;
    }
  }

  return labels.join(" + ");
}

function getCustomerPools(): Record<string, CustomerProfile[]> {
  return {
    biz_demuru: [
      {
        name: "Martina Lopez",
        phone: "+54 9 221 555-1010",
        email: "martina.lopez@mail.com",
        notes: ["Cumpleanos", "Mesa cerca de la ventana"],
        weight: 10,
        partyMin: 2,
        partyMax: 4,
        bias: "vip",
      },
      {
        name: "Joaquin Perez",
        phone: "+54 9 221 555-2020",
        email: null,
        notes: ["Cliente frecuente", "Solicita confirmar por WhatsApp"],
        weight: 9,
        partyMin: 2,
        partyMax: 5,
        bias: "vip",
      },
      {
        name: "Sofia Rojas",
        phone: "+54 9 221 555-3030",
        email: "sofia.rojas@mail.com",
        notes: ["Vegetariano"],
        weight: 8,
        partyMin: 2,
        partyMax: 4,
        bias: "balanced",
      },
      {
        name: "Camila Torres",
        phone: "+54 9 221 555-4040",
        email: "camila.torres@mail.com",
        notes: ["Sin gluten", "Mesa tranquila"],
        weight: 7,
        partyMin: 2,
        partyMax: 4,
        bias: "balanced",
      },
      {
        name: "Lucas Molina",
        phone: "+54 9 221 555-5050",
        email: null,
        notes: ["Prefiere terraza"],
        weight: 6,
        partyMin: 2,
        partyMax: 4,
        bias: "balanced",
      },
      {
        name: "Valentina Gomez",
        phone: "+54 9 221 555-6060",
        email: "valentina.gomez@mail.com",
        notes: ["Celebracion aniversario"],
        weight: 9,
        partyMin: 2,
        partyMax: 6,
        bias: "vip",
      },
      {
        name: "Nicolas Vega",
        phone: "+54 9 221 555-7070",
        email: "nico.vega@mail.com",
        notes: ["Mesa cerca de la ventana"],
        weight: 7,
        partyMin: 2,
        partyMax: 5,
        bias: "balanced",
      },
      {
        name: "Agustina Romero",
        phone: "+54 9 221 555-8080",
        email: null,
        notes: ["Viene con niños"],
        weight: 6,
        partyMin: 2,
        partyMax: 5,
        bias: "balanced",
      },
      {
        name: "Mateo Fernandez",
        phone: "+54 9 221 555-9090",
        email: "mateo.fernandez@mail.com",
        notes: ["Mesa tranquila", "Solicita confirmar por WhatsApp"],
        weight: 7,
        partyMin: 2,
        partyMax: 4,
        bias: "risk",
      },
      {
        name: "Lucia Herrera",
        phone: "+54 9 221 555-1111",
        email: "lucia.herrera@mail.com",
        notes: ["Prefiere horario temprano"],
        weight: 6,
        partyMin: 2,
        partyMax: 4,
        bias: "balanced",
      },
      {
        name: "Tomas Silva",
        phone: "+54 9 221 555-1212",
        email: null,
        notes: ["Cliente frecuente"],
        weight: 5,
        partyMin: 2,
        partyMax: 5,
        bias: "balanced",
      },
      {
        name: "Florencia Acosta",
        phone: "+54 9 221 555-1313",
        email: "florencia.acosta@mail.com",
        notes: ["Mesa cerca de la ventana"],
        weight: 5,
        partyMin: 2,
        partyMax: 4,
        bias: "balanced",
      },
    ],
    biz_barbados: [
      {
        name: "Mariano Costa",
        phone: "+54 9 223 555-1010",
        email: "mariano.costa@mail.com",
        notes: ["Prefiere terraza", "Cliente frecuente"],
        weight: 10,
        partyMin: 4,
        partyMax: 10,
        bias: "vip",
      },
      {
        name: "Paula Benitez",
        phone: "+54 9 223 555-2020",
        email: null,
        notes: ["Cumpleanos", "Mesa VIP"],
        weight: 9,
        partyMin: 3,
        partyMax: 8,
        bias: "vip",
      },
      {
        name: "Gonzalo Arias",
        phone: "+54 9 223 555-3030",
        email: "gonzalo.arias@mail.com",
        notes: ["Viene con amigos"],
        weight: 8,
        partyMin: 4,
        partyMax: 12,
        bias: "balanced",
      },
      {
        name: "Victoria Peralta",
        phone: "+54 9 223 555-4040",
        email: "victoria.peralta@mail.com",
        notes: ["Solicita confirmar por WhatsApp"],
        weight: 7,
        partyMin: 2,
        partyMax: 8,
        bias: "balanced",
      },
      {
        name: "Diego Ramos",
        phone: "+54 9 223 555-5050",
        email: null,
        notes: ["Mesa sunset"],
        weight: 7,
        partyMin: 4,
        partyMax: 14,
        bias: "balanced",
      },
      {
        name: "Emilia Sosa",
        phone: "+54 9 223 555-6060",
        email: "emilia.sosa@mail.com",
        notes: ["Prefiere terraza"],
        weight: 6,
        partyMin: 2,
        partyMax: 6,
        bias: "balanced",
      },
      {
        name: "Federico Castro",
        phone: "+54 9 223 555-7070",
        email: "federico.castro@mail.com",
        notes: ["Mesa VIP", "Cliente frecuente"],
        weight: 6,
        partyMin: 4,
        partyMax: 10,
        bias: "vip",
      },
      {
        name: "Julieta Navarro",
        phone: "+54 9 223 555-8080",
        email: null,
        notes: ["Viene con amigos", "Celebracion aniversario"],
        weight: 6,
        partyMin: 3,
        partyMax: 10,
        bias: "balanced",
      },
      {
        name: "Bruno Medina",
        phone: "+54 9 223 555-9090",
        email: "bruno.medina@mail.com",
        notes: ["Solicita confirmar por WhatsApp"],
        weight: 5,
        partyMin: 3,
        partyMax: 8,
        bias: "risk",
      },
      {
        name: "Carolina Diaz",
        phone: "+54 9 223 555-1111",
        email: "carolina.diaz@mail.com",
        notes: ["Mesa tranquila"],
        weight: 5,
        partyMin: 2,
        partyMax: 6,
        bias: "balanced",
      },
      {
        name: "Lucas Molina",
        phone: "+54 9 223 555-1212",
        email: null,
        notes: ["Prefiere terraza", "Cliente frecuente"],
        weight: 5,
        partyMin: 4,
        partyMax: 12,
        bias: "balanced",
      },
    ],
    biz_cafe_demo: [
      {
        name: "Julieta Navarro",
        phone: "+54 9 2254 555-101",
        email: "julieta.navarro@mail.com",
        notes: ["Prefiere horario temprano"],
        weight: 10,
        partyMin: 1,
        partyMax: 3,
        bias: "balanced",
      },
      {
        name: "Bruno Medina",
        phone: "+54 9 2254 555-202",
        email: null,
        notes: ["Mesa tranquila", "Sin gluten"],
        weight: 9,
        partyMin: 2,
        partyMax: 4,
        bias: "balanced",
      },
      {
        name: "Carolina Diaz",
        phone: "+54 9 2254 555-303",
        email: "carolina.cafe@mail.com",
        notes: ["Vegetariano"],
        weight: 8,
        partyMin: 1,
        partyMax: 4,
        bias: "balanced",
      },
      {
        name: "Federico Castro",
        phone: "+54 9 2254 555-404",
        email: "federico.cafe@mail.com",
        notes: ["Cliente frecuente", "Mesa tranquila"],
        weight: 7,
        partyMin: 2,
        partyMax: 4,
        bias: "vip",
      },
      {
        name: "Emilia Sosa",
        phone: "+54 9 2254 555-505",
        email: null,
        notes: ["Viene con niños"],
        weight: 6,
        partyMin: 2,
        partyMax: 4,
        bias: "balanced",
      },
      {
        name: "Mateo Fernandez",
        phone: "+54 9 2254 555-606",
        email: "mateo.cafe@mail.com",
        notes: ["Solicita confirmar por WhatsApp"],
        weight: 6,
        partyMin: 2,
        partyMax: 4,
        bias: "risk",
      },
      {
        name: "Lucia Herrera",
        phone: "+54 9 2254 555-707",
        email: "lucia.cafe@mail.com",
        notes: ["Mesa cerca de la ventana"],
        weight: 7,
        partyMin: 1,
        partyMax: 3,
        bias: "balanced",
      },
      {
        name: "Tomas Silva",
        phone: "+54 9 2254 555-808",
        email: null,
        notes: ["Prefiere horario temprano"],
        weight: 6,
        partyMin: 1,
        partyMax: 3,
        bias: "balanced",
      },
      {
        name: "Florencia Acosta",
        phone: "+54 9 2254 555-909",
        email: "florencia.cafe@mail.com",
        notes: ["Cliente frecuente"],
        weight: 6,
        partyMin: 2,
        partyMax: 4,
        bias: "vip",
      },
    ],
  };
}

function getStatusWeights(dateValue: string, bias: CustomerBias) {
  const isMay = dateValue <= "2026-05-31";
  const base = isMay
    ? [
        { value: "completed" as const, weight: 70 },
        { value: "confirmed" as const, weight: 14 },
        { value: "cancelled" as const, weight: 10 },
        { value: "no_show" as const, weight: 4 },
        { value: "pending" as const, weight: 2 },
      ]
    : [
        { value: "confirmed" as const, weight: 36 },
        { value: "pending" as const, weight: 28 },
        { value: "completed" as const, weight: 20 },
        { value: "cancelled" as const, weight: 10 },
        { value: "no_show" as const, weight: 6 },
      ];

  if (bias === "vip") {
    return base.map((entry) => {
      if (entry.value === "completed") {
        return { ...entry, weight: entry.weight + 10 };
      }

      if (entry.value === "confirmed") {
        return { ...entry, weight: entry.weight + 8 };
      }

      if (entry.value === "cancelled" || entry.value === "no_show") {
        return { ...entry, weight: Math.max(1, entry.weight - 4) };
      }

      return entry;
    });
  }

  if (bias === "risk") {
    return base.map((entry) => {
      if (entry.value === "cancelled") {
        return { ...entry, weight: entry.weight + 6 };
      }

      if (entry.value === "no_show") {
        return { ...entry, weight: entry.weight + 4 };
      }

      if (entry.value === "completed" || entry.value === "confirmed") {
        return { ...entry, weight: Math.max(1, entry.weight - 5) };
      }

      return entry;
    });
  }

  return base;
}

function getSourceWeights(businessId: string) {
  if (businessId === "biz_demuru") {
    return [
      { value: "manual" as ReservationSource, weight: 35 },
      { value: "whatsapp" as ReservationSource, weight: 35 },
      { value: "instagram" as ReservationSource, weight: 20 },
      { value: "admin" as ReservationSource, weight: 10 },
    ];
  }

  if (businessId === "biz_barbados") {
    return [
      { value: "instagram" as ReservationSource, weight: 45 },
      { value: "whatsapp" as ReservationSource, weight: 30 },
      { value: "manual" as ReservationSource, weight: 20 },
      { value: "admin" as ReservationSource, weight: 5 },
    ];
  }

  return [
    { value: "manual" as ReservationSource, weight: 50 },
    { value: "whatsapp" as ReservationSource, weight: 30 },
    { value: "instagram" as ReservationSource, weight: 15 },
    { value: "admin" as ReservationSource, weight: 5 },
  ];
}

function getTimeOptions(businessId: string) {
  if (businessId === "biz_demuru") {
    return normalizeTimeList(["19:30", "20:00", "20:30", "21:00", "21:30", "22:00"]);
  }

  if (businessId === "biz_barbados") {
    return normalizeTimeList(["18:00", "19:00", "20:00", "21:00", "22:00"]);
  }

  return normalizeTimeList(["08:30", "09:00", "10:00", "10:30", "11:00", "12:00"]);
}

function getTimeWeights(businessId: string, timeValue: string, partySize: number) {
  if (businessId === "biz_demuru") {
    if (partySize >= 6) {
      return timeValue === "21:00" || timeValue === "21:30" ? 30 : 10;
    }

    return timeValue === "20:00" || timeValue === "20:30"
      ? 30
      : timeValue === "21:00"
        ? 20
        : 10;
  }

  if (businessId === "biz_barbados") {
    if (partySize >= 10) {
      return timeValue === "20:00" || timeValue === "21:00" ? 30 : 12;
    }

    if (partySize >= 6) {
      return timeValue === "19:00" || timeValue === "20:00" || timeValue === "21:00" ? 25 : 10;
    }

    return timeValue === "18:00" || timeValue === "19:00" ? 24 : 14;
  }

  if (timeValue === "08:30" || timeValue === "09:00") {
    return 30;
  }

  if (timeValue === "10:00" || timeValue === "10:30") {
    return 22;
  }

  return 12;
}

function getPartySize(profile: CustomerProfile, businessId: string, rng: () => number) {
  if (businessId === "biz_barbados" && profile.partyMax >= 10) {
    return randomInt(rng, Math.max(4, profile.partyMin), profile.partyMax);
  }

  return randomInt(rng, profile.partyMin, profile.partyMax);
}

function getReservationStatus(
  businessId: string,
  dateValue: string,
  profile: CustomerProfile,
  rng: () => number,
) {
  const weights = getStatusWeights(dateValue, profile.bias);
  const selected = weightedPick(rng, weights);
  return (selected ?? (dateValue <= "2026-05-31" ? "completed" : "confirmed")) as ReservationStatus;
}

function getSourceForBusiness(businessId: string, rng: () => number) {
  return weightedPick(rng, getSourceWeights(businessId)) ?? "manual";
}

function getServiceIdForReservation(
  businessId: string,
  partySize: number,
  timeValue: string,
  rng: () => number,
) {
  if (businessId === "biz_demuru") {
    if (partySize >= 6) {
      return weightedPick(rng, [
        { value: "service-demuru-vino", weight: 60 },
        { value: "service-demuru-chef-table", weight: 25 },
        { value: "service-demuru-degustacion", weight: 15 },
      ]) ?? "service-demuru-vino";
    }

    if (timeValue >= "21:00") {
      return weightedPick(rng, [
        { value: "service-demuru-chef-table", weight: 55 },
        { value: "service-demuru-degustacion", weight: 35 },
        { value: "service-demuru-vino", weight: 10 },
      ]) ?? "service-demuru-chef-table";
    }

    return weightedPick(rng, [
      { value: "service-demuru-degustacion", weight: 55 },
      { value: "service-demuru-chef-table", weight: 30 },
      { value: "service-demuru-vino", weight: 15 },
    ]) ?? "service-demuru-degustacion";
  }

  if (businessId === "biz_barbados") {
    if (partySize >= 10) {
      return weightedPick(rng, [
        { value: "service-barbados-sunset", weight: 40 },
        { value: "service-barbados-vip", weight: 60 },
      ]) ?? "service-barbados-vip";
    }

    if (partySize >= 6) {
      return weightedPick(rng, [
        { value: "service-barbados-sunset", weight: 65 },
        { value: "service-barbados-vip", weight: 35 },
      ]) ?? "service-barbados-sunset";
    }

    return weightedPick(rng, [
      { value: "service-barbados-sunset", weight: 70 },
      { value: "service-barbados-vip", weight: 30 },
    ]) ?? "service-barbados-sunset";
  }

  if (timeValue <= "10:30") {
    return weightedPick(rng, [
      { value: "service-cafe-brunch", weight: 80 },
      { value: "service-cafe-cowork", weight: 20 },
    ]) ?? "service-cafe-brunch";
  }

  return weightedPick(rng, [
    { value: "service-cafe-cowork", weight: 65 },
    { value: "service-cafe-brunch", weight: 35 },
  ]) ?? "service-cafe-cowork";
}

function getBaseReservationCount(
  businessId: string,
  dateValue: string,
  rng: () => number,
) {
  const date = parseDateValue(dateValue);
  if (!date) {
    return 0;
  }

  const day = date.getDay();
  const isMay = dateValue <= "2026-05-31";

  if (businessId === "biz_demuru") {
    if (day === 1) return 0;
    if (isMay) {
      if (day === 5) return randomInt(rng, 7, 9);
      if (day === 6) return randomInt(rng, 8, 10);
      if (day === 0) return randomInt(rng, 5, 7);
      if (day === 4) return randomInt(rng, 4, 5);
      return randomInt(rng, 3, 4);
    }

    if (day === 5) return randomInt(rng, 5, 7);
    if (day === 6) return randomInt(rng, 6, 8);
    if (day === 0) return randomInt(rng, 4, 5);
    if (day === 4) return randomInt(rng, 3, 4);
    return randomInt(rng, 2, 3);
  }

  if (businessId === "biz_barbados") {
    if (isMay) {
      if (day === 4) return randomInt(rng, 7, 8);
      if (day === 5 || day === 6) return randomInt(rng, 9, 11);
      if (day === 0) return randomInt(rng, 6, 8);
      return randomInt(rng, 4, 5);
    }

    if (day === 4) return randomInt(rng, 6, 8);
    if (day === 5 || day === 6) return randomInt(rng, 8, 10);
    if (day === 0) return randomInt(rng, 6, 7);
    return randomInt(rng, 4, 5);
  }

  if (isMay) {
    if (day === 0) return randomInt(rng, 4, 5);
    if (day === 5 || day === 6) return randomInt(rng, 4, 6);
    return randomInt(rng, 2, 3);
  }

  if (day === 0) return randomInt(rng, 3, 5);
  if (day === 5 || day === 6) return randomInt(rng, 4, 5);
  return randomInt(rng, 2, 3);
}

function getDailyPlan(businessId: string, startDate: string, endDate: string, rng: () => number) {
  const dates = buildDateRange(startDate, endDate);
  return dates.map<DayPlan>((date) => ({
    date,
    count: getBaseReservationCount(businessId, date, rng),
  }));
}

function getOccupiedTableIdsFromReservation(reservation: Reservation) {
  if (reservation.assignedTableIds && reservation.assignedTableIds.length > 0) {
    return [...new Set(reservation.assignedTableIds.filter(Boolean))];
  }

  if (reservation.tableId) {
    return [reservation.tableId];
  }

  return [];
}

function getExistingOccupancy(reservations: Reservation[]) {
  const occupancy = new Map<string, Set<string>>();

  for (const reservation of reservations) {
    if (!ACTIVE_STATUSES.includes(reservation.status)) {
      continue;
    }

    const assignedTableIds = getOccupiedTableIdsFromReservation(reservation);
    if (assignedTableIds.length === 0 && reservation.joinedTableId) {
      const joinedTable = reservation.joinedTableId
        ? getJoinedTableRecord(reservation.joinedTableId)
        : null;
      if (joinedTable) {
        assignedTableIds.push(...joinedTable.tableIds);
      }
    }

    if (assignedTableIds.length === 0) {
      continue;
    }

    const slotKey = `${reservation.businessId}|${reservation.reservationDate}|${reservation.reservationTime}`;
    const current = occupancy.get(slotKey) ?? new Set<string>();
    for (const tableId of assignedTableIds) {
      current.add(tableId);
    }
    occupancy.set(slotKey, current);
  }

  return occupancy;
}

function getJoinedTableRecord(joinedTableId: string) {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORE_KEYS.joinedTables);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as JoinedTable[];
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.find((entry) => entry.id === joinedTableId) ?? null;
  } catch {
    return null;
  }
}

function getCurrentStoredReservations() {
  return dedupeReservations(getReservations());
}

function chooseSingleAssignment(
  reservation: Reservation,
  tables: FloorTable[],
  occupiedTableIds: Set<string>,
) {
  const availableTables = tables.filter((table) => {
    if (table.status === "blocked" || table.status === "out_of_service") {
      return false;
    }

    return !occupiedTableIds.has(table.id);
  });

  const candidates = availableTables
    .filter((table) => table.seats >= reservation.partySize)
    .map((table) => ({
      kind: "single" as const,
      tableIds: [table.id],
      label: table.label,
      seats: table.seats,
      excessSeats: table.seats - reservation.partySize,
    }))
    .sort((left, right) => {
      if (left.excessSeats !== right.excessSeats) {
        return left.excessSeats - right.excessSeats;
      }

      if (left.seats !== right.seats) {
        return left.seats - right.seats;
      }

      return left.label.localeCompare(right.label);
    });

  return candidates[0] ?? null;
}

function chooseJoinedAssignment(
  reservation: Reservation,
  tables: FloorTable[],
  occupiedTableIds: Set<string>,
) {
  const joinableTables = tables.filter(
    (table) =>
      table.isJoinable &&
      table.status !== "blocked" &&
      table.status !== "out_of_service" &&
      !occupiedTableIds.has(table.id),
  );

  const options: Array<{
    kind: "joined";
    tableIds: string[];
    label: string;
    seats: number;
    excessSeats: number;
  }> = [];

  function walk(startIndex: number, current: FloorTable[]) {
    if (current.length >= 2) {
      const seats = current.reduce((sum, table) => sum + table.seats, 0);
      if (seats >= reservation.partySize) {
        const tableIds = current.map((table) => table.id);
        options.push({
          kind: "joined",
          tableIds,
          label: buildLabelFromTables(current),
          seats,
          excessSeats: seats - reservation.partySize,
        });
      }
    }

    if (current.length === 3) {
      return;
    }

    for (let index = startIndex; index < joinableTables.length; index += 1) {
      current.push(joinableTables[index]);
      walk(index + 1, current);
      current.pop();
    }
  }

  walk(0, []);

  return options
    .sort((left, right) => {
      if (left.excessSeats !== right.excessSeats) {
        return left.excessSeats - right.excessSeats;
      }

      if (left.tableIds.length !== right.tableIds.length) {
        return left.tableIds.length - right.tableIds.length;
      }

      return left.label.localeCompare(right.label);
    })[0] ?? null;
}

function chooseTableAssignment(
  reservation: Reservation,
  tables: FloorTable[],
  occupiedTableIds: Set<string>,
  rng: () => number,
) {
  const shouldLeaveWithoutTable = rng() < getNoTableProbability(reservation.businessId, reservation.reservationDate);
  if (shouldLeaveWithoutTable) {
    return null;
  }

  const single = chooseSingleAssignment(reservation, tables, occupiedTableIds);
  const joined = chooseJoinedAssignment(reservation, tables, occupiedTableIds);

  if (single && joined) {
    if (single.excessSeats < joined.excessSeats) {
      return single;
    }

    if (single.excessSeats > joined.excessSeats) {
      return joined;
    }

    if (single.tableIds.length <= joined.tableIds.length) {
      return single;
    }

    return joined;
  }

  return single ?? joined;
}

function getNoTableProbability(businessId: string, dateValue: string) {
  const isMay = dateValue <= "2026-05-31";

  if (businessId === "biz_demuru") {
    return isMay ? 0.12 : 0.18;
  }

  if (businessId === "biz_barbados") {
    return isMay ? 0.08 : 0.12;
  }

  return isMay ? 0.1 : 0.12;
}

function buildCustomerReservation(
  businessId: string,
  dateValue: string,
  timeValue: string,
  index: number,
  profile: CustomerProfile,
  partySize: number,
  status: ReservationStatus,
  source: ReservationSource,
  serviceId: string,
  rng: () => number,
): Reservation {
  const note = profile.notes.length > 0 ? profile.notes[randomInt(rng, 0, profile.notes.length - 1)] : null;
  const timestamp = toIso(dateValue, timeValue);
  const reservationId = createReservationId(businessId, dateValue, index);

  return {
    id: reservationId,
    businessId,
    serviceId,
    customerName: profile.name,
    customerPhone: profile.phone,
    customerEmail: profile.email,
    normalizedPhone: normalizePhone(profile.phone),
    reservationDate: dateValue,
    reservationTime: timeValue,
    partySize,
    status,
    notes: note,
    source,
    tableId: null,
    tableLabel: null,
    joinedTableId: null,
    joinedTableLabel: null,
    assignedTableIds: null,
    assignedAt: null,
    assignedBy: null,
    requiresDeposit: false,
    depositAmount: null,
    depositStatus: "not_required",
    depositProvider: null,
    isDemo: true,
    demoBatch: DEMO_BATCH,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildBusinessDemoReservations(
  businessId: string,
  datePlans: DayPlan[],
  currentReservations: Reservation[],
) {
  const profiles = getCustomerPools()[businessId] ?? [];
  const tables = getFloorTablesByBusinessId(businessId);
  const services = getBusinessServices(businessId);
  const serviceIds = new Set(services.map((service) => service.id));
  const reservations: GeneratedReservation[] = [];
  const pendingJoinedAssignments: PendingJoinedAssignment[] = [];
  const occupancy = getExistingOccupancy(currentReservations.filter((reservation) => reservation.businessId === businessId));
  const slotCounts = new Map<string, number>();

  for (const dayPlan of datePlans) {
    if (dayPlan.count <= 0 || profiles.length === 0) {
      continue;
    }

    const dateRng = createRng(`${DEMO_BATCH}:${businessId}:${dayPlan.date}`);
    const times = getTimeOptions(businessId);
    const selectedProfiles: CustomerProfile[] = [];
    const remainingProfiles = profiles.map((profile) => ({ ...profile }));

    for (let count = 0; count < dayPlan.count; count += 1) {
      const pool = remainingProfiles.length > 0 ? remainingProfiles : profiles;
      const profile =
        weightedPick(dateRng, pool.map((entry) => ({ value: entry, weight: entry.weight }))) ??
        pool[0];
      if (!profile) {
        continue;
      }

      selectedProfiles.push(profile);

      const remainingIndex = remainingProfiles.findIndex((entry) => entry.phone === profile.phone);
      if (remainingIndex >= 0) {
        remainingProfiles.splice(remainingIndex, 1);
      }
    }

    selectedProfiles.forEach((profile, index) => {
      const reservationRng = createRng(`${DEMO_BATCH}:${businessId}:${dayPlan.date}:${index}`);
      const partySize = getPartySize(profile, businessId, reservationRng);
      const timeWeights = times.map((time) => ({
        value: time,
        weight:
          getTimeWeights(businessId, time, partySize) /
          (1 + (slotCounts.get(`${dayPlan.date}|${time}`) ?? 0)),
      }));
      const time = weightedPick(reservationRng, timeWeights) ?? times[0];
      const status = getReservationStatus(businessId, dayPlan.date, profile, reservationRng);
      const source = getSourceForBusiness(businessId, reservationRng);
      const serviceId = getServiceIdForReservation(businessId, partySize, time, reservationRng);
      const reservation = buildCustomerReservation(
        businessId,
        dayPlan.date,
        time,
        reservations.length + 1,
        profile,
        partySize,
        status,
        source,
        serviceId,
        reservationRng,
      );

      if (!serviceIds.has(reservation.serviceId)) {
        const fallback = services[0]?.id;
        if (fallback) {
          reservation.serviceId = fallback;
        }
      }

      const slotKey = `${businessId}|${dayPlan.date}|${time}`;
      const occupiedTableIds = occupancy.get(slotKey) ?? new Set<string>();
      const assigned = ACTIVE_STATUSES.includes(reservation.status)
        ? chooseTableAssignment(reservation, tables, occupiedTableIds, reservationRng)
        : null;

      if (assigned && assigned.kind === "single") {
        const table = tables.find((entry) => entry.id === assigned.tableIds[0]) ?? null;
        if (table) {
          reservation.tableId = table.id;
          reservation.tableLabel = table.label;
          reservation.assignedTableIds = [table.id];
          reservation.assignedAt = reservation.createdAt;
          reservation.assignedBy = "local_mock";
          const next = occupancy.get(slotKey) ?? new Set<string>();
          next.add(table.id);
          occupancy.set(slotKey, next);
        }
      } else if (assigned && assigned.kind === "joined") {
        pendingJoinedAssignments.push({
          reservationIndex: reservations.length,
          businessId,
          tableIds: [...assigned.tableIds],
          reservationDate: dayPlan.date,
          reservationTime: time,
        });
        reservation.assignedTableIds = [...assigned.tableIds];
        reservation.assignedAt = reservation.createdAt;
        reservation.assignedBy = "local_mock";

        const next = occupancy.get(slotKey) ?? new Set<string>();
        for (const tableId of assigned.tableIds) {
          next.add(tableId);
        }
        occupancy.set(slotKey, next);
      }

      slotCounts.set(slotKey, (slotCounts.get(slotKey) ?? 0) + 1);
      reservations.push({
        ...reservation,
        __slotKey: slotKey,
      });
    });
  }

  for (const pending of pendingJoinedAssignments) {
    const reservation = reservations[pending.reservationIndex];
    if (!reservation) {
      continue;
    }

    const joinedTable = createJoinedTable(
      pending.businessId,
      pending.tableIds,
      reservation.id,
      pending.reservationDate,
      pending.reservationTime,
    );

    reservation.joinedTableId = joinedTable.id;
    reservation.joinedTableLabel = joinedTable.label;
  }

  return reservations.map((entry) => {
    const { __slotKey, ...reservation } = entry;
    void __slotKey;
    return reservation as Reservation;
  });
}

function writeReservationsToStorage(reservations: Reservation[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(reservations));
  window.dispatchEvent(new Event("storage"));
}

function getStoredReservationsWithoutDemo() {
  return getCurrentStoredReservations().filter((reservation) => !reservation.isDemo);
}

export function clearDemoReservations() {
  if (!isBrowser()) {
    return { removed: 0 };
  }

  const demoReservations = getCurrentStoredReservations().filter((reservation) => reservation.isDemo);
  if (demoReservations.length === 0) {
    return { removed: 0 };
  }

  const removed = deleteReservationsByIds(demoReservations.map((reservation) => reservation.id));
  return { removed };
}

export function seedDemoReservations(): DemoSeedResult {
  if (!isBrowser()) {
    return {
      inserted: 0,
      perBusiness: {
        biz_demuru: 0,
        biz_barbados: 0,
        biz_cafe_demo: 0,
      },
    };
  }

  clearDemoReservations();

  const currentReservations = getStoredReservationsWithoutDemo();
  const finalReservations: Reservation[] = [...currentReservations];
  const perBusiness: Record<string, number> = {
    biz_demuru: 0,
    biz_barbados: 0,
    biz_cafe_demo: 0,
  };

  for (const businessId of BUSINESS_IDS) {
    const planRng = createRng(`${DEMO_BATCH}:${businessId}:plan`);
    const datePlans = [
      ...getDailyPlan(businessId, "2026-05-01", "2026-05-31", planRng),
      ...getDailyPlan(businessId, "2026-06-01", "2026-06-14", planRng),
    ];
    const generated = buildBusinessDemoReservations(businessId, datePlans, finalReservations);
    finalReservations.push(...generated);
    perBusiness[businessId] = generated.length;
  }

  const nextReservations = dedupeReservations(finalReservations).sort((left, right) => {
    const dateCompare = left.reservationDate.localeCompare(right.reservationDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    const timeCompare = left.reservationTime.localeCompare(right.reservationTime);
    if (timeCompare !== 0) {
      return timeCompare;
    }

    return left.id.localeCompare(right.id);
  });

  writeReservationsToStorage(nextReservations);

  return {
    inserted: Object.values(perBusiness).reduce((sum, count) => sum + count, 0),
    perBusiness,
  };
}

// Demo comercial local/mock:
// mayo completo + primeros 14 dias de junio, con volumen realista y aislado por negocio.
