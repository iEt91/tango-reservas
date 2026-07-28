"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Eye,
  Mail,
  PackageCheck,
  Pencil,
  Trash2,
  Plus,
  Search,
  Star,
  UserRoundCheck,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card, V2MetricCard } from "@/components/v2/v2-card";
import { V2ClientStatusBadge } from "@/components/v2/v2-badge";
import { V2FilterBar } from "@/components/v2/v2-filter-bar";
import { V2Input, V2Select, V2Textarea } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import { v2Clients, v2Deliveries, v2Reservations } from "@/lib/v2/v2-mock-data";

const RESERVATIONS_STORAGE_KEY = "tango-v2-reservations-calendar-v2";
const CLIENTS_META_STORAGE_KEY = "tango-v2-clients-meta-v1";
const MANUAL_CLIENTS_STORAGE_KEY = "tango-v2-manual-clients-v1";
const MANUAL_CLIENTS_EVENT = "tango-v2-manual-clients-updated";
const CLIENTS_META_EVENT = "tango-v2-clients-meta-updated";
const DELIVERIES_STORAGE_KEY = "tango-v2-deliveries-v1";
const DELIVERIES_EVENT = "tango-v2-deliveries-updated";

type V2ClientStatus = (typeof v2Clients)[number]["status"];

type V2ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

type V2ReservationOrigin =
  | "web"
  | "whatsapp"
  | "phone"
  | "instagram"
  | "manual"
  | "delivery"
  | "pickup";

type V2StoredReservation = {
  id: string;
  client: string;
  email?: string;
  phone?: string;
  date: string;
  time: string;
  people: number;
  note?: string;
  status: V2ReservationStatus;
  tableName?: string;
  origin?: V2ReservationOrigin;
  orderItems?: string;
  orderTotal?: number;
};

type V2ClientMeta = {
  birthDate: string;
  internalNotes: string;
};

type V2ManualClient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  internalNotes: string;
  createdAt: string;
};

type V2StoredDelivery = {
  id: string;
  date?: string;
  time: string;
  client: string;
  phone: string;
  address: string;
  deliveryType: "delivery" | "pickup";
  order: string;
  orderItems?: { id: string; name: string; price: number; quantity: number }[];
  total: number;
  payment: string;
  note: string;
  status: "confirmed" | "completed" | "cancelled";
};

type V2RealClient = {
  id: string;
  initials: string;
  name: string;
  email: string;
  phone: string;
  lastVisit: string;
  lastVisitRaw: string;
  nextVisit: string;
  nextVisitRaw: string;
  reservations: number;
  completedReservations: number;
  cancelledReservations: number;
  noShows: number;
  pendingReservations: number;
  confirmedReservations: number;
  preference: string;
  note: string;
  status: V2ClientStatus;
  totalSpent: number;
  averageTicket: number;
  habitualTable: string;
  mainOrigin: string;
  reservationsHistory: V2StoredReservation[];
  deliveriesHistory: V2StoredDelivery[];
  favoriteItems: string;
  birthDate: string;
  internalNotes: string;
};

type V2ClientFilter = "all" | "frequent" | "new" | "notes" | "no_show";
type V2ClientSort =
  | "name"
  | "phone"
  | "lastVisit"
  | "reservations"
  | "spent"
  | "ticket"
  | "status";

type V2SortDirection = "asc" | "desc";

const ORIGIN_LABELS: Record<V2ReservationOrigin, string> = {
  web: "Web",
  whatsapp: "WhatsApp",
  phone: "Teléfono",
  instagram: "Instagram",
  manual: "Manual",
  delivery: "Delivery",
  pickup: "Retiro",
};

const STATUS_PRIORITY: Record<V2ClientStatus, number> = {
  no_show: 0,
  frequent: 1,
  active: 2,
  new: 3,
  inactive: 4,
};

function readFromStorage<T>(key: string, fallback: T) {
  if (typeof window === "undefined") return fallback;

  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) return fallback;

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function writeToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("tango-v2-reservations-updated"));
}

function writeClientMetaToStorage(value: Record<string, V2ClientMeta>) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(CLIENTS_META_STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(CLIENTS_META_EVENT));
}

