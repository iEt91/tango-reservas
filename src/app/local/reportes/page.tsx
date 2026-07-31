"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileSpreadsheet,
  LockKeyhole,
  PackageCheck,
  Printer,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card, V2MetricCard } from "@/components/v2/v2-card";
import { V2FilterBar } from "@/components/v2/v2-filter-bar";
import { V2Input } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";

const DELIVERIES_STORAGE_KEY = "tango-v2-deliveries-v1";
const RESERVATIONS_STORAGE_KEY = "tango-v2-reservations-calendar-v2";
const LOCAL_CONFIG_STORAGE_KEY = "tango-v2-local-config-v1";
const STOCK_PRODUCTS_STORAGE_KEY = "tango-v2-stock-products";
const EXPENSES_STORAGE_KEY = "tango-v2-expenses-v1";
const CASH_REGISTER_STORAGE_KEY = "tango-v2-cash-register-v1";
const DELIVERIES_EVENT = "tango-v2-deliveries-updated";
const RESERVATIONS_EVENT = "tango-v2-reservations-updated";
const EXPENSES_EVENT = "tango-v2-expenses-updated";
const CASH_REGISTER_EVENT = "tango-v2-cash-register-updated";

type ReportRange = "day" | "custom" | "all";
type PaymentBreakdown = {
  cash: number;
  card: number;
  mercadoPago: number;
  transfer: number;
};
type LineItem = { menuItemId?: string; id?: string; name: string; price: number; quantity: number };
type RecipeIngredient = {
  stockProductId: string;
  name: string;
  quantity: number;
  unit: string;
};
type Recipe = {
  menuItemId: string;
  name: string;
  ingredients: RecipeIngredient[];
};
type StockProduct = {
  id: string;
  name: string;
  unit?: string;
  unitCost?: number;
};
type Reservation = {
  id: string;
  date: string;
  people?: number;
  status: string;
  orderTotal?: number;
  orderLineItems?: LineItem[];
  paymentMethod?: string;
  paidAmount?: number;
  paymentBreakdown?: PaymentBreakdown;
  paymentClosedAt?: string;
};
type Delivery = {
  id: string;
  date?: string;
  status: string;
  total?: number;
  orderItems?: LineItem[];
  payment?: string;
  paymentBreakdown?: Partial<PaymentBreakdown>;
  deliveredAt?: string;
};
type Expense = { id:string; date:string; amount:number; status:"paid"|"pending"; category?:string };
type CashMovement = { id:string; type:"income"|"withdrawal"; amount:number; reason:string; createdAt:string };
type CashRegister = {
  id:string;
  date:string;
  status:"open"|"closed";
  difference?:number|null;
  adjustment?:number;
  movements?:CashMovement[];
};

