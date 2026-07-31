"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Clock3,
  Landmark,
  PackageCheck,
  Plus,
  ShoppingBag,
  Table2,
  Truck,
  WalletCards,
  Warehouse,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Badge, V2ReservationStatusBadge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card, V2MetricCard } from "@/components/v2/v2-card";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import { V2_OPERATIONAL_EVENTS, V2_OPERATIONAL_STORAGE_KEYS } from "@/lib/v2-operational-storage";
import {
  v2Deliveries,
  v2Reservations,
  v2StockProducts,
  type V2DeliveryStatus,
  type V2DeliveryType,
  type V2ReservationStatus,
} from "@/lib/v2/v2-mock-data";

const RESERVATIONS_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.reservations;
const DELIVERIES_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.deliveries;
const FLOOR_TABLES_STORAGE_KEY = "tango-v2-floor-tables";
const STOCK_PRODUCTS_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.stockProducts;
const LOCAL_CONFIG_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.localConfig;
const WEB_CONFIG_STORAGE_KEY = "tango-v2-local-web-config-v1";
const CASH_REGISTER_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.cashRegister;
const EXPENSES_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.expenses;

const RESERVATIONS_EVENT = V2_OPERATIONAL_EVENTS.reservations;
const DELIVERIES_EVENT = V2_OPERATIONAL_EVENTS.deliveries;
const FLOOR_TABLES_EVENT = "tango-v2-floor-tables-updated";
const STOCK_PRODUCTS_EVENT = V2_OPERATIONAL_EVENTS.stockProducts;
const LOCAL_CONFIG_EVENT = V2_OPERATIONAL_EVENTS.localConfig;
const WEB_CONFIG_EVENT = "tango-v2-local-web-config-updated";
const CASH_REGISTER_EVENT = V2_OPERATIONAL_EVENTS.cashRegister;
const EXPENSES_EVENT = V2_OPERATIONAL_EVENTS.expenses;

type V2KitchenStatus = "pending" | "preparing" | "ready" | "completed";

type V2KitchenTicket = {
  id: string;
  status: V2KitchenStatus;
  items?: Array<{ menuItemId?: string; id?: string; name?: string; quantity?: number }>;
};

type V2ReservationOrderLineItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
};

type V2ReservationDraft = {
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
  orderLineItems?: V2ReservationOrderLineItem[];
  orderTotal?: number;
  payment?: string;
  paymentMethod?: string;
  paidAmount?: number;
  paymentBreakdown?: {
    cash: number;
    card: number;
    mercadoPago: number;
    transfer: number;
  };
  reservationCode?: string;
  createdAt?: string;
  confirmedAt?: string;
  seatedAt?: string;
  consumptionStartedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  noShowAt?: string;
  kitchenStatus?: V2KitchenStatus;
  kitchenTickets?: V2KitchenTicket[];
};

type V2DeliveryOrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type V2DeliveryDraft = {
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
  kitchenStatus?: V2KitchenStatus;
  kitchenTickets?: V2KitchenTicket[];
};

type V2FloorTableDraft = {
  id: string;
  name: string;
  capacity: number;
  status?: "available" | "reserved" | "occupied" | "blocked";
  locked?: boolean;
  reservationId?: string;
  reservationClient?: string;
  reservationTime?: string;
};

type V2StockProductDraft = (typeof v2StockProducts)[number] & {
  totalStock?: number;
  consumedBySales?: number;
  alertBelow?: number;
  unitCost?: number;
  stock?: number;
  currentStock?: number;
  quantity?: number;
  minStock?: number;
  minimumStock?: number;
  status?: string;
};

type V2LocalConfigState = {
  reservationEnabled?: boolean;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  standardDurationMinutes?: number;
};

type V2WebConfigState = {
  status?: "active" | "draft" | "paused";
  showMenu?: boolean;
  showReservations?: boolean;
  showDelivery?: boolean;
  showGallery?: boolean;
  showMap?: boolean;
};

type V2CashRegister = {
  id: string;
  date: string;
  status: "open" | "closed";
  difference?: number | null;
  salesSnapshot?: {
    cash?: number;
    card?: number;
    mercadoPago?: number;
    transfer?: number;
  } | null;
};

type V2Expense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "paid" | "pending";
};

type AgendaItem = {
  id: string;
  time: string;
  type: "reservation" | "delivery";
  title: string;
  detail: string;
  status: string;
  href: string;
  priority: "high" | "medium" | "low";
};

