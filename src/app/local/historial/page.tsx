"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  History,
  PackageCheck,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Badge } from "@/components/v2/v2-badge";
import { V2Card, V2MetricCard } from "@/components/v2/v2-card";
import { V2Input, V2Select } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import {
  v2Deliveries,
  v2Reservations,
  type V2DeliveryStatus,
  type V2DeliveryType,
  type V2ReservationStatus,
} from "@/lib/v2/v2-mock-data";

const DELIVERIES_STORAGE_KEY = "tango-v2-deliveries-v1";
const RESERVATIONS_STORAGE_KEY = "tango-v2-reservations-calendar-v2";
const DELIVERIES_EVENT = "tango-v2-deliveries-updated";
const RESERVATIONS_EVENT = "tango-v2-reservations-updated";

type HistoryTab = "envios" | "reservas";

type V2DeliveryOrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type V2Delivery = {
  id: string;
  date?: string;
  time: string;
  client: string;
  phone: string;
  address: string;
  deliveryType: V2DeliveryType;
  order: string;
  orderItems?: V2DeliveryOrderItem[];
  total: number;
  payment: string;
  note: string;
  status: V2DeliveryStatus;
  source?: "web" | "manual";
  needsAcceptance?: boolean;
  trackingId?: string;
  createdAt?: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  onTheWayAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
};

type V2Reservation = {
  id: string;
  date: string;
  time: string;
  client: string;
  people: number;
  phone: string;
  note: string;
  status: V2ReservationStatus;
  email?: string;
  tableName?: string;
  origin?: "web" | "whatsapp" | "phone" | "instagram" | "manual";
  orderItems?: string;
  orderTotal?: number;
  reservationCode?: string;
  createdAt?: string;
  confirmedAt?: string;
  seatedAt?: string;
  consumptionStartedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  noShowAt?: string;
};

