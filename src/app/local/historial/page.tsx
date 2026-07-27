"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CreditCard,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock3,
  History,
  Info,
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
type HistoryRange = "all" | "today" | "7d" | "30d" | "day";

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
  paymentMethod?: string;
  paidAmount?: number;
  paymentBreakdown?: {
    cash: number;
    card: number;
    mercadoPago: number;
    transfer: number;
  };
  paymentClosedAt?: string;
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

function readFromStorage<T>(key: string, fallback: T): T {
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

function addDaysToDateKey(date: string, days: number) {
  const parsedDate = new Date(`${date}T00:00:00`);
  parsedDate.setDate(parsedDate.getDate() + days);

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatLongDate(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return "Fecha inválida";

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

function formatCalendarMonth(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return "Calendario";

  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

function getMonthStartDateKey(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);
  parsedDate.setDate(1);

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function getMonthCalendarDates(date: string) {
  const monthStart = new Date(`${getMonthStartDateKey(date)}T00:00:00`);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }).map((_, index) => {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);

    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  });
}

function isSameMonth(date: string, monthReference: string) {
  return date.slice(0, 7) === monthReference.slice(0, 7);
}

function parseDateTime(date?: string, time?: string) {
  const parsedDate = new Date(`${date || getTodayDateKey()}T${time || "00:00"}:00`);

  return Number.isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
}

function formatDateTime(date?: string, time?: string) {
  const parsedDate = parseDateTime(date, time);

  if (parsedDate.getTime() === 0) return "—";

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

  return parsedDate.getTime() === 0 ? undefined : parsedDate.toISOString();
}

function formatMoney(value: number) {
  return `$${Math.max(Number(value) || 0, 0).toLocaleString("es-AR")}`;
}

function formatReservationPayment(reservation: V2Reservation) {
  if (!reservation.paymentMethod) return "Sin pago registrado";

  const paidAmount = Number(reservation.paidAmount ?? reservation.orderTotal ?? 0);
  const paymentLabel = `${reservation.paymentMethod} · ${formatMoney(paidAmount)}`;

  if (reservation.paymentMethod !== "Mixto" || !reservation.paymentBreakdown) {
    return paymentLabel;
  }

  return `${paymentLabel} · Efectivo ${formatMoney(reservation.paymentBreakdown.cash)} · Tarjeta ${formatMoney(reservation.paymentBreakdown.card)} · Mercado Pago ${formatMoney(reservation.paymentBreakdown.mercadoPago)} · Transferencia ${formatMoney(reservation.paymentBreakdown.transfer)}`;
}

function isClosedPaidDelivery(delivery: V2Delivery) {
  return delivery.status === "completed" || delivery.status === "delivered";
}

function normalizeDeliveryPaymentMethod(value?: string) {
  const payment = String(value || "Sin método").trim().toLowerCase();

  if (payment.includes("efectivo") || payment === "cash") return "Efectivo";

  return "Tarjeta / no efectivo";
}

function getDeliveryCashTotal(deliveries: V2Delivery[]) {
  return deliveries.reduce((total, delivery) => {
    const method = normalizeDeliveryPaymentMethod(delivery.payment);
    const amount = Number(delivery.total) || 0;

    return method === "Efectivo" ? total + amount : total;
  }, 0);
}

function getDeliveryNonCashTotal(deliveries: V2Delivery[]) {
  return deliveries.reduce((total, delivery) => {
    const method = normalizeDeliveryPaymentMethod(delivery.payment);
    const amount = Number(delivery.total) || 0;

    return method !== "Efectivo" ? total + amount : total;
  }, 0);
}

function normalizeReservationPaymentMethod(value?: string) {
  const payment = String(value || "Sin método").trim().toLowerCase();

  if (payment.includes("efectivo") || payment === "cash") return "Efectivo";
  if (payment.includes("tarjeta") || payment === "card") return "Tarjeta";
  if (payment.includes("mercado") || payment.includes("mp")) return "Mercado Pago";
  if (payment.includes("transfer")) return "Transferencia";
  if (payment.includes("mixto") || payment === "mixed") return "Mixto";

  return value?.trim() || "Sin método";
}

function getReservationPaymentRows(reservation: V2Reservation) {
  const fallbackTotal = Number(reservation.paidAmount ?? reservation.orderTotal ?? 0) || 0;

  if (reservation.paymentBreakdown) {
    return [
      { method: "Efectivo", amount: Number(reservation.paymentBreakdown.cash) || 0 },
      { method: "Tarjeta", amount: Number(reservation.paymentBreakdown.card) || 0 },
      { method: "Mercado Pago", amount: Number(reservation.paymentBreakdown.mercadoPago) || 0 },
      { method: "Transferencia", amount: Number(reservation.paymentBreakdown.transfer) || 0 },
    ].filter((item) => item.amount > 0);
  }

  if (!reservation.paymentMethod && fallbackTotal <= 0) return [];

  return [
    {
      method: normalizeReservationPaymentMethod(reservation.paymentMethod),
      amount: fallbackTotal,
    },
  ];
}

function getReservationCashTotal(reservations: V2Reservation[]) {
  return reservations.reduce((total, reservation) => {
    return (
      total +
      getReservationPaymentRows(reservation).reduce((subtotal, item) => {
        return item.method === "Efectivo" ? subtotal + item.amount : subtotal;
      }, 0)
    );
  }, 0);
}

function getReservationNonCashTotal(reservations: V2Reservation[]) {
  return reservations.reduce((total, reservation) => {
    return (
      total +
      getReservationPaymentRows(reservation).reduce((subtotal, item) => {
        return item.method !== "Efectivo" ? subtotal + item.amount : subtotal;
      }, 0)
    );
  }, 0);
}

function hasRegisteredPayment(reservation: V2Reservation) {
  return Boolean(reservation.paymentMethod || reservation.paymentBreakdown || Number(reservation.paidAmount) > 0);
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

function isInsideRange(date: string | undefined, range: HistoryRange, selectedDate: string) {
  if (range === "all") return true;

  const itemDate = parseDateTime(date, "00:00");
  const today = parseDateTime(getTodayDateKey(), "00:00");

  if (range === "day") {
    return date === selectedDate;
  }

  if (range === "today") {
    return itemDate.toDateString() === today.toDateString();
  }

  const days = range === "7d" ? 7 : 30;
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - days + 1);

  return itemDate >= minDate && itemDate <= today;
}

function deliveryTimeline(delivery: V2Delivery): TimelineItem[] {
  const createdAt =
    delivery.createdAt ?? timestampFromDateTime(delivery.date, delivery.time);
  const isCancelled = delivery.status === "cancelled";
  const isDelivered = delivery.status === "completed";
  const isAccepted = !delivery.needsAcceptance && !isCancelled;
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
        detail: delivery.source === "web" ? "Pedido recibido desde la web pública." : "Pedido cargado manualmente.",
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
      detail: delivery.source === "web" ? "Pedido recibido desde la web pública." : "Pedido cargado manualmente.",
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
      detail: isAccepted ? "El pedido pasó a preparación." : "Aún no comenzó la preparación.",
    },
    {
      label: delivery.deliveryType === "delivery" ? "En viaje" : "Listo para retirar",
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

function getDeliveryStatusLabel(delivery: V2Delivery) {
  if (delivery.status === "completed") return "Entregado";
  if (delivery.status === "cancelled") return "Cancelado";
  if (delivery.needsAcceptance) return "Pendiente";
  return "Confirmado";
}

function getReservationStatusLabel(status: V2ReservationStatus) {
  if (status === "pending") return "Pendiente";
  if (status === "confirmed") return "Confirmada";
  if (status === "completed") return "Completada";
  if (status === "cancelled") return "Cancelada";
  if (status === "no_show") return "No-show";

  return status;
}

export default function HistorialPage() {
  const [activeTab, setActiveTab] = useState<HistoryTab>("envios");
  const [deliveries, setDeliveries] = useState<V2Delivery[]>([]);
  const [reservations, setReservations] = useState<V2Reservation[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState<HistoryRange>("30d");
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateKey());
  const [calendarMonth, setCalendarMonth] = useState(() => getTodayDateKey());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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
    setIsInfoOpen(false);
  }, [activeTab]);

  function openDatePicker() {
    setCalendarMonth(getMonthStartDateKey(selectedDate));
    setIsCalendarOpen((current) => !current);
  }

  function goToPreviousMonth() {
    setCalendarMonth((current) => {
      const parsedDate = new Date(`${current}T00:00:00`);
      parsedDate.setMonth(parsedDate.getMonth() - 1);

      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, "0");

      return `${year}-${month}-01`;
    });
  }

  function goToNextMonth() {
    setCalendarMonth((current) => {
      const parsedDate = new Date(`${current}T00:00:00`);
      parsedDate.setMonth(parsedDate.getMonth() + 1);

      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, "0");

      return `${year}-${month}-01`;
    });
  }

  function goToPreviousDay() {
    setSelectedDate((current) => {
      const nextDate = addDaysToDateKey(current, -1);
      setCalendarMonth(getMonthStartDateKey(nextDate));
      return nextDate;
    });
    setRangeFilter("day");
    setOpenId(null);
    setIsCalendarOpen(false);
  }

  function goToNextDay() {
    setSelectedDate((current) => {
      const nextDate = addDaysToDateKey(current, 1);
      setCalendarMonth(getMonthStartDateKey(nextDate));
      return nextDate;
    });
    setRangeFilter("day");
    setOpenId(null);
    setIsCalendarOpen(false);
  }

  function selectCalendarDate(value: string) {
    setSelectedDate(value);
    setCalendarMonth(getMonthStartDateKey(value));
    setRangeFilter("day");
    setOpenId(null);
    setIsCalendarOpen(false);
  }

  function showFullHistory() {
    setRangeFilter("30d");
    setOpenId(null);
  }

  const filteredDeliveries = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return deliveries
      .filter((delivery) => {
        const publicId = getDeliveryTrackingId(delivery);
        const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;
        const matchesRange = isInsideRange(delivery.date, rangeFilter, selectedDate);
        const matchesSearch =
          !normalizedQuery ||
          [publicId, delivery.client, delivery.phone, delivery.address, delivery.order, summarizeDeliveryItems(delivery)]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

        return matchesStatus && matchesSearch && matchesRange;
      })
      .sort(
        (a, b) =>
          parseDateTime(b.date, b.time).getTime() - parseDateTime(a.date, a.time).getTime()
      );
  }, [deliveries, query, rangeFilter, selectedDate, statusFilter]);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return reservations
      .filter((reservation) => {
        const publicId = getReservationCode(reservation);
        const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;
        const matchesRange = isInsideRange(reservation.date, rangeFilter, selectedDate);
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

        return matchesStatus && matchesSearch && matchesRange;
      })
      .sort(
        (a, b) =>
          parseDateTime(b.date, b.time).getTime() - parseDateTime(a.date, a.time).getTime()
      );
  }, [query, rangeFilter, reservations, selectedDate, statusFilter]);

  const activeCount = activeTab === "envios" ? filteredDeliveries.length : filteredReservations.length;
  const activeOperationalCount =
    activeTab === "envios"
      ? filteredDeliveries.filter((item) => item.status === "confirmed").length
      : filteredReservations.filter((item) => item.status === "confirmed").length;
  const closedCount =
    activeTab === "envios"
      ? filteredDeliveries.filter((item) => item.status === "completed" || item.status === "cancelled").length
      : filteredReservations.filter((item) => item.status === "completed" || item.status === "cancelled" || item.status === "no_show").length;
  const paidDeliveryPayments = filteredDeliveries.filter(
    (delivery) => isClosedPaidDelivery(delivery) && Number(delivery.total) > 0
  );
  const moneyTotal = paidDeliveryPayments.reduce(
    (total, delivery) => total + (Number(delivery.total) || 0),
    0
  );
  const peopleTotal = filteredReservations.reduce((total, reservation) => total + (Number(reservation.people) || 0), 0);
  const deliveryCashTotal = getDeliveryCashTotal(paidDeliveryPayments);
  const deliveryNonCashTotal = getDeliveryNonCashTotal(paidDeliveryPayments);
  const completedReservationPayments = filteredReservations.filter(
    (reservation) => reservation.status === "completed"
  );
  const paidCompletedReservations = completedReservationPayments.filter(hasRegisteredPayment);
  const unpaidCompletedReservations = completedReservationPayments.filter(
    (reservation) => !hasRegisteredPayment(reservation) && Number(reservation.orderTotal) > 0
  );
  const reservationCashTotal = getReservationCashTotal(paidCompletedReservations);
  const reservationNonCashTotal = getReservationNonCashTotal(paidCompletedReservations);
  const calendarDates = getMonthCalendarDates(calendarMonth);

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Historial"
          description="Registro operativo de pedidos y reservas: qué entró, qué se confirmó, qué se completó y qué se canceló."
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsInfoOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                aria-label="Ver información del historial"
                title="Ver información del historial"
              >
                <Info size={18} />
              </button>

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
            </div>
          }
        />

        <div className="historial-top-metrics mt-4 grid shrink-0 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <V2MetricCard
            label={activeTab === "envios" ? "Pedidos" : "Reservas"}
            value={activeCount}
            helper="Según filtros"
            tone="blue"
            icon={activeTab === "envios" ? <PackageCheck size={20} /> : <CalendarDays size={20} />}
          />
          <V2MetricCard
            label="Activos"
            value={activeOperationalCount}
            helper={activeTab === "envios" ? "Confirmados" : "Confirmadas"}
            tone="green"
            icon={<CheckCircle2 size={20} />}
          />
          <V2MetricCard
            label="Cerrados"
            value={closedCount}
            helper="Completados/cancelados"
            tone="slate"
            icon={<History size={20} />}
          />
          <V2MetricCard
            label={activeTab === "envios" ? "Facturado" : "Personas"}
            value={activeTab === "envios" ? formatMoney(moneyTotal) : peopleTotal}
            helper="Total filtrado"
            tone="orange"
            icon={activeTab === "envios" ? <Truck size={20} /> : <Clock3 size={20} />}
          />

          <V2MetricCard
            label="Efectivo"
            value={formatMoney(activeTab === "envios" ? deliveryCashTotal : reservationCashTotal)}
            helper={
              activeTab === "envios"
                ? `${paidDeliveryPayments.length} pedidos cobrados`
                : `${paidCompletedReservations.length} reservas con pago`
            }
            tone="green"
            icon={<Banknote size={20} />}
          />

          <V2MetricCard
            label="Tarjeta / no efectivo"
            value={formatMoney(activeTab === "envios" ? deliveryNonCashTotal : reservationNonCashTotal)}
            helper={
              activeTab === "envios"
                ? "Tarjeta, MP o transferencia"
                : `${unpaidCompletedReservations.length} cerradas sin pago`
            }
            tone={activeTab === "reservas" && unpaidCompletedReservations.length > 0 ? "red" : "blue"}
            icon={<CreditCard size={20} />}
          />
        </div>

        <V2Card className="mt-4 shrink-0 p-3">
          <div className="grid gap-3 xl:grid-cols-[1.05fr_1fr_1fr_1fr] xl:items-center">
            <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousDay}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
              aria-label="Día anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="relative min-w-0 flex-1">
              <button
                type="button"
                onClick={openDatePicker}
                className="flex h-10 w-full min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-950 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <CalendarDays className="mr-2 text-slate-500" size={17} />
                <span className="truncate">{formatLongDate(selectedDate)}</span>
              </button>

              {isCalendarOpen ? (
                <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={goToPreviousMonth}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                      aria-label="Mes anterior"
                    >
                      <ChevronLeft size={17} />
                    </button>

                    <div className="text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Seleccionar día
                      </p>
                      <h2 className="mt-0.5 text-sm font-semibold capitalize text-slate-950">
                        {formatCalendarMonth(calendarMonth)}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={goToNextMonth}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                      aria-label="Mes siguiente"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-1.5">
                    {calendarDates.map((date) => {
                      const parsedDate = new Date(`${date}T00:00:00`);
                      const isSelected = date === selectedDate;
                      const isToday = date === getTodayDateKey();
                      const isMuted = !isSameMonth(date, calendarMonth);

                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => selectCalendarDate(date)}
                          className={`flex h-9 items-center justify-center rounded-xl border text-xs font-semibold transition ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                              : isToday
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                : isMuted
                                  ? "border-slate-100 bg-slate-50 text-slate-300 hover:text-slate-500"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                          }`}
                        >
                          {parsedDate.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => selectCalendarDate(getTodayDateKey())}
                      className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(false)}
                      className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={goToNextDay}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
              aria-label="Día siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>

            <div className="relative min-w-0">
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

            <div className="flex min-w-0 gap-2">
              <V2Select
                value={rangeFilter}
                onChange={(event) => setRangeFilter(event.target.value as HistoryRange)}
              >
                <option value="day">Día seleccionado</option>
                <option value="today">Hoy</option>
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="all">Todo el historial</option>
              </V2Select>

              {rangeFilter === "day" ? (
                <button
                  type="button"
                  onClick={showFullHistory}
                  className="hidden h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 xl:inline-flex xl:items-center"
                >
                  30 días
                </button>
              ) : null}
            </div>
          </div>
        </V2Card>

        <div className="v2-history-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {activeTab === "envios" ? (
            <div className="space-y-2">
              {filteredDeliveries.map((delivery) => {
                const publicId = getDeliveryTrackingId(delivery);
                const isOpen = openId === delivery.id;
                const timeline = deliveryTimeline(delivery);

                return (
                  <V2Card key={delivery.id} className="overflow-hidden p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : delivery.id)}
                      className="grid w-full items-center gap-3 bg-gradient-to-br from-white to-slate-50 px-5 py-3 text-left transition hover:bg-emerald-50/40 lg:grid-cols-[140px_1.1fr_1.7fr_150px_140px_38px]"
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
                          Fecha / hora
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatDateTime(delivery.date, delivery.time)}
                        </p>
                      </div>

                      <div className="flex items-center">
                        <V2Badge tone={getStatusBadgeTone(delivery.status)}>
                          {getDeliveryStatusLabel(delivery)}
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

                          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-sm shadow-sm">
                            <p className="font-semibold text-slate-950">Resumen</p>
                            <div className="mt-3 space-y-2 text-slate-600">
                              <p><strong>Total:</strong> {formatMoney(delivery.total)}</p>
                              <p><strong>Tipo:</strong> {delivery.deliveryType === "delivery" ? "Delivery" : "Retiro"}</p>
                              <p><strong>Dirección:</strong> {delivery.address}</p>
                              <p><strong>Teléfono:</strong> {delivery.phone}</p>
                              <p><strong>Pago:</strong> {delivery.payment}</p>
                              <p><strong>Origen:</strong> {delivery.source === "web" ? "Web pública" : "Manual"}</p>
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
                      <p className="mt-3 font-semibold text-slate-950">No hay pedidos</p>
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
                  <V2Card key={reservation.id} className="overflow-hidden p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : reservation.id)}
                      className="grid w-full items-center gap-3 bg-gradient-to-br from-white to-slate-50 px-5 py-3 text-left transition hover:bg-emerald-50/40 lg:grid-cols-[140px_1.1fr_1.5fr_120px_140px_38px]"
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
                        <p className="mt-1 truncate font-semibold text-slate-950">
                          {reservation.client}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Mesa / consumo
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {reservation.tableName || "Sin mesa"} · {summarizeReservationConsumption(reservation)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Fecha / hora
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatDateTime(reservation.date, reservation.time)}
                        </p>
                      </div>

                      <div className="flex items-center">
                        <V2Badge tone={getStatusBadgeTone(reservation.status)}>
                          {getReservationStatusLabel(reservation.status)}
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

                          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-sm shadow-sm">
                            <p className="font-semibold text-slate-950">Resumen</p>
                            <div className="mt-3 space-y-2 text-slate-600">
                              <p><strong>Personas:</strong> {reservation.people}</p>
                              <p><strong>Mesa:</strong> {reservation.tableName || "Sin mesa"}</p>
                              <p><strong>Teléfono:</strong> {reservation.phone}</p>
                              {reservation.email ? <p><strong>Email:</strong> {reservation.email}</p> : null}
                              <p><strong>Origen:</strong> {reservation.origin || "manual"}</p>
                              <p><strong>Consumo:</strong> {summarizeReservationConsumption(reservation)}</p>
                              <p><strong>Total:</strong> {formatMoney(reservation.orderTotal ?? 0)}</p>
                              <p><strong>Pago:</strong> {formatReservationPayment(reservation)}</p>
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
                      <XCircle className="mx-auto text-slate-300" size={42} />
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

        {isInfoOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm"
            onClick={() => setIsInfoOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Info size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Información
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">
                      {activeTab === "envios"
                        ? "Qué guarda este historial de envíos"
                        : "Qué guarda este historial de reservas"}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsInfoOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                  aria-label="Cerrar información"
                >
                  ×
                </button>
              </div>

              <p className="mt-5 text-sm leading-7 text-slate-600">
                {activeTab === "envios"
                  ? "Registra el ciclo operativo de cada pedido: entrada, aceptación, preparación, salida o retiro, entrega y cancelación. Sirve para auditar qué pasó con cada pedido y encontrar reclamos rápidamente."
                  : "Registra el ciclo de cada reserva: entrada, confirmación, llegada, consumo, cierre, cancelación o no-show. Sirve para entender qué pasó con cada mesa, cliente y horario."}
              </p>
            </div>
          </div>
        ) : null}

      <style jsx global>{`
        .historial-top-metrics > * {
          min-height: 86px;
        }

        .historial-top-metrics > * {
          padding-top: 0.625rem;
          padding-bottom: 0.625rem;
        }

        .historial-top-metrics p {
          line-height: 1.15;
        }

        .historial-top-metrics [class*="text-2xl"] {
          font-size: 1.375rem;
          line-height: 1.1;
        }

        .v2-history-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 transparent;
        }

        .v2-history-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .v2-history-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .v2-history-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #cbd5e1, #94a3b8);
          border: 3px solid transparent;
          border-radius: 999px;
          background-clip: padding-box;
        }

        .v2-history-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #94a3b8, #64748b);
          border: 3px solid transparent;
          background-clip: padding-box;
        }
      `}</style>
    </V2AppShell>
  );
}
