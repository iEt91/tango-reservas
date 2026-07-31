"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  History,
  Landmark,
  LockKeyhole,
  RotateCcw,
  WalletCards,
  X,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card, V2MetricCard } from "@/components/v2/v2-card";
import { V2Field, V2Input, V2Textarea } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";

const RESERVATIONS_KEY = "tango-v2-reservations-calendar-v2";
const DELIVERIES_KEY = "tango-v2-deliveries-v1";
const EXPENSES_KEY = "tango-v2-expenses-v1";
const CASH_REGISTER_KEY = "tango-v2-cash-register-v1";
const SYNC_EVENTS = [
  "tango-v2-reservations-updated",
  "tango-v2-deliveries-updated",
  "tango-v2-expenses-updated",
  "tango-v2-cash-register-updated",
];

type PaymentTotals = { cash: number; card: number; mercadoPago: number; transfer: number };
type Reservation = {
  date: string;
  status: string;
  orderTotal?: number;
  paidAmount?: number;
  payment?: string;
  paymentMethod?: string;
  paymentBreakdown?: Partial<PaymentTotals>;
};
type Delivery = { date?: string; status: string; total?: number; payment?: string };
type Expense = { date: string; status: string; amount: number; paymentMethod?: string };
type CashClose = {
  id: string;
  date: string;
  status: "open" | "closed";
  openingAmount: number;
  adjustment: number;
  actualCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  salesSnapshot: PaymentTotals | null;
  cashExpensesSnapshot: number | null;
  notes: string;
  openedAt: string;
  closedAt: string | null;
};

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function dateTimeLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function readArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function paymentKey(value?: string) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized.includes("mercado")) return "mercadoPago" as const;
  if (normalized.includes("transfer")) return "transfer" as const;
  if (normalized.includes("tarjeta") || normalized.includes("card")) return "card" as const;
  return "cash" as const;
}

function reservationPayment(reservation: Reservation): PaymentTotals {
  const breakdown = reservation.paymentBreakdown;
  if (breakdown) {
    return {
      cash: Number(breakdown.cash) || 0,
      card: Number(breakdown.card) || 0,
      mercadoPago: Number(breakdown.mercadoPago) || 0,
      transfer: Number(breakdown.transfer) || 0,
    };
  }
  const result: PaymentTotals = { cash: 0, card: 0, mercadoPago: 0, transfer: 0 };
  result[paymentKey(reservation.paymentMethod || reservation.payment)] =
    Number(reservation.paidAmount ?? reservation.orderTotal) || 0;
  return result;
}