type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "red" | "orange" | "blue" | "green" | "slate";
  label: string;
  priority: number;
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

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function timeToMinutes(time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");

  return Number(hours) * 60 + Number(minutes);
}

function formatMoney(value: number) {
  return `$ ${Math.max(Number(value) || 0, 0).toLocaleString("es-AR")}`;
}

function formatStockAmount(value: number) {
  const normalizedValue = Math.max(Number(value) || 0, 0);

  return normalizedValue.toLocaleString("es-AR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: normalizedValue % 1 === 0 ? 0 : 1,
  });
}

function formatTodayLabel() {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(`${getTodayDateKey()}T12:00:00`));
}

function isActiveReservation(status: string) {
  return status === "pending" || status === "confirmed";
}

function isClosedReservation(status: string) {
  return status === "completed" || status === "cancelled" || status === "no_show";
}

function hasReservationConsumption(reservation: V2ReservationDraft) {
  return Boolean(
    reservation.orderItems?.trim() ||
      reservation.orderLineItems?.some((item) => Number(item.quantity) > 0) ||
      Number(reservation.orderTotal) > 0
  );
}

function isOpenTableReservation(reservation: V2ReservationDraft) {
  if (reservation.status !== "confirmed") return false;

  return Boolean(
    reservation.seatedAt ||
      reservation.consumptionStartedAt ||
      hasReservationConsumption(reservation)
  );
}

function hasBaseKitchenItems(operation: V2ReservationDraft | V2DeliveryDraft) {
  const possibleStructuredItems = "orderLineItems" in operation
    ? operation.orderLineItems ?? []
    : operation.orderItems ?? [];
  const structuredItems = Array.isArray(possibleStructuredItems) ? possibleStructuredItems : [];

  if (structuredItems.length === 0) {
    const legacyItems = "order" in operation ? operation.order : operation.orderItems;
    return typeof legacyItems === "string" && legacyItems.trim().length > 0;
  }

  const ticketQuantities = new Map<string, number>();
  (operation.kitchenTickets ?? []).forEach((ticket) => {
    (ticket.items ?? []).forEach((item) => {
      const key = item.menuItemId ?? item.id ?? item.name?.trim().toLowerCase();
      if (!key) return;
      ticketQuantities.set(key, (ticketQuantities.get(key) ?? 0) + (Number(item.quantity) || 0));
    });
  });

  return structuredItems.some((item) => {
    const key = ("menuItemId" in item ? item.menuItemId : item.id) ?? item.name.trim().toLowerCase();
    return (Number(item.quantity) || 0) > (ticketQuantities.get(key) ?? 0);
  });
}

function getDeliveryLabel(delivery: V2DeliveryDraft) {
  if (delivery.needsAcceptance) return "Pendiente";
  if (delivery.status === "completed") return "Entregado";
  if (delivery.status === "cancelled") return "Cancelado";

  return "Activo";
}

function summarizeDelivery(delivery: V2DeliveryDraft) {
  if (delivery.orderItems?.length) {
    return delivery.orderItems
      .slice(0, 3)
      .map((item) => `${item.quantity}x ${item.name}`)
      .join(", ");
  }

  return delivery.order || "Pedido sin detalle";
}

function normalizePaymentMethod(value?: string) {
  const payment = String(value || "Sin método").trim().toLowerCase();

  if (payment.includes("mercado") || payment.includes("mp")) return "Mercado Pago";
  if (payment.includes("tarjeta") || payment.includes("crédito") || payment.includes("credito") || payment.includes("débito") || payment.includes("debito")) return "Tarjeta";
  if (payment.includes("efectivo")) return "Efectivo";
  if (payment.includes("transfer")) return "Transferencia";

  return value?.trim() || "Sin método";
}

function getStockValue(product: V2StockProductDraft) {
  const totalStock = Number(product.totalStock);
  const consumedBySales = Number(product.consumedBySales);

  if (Number.isFinite(totalStock)) {
    return Math.max(totalStock - (Number.isFinite(consumedBySales) ? consumedBySales : 0), 0);
  }

  return Number(product.currentStock ?? product.stock ?? product.quantity ?? 0);
}

function getStockMinimum(product: V2StockProductDraft) {
  return Number(product.alertBelow ?? product.minStock ?? product.minimumStock ?? 0);
}

function getStockUnit(product: V2StockProductDraft) {
  return "unit" in product && typeof product.unit === "string" ? product.unit : "u.";
}

function isCriticalStock(product: V2StockProductDraft) {
  const current = getStockValue(product);
  const minimum = getStockMinimum(product);
  const status = String(product.status ?? "").toLowerCase();

  return current <= 0 || (minimum > 0 && current <= minimum) || status.includes("cr");
}