type TimelineItem = {
  label: string;
  time: string;
  status: "done" | "pending" | "cancelled";
  detail?: string;
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

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateTime(date?: string, time?: string) {
  return new Date(`${date || getTodayDateKey()}T${time || "00:00"}:00`);
}

function formatDateTime(date?: string, time?: string) {
  const parsedDate = parseDateTime(date, time);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function formatTimestamp(value?: string) {
  if (!value) return "—";

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function timestampFromDateTime(date?: string, time?: string) {
  const parsedDate = parseDateTime(date, time);

  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString();
}

function formatMoney(value: number) {
  return `$${Math.max(Number(value) || 0, 0).toLocaleString("es-AR")}`;
}

function stableCode(prefix: string, id: string) {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return `${prefix}-${hash.toString(36).toUpperCase().slice(0, 5).padStart(5, "0")}`;
}

function getDeliveryTrackingId(delivery: V2Delivery) {
  return delivery.trackingId || stableCode("PED", delivery.id);
}

function getReservationCode(reservation: V2Reservation) {
  return reservation.reservationCode || stableCode("RES", reservation.id);
}

function summarizeDeliveryItems(delivery: V2Delivery) {
  if (delivery.orderItems?.length) {
    return delivery.orderItems
      .map((item) => `${item.quantity}x ${item.name}`)
      .join(", ");
  }

  return delivery.order || "Pedido sin detalle";
}

function getOrderGroups(orderItems?: string) {
  const groups = new Map<string, number>();

  (orderItems ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => groups.set(item, (groups.get(item) ?? 0) + 1));

  return Array.from(groups.entries());
}

function summarizeReservationConsumption(reservation: V2Reservation) {
  const groups = getOrderGroups(reservation.orderItems);

  if (groups.length === 0) return "Sin consumo cargado";

  return groups.map(([item, quantity]) => `${quantity}x ${item}`).join(", ");
}

function deliveryTimeline(delivery: V2Delivery): TimelineItem[] {
  const createdAt =
    delivery.createdAt ?? timestampFromDateTime(delivery.date, delivery.time);
  const isCancelled = delivery.status === "cancelled";
  const isAccepted = !delivery.needsAcceptance && !isCancelled;
  const isDelivered = delivery.status === "completed";
  const acceptedAt = delivery.acceptedAt ?? (isAccepted ? createdAt : undefined);
  const preparingAt = delivery.preparingAt ?? acceptedAt;
  const onTheWayAt = delivery.onTheWayAt ?? delivery.readyAt;
  const deliveredAt = delivery.deliveredAt ?? (isDelivered ? onTheWayAt : undefined);

  if (isCancelled) {
    return [
      {
        label: "Entró pedido",
        time: formatTimestamp(createdAt),
        status: "done",
        detail: delivery.source === "web" ? "Pedido recibido desde la web." : "Pedido cargado manualmente.",
      },
      {
        label: "Cancelado",
        time: formatTimestamp(delivery.cancelledAt),
        status: "cancelled",
        detail: "El pedido fue cancelado.",
      },
    ];
  }

  return [
    {
      label: "Entró pedido",
      time: formatTimestamp(createdAt),
      status: "done",
      detail: delivery.source === "web" ? "Pedido recibido desde la web." : "Pedido cargado manualmente.",
    },
    {
      label: "Confirmado",
      time: formatTimestamp(acceptedAt),
      status: isAccepted ? "done" : "pending",
      detail: isAccepted ? "El local aceptó el pedido." : "Pendiente de aceptación.",
    },
    {
      label: "En preparación",
      time: formatTimestamp(preparingAt),
      status: isAccepted ? "done" : "pending",
      detail: isAccepted ? "El pedido pasó a preparación tras aceptarse." : "Aún no comenzó la preparación.",
    },
    {
      label: delivery.deliveryType === "delivery" ? "En viaje al cliente" : "Listo para retirar",
      time: formatTimestamp(onTheWayAt),
      status: onTheWayAt || isDelivered ? "done" : "pending",
      detail:
        delivery.deliveryType === "delivery"
          ? "Se marca cuando el pedido sale del local."
          : "Se marca cuando el pedido queda listo para retiro.",
    },
    {
      label: "Entregado",
      time: formatTimestamp(deliveredAt),
      status: isDelivered ? "done" : "pending",
      detail: isDelivered ? "Pedido cerrado como entregado." : "Todavía no fue marcado como entregado.",
    },
  ];
}

function reservationTimeline(reservation: V2Reservation): TimelineItem[] {
  const createdAt =
    reservation.createdAt ?? timestampFromDateTime(reservation.date, reservation.time);
  const hasConsumption = Boolean(reservation.orderItems?.trim());
  const isConfirmed =
    reservation.status === "confirmed" ||
    reservation.status === "completed" ||
    reservation.status === "cancelled" ||
    reservation.status === "no_show";
  const isCancelled = reservation.status === "cancelled";
  const isNoShow = reservation.status === "no_show";
  const isCompleted = reservation.status === "completed";
  const confirmedAt = reservation.confirmedAt ?? (isConfirmed ? createdAt : undefined);
  const consumptionStartedAt =
    reservation.consumptionStartedAt ?? (hasConsumption ? confirmedAt : undefined);

  return [
    {
      label: "Entró reserva",
      time: formatTimestamp(createdAt),
      status: "done",
      detail: reservation.origin ? `Origen: ${reservation.origin}.` : "Reserva registrada.",
    },
    {
      label: "Confirmada",
      time: formatTimestamp(confirmedAt),
      status: isConfirmed ? "done" : "pending",
      detail: isConfirmed ? "Reserva confirmada por el local." : "Pendiente de confirmación.",
    },
    {
      label: "Cliente asistió",
      time: formatTimestamp(reservation.seatedAt),
      status: isNoShow ? "cancelled" : reservation.seatedAt || hasConsumption || isCompleted ? "done" : "pending",
      detail: isNoShow ? "Marcada como no-show." : "Paso operativo de llegada/ocupación.",
    },
    {
      label: "Consumo cargado",
      time: formatTimestamp(consumptionStartedAt),
      status: hasConsumption ? "done" : "pending",
      detail: hasConsumption ? summarizeReservationConsumption(reservation) : "Sin consumo cargado.",
    },
    {
      label: isCancelled ? "Cancelada" : isNoShow ? "No-show" : "Completada",
      time: formatTimestamp(
        isCompleted
          ? reservation.completedAt
          : isCancelled
            ? reservation.cancelledAt
            : isNoShow
              ? reservation.noShowAt
              : undefined
      ),
      status: isCancelled || isNoShow ? "cancelled" : isCompleted ? "done" : "pending",
      detail:
        isCompleted
          ? "Reserva cerrada como completada."
          : isCancelled
            ? "Reserva cancelada."
            : isNoShow
              ? "El cliente no asistió."
              : "Todavía no fue cerrada.",
    },
  ];
}

function getTimelineDotClass(status: TimelineItem["status"]) {
  if (status === "done") return "bg-emerald-600 ring-4 ring-emerald-100";
  if (status === "cancelled") return "bg-red-600 ring-4 ring-red-100";

  return "bg-slate-300 ring-4 ring-slate-100";
}

function getStatusBadgeTone(status: string): "green" | "orange" | "red" | "blue" | "slate" {
  if (status === "completed") return "green";
  if (status === "cancelled" || status === "no_show") return "red";
  if (status === "pending") return "orange";

  return "blue";
}

export default function HistorialPage() {
  const [activeTab, setActiveTab] = useState<HistoryTab>("envios");
  const [deliveries, setDeliveries] = useState<V2Delivery[]>([]);
  const [reservations, setReservations] = useState<V2Reservation[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    function syncHistory() {
      setDeliveries(readFromStorage<V2Delivery[]>(DELIVERIES_STORAGE_KEY, v2Deliveries as V2Delivery[]));
      setReservations(readFromStorage<V2Reservation[]>(RESERVATIONS_STORAGE_KEY, v2Reservations as V2Reservation[]));
    }

    syncHistory();

    window.addEventListener("focus", syncHistory);
    window.addEventListener("storage", syncHistory);
    window.addEventListener(DELIVERIES_EVENT, syncHistory);
    window.addEventListener(RESERVATIONS_EVENT, syncHistory);

    return () => {
      window.removeEventListener("focus", syncHistory);
      window.removeEventListener("storage", syncHistory);
      window.removeEventListener(DELIVERIES_EVENT, syncHistory);
      window.removeEventListener(RESERVATIONS_EVENT, syncHistory);
    };
  }, []);

  useEffect(() => {
    setOpenId(null);
    setStatusFilter("all");
  }, [activeTab]);

  const filteredDeliveries = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return deliveries
      .filter((delivery) => {
        const publicId = getDeliveryTrackingId(delivery);
        const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;
        const matchesSearch =
          !normalizedQuery ||
          [publicId, delivery.client, delivery.phone, delivery.address, delivery.order, summarizeDeliveryItems(delivery)]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

        return matchesStatus && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? timestampFromDateTime(b.date, b.time) ?? "").getTime() -
          new Date(a.createdAt ?? timestampFromDateTime(a.date, a.time) ?? "").getTime()
      );
  }, [deliveries, query, statusFilter]);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return reservations
      .filter((reservation) => {
        const publicId = getReservationCode(reservation);
        const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;
        const matchesSearch =
          !normalizedQuery ||
          [
            publicId,
            reservation.client,
            reservation.phone,
            reservation.email,
            reservation.tableName,
            reservation.note,
            summarizeReservationConsumption(reservation),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

        return matchesStatus && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? timestampFromDateTime(b.date, b.time) ?? "").getTime() -
          new Date(a.createdAt ?? timestampFromDateTime(a.date, a.time) ?? "").getTime()
      );
  }, [query, reservations, statusFilter]);

  const activeCount = activeTab === "envios" ? filteredDeliveries.length : filteredReservations.length;

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Historial"
          description="Seguimiento operativo de envíos y reservas, con timeline por operación."
          actions={
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setActiveTab("envios")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "envios"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                Envíos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("reservas")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "reservas"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                Reservas
              </button>
            </div>
          }
        />

        <div className="mt-4 grid shrink-0 gap-4 md:grid-cols-3">
          <V2MetricCard
            label={activeTab === "envios" ? "Envíos" : "Reservas"}
            value={activeCount}
            helper="Según filtros"
            tone="blue"
            icon={activeTab === "envios" ? <PackageCheck size={22} /> : <CalendarDays size={22} />}
          />
          <V2MetricCard
            label="Activos"
            value={
              activeTab === "envios"
                ? filteredDeliveries.filter((item) => item.status === "confirmed").length
                : filteredReservations.filter((item) => item.status === "confirmed").length
            }
            helper="Confirmados"
            tone="green"
            icon={<CheckCircle2 size={22} />}
          />
          <V2MetricCard
            label="Cerrados"
            value={
              activeTab === "envios"
                ? filteredDeliveries.filter((item) => item.status === "completed" || item.status === "cancelled").length
                : filteredReservations.filter((item) => item.status === "completed" || item.status === "cancelled" || item.status === "no_show").length
            }
            helper="Completados/cancelados"
            tone="slate"
            icon={<History size={22} />}
          />
        </div>

        <V2Card className="mt-4 shrink-0 p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-[280px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
              <V2Input
                className="pl-10"
                placeholder={activeTab === "envios" ? "Buscar pedido, cliente, teléfono o dirección" : "Buscar reserva, cliente, mesa o teléfono"}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <V2Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Todos los estados</option>
              {activeTab === "envios" ? (
                <>
                  <option value="confirmed">Confirmados</option>
                  <option value="completed">Entregados</option>
                  <option value="cancelled">Cancelados</option>
                </>
              ) : (
                <>
                  <option value="pending">Pendientes</option>
                  <option value="confirmed">Confirmadas</option>
                  <option value="completed">Completadas</option>
                  <option value="cancelled">Canceladas</option>
                  <option value="no_show">No-show</option>
                </>
              )}
            </V2Select>
          </div>
        </V2Card>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {activeTab === "envios" ? (
            <div className="space-y-2">
              {filteredDeliveries.map((delivery) => {
                const publicId = getDeliveryTrackingId(delivery);
                const isOpen = openId === delivery.id;
                const timeline = deliveryTimeline(delivery);

                return (
                  <V2Card key={delivery.id} className="overflow-hidden p-0">
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : delivery.id)}
                      className="grid w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 lg:grid-cols-[140px_1.1fr_1.7fr_150px_140px_38px]"
                    >
                      <div className="pl-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Pedido
                        </p>
                        <p className="mt-1 font-semibold text-slate-950">{publicId}</p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Cliente
                        </p>
                        <p className="mt-1 truncate font-semibold text-slate-950">
                          {delivery.client}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Pedido
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {summarizeDeliveryItems(delivery)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Hora
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatDateTime(delivery.date, delivery.time)}
                        </p>
                      </div>

                      <div className="flex items-center">
                        <V2Badge tone={getStatusBadgeTone(delivery.status)}>
                          {delivery.status === "completed"
                            ? "Entregado"
                            : delivery.status === "cancelled"
                              ? "Cancelado"
                              : delivery.needsAcceptance
                                ? "Pendiente"
                                : "Confirmado"}
                        </V2Badge>
                      </div>

                      <div className="flex items-center justify-end">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-slate-100 bg-slate-50/60 px-7 py-5">
                        <div className="ml-4 grid gap-5 border-l border-slate-200 pl-6 xl:grid-cols-[1fr_320px]">
                          <div className="space-y-4">
                            {timeline.map((item, index) => (
                              <div key={`${delivery.id}-${item.label}`} className="grid grid-cols-[90px_24px_1fr] gap-3">
                                <div className="pt-0.5 text-right text-xs font-semibold text-slate-500">
                                  {item.time}
                                </div>
                                <div className="relative flex justify-center">
                                  <span className={`mt-1 h-3 w-3 rounded-full ${getTimelineDotClass(item.status)}`} />
                                  {index < timeline.length - 1 ? (
                                    <span className="absolute top-5 h-[calc(100%+0.75rem)] w-px bg-slate-200" />
                                  ) : null}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-950">{item.label}</p>
                                  <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                            <p className="font-semibold text-slate-950">Resumen</p>
                            <div className="mt-3 space-y-2 text-slate-600">
                              <p><strong>Total:</strong> {formatMoney(delivery.total)}</p>
                              <p><strong>Tipo:</strong> {delivery.deliveryType === "delivery" ? "Delivery" : "Retiro"}</p>
                              <p><strong>Dirección:</strong> {delivery.address}</p>
                              <p><strong>Teléfono:</strong> {delivery.phone}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </V2Card>
                );
              })}

              {filteredDeliveries.length === 0 ? (
                <V2Card>
                  <div className="flex h-[260px] items-center justify-center text-center">
                    <div>
                      <Truck className="mx-auto text-slate-300" size={42} />
                      <p className="mt-3 font-semibold text-slate-950">No hay envíos</p>
                      <p className="mt-1 text-sm text-slate-500">No hay pedidos que coincidan con los filtros.</p>
                    </div>
                  </div>
                </V2Card>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReservations.map((reservation) => {
                const publicId = getReservationCode(reservation);
                const isOpen = openId === reservation.id;
                const timeline = reservationTimeline(reservation);

                return (
                  <V2Card key={reservation.id} className="overflow-hidden p-0">
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : reservation.id)}
                      className="grid w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 lg:grid-cols-[140px_1.1fr_1.7fr_150px_140px_38px]"
                    >
                      <div className="pl-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Reserva
                        </p>
                        <p className="mt-1 font-semibold text-slate-950">{publicId}</p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Cliente
                        </p>
                        <p className="mt-1 truncate font-semibold text-slate-950">{reservation.client}</p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Detalle
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {reservation.people} personas · {reservation.tableName || "Sin mesa"} · {summarizeReservationConsumption(reservation)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Hora
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatDateTime(reservation.date, reservation.time)}
                        </p>
                      </div>

                      <div className="flex items-center">
                        <V2Badge tone={getStatusBadgeTone(reservation.status)}>
                          {reservation.status === "no_show" ? "No-show" : reservation.status}
                        </V2Badge>
                      </div>

                      <div className="flex items-center justify-end">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-slate-100 bg-slate-50/60 px-7 py-5">
                        <div className="ml-4 grid gap-5 border-l border-slate-200 pl-6 xl:grid-cols-[1fr_320px]">
                          <div className="space-y-4">
                            {timeline.map((item, index) => (
                              <div key={`${reservation.id}-${item.label}`} className="grid grid-cols-[90px_24px_1fr] gap-3">
                                <div className="pt-0.5 text-right text-xs font-semibold text-slate-500">
                                  {item.time}
                                </div>
                                <div className="relative flex justify-center">
                                  <span className={`mt-1 h-3 w-3 rounded-full ${getTimelineDotClass(item.status)}`} />
                                  {index < timeline.length - 1 ? (
                                    <span className="absolute top-5 h-[calc(100%+0.75rem)] w-px bg-slate-200" />
                                  ) : null}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-950">{item.label}</p>
                                  <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                            <p className="font-semibold text-slate-950">Resumen</p>
                            <div className="mt-3 space-y-2 text-slate-600">
                              <p><strong>Personas:</strong> {reservation.people}</p>
                              <p><strong>Mesa:</strong> {reservation.tableName || "Sin mesa"}</p>
                              <p><strong>Teléfono:</strong> {reservation.phone}</p>
                              <p><strong>Consumo:</strong> {formatMoney(reservation.orderTotal ?? 0)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </V2Card>
                );
              })}

              {filteredReservations.length === 0 ? (
                <V2Card>
                  <div className="flex h-[260px] items-center justify-center text-center">
                    <div>
                      <Clock3 className="mx-auto text-slate-300" size={42} />
                      <p className="mt-3 font-semibold text-slate-950">No hay reservas</p>
                      <p className="mt-1 text-sm text-slate-500">No hay reservas que coincidan con los filtros.</p>
                    </div>
                  </div>
                </V2Card>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </V2AppShell>
  );
}
