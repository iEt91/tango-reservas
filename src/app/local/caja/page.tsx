"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  History,
  Landmark,
  LockKeyhole,
  Plus,
  RotateCcw,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card, V2MetricCard } from "@/components/v2/v2-card";
import { V2Field, V2Input, V2Select, V2Textarea } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import {
  getBusinessCashSnapshotAction,
  openBusinessCashSessionAction,
} from "./actions";
import { getDataSource } from "@/lib/data/dataSource";
import type {
  BusinessCashSession,
  BusinessPayment,
} from "@/lib/payments/business-payment-contract";
import {
  publishV2ServerSync,
  subscribeV2ServerSync,
} from "@/lib/v2-server-sync";
import { createV2OperationalId, V2_OPERATIONAL_EVENTS, V2_OPERATIONAL_STORAGE_KEYS } from "@/lib/v2-operational-storage";

const RESERVATIONS_KEY = V2_OPERATIONAL_STORAGE_KEYS.reservations;
const DELIVERIES_KEY = V2_OPERATIONAL_STORAGE_KEYS.deliveries;
const EXPENSES_KEY = V2_OPERATIONAL_STORAGE_KEYS.expenses;
const CASH_REGISTER_KEY = V2_OPERATIONAL_STORAGE_KEYS.cashRegister;
const SYNC_EVENTS = [
  V2_OPERATIONAL_EVENTS.reservations,
  V2_OPERATIONAL_EVENTS.deliveries,
  V2_OPERATIONAL_EVENTS.expenses,
  V2_OPERATIONAL_EVENTS.cashRegister,
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
type CashMovement = {
  id: string;
  type: "income" | "withdrawal";
  amount: number;
  reason: string;
  createdAt: string;
};
type CashClose = {
  id: string;
  date: string;
  status: "open" | "closed";
  openingAmount: number;
  adjustment: number;
  movements?: CashMovement[];
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

function longDate(value: string) {
  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
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
  const isSupabasePersistence =
    getDataSource() === "supabase";
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [closes, setCloses] = useState<CashClose[]>([]);
  const [persistentSession, setPersistentSession] =
    useState<BusinessCashSession | null>(null);
  const [persistentPayments, setPersistentPayments] =
    useState<BusinessPayment[]>([]);
  const [isCashSnapshotLoading, setIsCashSnapshotLoading] =
    useState(isSupabasePersistence);
  const [isCashMutating, setIsCashMutating] =
    useState(false);
  const [cashOperationError, setCashOperationError] =
    useState("");
  const cashOpenOperationKeyRef =
    useRef<string | null>(null);
  const [openingValue, setOpeningValue] = useState("0");
  const [actualValue, setActualValue] = useState("");
  const [notes, setNotes] = useState("");
  const [showClose, setShowClose] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [movementType, setMovementType] = useState<CashMovement["type"]>("withdrawal");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const today = todayKey();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [calendarMonth, setCalendarMonth] = useState(() => monthStart(todayKey()));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const selectedMonthData = monthData(calendarMonth);
  const isToday = selectedDate === today;

  useEffect(() => {
    if (isSupabasePersistence) {
      return;
    }

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
  }, [isSupabasePersistence]);

  useEffect(() => {
    if (!isSupabasePersistence) {
      return;
    }

    let cancelled = false;

    async function syncPersistentCash() {
      setIsCashSnapshotLoading(true);

      try {
        const result =
          await getBusinessCashSnapshotAction({
            businessDate:
              selectedDate,
          });

        if (cancelled) {
          return;
        }

        if (!result.ok) {
          setPersistentSession(null);
          setPersistentPayments([]);
          setCashOperationError(
            result.error,
          );
          return;
        }

        setPersistentSession(
          result.session,
        );
        setPersistentPayments(
          result.payments,
        );
        setCashOperationError("");
      } catch {
        if (!cancelled) {
          setCashOperationError(
            "No se pudo actualizar la caja persistente.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsCashSnapshotLoading(false);
        }
      }
    }

    void syncPersistentCash();

    const unsubscribe =
      subscribeV2ServerSync(
        "cash",
        () => {
          void syncPersistentCash();
        },
      );

    const handleFocus = () => {
      void syncPersistentCash();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [
    isSupabasePersistence,
    selectedDate,
  ]);

  const persistentSelectedClose:
    CashClose | null =
      persistentSession
      && persistentSession.businessDate
        === selectedDate
        ? {
            id:
              persistentSession.id,
            date:
              persistentSession.businessDate,
            status:
              persistentSession.status,
            openingAmount:
              persistentSession.openingAmount,
            adjustment: 0,
            movements: [],
            actualCash: null,
            expectedCash: null,
            difference: null,
            salesSnapshot: null,
            cashExpensesSnapshot: null,
            notes: "",
            openedAt:
              persistentSession.openedAt,
            closedAt: null,
          }
        : null;

  const selectedClose =
    isSupabasePersistence
      ? persistentSelectedClose
      : closes.find(
          (item) =>
            item.date === selectedDate,
        ) ?? null;
  const sales = useMemo(() => {
    const totals: PaymentTotals = { cash: 0, card: 0, mercadoPago: 0, transfer: 0 };

    if (isSupabasePersistence) {
      persistentPayments.forEach(
        (payment) => {
          if (payment.method === "cash") {
            totals.cash += payment.amount;
          } else if (
            payment.method === "card"
          ) {
            totals.card += payment.amount;
          } else if (
            payment.method
            === "mercado_pago"
          ) {
            totals.mercadoPago +=
              payment.amount;
          } else {
            totals.transfer +=
              payment.amount;
          }
        },
      );

      return totals;
    }

    reservations
      .filter((item) => item.date === selectedDate && item.status === "completed")
      .forEach((item) => {
        const payment = reservationPayment(item);
        totals.cash += payment.cash;
        totals.card += payment.card;
        totals.mercadoPago += payment.mercadoPago;
        totals.transfer += payment.transfer;
      });
    deliveries
      .filter((item) => (item.date ?? selectedDate) === selectedDate && item.status === "completed")
      .forEach((item) => {
        totals[paymentKey(item.payment)] += Number(item.total) || 0;
      });
    return totals;
  }, [
    deliveries,
    isSupabasePersistence,
    persistentPayments,
    reservations,
    selectedDate,
  ]);

  const cashExpenses = useMemo(
    () => isSupabasePersistence
      ? 0
      : expenses
      .filter((item) => item.date === selectedDate && item.status === "paid" && paymentKey(item.paymentMethod) === "cash")
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [
      expenses,
      isSupabasePersistence,
      selectedDate,
    ],
  );
  const cardExpenses = useMemo(
    () => isSupabasePersistence
      ? 0
      : expenses
      .filter((item) => item.date === selectedDate && item.status === "paid" && paymentKey(item.paymentMethod) !== "cash")
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [
      expenses,
      isSupabasePersistence,
      selectedDate,
    ],
  );
  const openingAmount = Number(selectedClose?.openingAmount) || 0;
  const movements = selectedClose?.movements ?? [];
  const movementNet = movements.reduce(
    (total, movement) => total + (movement.type === "income" ? movement.amount : -movement.amount),
    0,
  );
  const legacyAdjustment = selectedClose && !selectedClose.movements ? Number(selectedClose.adjustment) || 0 : 0;
  const adjustment = movementNet + legacyAdjustment;
  const expectedCash = openingAmount + sales.cash - cashExpenses + adjustment;
  function persist(next: CashClose[]) {
    if (isSupabasePersistence) {
      return;
    }

    setCloses(next);
    window.localStorage.setItem(CASH_REGISTER_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(V2_OPERATIONAL_EVENTS.cashRegister));
  }

  async function openCash() {
    if (
      !isToday
      || isCashMutating
    ) {
      return;
    }

    const opening =
      Number(openingValue);

    if (
      !Number.isFinite(opening)
      || opening < 0
    ) {
      return;
    }

    if (isSupabasePersistence) {
      const operationKey =
        cashOpenOperationKeyRef.current
        ?? createV2OperationalId(
          "cash-open",
        );

      cashOpenOperationKeyRef.current =
        operationKey;
      setIsCashMutating(true);
      setCashOperationError("");

      try {
        const result =
          await openBusinessCashSessionAction({
            businessDate:
              selectedDate,
            openingAmount:
              opening,
            operationKey,
          });

        if (!result.ok) {
          setCashOperationError(
            result.error,
          );
          return;
        }

        setPersistentSession(
          result.session,
        );
        setPersistentPayments([]);
        cashOpenOperationKeyRef.current =
          null;
        publishV2ServerSync("cash");
      } catch {
        setCashOperationError(
          "No se pudo abrir la caja persistente.",
        );
      } finally {
        setIsCashMutating(false);
      }

      return;
    }

    const record: CashClose = {
      id: `cash-${selectedDate}`,
      date: selectedDate,
      status: "open",
      openingAmount: opening,
      adjustment: 0,
      movements: [],
      actualCash: null,
      expectedCash: null,
      difference: null,
      salesSnapshot: null,
      cashExpensesSnapshot: null,
      notes: "",
      openedAt: new Date().toISOString(),
      closedAt: null,
    };
    persist([
      record,
      ...closes.filter(
        (item) =>
          item.date !== selectedDate,
      ),
    ]);
  }

  function closeCash() {
    if (isSupabasePersistence) {
      setCashOperationError(
        "El cierre persistente de Caja se habilitará junto con Gastos persistentes.",
      );
      return;
    }

    if (!isToday || !selectedClose || selectedClose.status !== "open") return;
    const actual = Number(actualValue);
    const nextExpected = openingAmount + sales.cash - cashExpenses + adjustment;
    if (!Number.isFinite(actual) || actual < 0) return;
    persist(closes.map((item) => item.date === selectedDate ? {
      ...item,
      status: "closed",
      adjustment,
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
    if (isSupabasePersistence) {
      setCashOperationError(
        "La reapertura persistente se habilitará junto con el cierre canónico.",
      );
      return;
    }

    if (!isToday || !selectedClose) return;
    setNotes(selectedClose.notes);
    persist(closes.map((item) => item.date === selectedDate ? {
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

  function openMovementModal() {
    if (isSupabasePersistence) {
      setCashOperationError(
        "Los movimientos manuales persistentes todavía no están habilitados.",
      );
      return;
    }

    setMovementType("withdrawal");
    setMovementAmount("");
    setMovementReason("");
    setShowMovement(true);
  }

  function addMovement() {
    if (isSupabasePersistence) {
      setCashOperationError(
        "Los movimientos manuales persistentes todavía no están habilitados.",
      );
      return;
    }

    if (!isToday || !selectedClose || selectedClose.status !== "open") return;
    const amount = Number(movementAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !movementReason.trim()) return;
    const previousMovements = [...(selectedClose.movements ?? [])];
    if (!selectedClose.movements && Number(selectedClose.adjustment) !== 0) {
      previousMovements.push({
        id: `movement-legacy-${selectedDate}`,
        type: Number(selectedClose.adjustment) > 0 ? "income" : "withdrawal",
        amount: Math.abs(Number(selectedClose.adjustment)),
        reason: "Ajuste registrado antes del historial de movimientos",
        createdAt: selectedClose.openedAt,
      });
    }
    previousMovements.push({
      id: createV2OperationalId("cash-movement"),
      type: movementType,
      amount,
      reason: movementReason.trim(),
      createdAt: new Date().toISOString(),
    });
    persist(closes.map((item) => item.date === selectedDate ? { ...item, adjustment: 0, movements: previousMovements } : item));
    setShowMovement(false);
  }

  function removeMovement(id: string) {
    if (isSupabasePersistence) {
      setCashOperationError(
        "Los movimientos manuales persistentes todavía no están habilitados.",
      );
      return;
    }

    if (!isToday || !selectedClose || selectedClose.status !== "open") return;
    persist(closes.map((item) => item.date === selectedDate ? {
      ...item,
      movements: (item.movements ?? []).filter((movement) => movement.id !== id),
    } : item));
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    setCalendarMonth(monthStart(date));
    setIsCalendarOpen(false);
  }

  function moveDay(days: number) {
    selectDate(addDays(selectedDate, days));
  }

  function moveMonth(months: number) {
    const value = new Date(`${calendarMonth}T12:00:00`);
    value.setMonth(value.getMonth() + months);
    setCalendarMonth(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-01`);
  }

  const history =
    isSupabasePersistence
      ? []
      : closes
          .filter(
            (item) =>
              item.status === "closed",
          )
          .sort(
            (a, b) =>
              b.date.localeCompare(a.date),
          );
  const displaySales = selectedClose?.status === "closed" && selectedClose.salesSnapshot ? selectedClose.salesSnapshot : sales;
  const displayTotalSales = displaySales.cash + displaySales.card + displaySales.mercadoPago + displaySales.transfer;
  const liveTotalSales = sales.cash + sales.card + sales.mercadoPago + sales.transfer;
  const postCloseSales = selectedClose?.status === "closed" && selectedClose.salesSnapshot
    ? liveTotalSales - displayTotalSales
    : 0;
  const displayExpected = selectedClose?.status === "closed" ? Number(selectedClose.expectedCash) || 0 : expectedCash;

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Caja"
          description="Controlá la apertura, los cobros del día, el efectivo esperado y las diferencias del cierre."
          actions={isToday && selectedClose?.status === "open" && !isSupabasePersistence ? (
            <>
              <V2Button variant="secondary" icon={<Plus size={17} />} onClick={openMovementModal}>Movimiento</V2Button>
              <V2Button variant="primary" icon={<LockKeyhole size={17} />} onClick={() => {
                setActualValue(String(Math.max(0, expectedCash)));
                setShowClose(true);
              }}>Cerrar caja</V2Button>
            </>
          ) : isToday && selectedClose?.status === "closed" && !isSupabasePersistence ? (
            <V2Button variant="secondary" icon={<RotateCcw size={17} />} onClick={reopenCash}>Reabrir caja</V2Button>
          ) : null}
        />

        <div className="relative mt-4 flex shrink-0 items-center gap-2 rounded-[14px] border border-slate-200 bg-white p-3">
          <V2Button variant="secondary" aria-label="Día anterior" icon={<ChevronLeft size={17} />} onClick={() => moveDay(-1)} />
          <div className="relative min-w-[320px] max-w-[520px] flex-1">
            <V2Input className="bg-slate-50 pr-11 font-semibold text-slate-950" value={longDate(selectedDate)} readOnly />
            <button type="button" onClick={() => {
              setCalendarMonth(monthStart(selectedDate));
              setIsCalendarOpen((current) => !current);
            }} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Abrir calendario"><CalendarDays size={17} /></button>
          </div>
          <V2Button variant="secondary" aria-label="Día siguiente" icon={<ChevronRight size={17} />} onClick={() => moveDay(1)} />
          {!isToday ? <V2Button variant="secondary" onClick={() => selectDate(today)}>Volver a hoy</V2Button> : null}
          {selectedClose ? (
            <div className={`ml-auto flex min-w-0 items-center gap-3 border-l pl-5 ${selectedClose.status === "open" ? "border-emerald-200 text-emerald-900" : "border-slate-200 text-slate-800"}`}>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${selectedClose.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {selectedClose.status === "open" ? <CheckCircle2 size={18} /> : <LockKeyhole size={18} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Caja {selectedClose.status === "open" ? "abierta" : "cerrada"}</p>
                {postCloseSales > 0 ? (
                  <p className="truncate text-xs font-semibold text-red-600">Hay {money(postCloseSales)} cobrados después del cierre · Reabrí la caja</p>
                ) : selectedClose.status === "closed" && Number(selectedClose.difference) !== 0 ? (
                  <p className="truncate text-xs font-semibold text-red-600">Diferencia de cierre: {money(Number(selectedClose.difference) || 0)}</p>
                ) : (
                  <p className="truncate text-xs opacity-75">{selectedClose.status === "open" ? `Abierta ${dateTimeLabel(selectedClose.openedAt)}` : `Cerrada ${dateTimeLabel(selectedClose.closedAt)}`}</p>
                )}
              </div>
              <p className="ml-3 whitespace-nowrap text-sm font-semibold">Fondo inicial: {money(openingAmount)}</p>
            </div>
          ) : !isToday ? (
            <div className="ml-auto flex min-w-0 items-center gap-3 border-l border-slate-200 pl-5 text-slate-700">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><LockKeyhole size={18} /></div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">No hay una caja registrada para este día</p>
                <p className="truncate text-xs text-slate-500">Los días anteriores son únicamente de consulta.</p>
              </div>
            </div>
          ) : null}

          {isCalendarOpen ? (
            <div className="absolute left-14 top-[calc(100%+0.5rem)] z-40 w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => moveMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft size={17} /></button>
                <p className="text-sm font-semibold capitalize text-slate-950">{new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(`${calendarMonth}T12:00:00`))}</p>
                <button type="button" onClick={() => moveMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronRight size={17} /></button>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">{["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div>
              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {Array.from({ length: selectedMonthData.firstWeekday }).map((_, index) => <span key={`empty-${index}`} className="h-9" />)}
                {Array.from({ length: selectedMonthData.daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const date = `${selectedMonthData.year}-${String(selectedMonthData.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const selected = date === selectedDate;
                  const hasClose =
                    isSupabasePersistence
                      ? (
                          date === selectedDate
                          && Boolean(
                            persistentSession,
                          )
                        )
                      : closes.some(
                          (item) =>
                            item.date === date,
                        );
                  return <button key={date} type="button" onClick={() => selectDate(date)} className={`relative flex h-9 items-center justify-center rounded-xl border text-xs font-semibold transition ${selected ? "border-emerald-700 bg-emerald-600 text-white" : date === today ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"}`}>{day}{hasClose && !selected ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" /> : null}</button>;
                })}
              </div>
              <div className="mt-4 flex justify-between border-t border-slate-100 pt-3"><button type="button" onClick={() => selectDate(today)} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Hoy</button><p className="self-center text-[11px] text-slate-500"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />Día con caja</p></div>
            </div>
          ) : null}
        </div>

        {!selectedClose && isToday && !isCashSnapshotLoading ? (
          <V2Card className={`mt-3 flex items-center justify-between gap-8 ${liveTotalSales > 0 ? "border-red-200 bg-red-50/70" : "border-emerald-200 bg-emerald-50/70"}`}>
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${liveTotalSales > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}><CircleDollarSign size={24} /></div>
              <div><h2 className="font-semibold text-slate-950">{liveTotalSales > 0 ? `Hay ${money(liveTotalSales)} cobrados sin caja abierta` : "La caja de hoy todavía no está abierta"}</h2><p className="mt-1 text-sm text-slate-600">{liveTotalSales > 0 ? "Abrí la caja para registrar correctamente la jornada." : "Indicá cuánto efectivo queda como fondo inicial."}</p></div>
            </div>
            <div className="flex items-end gap-3"><V2Field label="Fondo inicial"><V2Input className="w-48" type="number" min="0" value={openingValue} onChange={(event) => setOpeningValue(event.target.value)} /></V2Field><V2Button variant="primary" onClick={openCash} disabled={isCashMutating}>Abrir caja</V2Button></div>
          </V2Card>
        ) : null}

        {isSupabasePersistence ? (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <strong>Caja conectada a Supabase.</strong>{" "}
            Apertura y cobros de Reservas son persistentes. Cierre, movimientos manuales, Gastos y Envíos siguen bloqueados hasta su corte canónico.
          </div>
        ) : null}

        {cashOperationError ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {cashOperationError}
          </div>
        ) : null}

        <div className="mt-3 grid shrink-0 grid-cols-5 gap-3">
          <V2MetricCard
            label="Ventas cobradas"
            value={money(displayTotalSales)}
            helper={isSupabasePersistence ? "Reservas cobradas persistentes" : "Operaciones completadas"}
            tone="green"
            icon={<CircleDollarSign size={21} />}
          />
          <V2MetricCard
            label={isSupabasePersistence ? "Efectivo registrado" : "Efectivo esperado"}
            value={money(displayExpected)}
            helper={isSupabasePersistence ? "Fondo + cobros; sin Gastos" : "Fondo + efectivo - gastos"}
            tone="green"
            icon={<Banknote size={21} />}
          />
          <V2MetricCard
            label="Gastos en efectivo"
            value={isSupabasePersistence ? "—" : money(selectedClose?.status === "closed" ? Number(selectedClose.cashExpensesSnapshot) || 0 : cashExpenses)}
            helper={isSupabasePersistence ? "Pendiente de persistencia" : "Gastos pagados del día"}
            tone="orange"
            icon={<ArrowDownToLine size={21} />}
          />
          <V2MetricCard
            label="Gastos de tarjeta"
            value={isSupabasePersistence ? "—" : money(cardExpenses)}
            helper={isSupabasePersistence ? "Pendiente de persistencia" : "Tarjeta, MP y transferencia"}
            tone="blue"
            icon={<CreditCard size={21} />}
          />
          <V2MetricCard label="Diferencia" value={selectedClose?.status === "closed" ? money(Number(selectedClose.difference) || 0) : "—"} helper={selectedClose?.status === "closed" ? "Contado - esperado" : "Disponible al cerrar"} tone={selectedClose?.status === "closed" && Number(selectedClose.difference) !== 0 ? "red" : "slate"} icon={<LockKeyhole size={21} />} />
        </div>

        <div className="mt-3 grid min-h-0 flex-1 grid-cols-[1fr_1.2fr] gap-3">
          <V2Card className="min-h-0 overflow-hidden">
            <h2 className="font-semibold text-slate-950">Cobros por método</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isSupabasePersistence
                ? "Cobros persistentes de Reservas vinculados a la caja seleccionada."
                : "Solo reservas y envíos completados en la fecha seleccionada."}
            </p>
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
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-slate-900">Movimientos manuales</h3><p className="mt-0.5 text-xs text-slate-500">{isSupabasePersistence ? "Pendientes del próximo corte canónico." : "Ingresos y retiros de efectivo con trazabilidad."}</p></div><span className={`text-sm font-bold ${adjustment >= 0 ? "text-emerald-700" : "text-red-600"}`}>{money(adjustment)}</span></div>
              <div className="mt-3 max-h-36 space-y-2 overflow-y-auto pr-1">
                {movements.map((movement) => <div key={movement.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{movement.reason}</p><p className="text-[11px] text-slate-500">{dateTimeLabel(movement.createdAt)}</p></div><div className="flex items-center gap-2"><span className={`text-xs font-bold ${movement.type === "income" ? "text-emerald-700" : "text-red-600"}`}>{movement.type === "income" ? "+" : "−"}{money(movement.amount)}</span>{isToday && selectedClose?.status === "open" && !isSupabasePersistence ? <button type="button" onClick={() => removeMovement(movement.id)} className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar movimiento"><Trash2 size={14} /></button> : null}</div></div>)}
                {!movements.length && legacyAdjustment === 0 ? <p className="rounded-lg border border-dashed border-slate-200 py-5 text-center text-xs text-slate-500">Sin movimientos manuales.</p> : null}
                {!movements.length && legacyAdjustment !== 0 ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Ajuste anterior: {money(legacyAdjustment)}</div> : null}
              </div>
            </div>
            {selectedClose?.status === "closed" && selectedClose.notes ? <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"><span className="font-semibold text-slate-800">Nota del cierre:</span> {selectedClose.notes}</div> : null}
          </V2Card>

          <V2Card className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex items-center gap-2"><History size={18} className="text-slate-500" /><h2 className="font-semibold text-slate-950">Historial de cierres</h2></div>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {history.length ? <div className="space-y-2">{history.map((item) => <button type="button" onClick={() => selectDate(item.date)} key={item.id} className={`grid w-full grid-cols-[100px_1fr_1fr_1fr] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition hover:border-emerald-300 hover:bg-emerald-50/40 ${item.date === selectedDate ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200"}`}><p className="font-semibold text-slate-900">{dateLabel(item.date)}</p><div><p className="text-xs text-slate-500">Esperado</p><p className="font-semibold">{money(Number(item.expectedCash) || 0)}</p></div><div><p className="text-xs text-slate-500">Contado</p><p className="font-semibold">{money(Number(item.actualCash) || 0)}</p></div><div><p className="text-xs text-slate-500">Diferencia</p><p className={`font-bold ${Number(item.difference) === 0 ? "text-emerald-700" : "text-red-600"}`}>{money(Number(item.difference) || 0)}</p></div></button>)}</div> : <div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">Todavía no hay cierres registrados.</div>}
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
              <div className="flex justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm"><span className="text-slate-500">Movimientos manuales</span><strong className={adjustment >= 0 ? "text-emerald-700" : "text-red-600"}>{money(adjustment)}</strong></div>
              <V2Field label="Efectivo contado"><V2Input type="number" min="0" value={actualValue} onChange={(event) => setActualValue(event.target.value)} /></V2Field>
              <div className="flex justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm"><span className="text-slate-500">Diferencia prevista</span><strong className={(Number(actualValue) || 0) - expectedCash === 0 ? "text-emerald-700" : "text-red-600"}>{money((Number(actualValue) || 0) - expectedCash)}</strong></div>
              <V2Field label="Nota del cierre"><V2Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional: explicar diferencias o movimientos especiales." /></V2Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4"><V2Button variant="secondary" onClick={() => setShowClose(false)}>Cancelar</V2Button><V2Button variant="primary" icon={<LockKeyhole size={16} />} onClick={closeCash}>Confirmar cierre</V2Button></div>
          </div>
        </div>
      ) : null}

      {showMovement ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" onClick={() => setShowMovement(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Caja abierta</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Registrar movimiento</h2></div><button type="button" onClick={() => setShowMovement(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>
            <div className="space-y-4 p-5">
              <V2Field label="Tipo"><V2Select value={movementType} onChange={(event) => setMovementType(event.target.value as CashMovement["type"])}><option value="income">Ingreso de efectivo</option><option value="withdrawal">Retiro de efectivo</option></V2Select></V2Field>
              <V2Field label="Importe"><V2Input type="number" min="0" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} /></V2Field>
              <V2Field label="Motivo" helper="Obligatorio para mantener trazabilidad."><V2Input value={movementReason} onChange={(event) => setMovementReason(event.target.value)} placeholder="Ej.: retiro para cambio o ingreso extraordinario" /></V2Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4"><V2Button variant="secondary" onClick={() => setShowMovement(false)}>Cancelar</V2Button><V2Button variant="primary" onClick={addMovement}>Guardar movimiento</V2Button></div>
          </div>
        </div>
      ) : null}
    </V2AppShell>
  );
}