function sortAgenda(a: AgendaItem, b: AgendaItem) {
  return timeToMinutes(a.time) - timeToMinutes(b.time);
}

function getAttentionToneClass(tone: AttentionItem["tone"]) {
  if (tone === "red") return "border-red-200 bg-gradient-to-br from-red-50 to-white text-red-900";
  if (tone === "orange") return "border-orange-200 bg-gradient-to-br from-orange-50 to-white text-orange-900";
  if (tone === "blue") return "border-blue-200 bg-gradient-to-br from-blue-50 to-white text-blue-900";
  if (tone === "green") return "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-900";

  return "border-slate-200 bg-gradient-to-br from-slate-50 to-white text-slate-900";
}

function getAttentionBadgeTone(tone: AttentionItem["tone"]): "red" | "orange" | "blue" | "green" | "slate" {
  if (tone === "red") return "red";
  if (tone === "orange") return "orange";
  if (tone === "blue") return "blue";
  if (tone === "green") return "green";

  return "slate";
}

function getPaymentMethodTotal(
  paymentTotals: Record<string, number>,
  acceptedMethods: string[],
) {
  return Object.entries(paymentTotals).reduce((total, [method, amount]) => {
    const normalizedMethod = method.toLowerCase();

    if (acceptedMethods.some((acceptedMethod) => normalizedMethod.includes(acceptedMethod))) {
      return total + amount;
    }

    return total;
  }, 0);
}