export default function CajaPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [closes, setCloses] = useState<CashClose[]>([]);
  const [openingValue, setOpeningValue] = useState("0");
  const [actualValue, setActualValue] = useState("");
  const [adjustmentValue, setAdjustmentValue] = useState("0");
  const [notes, setNotes] = useState("");
  const [showClose, setShowClose] = useState(false);
  const today = todayKey();

  useEffect(() => {
    const sync = () => {
      setReservations(readArray<Reservation>(RESERVATIONS_KEY));
      setDeliveries(readArray<Delivery>(DELIVERIES_KEY));
      setExpenses(readArray<Expense>(EXPENSES_KEY));
      setCloses(readArray<CashClose>(CASH_REGISTER_KEY));
    };
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    SYNC_EVENTS.forEach((event) => window.addEventListener(event, sync));
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      SYNC_EVENTS.forEach((event) => window.removeEventListener(event, sync));
    };
  }, []);

  const todayClose = closes.find((item) => item.date === today) ?? null;
  const sales = useMemo(() => {
    const totals: PaymentTotals = { cash: 0, card: 0, mercadoPago: 0, transfer: 0 };
    reservations
      .filter((item) => item.date === today && item.status === "completed")
      .forEach((item) => {
        const payment = reservationPayment(item);
        totals.cash += payment.cash;
        totals.card += payment.card;
        totals.mercadoPago += payment.mercadoPago;
        totals.transfer += payment.transfer;
      });
    deliveries
      .filter((item) => (item.date ?? today) === today && item.status === "completed")
      .forEach((item) => {
        totals[paymentKey(item.payment)] += Number(item.total) || 0;
      });
    return totals;
  }, [deliveries, reservations, today]);

  const cashExpenses = useMemo(
    () => expenses
      .filter((item) => item.date === today && item.status === "paid" && paymentKey(item.paymentMethod) === "cash")
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [expenses, today],
  );
  const openingAmount = Number(todayClose?.openingAmount) || 0;
  const adjustment = todayClose?.status === "open" ? Number(adjustmentValue) || 0 : Number(todayClose?.adjustment) || 0;
  const expectedCash = openingAmount + sales.cash - cashExpenses + adjustment;
  function persist(next: CashClose[]) {
    setCloses(next);
    window.localStorage.setItem(CASH_REGISTER_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("tango-v2-cash-register-updated"));
  }

  function openCash() {
    const opening = Number(openingValue);
    if (!Number.isFinite(opening) || opening < 0) return;
    const record: CashClose = {
      id: `cash-${today}`,
      date: today,
      status: "open",
      openingAmount: opening,
      adjustment: 0,
      actualCash: null,
      expectedCash: null,
      difference: null,
      salesSnapshot: null,
      cashExpensesSnapshot: null,
      notes: "",
      openedAt: new Date().toISOString(),
      closedAt: null,
    };
    persist([record, ...closes.filter((item) => item.date !== today)]);
  }

  function closeCash() {
    if (!todayClose || todayClose.status !== "open") return;
    const actual = Number(actualValue);
    const nextAdjustment = Number(adjustmentValue) || 0;
    const nextExpected = openingAmount + sales.cash - cashExpenses + nextAdjustment;
    if (!Number.isFinite(actual) || actual < 0) return;
    persist(closes.map((item) => item.date === today ? {
      ...item,
      status: "closed",
      adjustment: nextAdjustment,
      actualCash: actual,
      expectedCash: nextExpected,
      difference: actual - nextExpected,
      salesSnapshot: { ...sales },
      cashExpensesSnapshot: cashExpenses,
      notes: notes.trim(),
      closedAt: new Date().toISOString(),
    } : item));
    setShowClose(false);
  }

  function reopenCash() {
    if (!todayClose) return;
    setAdjustmentValue(String(todayClose.adjustment || 0));
    setNotes(todayClose.notes);
    persist(closes.map((item) => item.date === today ? {
      ...item,
      status: "open",
      actualCash: null,
      expectedCash: null,
      difference: null,
      salesSnapshot: null,
      cashExpensesSnapshot: null,
      closedAt: null,
    } : item));
  }

  const history = closes.filter((item) => item.status === "closed").sort((a, b) => b.date.localeCompare(a.date));
  const displaySales = todayClose?.status === "closed" && todayClose.salesSnapshot ? todayClose.salesSnapshot : sales;
  const displayTotalSales = displaySales.cash + displaySales.card + displaySales.mercadoPago + displaySales.transfer;
  const displayExpected = todayClose?.status === "closed" ? Number(todayClose.expectedCash) || 0 : expectedCash;

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Caja"
          description="Controlá la apertura, los cobros del día, el efectivo esperado y las diferencias del cierre."
          actions={todayClose?.status === "open" ? (
            <V2Button variant="primary" icon={<LockKeyhole size={17} />} onClick={() => {
              setActualValue(String(Math.max(0, expectedCash)));
              setShowClose(true);
            }}>Cerrar caja</V2Button>
          ) : todayClose?.status === "closed" ? (
            <V2Button variant="secondary" icon={<RotateCcw size={17} />} onClick={reopenCash}>Reabrir caja</V2Button>
          ) : null}
        />

        {!todayClose ? (
          <V2Card className="mt-6 flex items-center justify-between gap-8 border-emerald-200 bg-emerald-50/70">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CircleDollarSign size={24} /></div>
              <div><h2 className="font-semibold text-slate-950">La caja de hoy todavía no está abierta</h2><p className="mt-1 text-sm text-slate-600">Indicá cuánto efectivo queda como fondo inicial.</p></div>
            </div>
            <div className="flex items-end gap-3"><V2Field label="Fondo inicial"><V2Input className="w-48" type="number" min="0" value={openingValue} onChange={(event) => setOpeningValue(event.target.value)} /></V2Field><V2Button variant="primary" onClick={openCash}>Abrir caja</V2Button></div>
          </V2Card>
        ) : (
          <div className={`mt-6 flex items-center justify-between rounded-xl border px-5 py-3 ${todayClose.status === "open" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-slate-100 text-slate-800"}`}>
            <div className="flex items-center gap-3">{todayClose.status === "open" ? <CheckCircle2 size={20} /> : <LockKeyhole size={20} />}<div><p className="text-sm font-semibold">Caja {todayClose.status === "open" ? "abierta" : "cerrada"}</p><p className="text-xs opacity-75">{todayClose.status === "open" ? `Abierta ${dateTimeLabel(todayClose.openedAt)}` : `Cerrada ${dateTimeLabel(todayClose.closedAt)}`}</p></div></div>
            <p className="text-sm font-semibold">Fondo inicial: {money(openingAmount)}</p>
          </div>
        )}

        <div className="mt-3 grid shrink-0 grid-cols-4 gap-3">
          <V2MetricCard label="Ventas cobradas" value={money(displayTotalSales)} helper="Operaciones completadas" tone="green" icon={<CircleDollarSign size={21} />} />
          <V2MetricCard label="Efectivo esperado" value={money(displayExpected)} helper="Fondo + efectivo - gastos" tone="green" icon={<Banknote size={21} />} />
          <V2MetricCard label="Gastos en efectivo" value={money(todayClose?.status === "closed" ? Number(todayClose.cashExpensesSnapshot) || 0 : cashExpenses)} helper="Gastos pagados hoy" tone="orange" icon={<ArrowDownToLine size={21} />} />
          <V2MetricCard label="Diferencia" value={todayClose?.status === "closed" ? money(Number(todayClose.difference) || 0) : "—"} helper={todayClose?.status === "closed" ? "Contado - esperado" : "Disponible al cerrar"} tone={todayClose?.status === "closed" && Number(todayClose.difference) !== 0 ? "red" : "slate"} icon={<LockKeyhole size={21} />} />
        </div>

        <div className="mt-3 grid min-h-0 flex-1 grid-cols-[1fr_1.2fr] gap-3">
          <V2Card className="min-h-0 overflow-hidden">
            <h2 className="font-semibold text-slate-950">Cobros por método</h2>
            <p className="mt-1 text-sm text-slate-500">Solo reservas y envíos completados hoy.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: "Efectivo", value: displaySales.cash, icon: Banknote, tone: "bg-emerald-50 text-emerald-800" },
                { label: "Tarjeta", value: displaySales.card, icon: CreditCard, tone: "bg-blue-50 text-blue-800" },
                { label: "Mercado Pago", value: displaySales.mercadoPago, icon: WalletCards, tone: "bg-sky-50 text-sky-800" },
                { label: "Transferencia", value: displaySales.transfer, icon: Landmark, tone: "bg-indigo-50 text-indigo-800" },
              ].map((item) => {
                const Icon = item.icon;
                return <div key={item.label} className={`rounded-xl p-4 ${item.tone}`}><div className="flex items-center gap-2 text-sm font-semibold"><Icon size={17} />{item.label}</div><p className="mt-3 text-xl font-bold">{money(item.value)}</p></div>;
              })}
            </div>
            {todayClose?.status === "closed" && todayClose.notes ? <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"><span className="font-semibold text-slate-800">Nota del cierre:</span> {todayClose.notes}</div> : null}
          </V2Card>

          <V2Card className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex items-center gap-2"><History size={18} className="text-slate-500" /><h2 className="font-semibold text-slate-950">Historial de cierres</h2></div>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {history.length ? <div className="space-y-2">{history.map((item) => <div key={item.id} className="grid grid-cols-[100px_1fr_1fr_1fr] items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm"><p className="font-semibold text-slate-900">{dateLabel(item.date)}</p><div><p className="text-xs text-slate-500">Esperado</p><p className="font-semibold">{money(Number(item.expectedCash) || 0)}</p></div><div><p className="text-xs text-slate-500">Contado</p><p className="font-semibold">{money(Number(item.actualCash) || 0)}</p></div><div><p className="text-xs text-slate-500">Diferencia</p><p className={`font-bold ${Number(item.difference) === 0 ? "text-emerald-700" : "text-red-600"}`}>{money(Number(item.difference) || 0)}</p></div></div>)}</div> : <div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">Todavía no hay cierres registrados.</div>}
            </div>
          </V2Card>
        </div>
      </div>

      {showClose ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" onClick={() => setShowClose(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Cierre del día</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Contar efectivo</h2></div><button type="button" onClick={() => setShowClose(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between text-sm"><span className="text-slate-500">Efectivo sin ajustes</span><strong>{money(openingAmount + sales.cash - cashExpenses)}</strong></div><div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Efectivo esperado final</span><strong className="text-emerald-700">{money(expectedCash)}</strong></div></div>
              <V2Field label="Ajuste manual" helper="Usá positivo para un ingreso y negativo para un retiro no registrado como gasto."><V2Input type="number" value={adjustmentValue} onChange={(event) => setAdjustmentValue(event.target.value)} /></V2Field>
              <V2Field label="Efectivo contado"><V2Input type="number" min="0" value={actualValue} onChange={(event) => setActualValue(event.target.value)} /></V2Field>
              <div className="flex justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm"><span className="text-slate-500">Diferencia prevista</span><strong className={(Number(actualValue) || 0) - expectedCash === 0 ? "text-emerald-700" : "text-red-600"}>{money((Number(actualValue) || 0) - expectedCash)}</strong></div>
              <V2Field label="Nota del cierre"><V2Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional: explicar diferencias o movimientos especiales." /></V2Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4"><V2Button variant="secondary" onClick={() => setShowClose(false)}>Cancelar</V2Button><V2Button variant="primary" icon={<LockKeyhole size={16} />} onClick={closeCash}>Confirmar cierre</V2Button></div>
          </div>
        </div>
      ) : null}
    </V2AppShell>
  );
}