function readStorage<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function readObject<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function monthData(date: string) {
  const first = new Date(`${monthStart(date)}T12:00:00`);
  return {
    year: first.getFullYear(),
    month: first.getMonth(),
    daysInMonth: new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(),
    firstWeekday: first.getDay(),
  };
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function longDate(date: string) {
  const value = new Date(`${date}T12:00:00`);
  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function insideRange(
  date: string | undefined,
  range: ReportRange,
  selectedDate: string,
  startDate: string,
  endDate: string,
) {
  if (range === "all") return true;
  if (!date) return false;
  if (range === "day") return date === selectedDate;
  const lower = startDate <= endDate ? startDate : endDate;
  const upper = startDate <= endDate ? endDate : startDate;
  return date >= lower && date <= upper;
}

function money(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizePayment(value?: string) {
  const payment = value?.toLowerCase() ?? "";
  if (payment.includes("mercado")) return "mercadoPago";
  if (payment.includes("transfer")) return "transfer";
  if (payment.includes("tarjeta") || payment.includes("card")) return "card";
  return "cash";
}

function getReservationPayment(reservation: Reservation): PaymentBreakdown {
  if (reservation.paymentBreakdown) return reservation.paymentBreakdown;
  const result: PaymentBreakdown = { cash: 0, card: 0, mercadoPago: 0, transfer: 0 };
  if (reservation.paymentClosedAt || Number(reservation.paidAmount) > 0) {
    result[normalizePayment(reservation.paymentMethod)] =
      Number(reservation.paidAmount) || Number(reservation.orderTotal) || 0;
  }
  return result;
}

function getDeliveryPayment(delivery: Delivery): PaymentBreakdown {
  const result: PaymentBreakdown = { cash: 0, card: 0, mercadoPago: 0, transfer: 0 };
  if (delivery.paymentBreakdown) {
    result.cash = Number(delivery.paymentBreakdown.cash) || 0;
    result.card = Number(delivery.paymentBreakdown.card) || 0;
    result.mercadoPago = Number(delivery.paymentBreakdown.mercadoPago) || 0;
    result.transfer = Number(delivery.paymentBreakdown.transfer) || 0;
    return result;
  }
  result[normalizePayment(delivery.payment)] = Number(delivery.total) || 0;
  return result;
}

function normalizedName(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

function convertQuantity(quantity: number, fromUnit: string, toUnit: string) {
  const from = normalizedName(fromUnit);
  const to = normalizedName(toUnit);
  if (from === to) return quantity;
  if (from === "g" && to === "kg") return quantity / 1000;
  if (from === "kg" && to === "g") return quantity * 1000;
  if (from === "ml" && to === "l") return quantity / 1000;
  if (from === "l" && to === "ml") return quantity * 1000;
  return quantity;
}

function getRecipeUnitCost(
  item: LineItem,
  recipes: Recipe[],
  stockProducts: StockProduct[],
) {
  const itemId = item.menuItemId ?? item.id;
  const recipe = recipes.find(
    (candidate) =>
      (itemId && candidate.menuItemId === itemId) ||
      normalizedName(candidate.name) === normalizedName(item.name),
  );
  if (!recipe) return 0;

  return recipe.ingredients.reduce((total, ingredient) => {
    const product = stockProducts.find(
      (candidate) =>
        candidate.id === ingredient.stockProductId ||
        normalizedName(candidate.name) === normalizedName(ingredient.name),
    );
    if (!product) return total;
    const quantity = convertQuantity(
      Number(ingredient.quantity) || 0,
      ingredient.unit,
      product.unit ?? ingredient.unit,
    );
    return total + quantity * (Number(product.unitCost) || 0);
  }, 0);
}

export default function ReportesPage() {
  const [range, setRange] = useState<ReportRange>("day");
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState(todayKey);
  const [calendarMonth, setCalendarMonth] = useState(todayKey);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPickingEnd, setIsPickingEnd] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);

  useEffect(() => {
    function sync() {
      setReservations(readStorage<Reservation>(RESERVATIONS_STORAGE_KEY));
      setDeliveries(readStorage<Delivery>(DELIVERIES_STORAGE_KEY));
      const config = readObject<{ recipes?: Recipe[] }>(LOCAL_CONFIG_STORAGE_KEY, {});
      setRecipes(Array.isArray(config.recipes) ? config.recipes : []);
      setStockProducts(readStorage<StockProduct>(STOCK_PRODUCTS_STORAGE_KEY));
      setExpenses(readStorage<Expense>(EXPENSES_STORAGE_KEY));
      setCashRegisters(readStorage<CashRegister>(CASH_REGISTER_STORAGE_KEY));
    }
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(RESERVATIONS_EVENT, sync);
    window.addEventListener(DELIVERIES_EVENT, sync);
    window.addEventListener(EXPENSES_EVENT, sync);
    window.addEventListener(CASH_REGISTER_EVENT, sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(RESERVATIONS_EVENT, sync);
      window.removeEventListener(DELIVERIES_EVENT, sync);
      window.removeEventListener(EXPENSES_EVENT, sync);
      window.removeEventListener(CASH_REGISTER_EVENT, sync);
    };
  }, []);

  const report = useMemo(() => {
    const closedReservations = reservations.filter(
      (item) =>
        item.status === "completed" &&
        insideRange(item.date, range, selectedDate, startDate, endDate),
    );
    const closedDeliveries = deliveries.filter(
      (item) =>
        item.status === "completed" &&
        insideRange(item.date, range, selectedDate, startDate, endDate),
    );
    const payments = [...closedReservations.map(getReservationPayment), ...closedDeliveries.map(getDeliveryPayment)]
      .reduce<PaymentBreakdown>(
        (total, item) => ({
          cash: total.cash + item.cash,
          card: total.card + item.card,
          mercadoPago: total.mercadoPago + item.mercadoPago,
          transfer: total.transfer + item.transfer,
        }),
        { cash: 0, card: 0, mercadoPago: 0, transfer: 0 },
      );
    const revenue = Object.values(payments).reduce((total, value) => total + value, 0);
    const transactions = closedReservations.length + closedDeliveries.length;
    const guests = closedReservations.reduce((total, item) => total + (Number(item.people) || 0), 0);
    const noShows = reservations.filter(
      (item) =>
        item.status === "no_show" &&
        insideRange(item.date, range, selectedDate, startDate, endDate),
    ).length;
    const soldItems = [
      ...closedReservations.flatMap((item) => item.orderLineItems ?? []),
      ...closedDeliveries.flatMap((item) => item.orderItems ?? []),
    ];
    const productMap = new Map<
      string,
      { name: string; quantity: number; revenue: number; cost: number; uncostedQuantity: number }
    >();
    const ingredientMap = new Map<string, { name: string; quantity: number; unit: string; cost: number }>();
    soldItems.forEach((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitCost = getRecipeUnitCost(item, recipes, stockProducts);
      const key = normalizedName(item.name);
      const previous = productMap.get(key) ?? {
        name: item.name,
        quantity: 0,
        revenue: 0,
        cost: 0,
        uncostedQuantity: 0,
      };
      previous.quantity += quantity;
      previous.revenue += (Number(item.price) || 0) * quantity;
      previous.cost += unitCost * quantity;
      previous.uncostedQuantity += unitCost > 0 ? 0 : quantity;
      productMap.set(key, previous);

      const itemId = item.menuItemId ?? item.id;
      const recipe = recipes.find(
        (candidate) =>
          (itemId && candidate.menuItemId === itemId) ||
          normalizedName(candidate.name) === normalizedName(item.name),
      );
      recipe?.ingredients.forEach((ingredient) => {
        const product = stockProducts.find(
          (candidate) =>
            candidate.id === ingredient.stockProductId ||
            normalizedName(candidate.name) === normalizedName(ingredient.name),
        );
        const unit = product?.unit ?? ingredient.unit;
        const usedQuantity =
          convertQuantity(Number(ingredient.quantity) || 0, ingredient.unit, unit) * quantity;
        const ingredientKey = product?.id ?? normalizedName(ingredient.name);
        const current = ingredientMap.get(ingredientKey) ?? {
          name: product?.name ?? ingredient.name,
          quantity: 0,
          unit,
          cost: 0,
        };
        current.quantity += usedQuantity;
        current.cost += usedQuantity * (Number(product?.unitCost) || 0);
        ingredientMap.set(ingredientKey, current);
      });
    });
    const products = [...productMap.values()]
      .map((item) => ({
        ...item,
        grossProfit: item.revenue - item.cost,
        grossMargin: item.revenue > 0 ? ((item.revenue - item.cost) / item.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.quantity - a.quantity);
    const ingredients = [...ingredientMap.values()].sort((a, b) => b.cost - a.cost);
    const ingredientCost = soldItems.reduce(
      (total, item) =>
        total +
        getRecipeUnitCost(item, recipes, stockProducts) * (Number(item.quantity) || 0),
      0,
    );
    const grossProfit = revenue - ingredientCost;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const operationalExpenses = expenses
      .filter((item) => item.status === "paid" && item.category !== "Compra de stock" && insideRange(item.date, range, selectedDate, startDate, endDate))
      .reduce((total, item) => total + (Number(item.amount) || 0), 0);
    const netResult = grossProfit - operationalExpenses;
    const netMargin = revenue > 0 ? (netResult / revenue) * 100 : 0;
    const uncostedItems = soldItems.reduce((total, item) => {
      const hasCost = getRecipeUnitCost(item, recipes, stockProducts) > 0;
      return total + (hasCost ? 0 : Number(item.quantity) || 0);
    }, 0);
    const periodCashRegisters = cashRegisters.filter((item) =>
      insideRange(item.date, range, selectedDate, startDate, endDate),
    );
    const closedCashRegisters = periodCashRegisters.filter((item) => item.status === "closed");
    const cashDifference = closedCashRegisters.reduce(
      (total, item) => total + (Number(item.difference) || 0),
      0,
    );
    const cashMovements = periodCashRegisters.flatMap((item) => item.movements ?? []);
    const legacyCashAdjustments = periodCashRegisters
      .filter((item) => !item.movements?.length && Number(item.adjustment) !== 0)
      .map((item) => Number(item.adjustment) || 0);
    const manualCashIncome = cashMovements
      .filter((item) => item.type === "income")
      .reduce((total, item) => total + (Number(item.amount) || 0), 0) +
      legacyCashAdjustments.filter((amount) => amount > 0).reduce((total, amount) => total + amount, 0);
    const manualCashWithdrawals = cashMovements
      .filter((item) => item.type === "withdrawal")
      .reduce((total, item) => total + (Number(item.amount) || 0), 0) +
      legacyCashAdjustments.filter((amount) => amount < 0).reduce((total, amount) => total + Math.abs(amount), 0);
    return {
      closedReservations,
      closedDeliveries,
      payments,
      revenue,
      transactions,
      guests,
      noShows,
      products,
      ingredients,
      ingredientCost,
      grossProfit,
      grossMargin,
      operationalExpenses,
      netResult,
      netMargin,
      uncostedItems,
      closedCashRegisters,
      cashDifference,
      manualCashIncome,
      manualCashWithdrawals,
    };
  }, [cashRegisters, deliveries, endDate, expenses, range, recipes, reservations, selectedDate, startDate, stockProducts]);

  function exportCsv() {
    const rows = [
      ["Reporte Tango", range === "all" ? "Todo" : range === "day" ? selectedDate : `${startDate} a ${endDate}`],
      ["Facturación cobrada", report.revenue],
      ["Operaciones cerradas", report.transactions],
      ["Reservas completadas", report.closedReservations.length],
      ["Envíos entregados", report.closedDeliveries.length],
      ["Personas atendidas", report.guests],
      ["No-show", report.noShows],
      ["Costo estimado de insumos", report.ingredientCost],
      ["Ganancia bruta estimada", report.grossProfit],
      ["Margen bruto", `${report.grossMargin.toFixed(1)}%`],
      ["Gastos operativos pagados", report.operationalExpenses],
      ["Resultado neto estimado", report.netResult],
      ["Margen neto estimado", `${report.netMargin.toFixed(1)}%`],
      ["Unidades sin costo configurado", report.uncostedItems],
      ["Cajas cerradas", report.closedCashRegisters.length],
      ["Diferencia acumulada de caja", report.cashDifference],
      ["Ingresos manuales de efectivo", report.manualCashIncome],
      ["Retiros manuales de efectivo", report.manualCashWithdrawals],
      [],
      ["Método", "Importe"],
      ["Efectivo", report.payments.cash],
      ["Tarjeta", report.payments.card],
      ["Mercado Pago", report.payments.mercadoPago],
      ["Transferencia", report.payments.transfer],
      [],
      ["Producto", "Unidades", "Venta", "Costo", "Ganancia bruta", "Margen bruto"],
      ...report.products.map((item) => [
        item.name,
        item.quantity,
        item.revenue,
        item.cost,
        item.grossProfit,
        `${item.grossMargin.toFixed(1)}%`,
      ]),
      [],
      ["Insumo consumido", "Cantidad", "Unidad", "Costo"],
      ...report.ingredients.map((item) => [item.name, item.quantity, item.unit, item.cost]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tango-reporte-${range}-${todayKey()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const period =
      range === "all" ? "Todo el historial" : range === "day" ? selectedDate : `${startDate} a ${endDate}`;
    const summaryRows = [
      ["Período", period],
      ["Facturación cobrada", report.revenue],
      ["Operaciones cerradas", report.transactions],
      ["Reservas completadas", report.closedReservations.length],
      ["Envíos entregados", report.closedDeliveries.length],
      ["Personas atendidas", report.guests],
      ["No-show", report.noShows],
      ["Costo estimado de insumos", report.ingredientCost],
      ["Ganancia bruta estimada", report.grossProfit],
      ["Margen bruto", `${report.grossMargin.toFixed(1)}%`],
      ["Gastos operativos pagados", report.operationalExpenses],
      ["Resultado neto estimado", report.netResult],
      ["Margen neto estimado", `${report.netMargin.toFixed(1)}%`],
      ["Unidades sin costo configurado", report.uncostedItems],
      ["Cajas cerradas", report.closedCashRegisters.length],
      ["Diferencia acumulada de caja", report.cashDifference],
      ["Ingresos manuales de efectivo", report.manualCashIncome],
      ["Retiros manuales de efectivo", report.manualCashWithdrawals],
    ];
    const paymentRows = [
      ["Efectivo", report.payments.cash],
      ["Tarjeta", report.payments.card],
      ["Mercado Pago", report.payments.mercadoPago],
      ["Transferencia", report.payments.transfer],
    ];
    const tableRows = (rows: (string | number)[][]) =>
      rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
        )
        .join("");
    const workbook = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;color:#0f172a}h1{color:#047857}h2{margin-top:24px}
table{border-collapse:collapse;min-width:520px}th,td{border:1px solid #cbd5e1;padding:8px 12px}
th{background:#ecfdf5;text-align:left}td:nth-child(n+2){text-align:right}
</style></head>
<body>
<h1>Reporte Tango</h1>
<h2>Resumen</h2><table>${tableRows(summaryRows)}</table>
<h2>Ingresos por método</h2><table><tr><th>Método</th><th>Importe</th></tr>${tableRows(paymentRows)}</table>
<h2>Rentabilidad por producto</h2><table><tr><th>Producto</th><th>Unidades</th><th>Venta</th><th>Costo</th><th>Ganancia bruta</th><th>Margen</th></tr>
${tableRows(report.products.map((item) => [item.name, item.quantity, item.revenue, item.cost, item.grossProfit, `${item.grossMargin.toFixed(1)}%`]))}</table>
<h2>Insumos consumidos</h2><table><tr><th>Insumo</th><th>Cantidad</th><th>Unidad</th><th>Costo</th></tr>
${tableRows(report.ingredients.map((item) => [item.name, item.quantity, item.unit, item.cost]))}</table>
</body></html>`;
    const url = URL.createObjectURL(
      new Blob(["\ufeff", workbook], { type: "application/vnd.ms-excel;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tango-reporte-${range}-${todayKey()}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    const printWindow = window.open("", "_blank", "width=1050,height=800");
    if (!printWindow) return;
    const products = report.products.length
      ? report.products
          .map(
            (item, index) =>
              `<tr><td>${index + 1}</td><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${money(item.revenue)}</td><td>${money(item.cost)}</td><td>${money(item.grossProfit)}</td><td>${item.grossMargin.toFixed(1)}%</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="7">No hay ventas cerradas en este período.</td></tr>';
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>Reporte Tango</title><style>
@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#0f172a;margin:0}
h1{margin:0;font-size:26px}.subtitle{color:#64748b;margin:6px 0 24px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.card{border:1px solid #cbd5e1;border-radius:10px;padding:12px}.label{font-size:11px;text-transform:uppercase;color:#64748b}
.value{font-size:18px;font-weight:700;margin-top:5px}.profit{color:#047857}h2{font-size:17px;margin:24px 0 10px}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}
th{background:#f1f5f9}th:nth-child(n+3),td:nth-child(n+3){text-align:right}.note{font-size:11px;color:#64748b;margin-top:18px}
</style></head><body>
<h1>Reporte Tango</h1><p class="subtitle">${escapeHtml(rangeLabel)}</p>
<div class="grid">
<div class="card"><div class="label">Facturación cobrada</div><div class="value">${money(report.revenue)}</div></div>
<div class="card"><div class="label">Costo de insumos</div><div class="value">${money(report.ingredientCost)}</div></div>
<div class="card"><div class="label">Ganancia bruta</div><div class="value profit">${money(report.grossProfit)}</div></div>
<div class="card"><div class="label">Gastos operativos</div><div class="value">${money(report.operationalExpenses)}</div></div>
<div class="card"><div class="label">Resultado neto estimado</div><div class="value profit">${money(report.netResult)}</div></div>
<div class="card"><div class="label">Margen neto estimado</div><div class="value">${report.netMargin.toFixed(1)}%</div></div>
<div class="card"><div class="label">Operaciones</div><div class="value">${report.transactions}</div></div>
<div class="card"><div class="label">Personas atendidas</div><div class="value">${report.guests}</div></div>
<div class="card"><div class="label">Cajas cerradas</div><div class="value">${report.closedCashRegisters.length}</div></div>
<div class="card"><div class="label">Diferencia acumulada de caja</div><div class="value">${money(report.cashDifference)}</div></div>
</div>
<h2>Ingresos por método</h2><table><tr><th>Método</th><th>Importe</th></tr>
<tr><td>Efectivo</td><td>${money(report.payments.cash)}</td></tr>
<tr><td>Tarjeta</td><td>${money(report.payments.card)}</td></tr>
<tr><td>Mercado Pago</td><td>${money(report.payments.mercadoPago)}</td></tr>
<tr><td>Transferencia</td><td>${money(report.payments.transfer)}</td></tr></table>
<h2>Control de caja</h2><table><tr><th>Concepto</th><th>Importe</th></tr>
<tr><td>Ingresos manuales</td><td>${money(report.manualCashIncome)}</td></tr>
<tr><td>Retiros manuales</td><td>${money(report.manualCashWithdrawals)}</td></tr>
<tr><td>Diferencia acumulada</td><td>${money(report.cashDifference)}</td></tr></table>
<h2>Rentabilidad por producto</h2><table><tr><th>#</th><th>Producto</th><th>Unidades</th><th>Venta</th><th>Costo</th><th>Ganancia</th><th>Margen</th></tr>${products}</table>
<h2>Insumos consumidos</h2><table><tr><th>Insumo</th><th>Cantidad</th><th>Unidad</th><th>Costo</th></tr>
${report.ingredients.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity.toLocaleString("es-AR", { maximumFractionDigits: 3 })}</td><td>${escapeHtml(item.unit)}</td><td>${money(item.cost)}</td></tr>`).join("")}</table>
<p class="note">El resultado neto estimado descuenta materia prima y gastos marcados como pagados. Las compras de stock no se duplican.${report.uncostedItems > 0 ? ` Hay ${report.uncostedItems} unidades sin costo configurado.` : ""}</p>
</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  const paymentCards = [
    { label: "Efectivo", value: report.payments.cash, icon: Banknote, tone: "green" },
    { label: "Tarjeta", value: report.payments.card, icon: CreditCard, tone: "blue" },
    { label: "Mercado Pago", value: report.payments.mercadoPago, icon: ReceiptText, tone: "blue" },
    { label: "Transferencia", value: report.payments.transfer, icon: ChartNoAxesCombined, tone: "purple" },
  ] as const;
  const calendarMonthData = monthData(calendarMonth);
  const rangeLabel =
    range === "all"
      ? "Todo el historial"
      : range === "day"
        ? longDate(selectedDate)
        : `${shortDate(startDate)} — ${shortDate(endDate)}`;

  function moveDay(days: number) {
    const nextDate = addDays(selectedDate, days);
    setSelectedDate(nextDate);
    setStartDate(nextDate);
    setEndDate(nextDate);
    setCalendarMonth(monthStart(nextDate));
    setRange("day");
    setIsPickingEnd(false);
    setIsCalendarOpen(false);
  }

  function selectCalendarDate(date: string) {
    if (range === "custom") {
      if (!isPickingEnd) {
        setStartDate(date);
        setEndDate(date);
        setSelectedDate(date);
        setIsPickingEnd(true);
        return;
      }
      setStartDate(startDate <= date ? startDate : date);
      setEndDate(startDate <= date ? date : startDate);
      setIsPickingEnd(false);
      setIsCalendarOpen(false);
      return;
    }
    setSelectedDate(date);
    setStartDate(date);
    setEndDate(date);
    setCalendarMonth(monthStart(date));
    setRange("day");
    setIsCalendarOpen(false);
  }

  function moveMonth(months: number) {
    const value = new Date(`${monthStart(calendarMonth)}T12:00:00`);
    value.setMonth(value.getMonth() + months);
    setCalendarMonth(
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-01`,
    );
  }

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Reportes"
          description="Resultados cobrados del restaurante, sin contar mesas abiertas ni consumos todavía impagos."
          actions={
            <>
              <V2Button variant="secondary" icon={<Download size={17} />} onClick={exportCsv}>
                CSV
              </V2Button>
              <V2Button variant="secondary" icon={<FileSpreadsheet size={17} />} onClick={exportExcel}>
                Excel
              </V2Button>
              <V2Button variant="secondary" icon={<Printer size={17} />} onClick={printReport}>
                Imprimir / PDF
              </V2Button>
            </>
          }
        />

        <div className="mt-4 shrink-0">
          <V2FilterBar>
            <div className="relative flex min-w-[340px] max-w-[560px] flex-1 items-center gap-2">
              <V2Button
                size="md"
                variant="secondary"
                aria-label="Día anterior"
                icon={<ChevronLeft size={17} />}
                onClick={() => moveDay(-1)}
              />

              <div className="relative min-w-0 flex-1">
                <V2Input
                  className="min-w-0 bg-slate-50 pr-11 font-semibold text-slate-950"
                  value={rangeLabel}
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMonth(monthStart(selectedDate));
                    setIsCalendarOpen((current) => !current);
                  }}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Abrir calendario"
                >
                  <CalendarDays size={17} />
                </button>
              </div>

              <V2Button
                size="md"
                variant="secondary"
                aria-label="Día siguiente"
                icon={<ChevronRight size={17} />}
                onClick={() => moveDay(1)}
              />

              {isCalendarOpen ? (
                <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => moveMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950">
                  <ChevronLeft size={17} />
                </button>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {range === "custom" ? (isPickingEnd ? "Seleccionar hasta" : "Seleccionar desde") : "Seleccionar día"}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold capitalize text-slate-950">
                    {new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(`${calendarMonth}T12:00:00`))}
                  </p>
                </div>
                <button type="button" onClick={() => moveMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950">
                  <ChevronRight size={17} />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {Array.from({ length: calendarMonthData.firstWeekday }).map((_, index) => <span key={`empty-${index}`} className="h-9" />)}
                {Array.from({ length: calendarMonthData.daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const date = `${calendarMonthData.year}-${String(calendarMonthData.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const lower = startDate <= endDate ? startDate : endDate;
                  const upper = startDate <= endDate ? endDate : startDate;
                  const isSelected =
                    range === "day"
                      ? date === selectedDate
                      : range === "custom" && (date === lower || date === upper);
                  const isInside = range === "custom" && date > lower && date < upper;
                  const isToday = date === todayKey();
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => selectCalendarDate(date)}
                      className={`relative flex h-9 items-center justify-center rounded-xl border text-xs font-semibold transition ${
                        isSelected
                          ? "border-emerald-700 bg-emerald-600 text-white shadow-sm"
                          : isInside
                            ? "border-emerald-200 bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                            : isToday
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3">
                {range === "custom" ? (
                  <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    <p className="font-semibold">{isPickingEnd ? "Ahora elegí la fecha final." : "Elegí la fecha inicial."}</p>
                    <p className="mt-1 text-emerald-800">Rango: {shortDate(startDate)} — {shortDate(endDate)}</p>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => selectCalendarDate(todayKey())} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950">Hoy</button>
                  <button
                    type="button"
                    onClick={() => {
                      setRange("custom");
                      setStartDate(selectedDate);
                      setEndDate(selectedDate);
                      setIsPickingEnd(false);
                    }}
                    className="h-9 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    Rango
                  </button>
                  <button type="button" onClick={() => setIsCalendarOpen(false)} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950">Cerrar</button>
                </div>
              </div>
            </div>
              ) : null}
            </div>
          </V2FilterBar>
        </div>

        <div className="mt-4 grid shrink-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <V2MetricCard label="Facturación cobrada" value={money(report.revenue)} helper="Solo operaciones cerradas" tone="green" icon={<Banknote size={21} />} />
          <V2MetricCard label="Ticket promedio" value={money(report.transactions ? report.revenue / report.transactions : 0)} helper={`${report.transactions} operaciones`} tone="blue" icon={<ReceiptText size={21} />} />
          <V2MetricCard label="Personas atendidas" value={report.guests} helper={`${report.closedReservations.length} reservas completadas`} tone="purple" icon={<UsersRound size={21} />} />
          <V2MetricCard label="Envíos entregados" value={report.closedDeliveries.length} helper={`${report.noShows} no-show`} tone="orange" icon={<PackageCheck size={21} />} />
        </div>

        <div className="mt-3 grid min-h-0 flex-1 gap-3 xl:grid-cols-[1fr_1.25fr]">
          <V2Card className="min-h-0 overflow-y-auto">
            <div className="flex items-center gap-2">
              <CalendarDays size={19} className="text-emerald-700" />
              <h2 className="font-semibold text-slate-950">Ingresos por método</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {paymentCards.map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Icon size={17} className={tone === "green" ? "text-emerald-700" : tone === "purple" ? "text-violet-700" : "text-blue-700"} />
                    {label}
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-950">{money(value)}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={tone === "green" ? "h-full bg-emerald-500" : tone === "purple" ? "h-full bg-violet-500" : "h-full bg-blue-500"}
                      style={{ width: `${report.revenue ? Math.max((value / report.revenue) * 100, value ? 3 : 0) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Costo de insumos
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {money(report.ingredientCost)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Ganancia bruta
                  </p>
                  <p className="mt-1 text-lg font-bold text-emerald-700">
                    {money(report.grossProfit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Gastos operativos
                  </p>
                  <p className="mt-1 text-lg font-bold text-orange-700">
                    {money(report.operationalExpenses)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Resultado neto
                  </p>
                  <p className={`mt-1 text-lg font-bold ${report.netResult >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {money(report.netResult)}
                  </p>
                </div>
              </div>
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Margen bruto: {report.grossMargin.toFixed(1)}% · Margen neto estimado: {report.netMargin.toFixed(1)}%.
                Solo descuenta gastos pagados; las compras de stock no se duplican.
                {report.uncostedItems > 0
                  ? ` Hay ${report.uncostedItems} unidades vendidas sin costo configurado.`
                  : ""}
              </p>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <LockKeyhole size={18} className="text-slate-500" />
                <div>
                  <h3 className="font-semibold text-slate-950">Control de caja</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Auditoría operativa del período; no modifica la facturación ni el resultado neto.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cajas cerradas</p><p className="mt-1 text-lg font-bold text-slate-950">{report.closedCashRegisters.length}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Diferencia acumulada</p><p className={`mt-1 text-lg font-bold ${report.cashDifference === 0 ? "text-emerald-700" : "text-red-700"}`}>{money(report.cashDifference)}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ingresos manuales</p><p className="mt-1 text-lg font-bold text-emerald-700">{money(report.manualCashIncome)}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Retiros manuales</p><p className="mt-1 text-lg font-bold text-orange-700">{money(report.manualCashWithdrawals)}</p></div>
              </div>
            </div>
          </V2Card>

          <V2Card className="flex min-h-0 flex-col overflow-hidden p-0">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Rentabilidad por producto</h2>
              <p className="mt-1 text-sm text-slate-500">Ventas cerradas, costo de receta y margen bruto.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {report.products.length ? (
                <div className="space-y-2">
                  {report.products.map((item, index) => (
                    <div key={item.name} className="grid grid-cols-[38px_minmax(130px,1fr)_auto_auto_auto] items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{item.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{item.quantity} unidades · venta {money(item.revenue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Costo</p>
                        <p className="text-sm font-semibold text-slate-700">{money(item.cost)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ganancia</p>
                        <p className="text-sm font-semibold text-emerald-700">{money(item.grossProfit)}</p>
                      </div>
                      <div className="min-w-16 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Margen</p>
                        <p className="text-sm font-bold text-blue-700">{item.grossMargin.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                  {report.ingredients.length ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="font-semibold text-slate-950">Insumos consumidos</h3>
                      <p className="mt-1 text-xs text-slate-500">Calculados desde las recetas de las ventas cerradas.</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {report.ingredients.map((item) => (
                          <div key={`${item.name}-${item.unit}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500">
                                {item.quantity.toLocaleString("es-AR", { maximumFractionDigits: 3 })} {item.unit}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold text-slate-700">{money(item.cost)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
                  <ChartNoAxesCombined size={38} className="text-slate-300" />
                  <p className="mt-3 font-semibold text-slate-950">Todavía no hay ventas cerradas</p>
                  <p className="mt-1 text-sm text-slate-500">Cambia el período o completa una operación.</p>
                </div>
              )}
            </div>
          </V2Card>
        </div>
      </div>
    </V2AppShell>
  );
}