export function V2LocalPage() {
  const [todayDate, setTodayDate] = useState(() => getTodayDateKey());
  const [reservations, setReservations] = useState<V2ReservationDraft[]>([]);
  const [deliveries, setDeliveries] = useState<V2DeliveryDraft[]>([]);
  const [floorTables, setFloorTables] = useState<V2FloorTableDraft[]>([]);
  const [stockProducts, setStockProducts] = useState<V2StockProductDraft[]>([]);
  const [localConfig, setLocalConfig] = useState<V2LocalConfigState>({});
  const [webConfig, setWebConfig] = useState<V2WebConfigState>({});
  const [cashRegisters, setCashRegisters] = useState<V2CashRegister[]>([]);
  const [expenses, setExpenses] = useState<V2Expense[]>([]);

  useEffect(() => {
    function syncDashboardData() {
      setTodayDate(getTodayDateKey());
      setReservations(
        readFromStorage<V2ReservationDraft[]>(
          RESERVATIONS_STORAGE_KEY,
          v2Reservations as V2ReservationDraft[]
        )
      );
      setDeliveries(
        readFromStorage<V2DeliveryDraft[]>(
          DELIVERIES_STORAGE_KEY,
          v2Deliveries as V2DeliveryDraft[]
        )
      );
      setFloorTables(readFromStorage<V2FloorTableDraft[]>(FLOOR_TABLES_STORAGE_KEY, []));
      setStockProducts(
        readFromStorage<V2StockProductDraft[]>(
          STOCK_PRODUCTS_STORAGE_KEY,
          v2StockProducts as V2StockProductDraft[]
        )
      );
      setLocalConfig(readFromStorage<V2LocalConfigState>(LOCAL_CONFIG_STORAGE_KEY, {}));
      setWebConfig(readFromStorage<V2WebConfigState>(WEB_CONFIG_STORAGE_KEY, {}));
      setCashRegisters(readFromStorage<V2CashRegister[]>(CASH_REGISTER_STORAGE_KEY, []));
      setExpenses(readFromStorage<V2Expense[]>(EXPENSES_STORAGE_KEY, []));
    }

    syncDashboardData();

    window.addEventListener("focus", syncDashboardData);
    window.addEventListener("storage", syncDashboardData);
    window.addEventListener(RESERVATIONS_EVENT, syncDashboardData);
    window.addEventListener(DELIVERIES_EVENT, syncDashboardData);
    window.addEventListener(FLOOR_TABLES_EVENT, syncDashboardData);
    window.addEventListener(STOCK_PRODUCTS_EVENT, syncDashboardData);
    window.addEventListener(LOCAL_CONFIG_EVENT, syncDashboardData);
    window.addEventListener(WEB_CONFIG_EVENT, syncDashboardData);
    window.addEventListener(CASH_REGISTER_EVENT, syncDashboardData);
    window.addEventListener(EXPENSES_EVENT, syncDashboardData);

    return () => {
      window.removeEventListener("focus", syncDashboardData);
      window.removeEventListener("storage", syncDashboardData);
      window.removeEventListener(RESERVATIONS_EVENT, syncDashboardData);
      window.removeEventListener(DELIVERIES_EVENT, syncDashboardData);
      window.removeEventListener(FLOOR_TABLES_EVENT, syncDashboardData);
      window.removeEventListener(STOCK_PRODUCTS_EVENT, syncDashboardData);
      window.removeEventListener(LOCAL_CONFIG_EVENT, syncDashboardData);
      window.removeEventListener(WEB_CONFIG_EVENT, syncDashboardData);
      window.removeEventListener(CASH_REGISTER_EVENT, syncDashboardData);
      window.removeEventListener(EXPENSES_EVENT, syncDashboardData);
    };
  }, []);

  const todayReservations = useMemo(
    () => reservations.filter((reservation) => reservation.date === todayDate),
    [reservations, todayDate]
  );

  const todayDeliveries = useMemo(
    () => deliveries.filter((delivery) => (delivery.date ?? todayDate) === todayDate),
    [deliveries, todayDate]
  );

  const activeTodayReservations = todayReservations.filter((reservation) =>
    isActiveReservation(reservation.status)
  );
  const pendingTodayReservations = todayReservations.filter(
    (reservation) => reservation.status === "pending"
  );
  const todayReservationPeople = activeTodayReservations.reduce(
    (total, reservation) => total + (Number(reservation.people) || 0),
    0
  );

  const activeTodayDeliveries = todayDeliveries.filter(
    (delivery) => delivery.status !== "completed" && delivery.status !== "cancelled"
  );
  const pendingDeliveries = todayDeliveries.filter(
    (delivery) => delivery.needsAcceptance || String(delivery.status) === "pending"
  );
  const todayRevenue =
    todayDeliveries
      .filter((delivery) => delivery.status === "completed")
      .reduce((total, delivery) => total + (Number(delivery.total) || 0), 0) +
    todayReservations
      .filter((reservation) => reservation.status === "completed")
      .reduce(
        (total, reservation) =>
          total + (Number(reservation.paidAmount ?? reservation.orderTotal) || 0),
        0,
      );

  const paymentTotals = [
    ...todayDeliveries
      .filter((delivery) => delivery.status === "completed")
      .map((delivery) => ({
        method: normalizePaymentMethod(delivery.payment),
        amount: Number(delivery.total) || 0,
      })),
    ...todayReservations
      .filter((reservation) => reservation.status === "completed")
      .flatMap((reservation) => {
        const breakdown = reservation.paymentBreakdown;

        if (breakdown) {
          return [
            { method: "Efectivo", amount: Number(breakdown.cash) || 0 },
            { method: "Tarjeta", amount: Number(breakdown.card) || 0 },
            { method: "Mercado Pago", amount: Number(breakdown.mercadoPago) || 0 },
            { method: "Transferencia", amount: Number(breakdown.transfer) || 0 },
          ];
        }

        return [{
          method: normalizePaymentMethod(reservation.paymentMethod || reservation.payment),
          amount: Number(reservation.paidAmount ?? reservation.orderTotal) || 0,
        }];
      }),
  ].reduce<Record<string, number>>((totals, item) => {
    if (item.amount <= 0) return totals;

    totals[item.method] = (totals[item.method] ?? 0) + item.amount;
    return totals;
  }, {});

  const cashTotal = getPaymentMethodTotal(paymentTotals, ["efectivo", "sin método"]);
  const cardTotal = getPaymentMethodTotal(paymentTotals, ["tarjeta"]);
  const mercadoPagoTotal = getPaymentMethodTotal(paymentTotals, ["mercado pago"]);
  const transferTotal = getPaymentMethodTotal(paymentTotals, ["transferencia"]);
  const todayCashRegister = cashRegisters.find((item) => item.date === todayDate) ?? null;
  const closedSalesTotal = todayCashRegister?.salesSnapshot
    ? Object.values(todayCashRegister.salesSnapshot).reduce(
        (total, amount) => total + (Number(amount) || 0),
        0,
      )
    : null;

  const openTableReservations = todayReservations.filter(isOpenTableReservation);
  const reservedOrOccupiedTables = floorTables.filter(
    (table) => table.status === "occupied" || table.status === "reserved"
  );
  const blockedTables = floorTables.filter((table) => table.status === "blocked" || table.locked);
  const availableTables = floorTables.filter(
    (table) =>
      table.status !== "blocked" &&
      table.status !== "reserved" &&
      table.status !== "occupied" &&
      !table.locked
  );
  const criticalStock = stockProducts.filter(isCriticalStock);
  const activeKitchenOperations: Array<V2ReservationDraft | V2DeliveryDraft> = [
    ...todayReservations.filter((reservation) => reservation.status === "confirmed"),
    ...todayDeliveries.filter(
      (delivery) => delivery.status === "confirmed" && !delivery.needsAcceptance,
    ),
  ];
  const readyKitchenCommands = activeKitchenOperations.reduce(
    (total, operation) =>
      total +
      (operation.kitchenStatus === "ready" && hasBaseKitchenItems(operation) ? 1 : 0) +
      (operation.kitchenTickets ?? []).filter((ticket) => ticket.status === "ready").length,
    0,
  );
  const overdueExpenses = expenses.filter(
    (expense) => expense.status === "pending" && expense.date < todayDate,
  );
  const overdueExpensesTotal = overdueExpenses.reduce(
    (total, expense) => total + (Number(expense.amount) || 0),
    0,
  );

  const agenda = useMemo<AgendaItem[]>(() => {
    const reservationItems: AgendaItem[] = todayReservations
      .filter((reservation) => !isClosedReservation(reservation.status))
      .map((reservation) => ({
        id: `reservation-${reservation.id}`,
        time: reservation.time,
        type: "reservation",
        title: reservation.client,
        detail: `${reservation.people} personas · ${reservation.tableName || "sin mesa"}${
          reservation.note ? ` · ${reservation.note}` : ""
        }`,
        status: reservation.status,
        href: "/local/reservas",
        priority:
          reservation.status === "pending" || !reservation.tableName ? "high" : "medium",
      }));

    const deliveryItems: AgendaItem[] = todayDeliveries
      .filter((delivery) => delivery.status !== "completed" && delivery.status !== "cancelled")
      .map((delivery) => ({
        id: `delivery-${delivery.id}`,
        time: delivery.time,
        type: "delivery",
        title: delivery.client,
        detail: `${delivery.deliveryType === "delivery" ? "Delivery" : "Retiro"} · ${summarizeDelivery(
          delivery
        )}`,
        status: getDeliveryLabel(delivery),
        href: "/local/envios",
        priority: delivery.needsAcceptance ? "high" : "medium",
      }));

    return [...reservationItems, ...deliveryItems].sort(sortAgenda);
  }, [todayDeliveries, todayReservations]);

  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    if (!todayCashRegister && todayRevenue > 0) {
      items.push({
        id: "cash-register-not-opened",
        title: "Hay ventas sin caja abierta",
        detail: `${formatMoney(todayRevenue)} cobrados hoy sin registro de apertura.`,
        href: "/local/caja",
        tone: "red",
        label: "Caja",
        priority: 1,
      });
    }

    if (
      todayCashRegister?.status === "closed" &&
      closedSalesTotal !== null &&
      Math.abs(todayRevenue - closedSalesTotal) > 0.01
    ) {
      items.push({
        id: "cash-register-new-sales-after-close",
        title: "Hay cobros posteriores al cierre",
        detail: `${formatMoney(Math.abs(todayRevenue - closedSalesTotal))} cobrados después del último cierre.`,
        href: "/local/caja",
        tone: "red",
        label: "Reabrir",
        priority: 1,
      });
    }

    if (todayCashRegister?.status === "closed" && Number(todayCashRegister.difference) !== 0) {
      items.push({
        id: "cash-register-difference",
        title: "Diferencia en el cierre de caja",
        detail: `La caja cerró con una diferencia de ${formatMoney(Math.abs(Number(todayCashRegister.difference) || 0))}.`,
        href: "/local/caja",
        tone: "orange",
        label: "Revisar",
        priority: 2,
      });
    }

    if (readyKitchenCommands > 0) {
      items.push({
        id: "kitchen-ready",
        title: `${readyKitchenCommands} ${readyKitchenCommands === 1 ? "comanda lista" : "comandas listas"}`,
        detail: "Cocina terminó la preparación y espera que el pedido sea servido o despachado.",
        href: "/local/cocina",
        tone: "green",
        label: "Entregar",
        priority: 1,
      });
    }

    if (overdueExpenses.length > 0) {
      items.push({
        id: "expenses-overdue",
        title: `${overdueExpenses.length} ${overdueExpenses.length === 1 ? "gasto vencido" : "gastos vencidos"}`,
        detail: `${formatMoney(overdueExpensesTotal)} pendientes de pago fuera de fecha.`,
        href: "/local/gastos",
        tone: "red",
        label: "Revisar",
        priority: 1,
      });
    }

    pendingDeliveries.forEach((delivery) => {
      items.push({
        id: `delivery-pending-${delivery.id}`,
        title: "Pedido pendiente de aceptación",
        detail: `${delivery.time} · ${delivery.client} · ${formatMoney(delivery.total)}`,
        href: "/local/envios",
        tone: "red",
        label: "Alta",
        priority: 1,
      });
    });

    pendingTodayReservations.forEach((reservation) => {
      items.push({
        id: `reservation-pending-${reservation.id}`,
        title: "Reserva pendiente por confirmar",
        detail: `${reservation.time} · ${reservation.client} · ${reservation.people} personas`,
        href: "/local/reservas",
        tone: "orange",
        label: "Media",
        priority: 2,
      });
    });

    activeTodayReservations
      .filter((reservation) => !reservation.tableName)
      .forEach((reservation) => {
        items.push({
          id: `reservation-no-table-${reservation.id}`,
          title: "Reserva sin mesa asignada",
          detail: `${reservation.time} · ${reservation.client} · ${reservation.people} personas`,
          href: "/local/plano",
          tone: "red",
          label: "Alta",
          priority: 1,
        });
      });

    openTableReservations.forEach((reservation) => {
      items.push({
        id: `open-table-${reservation.id}`,
        title: "Mesa abierta sin cerrar",
        detail: `${reservation.tableName || "Mesa"} · ${reservation.client} · consumo ${formatMoney(
          reservation.orderTotal ?? 0
        )}`,
        href: "/local/reservas",
        tone: "orange",
        label: "Revisar",
        priority: 2,
      });
    });

    criticalStock.slice(0, 6).forEach((product) => {
      items.push({
        id: `critical-stock-${product.id}`,
        title: "Stock crítico",
        detail: `${product.name}: restan ${formatStockAmount(getStockValue(product))} ${getStockUnit(product)} · alerta < ${formatStockAmount(getStockMinimum(product))} ${getStockUnit(product)}`,
        href: "/local/stock",
        tone: getStockValue(product) <= 0 ? "red" : "orange",
        label: getStockValue(product) <= 0 ? "Sin stock" : "Bajo",
        priority: getStockValue(product) <= 0 ? 1 : 3,
      });
    });

    if (webConfig.showReservations && localConfig.reservationEnabled === false) {
      items.push({
        id: "config-reservations-mismatch",
        title: "Reservas visibles pero desactivadas",
        detail: "La web puede mostrar reservas, pero Configuración bloquea el motor operativo.",
        href: "/local/configuracion#config-reservas",
        tone: "red",
        label: "Config",
        priority: 1,
      });
    }

    if (webConfig.showDelivery && localConfig.deliveryEnabled === false && localConfig.pickupEnabled === false) {
      items.push({
        id: "config-delivery-mismatch",
        title: "Pedidos visibles pero desactivados",
        detail: "La web puede mostrar pedidos, pero delivery y retiro están apagados.",
        href: "/local/configuracion#config-envios",
        tone: "red",
        label: "Config",
        priority: 1,
      });
    }

    return items.sort((a, b) => a.priority - b.priority);
  }, [
    activeTodayReservations,
    criticalStock,
    localConfig.deliveryEnabled,
    localConfig.pickupEnabled,
    localConfig.reservationEnabled,
    openTableReservations,
    pendingDeliveries,
    pendingTodayReservations,
    overdueExpenses.length,
    overdueExpensesTotal,
    readyKitchenCommands,
    closedSalesTotal,
    todayCashRegister,
    todayRevenue,
    webConfig.showDelivery,
    webConfig.showReservations,
  ]);

  const criticalCount = attentionItems.filter((item) => item.priority === 1).length;

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Inicio"
          description={`Centro de control operativo · ${formatTodayLabel()}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/local/reservas">
                <V2Button variant="secondary" icon={<CalendarDays size={18} />}>
                  Reservas
                </V2Button>
              </Link>
              <Link href="/local/envios">
                <V2Button variant="secondary" icon={<ShoppingBag size={18} />}>
                  Envíos
                </V2Button>
              </Link>
              <Link href="/local/reservas">
                <V2Button variant="primary" icon={<Plus size={18} />}>
                  Nueva reserva
                </V2Button>
              </Link>
            </div>
          }
        />

        <div className="mt-4 grid min-h-0 flex-1 gap-3 xl:grid-cols-[1fr_360px]">
          <div className="flex min-h-0 min-w-0 flex-col gap-3">
            <div className="dashboard-top-metrics grid shrink-0 gap-2 md:grid-cols-3 xl:grid-cols-6">
              <V2MetricCard
                label="Reservas hoy"
                value={todayReservations.length}
                helper={`${todayReservationPeople} personas esperadas`}
                tone="blue"
                icon={<CalendarDays size={22} />}
              />

              <V2MetricCard
                label="Pedidos hoy"
                value={todayDeliveries.length}
                helper={`${activeTodayDeliveries.length} activos`}
                tone="orange"
                icon={<Truck size={22} />}
              />

              <V2MetricCard
                label="Mesas abiertas"
                value={openTableReservations.length || reservedOrOccupiedTables.length}
                helper={`${availableTables.length} disp. · ${blockedTables.length} bloqueadas`}
                tone="green"
                icon={<Table2 size={22} />}
              />

              <V2MetricCard
                label="Stock crítico"
                value={criticalStock.length}
                helper={criticalStock.length > 0 ? "Revisar reposición" : "Sin alertas"}
                tone={criticalStock.length > 0 ? "orange" : "green"}
                icon={<Warehouse size={22} />}
              />

              <Link href="/local/caja" className="block rounded-[14px] focus:outline-none focus:ring-2 focus:ring-emerald-600/20">
              <V2Card className="flex min-h-[86px] flex-col justify-between gap-1 px-2 py-2 transition hover:border-emerald-300 hover:shadow-sm">
                <div className="flex min-w-0 items-center justify-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Banknote size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-slate-500">Caja del día</p>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${todayCashRegister?.status === "open" ? "bg-emerald-100 text-emerald-700" : todayCashRegister?.status === "closed" ? "bg-slate-100 text-slate-600" : "bg-orange-100 text-orange-700"}`}>
                        {todayCashRegister?.status === "open" ? "Abierta" : todayCashRegister?.status === "closed" ? "Cerrada" : "Sin abrir"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xl font-bold leading-none text-slate-950">{formatMoney(todayRevenue)}</p>
                  </div>
                </div>

                <div className="grid w-full grid-cols-2 gap-1 text-[10px] font-semibold text-slate-600">
                  <div
                    className="flex min-w-0 items-center gap-1 rounded-lg bg-emerald-50 px-1.5 py-1 text-emerald-800"
                    title={`Efectivo: ${formatMoney(cashTotal)}`}
                  >
                    <Banknote className="shrink-0" size={11} />
                    <span className="truncate">{formatMoney(cashTotal)}</span>
                  </div>
                  <div
                    className="flex min-w-0 items-center gap-1 rounded-lg bg-sky-50 px-1.5 py-1 text-sky-800"
                    title={`Mercado Pago: ${formatMoney(mercadoPagoTotal)}`}
                  >
                    <WalletCards className="shrink-0" size={11} />
                    <span className="truncate">{formatMoney(mercadoPagoTotal)}</span>
                  </div>
                  <div
                    className="flex min-w-0 items-center gap-1 rounded-lg bg-blue-50 px-1.5 py-1 text-blue-800"
                    title={`Tarjeta: ${formatMoney(cardTotal)}`}
                  >
                    <CreditCard className="shrink-0" size={11} />
                    <span className="truncate">{formatMoney(cardTotal)}</span>
                  </div>
                  <div
                    className="flex min-w-0 items-center gap-1 rounded-lg bg-indigo-50 px-1.5 py-1 text-indigo-800"
                    title={`Transferencia: ${formatMoney(transferTotal)}`}
                  >
                    <Landmark className="shrink-0" size={11} />
                    <span className="truncate">{formatMoney(transferTotal)}</span>
                  </div>
                </div>
              </V2Card>
              </Link>

              <V2MetricCard
                label="Requiere atención"
                value={attentionItems.length}
                helper={criticalCount > 0 ? `${criticalCount} críticas` : "Sin críticas"}
                tone={criticalCount > 0 ? "red" : "slate"}
                icon={<AlertTriangle size={22} />}
              />
            </div>

            <V2Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Agenda operativa de hoy</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Reservas y pedidos activos ordenados por hora.
                  </p>
                </div>
                <V2Badge tone={agenda.length > 0 ? "blue" : "slate"}>
                  {agenda.length} eventos
                </V2Badge>
              </div>

              <div className="v2-dashboard-scrollbar mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {agenda.length > 0 ? (
                  agenda.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      className="grid items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40 lg:grid-cols-[74px_130px_1fr_110px]"
                    >
                      <div className="text-lg font-bold text-slate-950">{item.time}</div>

                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            item.type === "reservation"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-orange-50 text-orange-700"
                          }`}
                        >
                          {item.type === "reservation" ? (
                            <CalendarDays size={17} />
                          ) : (
                            <PackageCheck size={17} />
                          )}
                        </span>
                        {item.type === "reservation" ? "Reserva" : "Pedido"}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-1 truncate text-sm text-slate-500">{item.detail}</p>
                      </div>

                      <div className="flex justify-start lg:justify-end">
                        {item.type === "reservation" ? (
                          <V2ReservationStatusBadge status={item.status as V2ReservationStatus} />
                        ) : (
                          <V2Badge tone={item.priority === "high" ? "orange" : "blue"}>
                            {item.status}
                          </V2Badge>
                        )}
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                    <div>
                      <CheckCircle2 className="mx-auto text-emerald-500" size={42} />
                      <p className="mt-3 font-semibold text-slate-950">No hay eventos activos hoy</p>
                      <p className="mt-1 text-sm text-slate-500">
                        No hay reservas ni pedidos pendientes para el día actual.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </V2Card>
          </div>

          <aside className="flex min-h-0 flex-col gap-3">
            <V2Card className="flex min-h-[260px] flex-[1.2] flex-col overflow-hidden">
              <div className="flex shrink-0 items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Requiere atención</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Prioridades que conviene resolver ahora.
                  </p>
                </div>
                <V2Badge tone={criticalCount > 0 ? "red" : "green"}>
                  {criticalCount > 0 ? `${criticalCount} críticas` : "OK"}
                </V2Badge>
              </div>

              <div className="v2-dashboard-scrollbar mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {attentionItems.length > 0 ? (
                  attentionItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      className={`group block rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getAttentionToneClass(
                        item.tone
                      )}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/75 shadow-sm">
                          {item.title.includes("Stock") ? (
                            <Warehouse size={17} />
                          ) : item.title.includes("Pedido") ? (
                            <PackageCheck size={17} />
                          ) : item.title.includes("Reserva") ? (
                            <CalendarDays size={17} />
                          ) : (
                            <AlertTriangle size={17} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold leading-snug">{item.title}</p>
                            <V2Badge tone={getAttentionBadgeTone(item.tone)}>{item.label}</V2Badge>
                          </div>
                          <p className="mt-1 text-sm leading-5 opacity-75">{item.detail}</p>
                        </div>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    No hay pendientes críticos. La operación está al día.
                  </div>
                )}
              </div>
            </V2Card>

            <V2Card className="flex flex-[0.8] flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Clock3 size={18} />
                  </div>
                  <h2 className="text-base font-semibold text-slate-950">Estado operativo</h2>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                    <span className="text-slate-600">Reservas online</span>
                    <V2Badge tone={localConfig.reservationEnabled === false ? "red" : "green"}>
                      {localConfig.reservationEnabled === false ? "Desactivadas" : "Activas"}
                    </V2Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                    <span className="text-slate-600">Pedidos online</span>
                    <V2Badge
                      tone={
                        localConfig.deliveryEnabled === false && localConfig.pickupEnabled === false
                          ? "red"
                          : "green"
                      }
                    >
                      {localConfig.deliveryEnabled === false && localConfig.pickupEnabled === false
                        ? "Desactivados"
                        : "Activos"}
                    </V2Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                    <span className="text-slate-600">Web pública</span>
                    <V2Badge tone={webConfig.status === "paused" ? "orange" : webConfig.status === "draft" ? "slate" : "green"}>
                      {webConfig.status === "paused" ? "Pausada" : webConfig.status === "draft" ? "Borrador" : "Publicada"}
                    </V2Badge>
                  </div>
                </div>
              </div>
            </V2Card>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        .dashboard-top-metrics > * {
          min-height: 86px;
        }

        .dashboard-top-metrics > * > div,
        .dashboard-top-metrics > * {
          padding-top: 0.625rem;
          padding-bottom: 0.625rem;
        }

        .dashboard-top-metrics p {
          line-height: 1.15;
        }

        .dashboard-top-metrics [class*="text-2xl"] {
          font-size: 1.375rem;
          line-height: 1.1;
        }

        .v2-dashboard-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 transparent;
        }

        .v2-dashboard-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .v2-dashboard-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .v2-dashboard-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #cbd5e1, #94a3b8);
          border: 3px solid transparent;
          border-radius: 999px;
          background-clip: padding-box;
        }

        .v2-dashboard-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #94a3b8, #64748b);
          border: 3px solid transparent;
          background-clip: padding-box;
        }
      `}</style>
    </V2AppShell>
  );
}