function writeManualClientsToStorage(value: V2ManualClient[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(MANUAL_CLIENTS_STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(MANUAL_CLIENTS_EVENT));
}

function formatMoney(value: number) {
  return `$${Math.max(Number(value) || 0, 0).toLocaleString("es-AR")}`;
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return date || "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function formatBirthDateLabel(date: string) {
  if (!date) return "Sin fecha de nacimiento";

  return formatDateLabel(date);
}

function getReservationStatusMeta(status: V2ReservationStatus) {
  const meta: Record<
    V2ReservationStatus,
    { label: string; className: string }
  > = {
    pending: {
      label: "Pendiente",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    confirmed: {
      label: "Confirmada",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    completed: {
      label: "Completada",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    },
    cancelled: {
      label: "Cancelada",
      className: "border-red-200 bg-red-50 text-red-700",
    },
    no_show: {
      label: "No-show",
      className: "border-red-200 bg-red-50 text-red-700",
    },
  };

  return meta[status];
}

function reservationTimestamp(reservation: Pick<V2StoredReservation, "date" | "time">) {
  const timestamp = new Date(`${reservation.date}T${reservation.time || "00:00"}:00`).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function deliveryTimestamp(delivery: Pick<V2StoredDelivery, "date" | "time">) {
  const timestamp = new Date(`${delivery.date || ""}T${delivery.time || "00:00"}:00`).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function mapDeliveryStatusToReservationStatus(
  status: V2StoredDelivery["status"]
): V2ReservationStatus {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";

  return "confirmed";
}

function summarizeDeliveryOrder(delivery: V2StoredDelivery) {
  if (Array.isArray(delivery.orderItems) && delivery.orderItems.length > 0) {
    return delivery.orderItems
      .map((item) => `${item.quantity}x ${item.name} (${formatMoney(item.price)})`)
      .join(", ");
  }

  return delivery.order || "Pedido sin detalle";
}

function deliveryToClientActivity(delivery: V2StoredDelivery): V2StoredReservation {
  return {
    id: `delivery-${delivery.id}`,
    client: delivery.client,
    email: "",
    phone: delivery.phone,
    date: delivery.date || "",
    time: delivery.time || "",
    people: 0,
    note: delivery.note && delivery.note !== "—" ? delivery.note : delivery.address,
    status: mapDeliveryStatusToReservationStatus(delivery.status),
    tableName: delivery.deliveryType === "delivery" ? "Delivery" : "Retiro",
    origin: delivery.deliveryType === "delivery" ? "delivery" : "pickup",
    orderItems: summarizeDeliveryOrder(delivery),
    orderTotal: Math.max(Number(delivery.total) || 0, 0),
  };
}

function normalizeDelivery(delivery: Partial<V2StoredDelivery>): V2StoredDelivery {
  return {
    id: delivery.id ?? crypto.randomUUID(),
    date: delivery.date ?? "",
    time: delivery.time ?? "",
    client: delivery.client?.trim() || "Cliente sin nombre",
    phone: delivery.phone?.trim() ?? "",
    address: delivery.address?.trim() ?? "",
    deliveryType: delivery.deliveryType ?? "delivery",
    order: delivery.order?.trim() ?? "",
    orderItems: Array.isArray(delivery.orderItems) ? delivery.orderItems : [],
    total: Math.max(Number(delivery.total) || 0, 0),
    payment: delivery.payment?.trim() || "Efectivo",
    note: delivery.note?.trim() || "—",
    status: delivery.status ?? "confirmed",
  };
}

function normalizePhone(phone?: string) {
  return (phone ?? "").replace(/\D/g, "");
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function getClientStableId({
  name,
  phone,
  email,
  fallbackId,
}: {
  name: string;
  phone?: string;
  email?: string;
  fallbackId?: string;
}) {
  return (
    normalizePhone(phone) ||
    email?.trim().toLowerCase() ||
    normalizeSearch(name) ||
    fallbackId ||
    crypto.randomUUID()
  );
}

function normalizeManualClient(client: Partial<V2ManualClient>): V2ManualClient {
  const name = client.name?.trim() || "Cliente sin nombre";
  const phone = client.phone?.trim() ?? "";
  const email = client.email?.trim() ?? "";

  return {
    id: getClientStableId({ name, phone, email, fallbackId: client.id }),
    name,
    email,
    phone,
    birthDate: client.birthDate?.trim() ?? "",
    internalNotes: client.internalNotes?.trim() ?? "",
    createdAt: client.createdAt || getTodayDateKey(),
  };
}

function manualClientToRealClient(client: V2ManualClient): V2RealClient {
  return {
    id: client.id,
    initials: getInitials(client.name),
    name: client.name,
    email: client.email || "Sin email",
    phone: client.phone || "Sin teléfono",
    lastVisit: "Sin visitas todavía",
    lastVisitRaw: "",
    nextVisit: "Sin próxima reserva",
    nextVisitRaw: "",
    reservations: 0,
    completedReservations: 0,
    cancelledReservations: 0,
    noShows: 0,
    pendingReservations: 0,
    confirmedReservations: 0,
    preference: "—",
    note: client.internalNotes,
    status: "new",
    totalSpent: 0,
    averageTicket: 0,
    habitualTable: "—",
    mainOrigin: "Manual",
    reservationsHistory: [],
    deliveriesHistory: [],
    favoriteItems: "Sin historial de consumo todavía.",
    birthDate: client.birthDate,
    internalNotes: client.internalNotes,
  };
}

function getInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "CL";

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function getMostFrequentValue(values: string[]) {
  const counts = new Map<string, number>();

  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return (
    Array.from(counts.entries()).sort((first, second) => second[1] - first[1])[0]?.[0] ??
    "—"
  );
}

function getFavoriteItems(reservations: V2StoredReservation[]) {
  const counts = new Map<string, number>();

  reservations.forEach((reservation) => {
    reservation.orderItems
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));
  });

  const items = Array.from(counts.entries())
    .sort((first, second) => second[1] - first[1])
    .slice(0, 3)
    .map(([item, quantity]) => `${quantity}x ${item}`);

  return items.length > 0 ? items.join(", ") : "Sin historial de consumo todavía.";
}

function getClientStatus(reservations: V2StoredReservation[]): V2ClientStatus {
  const noShows = reservations.filter((reservation) => reservation.status === "no_show").length;

  if (noShows > 0) return "no_show";
  if (reservations.length >= 5) return "frequent";
  if (reservations.length <= 1) return "new";

  return "active";
}

function normalizeReservation(reservation: Partial<V2StoredReservation>): V2StoredReservation {
  return {
    id: reservation.id ?? crypto.randomUUID(),
    client: reservation.client?.trim() || "Cliente sin nombre",
    email: reservation.email?.trim() ?? "",
    phone: reservation.phone?.trim() ?? "",
    date: reservation.date ?? "",
    time: reservation.time ?? "",
    people: Math.max(Number(reservation.people) || 1, 1),
    note: reservation.note?.trim() ?? "",
    status: reservation.status ?? "pending",
    tableName: reservation.tableName?.trim() ?? "",
    origin: reservation.origin ?? "manual",
    orderItems: reservation.orderItems?.trim() ?? "",
    orderTotal: Math.max(Number(reservation.orderTotal) || 0, 0),
  };
}

function buildClientsFromReservations(
  reservations: V2StoredReservation[],
  deliveries: V2StoredDelivery[]
) {
  const deliveryActivities = deliveries.map((delivery) =>
    deliveryToClientActivity(delivery)
  );
  const allClientActivities = [...reservations, ...deliveryActivities];
  const groupedClients = new Map<string, V2StoredReservation[]>();
  const groupedDeliveries = new Map<string, V2StoredDelivery[]>();

  allClientActivities.forEach((reservation) => {
    const nameKey = normalizeSearch(reservation.client);
    const stableKey =
      normalizePhone(reservation.phone) ||
      reservation.email?.trim().toLowerCase() ||
      nameKey ||
      reservation.id;
    const key = stableKey;

    if (!groupedClients.has(key)) {
      groupedClients.set(key, []);
    }

    groupedClients.get(key)?.push(reservation);
  });

  deliveries.forEach((delivery) => {
    const nameKey = normalizeSearch(delivery.client);
    const stableKey =
      normalizePhone(delivery.phone) ||
      nameKey ||
      delivery.id;
    const key = stableKey;

    if (!groupedDeliveries.has(key)) {
      groupedDeliveries.set(key, []);
    }

    groupedDeliveries.get(key)?.push(delivery);
  });

  return Array.from(groupedClients.entries()).map(([key, groupedReservations]) => {
    const orderedReservations = [...groupedReservations].sort(
      (first, second) => reservationTimestamp(second) - reservationTimestamp(first)
    );
    const orderedDeliveries = [...(groupedDeliveries.get(key) ?? [])].sort(
      (first, second) => deliveryTimestamp(second) - deliveryTimestamp(first)
    );
    const completedReservations = orderedReservations.filter(
      (reservation) => reservation.status === "completed"
    );
    const activeReservations = orderedReservations.filter(
      (reservation) => reservation.status === "pending" || reservation.status === "confirmed"
    );
    const now = Date.now();
    const pastReservations = orderedReservations.filter(
      (reservation) => reservationTimestamp(reservation) <= now
    );
    const futureReservations = orderedReservations
      .filter((reservation) => reservationTimestamp(reservation) > now)
      .sort((first, second) => reservationTimestamp(first) - reservationTimestamp(second));

    const latestReservation = pastReservations[0] ?? orderedReservations[0];
    const nextReservation = futureReservations[0] ?? null;
    const totalSpent = orderedReservations.reduce(
      (total, reservation) => total + Math.max(Number(reservation.orderTotal) || 0, 0),
      0
    );
    const ticketReservations = orderedReservations.filter(
      (reservation) => Math.max(Number(reservation.orderTotal) || 0, 0) > 0
    );
    const notes = orderedReservations
      .map((reservation) => reservation.note?.trim() ?? "")
      .filter(Boolean);

    const client: V2RealClient = {
      id: key,
      initials: getInitials(latestReservation.client),
      name: latestReservation.client,
      email: latestReservation.email || "Sin email",
      phone: latestReservation.phone || "Sin teléfono",
      lastVisit: latestReservation ? formatDateLabel(latestReservation.date) : "—",
      lastVisitRaw: latestReservation?.date ?? "",
      nextVisit: nextReservation ? `${formatDateLabel(nextReservation.date)} · ${nextReservation.time}` : "Sin próxima reserva",
      nextVisitRaw: nextReservation?.date ?? "",
      reservations: orderedReservations.length,
      completedReservations: completedReservations.length,
      cancelledReservations: orderedReservations.filter(
        (reservation) => reservation.status === "cancelled"
      ).length,
      noShows: orderedReservations.filter((reservation) => reservation.status === "no_show").length,
      pendingReservations: orderedReservations.filter(
        (reservation) => reservation.status === "pending"
      ).length,
      confirmedReservations: activeReservations.filter(
        (reservation) => reservation.status === "confirmed"
      ).length,
      preference: getMostFrequentValue([
        ...orderedReservations.map((reservation) => reservation.tableName ?? ""),
        ...notes,
      ]),
      note: notes[0] ?? "",
      status: getClientStatus(orderedReservations),
      totalSpent,
      averageTicket:
        ticketReservations.length > 0 ? Math.round(totalSpent / ticketReservations.length) : 0,
      habitualTable: getMostFrequentValue(
        orderedReservations.map((reservation) => reservation.tableName ?? "")
      ),
      mainOrigin: getMostFrequentValue(
        orderedReservations.map((reservation) =>
          reservation.origin ? ORIGIN_LABELS[reservation.origin] : "Manual"
        )
      ),
      reservationsHistory: orderedReservations,
      deliveriesHistory: orderedDeliveries,
      favoriteItems: getFavoriteItems(orderedReservations),
      birthDate: "",
      internalNotes: notes[0] ?? "",
    };

    return client;
  });
}

export function V2ClientesPage() {
  const [reservations, setReservations] = useState<V2StoredReservation[]>([]);
  const [deliveries, setDeliveries] = useState<V2StoredDelivery[]>([]);
  const [manualClients, setManualClients] = useState<V2ManualClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [profileClientId, setProfileClientId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [newDeliveryClientId, setNewDeliveryClientId] = useState<string | null>(null);
  const [newReservationClientId, setNewReservationClientId] = useState<string | null>(null);
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [clientMeta, setClientMeta] = useState<Record<string, V2ClientMeta>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState<V2ClientFilter>("all");
  const [clientSort, setClientSort] = useState<V2ClientSort>("name");
  const [sortDirection, setSortDirection] = useState<V2SortDirection>("asc");

  useEffect(() => {
    function syncReservationsFromStorage() {
      setReservations(
        readFromStorage<V2StoredReservation[]>(
          RESERVATIONS_STORAGE_KEY,
          v2Reservations.map((reservation) => normalizeReservation(reservation))
        ).map((reservation) => normalizeReservation(reservation))
      );
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== RESERVATIONS_STORAGE_KEY) return;

      syncReservationsFromStorage();
    }

    syncReservationsFromStorage();

    window.addEventListener("focus", syncReservationsFromStorage);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("tango-v2-reservations-updated", syncReservationsFromStorage);

    return () => {
      window.removeEventListener("focus", syncReservationsFromStorage);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("tango-v2-reservations-updated", syncReservationsFromStorage);
    };
  }, []);

  useEffect(() => {
    function syncDeliveriesFromStorage() {
      setDeliveries(
        readFromStorage<V2StoredDelivery[]>(
          DELIVERIES_STORAGE_KEY,
          v2Deliveries.map((delivery) => normalizeDelivery(delivery as V2StoredDelivery))
        ).map((delivery) => normalizeDelivery(delivery))
      );
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== DELIVERIES_STORAGE_KEY) return;

      syncDeliveriesFromStorage();
    }

    syncDeliveriesFromStorage();

    window.addEventListener("focus", syncDeliveriesFromStorage);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(DELIVERIES_EVENT, syncDeliveriesFromStorage);

    return () => {
      window.removeEventListener("focus", syncDeliveriesFromStorage);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(DELIVERIES_EVENT, syncDeliveriesFromStorage);
    };
  }, []);

  useEffect(() => {
    function syncClientMetaFromStorage() {
      setClientMeta(
        readFromStorage<Record<string, V2ClientMeta>>(CLIENTS_META_STORAGE_KEY, {})
      );
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== CLIENTS_META_STORAGE_KEY) return;

      syncClientMetaFromStorage();
    }

    syncClientMetaFromStorage();

    window.addEventListener("focus", syncClientMetaFromStorage);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(CLIENTS_META_EVENT, syncClientMetaFromStorage);

    return () => {
      window.removeEventListener("focus", syncClientMetaFromStorage);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CLIENTS_META_EVENT, syncClientMetaFromStorage);
    };
  }, []);

  useEffect(() => {
    function syncManualClientsFromStorage() {
      setManualClients(
        readFromStorage<V2ManualClient[]>(MANUAL_CLIENTS_STORAGE_KEY, []).map(
          (client) => normalizeManualClient(client)
        )
      );
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== MANUAL_CLIENTS_STORAGE_KEY) return;

      syncManualClientsFromStorage();
    }

    syncManualClientsFromStorage();

    window.addEventListener("focus", syncManualClientsFromStorage);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(MANUAL_CLIENTS_EVENT, syncManualClientsFromStorage);

    return () => {
      window.removeEventListener("focus", syncManualClientsFromStorage);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(MANUAL_CLIENTS_EVENT, syncManualClientsFromStorage);
    };
  }, []);


  const clients = useMemo(() => {
    const generatedClients = buildClientsFromReservations(reservations, deliveries);
    const generatedClientIds = new Set(generatedClients.map((client) => client.id));
    const manualOnlyClients = manualClients
      .filter((client) => !generatedClientIds.has(client.id))
      .map((client) => manualClientToRealClient(client));

    return [...generatedClients, ...manualOnlyClients].map((client) => {
      const meta = clientMeta[client.id];

      return meta
        ? {
            ...client,
            birthDate: meta.birthDate ?? client.birthDate,
            internalNotes: meta.internalNotes ?? client.internalNotes,
            note: meta.internalNotes ?? client.note,
          }
        : client;
    });
  }, [clientMeta, deliveries, manualClients, reservations]);

  const filteredClients = useMemo(() => {
    const normalizedQuery = normalizeSearch(searchQuery);

    return clients
      .filter((client) => {
        const matchesSearch =
          normalizeSearch(client.name).includes(normalizedQuery) ||
          normalizeSearch(client.email).includes(normalizedQuery) ||
          normalizeSearch(client.phone).includes(normalizedQuery);

        if (!matchesSearch) return false;

        if (clientFilter === "notes") return client.note.trim().length > 0;
        if (clientFilter === "all") return true;

        return client.status === clientFilter;
      })
      .sort((first, second) => {
        let result = 0;

        if (clientSort === "name") result = first.name.localeCompare(second.name);
        if (clientSort === "phone") result = first.phone.localeCompare(second.phone);
        if (clientSort === "lastVisit") {
          result =
            (new Date(first.lastVisitRaw).getTime() || 0) -
            (new Date(second.lastVisitRaw).getTime() || 0);
        }
        if (clientSort === "reservations") {
          result = first.reservations - second.reservations;
        }
        if (clientSort === "spent") {
          result = first.totalSpent - second.totalSpent;
        }
        if (clientSort === "ticket") {
          result = first.averageTicket - second.averageTicket;
        }
        if (clientSort === "status") {
          result = STATUS_PRIORITY[first.status] - STATUS_PRIORITY[second.status];
        }

        return sortDirection === "asc" ? result : -result;
      });
  }, [clientFilter, clientSort, clients, searchQuery, sortDirection]);

  const resolvedSelectedClientId = clients.some((client) => client.id === selectedClientId)
    ? selectedClientId
    : clients[0]?.id ?? "";
  const selectedClient =
    clients.find((client) => client.id === resolvedSelectedClientId) ?? null;
  const profileClient =
    clients.find((client) => client.id === profileClientId) ?? null;
  const clientPendingDelete =
    clients.find((client) => client.id === deleteClientId) ?? null;
  const clientPendingDelivery =
    clients.find((client) => client.id === newDeliveryClientId) ?? null;
  const clientPendingReservation =
    clients.find((client) => client.id === newReservationClientId) ?? null;

  const frequentClients = clients.filter((item) => item.status === "frequent");
  const newClients = clients.filter((item) => item.status === "new");
  const clientsWithNotes = clients.filter((item) => item.note.trim().length > 0);
  const noShowClients = clients.filter((item) => item.status === "no_show");

  function closeAllClientModals() {
    setNewClientModalOpen(false);
    setNewDeliveryClientId(null);
    setNewReservationClientId(null);
    setDeleteClientId(null);
    setEditingClientId(null);
    setProfileClientId(null);
    setDeleteConfirmationText("");
  }

  useEffect(() => {
    const hasOpenModal =
      newClientModalOpen ||
      Boolean(newDeliveryClientId) ||
      Boolean(newReservationClientId) ||
      Boolean(deleteClientId) ||
      Boolean(editingClientId) ||
      Boolean(profileClientId);

    if (!hasOpenModal) return;

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAllClientModals();
      }
    }

    window.addEventListener("keydown", handleEscapeKey);

    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [
    deleteClientId,
    editingClientId,
    newClientModalOpen,
    newDeliveryClientId,
    newReservationClientId,
    profileClientId,
  ]);

  function openProfile(client: V2RealClient) {
    setSelectedClientId(client.id);
    setProfileClientId(client.id);
  }

  function selectClient(client: V2RealClient) {
    setSelectedClientId(client.id);
  }

  function editClient(client: V2RealClient) {
    setSelectedClientId(client.id);
    setEditingClientId(client.id);
  }

  function deleteClient(client: V2RealClient) {
    setSelectedClientId(client.id);
    setDeleteClientId(client.id);
    setDeleteConfirmationText("");
  }

  function confirmDeleteClient(client: V2RealClient) {
    const reservationIdsToRemove = new Set(
      client.reservationsHistory
        .filter((reservation) => !reservation.id.startsWith("delivery-"))
        .map((reservation) => reservation.id)
    );
    const deliveryIdsToRemove = new Set(
      client.deliveriesHistory.map((delivery) => delivery.id)
    );
    const nextReservations = reservations.filter(
      (reservation) => !reservationIdsToRemove.has(reservation.id)
    );
    const nextDeliveries = deliveries.filter(
      (delivery) => !deliveryIdsToRemove.has(delivery.id)
    );
    const nextClientMeta = { ...clientMeta };
    const nextManualClients = manualClients.filter((manualClient) => manualClient.id !== client.id);

    delete nextClientMeta[client.id];

    setReservations(nextReservations);
    setDeliveries(nextDeliveries);
    setManualClients(nextManualClients);
    setClientMeta(nextClientMeta);
    writeToStorage(RESERVATIONS_STORAGE_KEY, nextReservations);
    writeToStorage(DELIVERIES_STORAGE_KEY, nextDeliveries);
    writeManualClientsToStorage(nextManualClients);
    window.dispatchEvent(new Event(DELIVERIES_EVENT));
    writeClientMetaToStorage(nextClientMeta);
    setDeleteClientId(null);
    setDeleteConfirmationText("");
    setProfileClientId(null);
    setEditingClientId(null);
  }

  function saveClientEdition(client: V2RealClient, formData: FormData) {
    const nextName = String(formData.get("name") ?? "").trim();
    const nextPhone = String(formData.get("phone") ?? "").trim();
    const nextEmail = String(formData.get("email") ?? "").trim();
    const nextBirthDate = String(formData.get("birthDate") ?? "").trim();
    const nextInternalNotes = String(formData.get("internalNotes") ?? "").trim();

    if (!nextName) return;

    const reservationIdsToUpdate = new Set(
      client.reservationsHistory.map((reservation) => reservation.id)
    );
    const deliveryIdsToUpdate = new Set(
      client.deliveriesHistory.map((delivery) => delivery.id)
    );
    const nextReservations = reservations.map((reservation) =>
      reservationIdsToUpdate.has(reservation.id)
        ? {
            ...reservation,
            client: nextName,
            phone: nextPhone,
            email: nextEmail,
          }
        : reservation
    );
    const nextDeliveries = deliveries.map((delivery) =>
      deliveryIdsToUpdate.has(delivery.id)
        ? {
            ...delivery,
            client: nextName,
            phone: nextPhone,
          }
        : delivery
    );

    const nextClientId =
      normalizePhone(nextPhone) ||
      nextEmail.trim().toLowerCase() ||
      normalizeSearch(nextName) ||
      client.id;

    const nextClientMeta = { ...clientMeta };
    const nextManualClients = manualClients.map((manualClient) =>
      manualClient.id === client.id
        ? {
            ...manualClient,
            id: nextClientId,
            name: nextName,
            phone: nextPhone,
            email: nextEmail,
            birthDate: nextBirthDate,
            internalNotes: nextInternalNotes,
          }
        : manualClient
    );

    if (client.id !== nextClientId) {
      delete nextClientMeta[client.id];
    }

    nextClientMeta[nextClientId] = {
      birthDate: nextBirthDate,
      internalNotes: nextInternalNotes,
    };

    setReservations(nextReservations);
    setDeliveries(nextDeliveries);
    setManualClients(nextManualClients);
    setClientMeta(nextClientMeta);
    writeToStorage(RESERVATIONS_STORAGE_KEY, nextReservations);
    writeToStorage(DELIVERIES_STORAGE_KEY, nextDeliveries);
    writeManualClientsToStorage(nextManualClients);
    window.dispatchEvent(new Event(DELIVERIES_EVENT));
    writeClientMetaToStorage(nextClientMeta);
    setSelectedClientId(nextClientId);
    setProfileClientId((current) => (current === client.id ? nextClientId : current));
    setEditingClientId(null);
  }

  function renderSelectableCell(client: V2RealClient, content: ReactNode) {
    return (
      <button
        type="button"
        onClick={() => selectClient(client)}
        className="w-full text-left"
      >
        {content}
      </button>
    );
  }

  function saveNewClient(formData: FormData) {
    const nextName = String(formData.get("name") ?? "").trim();
    const nextPhone = String(formData.get("phone") ?? "").trim();
    const nextEmail = String(formData.get("email") ?? "").trim();
    const nextBirthDate = String(formData.get("birthDate") ?? "").trim();
    const nextInternalNotes = String(formData.get("internalNotes") ?? "").trim();

    if (!nextName) return;

    const manualClient = normalizeManualClient({
      name: nextName,
      phone: nextPhone,
      email: nextEmail,
      birthDate: nextBirthDate,
      internalNotes: nextInternalNotes,
      createdAt: getTodayDateKey(),
    });
    const nextManualClients = [
      manualClient,
      ...manualClients.filter((client) => client.id !== manualClient.id),
    ];
    const nextClientMeta = {
      ...clientMeta,
      [manualClient.id]: {
        birthDate: nextBirthDate,
        internalNotes: nextInternalNotes,
      },
    };

    setManualClients(nextManualClients);
    setClientMeta(nextClientMeta);
    writeManualClientsToStorage(nextManualClients);
    writeClientMetaToStorage(nextClientMeta);
    setSelectedClientId(manualClient.id);
    setNewClientModalOpen(false);
  }

  function saveClientDelivery(client: V2RealClient, formData: FormData) {
    const deliveryType = String(formData.get("deliveryType") ?? "delivery") as "delivery" | "pickup";
    const nextDelivery: V2StoredDelivery = {
      id: `env-${Date.now()}`,
      date: getTodayDateKey(),
      time: String(formData.get("time") ?? "").trim() || "20:00",
      client: String(formData.get("client") ?? client.name).trim() || client.name,
      phone: String(formData.get("phone") ?? client.phone).trim(),
      address:
        deliveryType === "pickup"
          ? "Retira en local"
          : String(formData.get("address") ?? "").trim(),
      deliveryType,
      order: String(formData.get("order") ?? "").trim() || "Pedido sin detalle",
      total: Number(formData.get("total") ?? 0) || 0,
      payment: String(formData.get("payment") ?? "Efectivo").trim() || "Efectivo",
      note: String(formData.get("note") ?? "").trim() || "—",
      status: "confirmed",
    };

    const currentDeliveries = readFromStorage<V2StoredDelivery[]>(
      DELIVERIES_STORAGE_KEY,
      []
    );
    const nextDeliveries = [nextDelivery, ...currentDeliveries];

    setDeliveries(nextDeliveries);
    writeToStorage(DELIVERIES_STORAGE_KEY, nextDeliveries);
    window.dispatchEvent(new Event(DELIVERIES_EVENT));
    setNewDeliveryClientId(null);
  }

  function saveClientReservation(client: V2RealClient, formData: FormData) {
    const nextReservation: V2StoredReservation = {
      id: `res-${Date.now()}`,
      client: String(formData.get("client") ?? client.name).trim() || client.name,
      email: String(formData.get("email") ?? client.email).trim(),
      phone: String(formData.get("phone") ?? client.phone).trim(),
      date: String(formData.get("date") ?? "").trim(),
      time: String(formData.get("time") ?? "").trim(),
      people: Number(formData.get("people") ?? 2) || 2,
      note: String(formData.get("note") ?? "").trim(),
      status: "pending",
      origin: "manual",
    };

    if (!nextReservation.date || !nextReservation.time) return;

    const nextReservations = [nextReservation, ...reservations];

    setReservations(nextReservations);
    writeToStorage(RESERVATIONS_STORAGE_KEY, nextReservations);
    setSelectedClientId(client.id);
    setNewReservationClientId(null);
  }

  function toggleSort(nextSort: V2ClientSort) {
    if (clientSort === nextSort) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setClientSort(nextSort);
    setSortDirection("asc");
  }

  function renderSortHeader(label: string, sort: V2ClientSort) {
    const isActive = clientSort === sort;

    return (
      <button
        type="button"
        onClick={() => toggleSort(sort)}
        className={`inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide transition ${
          isActive ? "text-slate-950" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <span>{label}</span>
        <span className="text-[10px] text-slate-400">
          {isActive ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    );
  }

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Clientes"
          description="CRM generado automáticamente desde reservas, consumo y comportamiento."
          actions={
            <V2Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => setNewClientModalOpen(true)}
            >
              Nuevo cliente
            </V2Button>
          }
        />
        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-4 xl:grid-cols-[1fr_340px]">
          <div className="flex min-h-0 flex-col gap-4">
            <div className="grid shrink-0 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <V2MetricCard
                label="Total"
                value={clients.length}
                helper="Clientes reales"
                tone="blue"
                icon={<UsersRound size={22} />}
              />

              <V2MetricCard
                label="Frecuentes"
                value={frequentClients.length}
                helper="5+ reservas"
                tone="orange"
                icon={<Star size={22} />}
              />

              <V2MetricCard
                label="Nuevos"
                value={newClients.length}
                helper="Primera visita"
                tone="green"
                icon={<UserRoundCheck size={22} />}
              />

              <V2MetricCard
                label="Con notas"
                value={clientsWithNotes.length}
                helper="Observaciones"
                tone="purple"
                icon={<Mail size={22} />}
              />

              <V2MetricCard
                label="No-show"
                value={noShowClients.length}
                helper="Con riesgo"
                tone="red"
                icon={<XCircle size={22} />}
              />
            </div>

            <div className="-mt-2 shrink-0">
              <V2FilterBar>
                <div className="relative min-w-[320px] flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-2.5 text-slate-400"
                    size={18}
                  />
                  <V2Input
                    className="pl-10"
                    placeholder="Buscar por nombre, teléfono o email"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>

                <div className="min-w-[170px]">
                  <V2Select
                    value={clientFilter}
                    onChange={(event) =>
                      setClientFilter(event.target.value as V2ClientFilter)
                    }
                  >
                    <option value="all">Todos los clientes</option>
                    <option value="frequent">Frecuentes</option>
                    <option value="new">Nuevos</option>
                    <option value="notes">Con notas</option>
                    <option value="no_show">No-show</option>
                  </V2Select>
                </div>

                <div className="min-w-[170px]">
                  <V2Select
                    value={clientSort}
                    onChange={(event) => {
                      setClientSort(event.target.value as V2ClientSort);
                      setSortDirection("asc");
                    }}
                  >
                    <option value="name">Nombre</option>
                    <option value="phone">Teléfono</option>
                    <option value="lastVisit">Última visita</option>
                    <option value="reservations">Reservas</option>
                    <option value="spent">Total gastado</option>
                    <option value="ticket">Ticket promedio</option>
                    <option value="status">Estado</option>
                  </V2Select>
                </div>
              </V2FilterBar>
            </div>

            <div className="-mt-6 min-h-0 flex-1">
              <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="h-full overflow-auto">
                  <table className="w-full min-w-[1060px] border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-slate-200">
                        <th className="px-5 py-4 text-left">
                          {renderSortHeader("Cliente", "name")}
                        </th>
                        <th className="px-5 py-4 text-left">
                          {renderSortHeader("Teléfono", "phone")}
                        </th>
                        <th className="px-5 py-4 text-left">
                          {renderSortHeader("Última visita", "lastVisit")}
                        </th>
                        <th className="px-5 py-4 text-left">
                          {renderSortHeader("Reservas", "reservations")}
                        </th>
                        <th className="px-5 py-4 text-left">
                          {renderSortHeader("Total gastado", "spent")}
                        </th>
                        <th className="px-5 py-4 text-left">
                          {renderSortHeader("Ticket prom.", "ticket")}
                        </th>
                        <th className="px-5 py-4 text-left">
                          {renderSortHeader("Estado", "status")}
                        </th>
                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Acciones
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredClients.length > 0 ? (
                        filteredClients.map((row, index) => (
                          <tr
                            key={row.id}
                            className={`border-b border-slate-100 transition ${
                              resolvedSelectedClientId === row.id
                                ? "bg-emerald-50/60 hover:bg-emerald-50"
                                : index % 2 === 0
                                  ? "bg-white hover:bg-slate-50"
                                  : "bg-slate-100/70 hover:bg-slate-100/70"
                            }`}
                          >
                            <td className="px-5 py-3 align-middle">
                              <button
                                type="button"
                                onClick={() => selectClient(row)}
                                className="flex items-center gap-3 text-left"
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                                  {row.initials}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-950">
                                    {row.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {row.email}
                                  </p>
                                </div>
                              </button>
                            </td>

                            <td className="px-5 py-3 align-middle text-slate-700">
                              {renderSelectableCell(row, row.phone)}
                            </td>
                            <td className="px-5 py-3 align-middle text-slate-700">
                              {renderSelectableCell(row, row.lastVisit)}
                            </td>
                            <td className="px-5 py-3 align-middle text-slate-700">
                              {renderSelectableCell(row, row.reservations)}
                            </td>
                            <td className="px-5 py-3 align-middle font-semibold text-slate-950">
                              {renderSelectableCell(row, formatMoney(row.totalSpent))}
                            </td>
                            <td className="px-5 py-3 align-middle text-slate-700">
                              {renderSelectableCell(row, formatMoney(row.averageTicket))}
                            </td>
                            <td className="px-5 py-3 align-middle">
                              {renderSelectableCell(
                                row,
                                <V2ClientStatusBadge status={row.status} />
                              )}
                            </td>
                            <td className="px-5 py-3 align-middle">
                              <div className="flex justify-end gap-2">
                                <V2Button
                                  size="sm"
                                  variant="secondary"
                                  className="min-w-[92px] whitespace-nowrap"
                                  onClick={() => openProfile(row)}
                                >
                                  Ver perfil
                                </V2Button>
                                <V2Button
                                  size="sm"
                                  variant="success"
                                  className="min-w-[116px] whitespace-nowrap"
                                  onClick={() => {
                                    setSelectedClientId(row.id);
                                    setNewReservationClientId(row.id);
                                  }}
                                >
                                  Nueva reserva
                                </V2Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-5 py-10 text-center text-sm text-slate-500"
                          >
                            No hay clientes que coincidan con los filtros actuales.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <aside className="flex h-full min-h-0 flex-col overflow-hidden">
            <V2Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">
                  Cliente seleccionado
                </h2>

                {selectedClient ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openProfile(selectedClient)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                      aria-label="Ver perfil"
                      title="Ver perfil"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => editClient(selectedClient)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                      aria-label="Editar cliente"
                      title="Editar cliente"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteClient(selectedClient)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                      aria-label="Eliminar cliente"
                      title="Eliminar cliente"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : null}
              </div>

              {selectedClient ? (
                <>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-bold text-slate-950 shadow-sm">
                      {selectedClient.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">
                          {selectedClient.name}
                        </p>
                        <V2ClientStatusBadge status={selectedClient.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedClient.phone}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="space-y-4 border-t border-slate-100 pt-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Email
                        </p>
                        <p className="mt-1 text-slate-950">
                          {selectedClient.email}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Próxima reserva
                        </p>
                        <p className="mt-1 text-slate-950">
                          {selectedClient.nextVisit}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Fecha de nacimiento
                        </p>
                        <p className="mt-1 text-slate-950">
                          {formatBirthDateLabel(selectedClient.birthDate)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Total gastado
                          </p>
                          <p className="mt-1 font-semibold text-slate-950">
                            {formatMoney(selectedClient.totalSpent)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Ticket prom.
                          </p>
                          <p className="mt-1 font-semibold text-slate-950">
                            {formatMoney(selectedClient.averageTicket)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Mesa habitual
                        </p>
                        <p className="mt-1 text-slate-950">
                          {selectedClient.habitualTable}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Origen principal
                        </p>
                        <p className="mt-1 text-slate-950">
                          {selectedClient.mainOrigin}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Platos más pedidos
                        </p>
                        <p className="mt-1 leading-6 text-slate-700">
                          {selectedClient.favoriteItems}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Notas internas
                        </p>
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 leading-6 text-slate-600">
                          {selectedClient.internalNotes ||
                            "Este cliente todavía no tiene notas internas."}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                    <V2Button
                      variant="secondary"
                      icon={<PackageCheck size={16} />}
                      className="whitespace-nowrap"
                      onClick={() => setNewDeliveryClientId(selectedClient.id)}
                    >
                      Nuevo envío
                    </V2Button>
                    <V2Button
                      variant="primary"
                      icon={<Plus size={16} />}
                      className="whitespace-nowrap"
                      onClick={() => setNewReservationClientId(selectedClient.id)}
                    >
                      Nueva reserva
                    </V2Button>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  No hay clientes generados todavía. Creá reservas o envíos para alimentar el CRM.
                </div>
              )}
            </V2Card>
          </aside>
        </div>
      </div>

      {newClientModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={closeAllClientModals}
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              saveNewClient(new FormData(event.currentTarget));
            }}
            className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">Nuevo cliente</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Crear cliente manual
                </h2>
              </div>

              <button
                type="button"
                onClick={closeAllClientModals}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Nombre
                <V2Input name="name" required placeholder="Nombre y apellido" />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Teléfono
                <V2Input name="phone" placeholder="Teléfono del cliente" />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Email
                <V2Input name="email" type="email" placeholder="email@cliente.com" />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Fecha de nacimiento
                <V2Input name="birthDate" type="date" />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Notas internas
                <V2Textarea
                  name="internalNotes"
                  rows={4}
                  placeholder="Preferencias, alergias, cumpleaños, observaciones internas..."
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button type="button" variant="secondary" onClick={closeAllClientModals}>
                Cancelar
              </V2Button>
              <V2Button type="submit" variant="primary">
                Crear cliente
              </V2Button>
            </div>
          </form>
        </div>
      ) : null}

      {clientPendingDelivery ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={closeAllClientModals}
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              saveClientDelivery(
                clientPendingDelivery,
                new FormData(event.currentTarget)
              );
            }}
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">Nuevo envío</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {clientPendingDelivery.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setNewDeliveryClientId(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Cliente
                <V2Input name="client" defaultValue={clientPendingDelivery.name} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Teléfono
                <V2Input name="phone" defaultValue={clientPendingDelivery.phone} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Hora
                <V2Input name="time" type="time" defaultValue="20:00" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Tipo
                <V2Select name="deliveryType" defaultValue="delivery">
                  <option value="delivery">Delivery</option>
                  <option value="pickup">Retira en local</option>
                </V2Select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Dirección
                <V2Input name="address" placeholder="Dirección de entrega" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Pedido
                <V2Textarea name="order" rows={4} placeholder="Detalle del pedido" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Total
                <V2Input name="total" type="number" min="0" defaultValue="0" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Pago
                <V2Select name="payment" defaultValue="Efectivo">
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </V2Select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Nota
                <V2Textarea name="note" rows={3} placeholder="Indicaciones internas" />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button
                type="button"
                variant="secondary"
                onClick={() => setNewDeliveryClientId(null)}
              >
                Cancelar
              </V2Button>
              <V2Button type="submit" variant="primary">
                Crear envío
              </V2Button>
            </div>
          </form>
        </div>
      ) : null}

      {clientPendingReservation ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={closeAllClientModals}
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              saveClientReservation(
                clientPendingReservation,
                new FormData(event.currentTarget)
              );
            }}
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">Nueva reserva</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {clientPendingReservation.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setNewReservationClientId(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Cliente
                <V2Input name="client" defaultValue={clientPendingReservation.name} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Teléfono
                <V2Input name="phone" defaultValue={clientPendingReservation.phone} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Email
                <V2Input name="email" type="email" defaultValue={clientPendingReservation.email} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Personas
                <V2Input name="people" type="number" min="1" defaultValue="2" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Día
                <V2Input name="date" type="date" required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Hora
                <V2Input name="time" type="time" required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Nota
                <V2Textarea
                  name="note"
                  rows={3}
                  defaultValue={clientPendingReservation.internalNotes}
                  placeholder="Preferencias, alergias o nota interna"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button
                type="button"
                variant="secondary"
                onClick={() => setNewReservationClientId(null)}
              >
                Cancelar
              </V2Button>
              <V2Button type="submit" variant="primary">
                Crear reserva
              </V2Button>
            </div>
          </form>
        </div>
      ) : null}

      {clientPendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={closeAllClientModals}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">Eliminar cliente</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {clientPendingDelete.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteClientId(null);
                  setDeleteConfirmationText("");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                Esta acción eliminará el cliente del prototipo y quitará sus reservas locales asociadas.
                Para confirmar, escribí exactamente el nombre del cliente.
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Texto requerido
                </p>
                <p className="mt-1 font-semibold text-slate-950">
                  {clientPendingDelete.name}
                </p>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Escribí el nombre para eliminar
                <V2Input
                  value={deleteConfirmationText}
                  onChange={(event) => setDeleteConfirmationText(event.target.value)}
                  placeholder={clientPendingDelete.name}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDeleteClientId(null);
                  setDeleteConfirmationText("");
                }}
              >
                Cancelar
              </V2Button>
              <V2Button
                type="button"
                variant="dangerSolid"
                disabled={deleteConfirmationText.trim() !== clientPendingDelete.name}
                onClick={() => confirmDeleteClient(clientPendingDelete)}
              >
                Eliminar cliente
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}

      {editingClientId ? (
        (() => {
          const editingClient = clients.find((client) => client.id === editingClientId);

          if (!editingClient) return null;

          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
              onClick={closeAllClientModals}
            >
              <form
                onClick={(event) => event.stopPropagation()}
                onSubmit={(event) => {
                  event.preventDefault();
                  saveClientEdition(editingClient, new FormData(event.currentTarget));
                }}
                className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
                  <div>
                    <p className="text-sm text-slate-500">Editar cliente</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950">
                      {editingClient.name}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingClientId(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                    aria-label="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid gap-4 p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                      Nombre
                      <V2Input name="name" defaultValue={editingClient.name} />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Teléfono
                      <V2Input name="phone" defaultValue={editingClient.phone} />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Email
                      <V2Input name="email" type="email" defaultValue={editingClient.email} />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Fecha de nacimiento
                      <V2Input
                        name="birthDate"
                        type="date"
                        defaultValue={editingClient.birthDate}
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                      Notas internas
                      <V2Textarea
                        name="internalNotes"
                        rows={4}
                        defaultValue={editingClient.internalNotes}
                        placeholder="Ej.: cumpleaños, alergias, preferencias, observaciones internas..."
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                    Podés editar todos los datos del cliente que no dependen de reservas ni consumos.
                    Si cargás fecha de nacimiento, el sistema avisa automáticamente 7 días antes.
                    Los campos de nombre, teléfono y email también actualizan sus reservas locales del prototipo.
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
                  <V2Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingClientId(null)}
                  >
                    Cancelar
                  </V2Button>
                  <V2Button type="submit" variant="primary">
                    Guardar cambios
                  </V2Button>
                </div>
              </form>
            </div>
          );
        })()
      ) : null}

      {profileClient ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={closeAllClientModals}
        >
          <div
            className="flex h-[760px] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-700">
                  {profileClient.initials}
                </div>

                <div className="min-w-0">
                  <p className="text-sm text-slate-500">Perfil del cliente</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl font-semibold text-slate-950">
                      {profileClient.name}
                    </h2>
                    <V2ClientStatusBadge status={profileClient.status} />
                  </div>
                  <div className="mt-1 space-y-0.5 text-sm text-slate-500">
                    <p>{profileClient.phone}</p>
                    <p className="break-all">{profileClient.email}</p>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-start gap-3">
                <div className="hidden grid-cols-4 gap-2 md:grid">
                  <div className="rounded-xl border border-amber-200 bg-amber-100/70 px-3 py-2 text-center">
                    <p className="text-sm font-bold text-slate-950">
                      {profileClient.pendingReservations}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase text-amber-700">
                      Pend.
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-100/70 px-3 py-2 text-center">
                    <p className="text-sm font-bold text-slate-950">
                      {profileClient.completedReservations}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                      Comp.
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-100/70 px-3 py-2 text-center">
                    <p className="text-sm font-bold text-slate-950">
                      {profileClient.cancelledReservations}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase text-red-700">
                      Canc.
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-100/70 px-3 py-2 text-center">
                    <p className="text-sm font-bold text-slate-950">
                      {profileClient.noShows}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase text-red-700">
                      No-show
                    </p>
                  </div>
                </div>

                <div className="hidden min-w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:block">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Próxima reserva
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-950">
                    {profileClient.nextVisit}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setProfileClientId(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-slate-50 p-5">
              <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_300px]">
                <div className="flex min-h-0 flex-col gap-4">
                  <div className="grid min-h-0 flex-1 gap-4 md:grid-rows-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
                    <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex shrink-0 items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Platos más pedidos
                        </p>
                        <span className="text-xs text-slate-400">Consumo</span>
                      </div>
                      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                        <p className="text-sm leading-6 text-slate-700">
                          {profileClient.favoriteItems}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex shrink-0 items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Historial comercial
                        </p>
                        <span className="text-xs font-medium text-slate-400">
                          {profileClient.reservationsHistory.length} movimientos
                        </span>
                      </div>

                      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-sm">
                        {profileClient.reservationsHistory.map((reservation) => (
                          <div
                            key={reservation.id}
                            className="grid grid-cols-[78px_1fr_92px] items-start gap-3 border-b border-slate-100 bg-white py-3 last:border-b-0"
                          >
                            <div>
                              <p className="font-semibold text-slate-950">
                                {reservation.time}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDateLabel(reservation.date)}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p className="font-medium text-slate-950">
                                {reservation.tableName || "Sin mesa"}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                {reservation.orderItems ||
                                  reservation.note ||
                                  "Sin consumo registrado"}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="font-semibold text-slate-950">
                                {formatMoney(reservation.orderTotal ?? 0)}
                              </p>
                              <span
                                className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getReservationStatusMeta(reservation.status).className}`}
                              >
                                {getReservationStatusMeta(reservation.status).label}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="flex min-h-0 flex-col gap-4">
                  <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Resumen comercial
                    </p>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <span className="text-sm text-slate-500">Reservas</span>
                        <span className="font-semibold text-slate-950">
                          {profileClient.reservations}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <span className="text-sm text-slate-500">Total gastado</span>
                        <span className="font-semibold text-slate-950">
                          {formatMoney(profileClient.totalSpent)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-500">Ticket promedio</span>
                        <span className="font-semibold text-slate-950">
                          {formatMoney(profileClient.averageTicket)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Mesa habitual
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-950">
                      {profileClient.habitualTable}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Preferencia: {profileClient.preference}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Fecha de nacimiento
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-950">
                      {formatBirthDateLabel(profileClient.birthDate)}
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Notas internas
                    </p>
                    <div className="mt-3 h-[calc(100%-28px)] overflow-y-auto border-t border-slate-100 pt-3 text-sm leading-6 text-slate-600">
                      {profileClient.internalNotes ||
                        "Este cliente todavía no tiene notas internas."}
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white p-5">
              <V2Button
                variant="secondary"
                onClick={() => setProfileClientId(null)}
              >
                Cerrar
              </V2Button>
              <V2Button
                variant="secondary"
                icon={<PackageCheck size={16} />}
                className="min-w-[120px] whitespace-nowrap"
                onClick={() => {
                  setProfileClientId(null);
                  setNewDeliveryClientId(profileClient.id);
                }}
              >
                Nuevo envío
              </V2Button>
              <V2Button
                variant="primary"
                icon={<Plus size={16} />}
                className="min-w-[132px] whitespace-nowrap"
                onClick={() => {
                  setProfileClientId(null);
                  setNewReservationClientId(profileClient.id);
                }}
              >
                Nueva reserva
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}
    </V2AppShell>
  );
}
