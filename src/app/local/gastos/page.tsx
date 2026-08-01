"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, CalendarDays, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, ReceiptText, Search, Trash2, WalletCards, X } from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card, V2MetricCard } from "@/components/v2/v2-card";
import { V2Field, V2Input, V2Select } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import { V2_OPERATIONAL_EVENTS, V2_OPERATIONAL_STORAGE_KEYS } from "@/lib/v2-operational-storage";

const STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.expenses;
const UPDATE_EVENT = V2_OPERATIONAL_EVENTS.expenses;
const CASH_REGISTER_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.cashRegister;

type Status = "paid" | "pending";
type VisualStatus = Status | "overdue";
type Expense = {
  id: string;
  businessId: string;
  date: string;
  dueDate?: string;
  description: string;
  provider: string;
  category: string;
  amount: number;
  status: Status;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
};

const emptyForm = {
  date: "",
  description: "",
  provider: "",
  category: "Servicios",
  amount: "",
  status: "pending" as Status,
  paymentMethod: "Efectivo",
};

function today() {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function monthData(value: string) {
  const date = new Date(`${value}T12:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    label: new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date),
    firstDay: new Date(year, month, 1).getDay(),
    days: new Date(year, month + 1, 0).getDate(),
    year,
    month,
  };
}

function longDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function visualStatus(expense: Expense): VisualStatus {
  const dueDate = expense.dueDate ?? expense.date;
  return expense.status === "pending" && dueDate < today() ? "overdue" : expense.status;
}

function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR").format(new Date(`${value}T12:00:00`));
}

function monthLabel() {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date());
}

function readExpenses(): Expense[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Expense[]) : [];
  } catch {
    return [];
  }
}

function getCashRegisterError(date: string) {
  try {
    const records = JSON.parse(
      window.localStorage.getItem(CASH_REGISTER_STORAGE_KEY) ?? "[]",
    ) as Array<{ date?: string; status?: string }>;
    const cashRegister = records.find((record) => record.date === date);

    if (cashRegister?.status === "open") return "";
    if (cashRegister?.status === "closed") {
      return "La caja de este día está cerrada. Reabrila antes de modificar un pago en efectivo.";
    }
    return "No hay una caja abierta para este día. Abrila antes de registrar un pago en efectivo.";
  } catch {
    return "No se pudo comprobar el estado de la caja. Revisala antes de registrar el pago.";
  }
}

function isCashPayment(paymentMethod: string) {
  return paymentMethod.trim().toLowerCase() === "efectivo";
}

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | VisualStatus>("all");
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarMonth, setCalendarMonth] = useState(() => monthStart(today()));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm, date: today() });
  const [cashRegisterError, setCashRegisterError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  useEffect(() => {
    const refresh = () => setExpenses(readExpenses());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(UPDATE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(UPDATE_EVENT, refresh);
    };
  }, []);

  function persist(next: Expense[]) {
    setExpenses(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(UPDATE_EVENT));
  }

  const paid = expenses.filter((expense) => expense.status === "paid");
  const pending = expenses.filter((expense) => expense.status === "pending");
  const currentMonth = today().slice(0, 7);
  const paidThisMonth = paid.filter((expense) => expense.date.startsWith(currentMonth));
  const categories = useMemo(() => [...new Set(expenses.map((expense) => expense.category).filter(Boolean))].sort(), [expenses]);
  const expenseDates = useMemo(() => new Set(expenses.map((expense) => expense.date)), [expenses]);
  const selectedMonthData = monthData(calendarMonth);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return expenses
      .filter((expense) => expense.date === selectedDate)
      .filter((expense) => !term || `${expense.description} ${expense.provider}`.toLowerCase().includes(term))
      .filter((expense) => category === "all" || expense.category === category)
      .filter((expense) => status === "all" || visualStatus(expense) === status)
      .sort((left, right) => right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt));
  }, [expenses, selectedDate, search, category, status]);

  function selectDate(value: string) {
    setSelectedDate(value);
    setCalendarMonth(monthStart(value));
    setIsCalendarOpen(false);
  }

  function moveDay(days: number) {
    selectDate(addDays(selectedDate, days));
  }

  function moveMonth(months: number) {
    const date = new Date(`${calendarMonth}T12:00:00`);
    date.setMonth(date.getMonth() + months);
    setCalendarMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`);
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm, date: today() });
    setCashRegisterError("");
    setIsOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditingId(expense.id);
    setForm({
      date: expense.date,
      description: expense.description,
      provider: expense.provider,
      category: expense.category,
      amount: String(expense.amount),
      status: expense.status,
      paymentMethod: expense.paymentMethod,
    });
    setCashRegisterError("");
    setIsOpen(true);
  }

  function saveExpense() {
    const amount = Number(form.amount);
    if (!form.date || !form.description.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const previousExpense = editingId
      ? expenses.find((expense) => expense.id === editingId) ?? null
      : null;
    const timestamp = new Date().toISOString();
    const isPayingPendingExpense = Boolean(
      previousExpense?.status === "pending" && form.status === "paid",
    );
    const isReturningPaidExpenseToPending = Boolean(
      previousExpense?.status === "paid" && form.status === "pending",
    );
    const persistedDate = isPayingPendingExpense
      ? today()
      : isReturningPaidExpenseToPending
        ? previousExpense?.dueDate ?? form.date
        : form.date;
    const persistedDueDate = isPayingPendingExpense
      ? previousExpense?.dueDate ?? form.date
      : isReturningPaidExpenseToPending
        ? previousExpense?.dueDate ?? form.date
        : previousExpense?.dueDate;
    const affectsPaidCash =
      (form.status === "paid" && isCashPayment(form.paymentMethod)) ||
      Boolean(previousExpense?.status === "paid" && isCashPayment(previousExpense.paymentMethod));
    const financialDataChanged =
      !previousExpense ||
      previousExpense.date !== form.date ||
      previousExpense.amount !== amount ||
      previousExpense.status !== form.status ||
      previousExpense.paymentMethod !== form.paymentMethod;

    if (affectsPaidCash && financialDataChanged) {
      const affectedDates = [
        form.status === "paid" && isCashPayment(form.paymentMethod) ? persistedDate : null,
        previousExpense?.status === "paid" && isCashPayment(previousExpense.paymentMethod)
          ? previousExpense.date
          : null,
      ].filter((date, index, dates): date is string => Boolean(date) && dates.indexOf(date) === index);

      for (const date of affectedDates) {
        const error = getCashRegisterError(date);
        if (error) {
          setCashRegisterError(error);
          return;
        }
      }
    }

    if (editingId) {
      persist(expenses.map((expense) => expense.id === editingId ? {
        ...expense,
        ...form,
        date: persistedDate,
        dueDate: persistedDueDate,
        description: form.description.trim(),
        provider: form.provider.trim(),
        amount,
        paidAt: form.status === "paid" ? expense.paidAt ?? timestamp : undefined,
        updatedAt: timestamp,
      } : expense));
    } else {
      persist([{ id: `expense-${Date.now()}`, businessId: "biz_demuru", ...form, description: form.description.trim(), provider: form.provider.trim(), amount, createdAt: timestamp, updatedAt: timestamp }, ...expenses]);
    }
    setIsOpen(false);
  }

  function toggleStatus(expense: Expense) {
    const nextStatus: Status = expense.status === "paid" ? "pending" : "paid";
    const paymentDate = nextStatus === "paid" ? today() : expense.date;

    if (isCashPayment(expense.paymentMethod)) {
      const error = getCashRegisterError(paymentDate);
      if (error) {
        setCashRegisterError(error);
        return;
      }
    }

    const timestamp = new Date().toISOString();
    persist(expenses.map((item) => item.id === expense.id ? {
      ...item,
      status: nextStatus,
      date: nextStatus === "paid" ? paymentDate : item.dueDate ?? item.date,
      dueDate: nextStatus === "paid" ? item.dueDate ?? item.date : item.dueDate,
      paidAt: nextStatus === "paid" ? timestamp : undefined,
      updatedAt: timestamp,
    } : item));
    setCashRegisterError("");
  }

  function removeExpense(id: string) {
    const expense = expenses.find((item) => item.id === id);
    if (!expense) return;

    if (expense.status === "paid" && isCashPayment(expense.paymentMethod)) {
      const error = getCashRegisterError(expense.date);
      if (error) {
        setCashRegisterError(error);
        return;
      }
    }

    setDeleteTarget(expense);
    setDeleteConfirmation("");
  }

  function closeDeleteDialog() {
    setDeleteTarget(null);
    setDeleteConfirmation("");
  }

  function confirmDelete() {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.description) return;
    persist(expenses.filter((item) => item.id !== deleteTarget.id));
    closeDeleteDialog();
  }

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Gastos"
          description="Registrá egresos y separá lo pagado de lo pendiente. Las compras de stock no duplican el costo de recetas en Reportes."
          actions={<V2Button variant="primary" icon={<Plus size={17} />} onClick={openNew}>Nuevo gasto</V2Button>}
        />

        <div className="mt-10 grid shrink-0 grid-cols-4 gap-3">
          <V2MetricCard label="Pagado total" value={money(paid.reduce((sum, expense) => sum + expense.amount, 0))} helper={`${paid.length} gastos`} icon={<Banknote size={20} />} tone="green" />
          <V2MetricCard label="Pendiente" value={money(pending.reduce((sum, expense) => sum + expense.amount, 0))} helper={`${pending.length} compromisos`} icon={<Clock3 size={20} />} tone="orange" />
          <V2MetricCard label="Pagado este mes" value={money(paidThisMonth.reduce((sum, expense) => sum + expense.amount, 0))} helper={monthLabel()} icon={<WalletCards size={20} />} tone="blue" />
          <V2MetricCard label="Registros" value={expenses.length} helper={`${visible.length} visibles`} icon={<ReceiptText size={20} />} tone="purple" />
        </div>

        <V2Card className="mt-3 min-h-0 flex-1 overflow-hidden p-5">
          <div className="grid grid-cols-[minmax(330px,1.15fr)_minmax(240px,1fr)_200px_180px] items-center gap-3 border-b border-slate-200 pb-4">
            <div className="relative flex min-w-0 items-center gap-2">
              <V2Button variant="secondary" onClick={() => moveDay(-1)} aria-label="Día anterior"><ChevronLeft size={17} /></V2Button>
              <button type="button" onClick={() => setIsCalendarOpen((open) => !open)} className="flex h-10 min-w-0 flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-950 transition hover:border-slate-300">
                <span className="truncate capitalize">{longDate(selectedDate)}</span>
                <CalendarDays size={16} className="ml-3 shrink-0 text-slate-400" />
              </button>
              <V2Button variant="secondary" onClick={() => moveDay(1)} aria-label="Día siguiente"><ChevronRight size={17} /></V2Button>

              {isCalendarOpen ? (
                <div className="absolute left-12 top-[calc(100%+0.5rem)] z-40 w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => moveMonth(-1)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Mes anterior"><ChevronLeft size={17} /></button>
                    <p className="text-sm font-semibold capitalize text-slate-950">{selectedMonthData.label}</p>
                    <button type="button" onClick={() => moveMonth(1)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Mes siguiente"><ChevronRight size={17} /></button>
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => <span key={day}>{day}</span>)}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {Array.from({ length: selectedMonthData.firstDay }).map((_, index) => <span key={`empty-${index}`} />)}
                    {Array.from({ length: selectedMonthData.days }, (_, index) => {
                      const day = index + 1;
                      const value = `${selectedMonthData.year}-${String(selectedMonthData.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isSelected = value === selectedDate;
                      const isToday = value === today();
                      return (
                        <button key={value} type="button" onClick={() => selectDate(value)} className={`relative flex h-9 items-center justify-center rounded-lg text-sm font-medium transition ${isSelected ? "bg-emerald-700 text-white" : isToday ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-100"}`}>
                          {day}
                          {expenseDates.has(value) ? <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? "bg-white" : "bg-emerald-500"}`} /> : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-2 text-xs text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Día con gastos</span>
                    <button type="button" onClick={() => selectDate(today())} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">Hoy</button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="relative min-w-[240px]">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <V2Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descripción o proveedor" className="pl-10" />
            </div>
            <V2Select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full">
              <option value="all">Todas las categorías</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </V2Select>
            <V2Select value={status} onChange={(event) => setStatus(event.target.value as "all" | VisualStatus)} className="w-full">
              <option value="all">Todos los estados</option>
              <option value="paid">Pagados</option>
              <option value="pending">Pendientes</option>
              <option value="overdue">Vencidos</option>
            </V2Select>
          </div>

          <div className="mt-3 space-y-2 overflow-y-auto pr-1">
            {visible.map((expense) => {
              const shownStatus = visualStatus(expense);
              const rowClass = shownStatus === "paid" ? "border-emerald-200 bg-emerald-50/80" : shownStatus === "overdue" ? "border-red-200 bg-red-50/80" : "border-orange-200 bg-orange-50/80";
              const badgeClass = shownStatus === "paid" ? "border-emerald-300 bg-emerald-100 text-emerald-800" : shownStatus === "overdue" ? "border-red-300 bg-red-100 text-red-700" : "border-orange-300 bg-orange-100 text-orange-700";
              return (
                <article key={expense.id} className={`grid grid-cols-[110px_minmax(240px,1fr)_140px_160px_120px_76px] items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${rowClass}`}>
                  <p className="text-sm font-semibold text-slate-800">{dateLabel(expense.date)}</p>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{expense.description}</p><p className="truncate text-xs text-slate-500">{expense.provider || "Sin proveedor"} · {expense.paymentMethod}</p></div>
                  <span className="w-fit rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">{expense.category}</span>
                  <p className="text-right text-sm font-bold text-slate-950">{money(expense.amount)}</p>
                  <button type="button" onClick={() => toggleStatus(expense)} className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium ${badgeClass}`}><Clock3 size={14} />{shownStatus === "paid" ? "Pagado" : shownStatus === "overdue" ? "Vencido" : "Pendiente"}</button>
                  <div className="flex justify-end gap-1"><button type="button" onClick={() => openEdit(expense)} className="rounded-lg p-2 text-slate-500 hover:bg-white/70 hover:text-slate-900" aria-label="Editar"><Pencil size={16} /></button><button type="button" onClick={() => removeExpense(expense.id)} className="rounded-lg p-2 text-red-500 hover:bg-white/70 hover:text-red-700" aria-label="Eliminar"><Trash2 size={16} /></button></div>
                </article>
              );
            })}
            {visible.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">No hay gastos para los filtros seleccionados.</div> : null}
          </div>
        </V2Card>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" onClick={() => setIsOpen(false)}>
          <div className="w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{editingId ? "Editar registro" : "Nuevo registro"}</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{editingId ? "Modificar gasto" : "Registrar gasto"}</h2></div><button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>
            <div className="grid grid-cols-2 gap-4 p-5">
              {cashRegisterError ? (
                <div className="col-span-2 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 shrink-0" size={17} />
                  <p className="flex-1">{cashRegisterError}</p>
                  <Link href="/local/caja" className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 font-semibold transition hover:bg-red-100">Ir a Caja</Link>
                </div>
              ) : null}
              <V2Field label="Fecha de pago o vencimiento"><V2Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></V2Field>
              <V2Field label="Monto"><V2Input type="number" min="0" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></V2Field>
              <V2Field label="Descripción"><V2Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ej.: Luz" /></V2Field>
              <V2Field label="Proveedor"><V2Input value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} placeholder="Ej.: CALP" /></V2Field>
              <V2Field label="Categoría"><V2Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{["Servicios", "Alquiler", "Sueldos", "Impuestos", "Mantenimiento", "Marketing", "Otros"].map((item) => <option key={item}>{item}</option>)}</V2Select></V2Field>
              <V2Field label="Método de pago"><V2Select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}>{["Efectivo", "Tarjeta", "Mercado Pago", "Transferencia"].map((item) => <option key={item}>{item}</option>)}</V2Select></V2Field>
              <V2Field label="Estado"><V2Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Status })}><option value="pending">Pendiente</option><option value="paid">Pagado</option></V2Select></V2Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4"><V2Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</V2Button><V2Button variant="primary" onClick={saveExpense}>{editingId ? "Guardar cambios" : "Crear gasto"}</V2Button></div>
          </div>
        </div>
      ) : null}

      {!isOpen && cashRegisterError ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={() => setCashRegisterError("")}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div><p className="text-sm font-semibold text-amber-700">Pago en efectivo</p><h2 className="mt-1 text-xl font-semibold text-slate-950">La caja debe estar abierta</h2></div>
              <button type="button" onClick={() => setCashRegisterError("")} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50" aria-label="Cerrar aviso"><X size={18} /></button>
            </div>
            <p className="p-5 text-sm leading-6 text-slate-600">{cashRegisterError}</p>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <V2Button variant="secondary" onClick={() => setCashRegisterError("")}>Volver</V2Button>
              <Link href="/local/caja" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800">Ir a Caja</Link>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-red-100 p-6">
              <div>
                <p className="text-sm font-semibold text-red-700">Confirmar eliminación</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{deleteTarget.description}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {deleteTarget.provider || "Sin proveedor"} · {money(deleteTarget.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeleteDialog}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm leading-6 text-slate-600">
                Esta acción no se puede deshacer. Para confirmar, escribí exactamente:
              </p>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm font-semibold text-slate-950">
                {deleteTarget.description}
              </div>
              <div className="mt-4">
                <V2Field label="Confirmación">
                  <V2Input
                    autoFocus
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    placeholder={deleteTarget.description}
                  />
                </V2Field>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button variant="secondary" onClick={closeDeleteDialog}>Cancelar</V2Button>
              <V2Button
                variant="danger"
                icon={<Trash2 size={17} />}
                onClick={confirmDelete}
                disabled={deleteConfirmation !== deleteTarget.description}
              >
                Eliminar definitivamente
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}
    </V2AppShell>
  );
}
