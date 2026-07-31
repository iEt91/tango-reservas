"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Clock3, Pencil, Plus, ReceiptText, Search, Trash2, WalletCards, X } from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card, V2MetricCard } from "@/components/v2/v2-card";
import { V2Field, V2Input, V2Select } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";

const STORAGE_KEY = "tango-v2-expenses-v1";
const UPDATE_EVENT = "tango-v2-expenses-updated";

type Status = "paid" | "pending";
type VisualStatus = Status | "overdue";
type Expense = {
  id: string;
  businessId: string;
  date: string;
  description: string;
  provider: string;
  category: string;
  amount: number;
  status: Status;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
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

function visualStatus(expense: Expense): VisualStatus {
  return expense.status === "pending" && expense.date < today() ? "overdue" : expense.status;
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

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | VisualStatus>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm, date: today() });

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
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return expenses
      .filter((expense) => !term || `${expense.description} ${expense.provider}`.toLowerCase().includes(term))
      .filter((expense) => category === "all" || expense.category === category)
      .filter((expense) => status === "all" || visualStatus(expense) === status)
      .sort((left, right) => right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt));
  }, [expenses, search, category, status]);

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm, date: today() });
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
    setIsOpen(true);
  }

  function saveExpense() {
    const amount = Number(form.amount);
    if (!form.date || !form.description.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const timestamp = new Date().toISOString();
    if (editingId) {
      persist(expenses.map((expense) => expense.id === editingId ? { ...expense, ...form, description: form.description.trim(), provider: form.provider.trim(), amount, updatedAt: timestamp } : expense));
    } else {
      persist([{ id: `expense-${Date.now()}`, businessId: "biz_demuru", ...form, description: form.description.trim(), provider: form.provider.trim(), amount, createdAt: timestamp, updatedAt: timestamp }, ...expenses]);
    }
    setIsOpen(false);
  }

  function toggleStatus(expense: Expense) {
    const timestamp = new Date().toISOString();
    persist(expenses.map((item) => item.id === expense.id ? { ...item, status: item.status === "paid" ? "pending" : "paid", updatedAt: timestamp } : item));
  }

  function removeExpense(id: string) {
    if (window.confirm("¿Eliminar este gasto?")) persist(expenses.filter((expense) => expense.id !== id));
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
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="relative min-w-0 flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <V2Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descripción o proveedor" className="pl-10" />
            </div>
            <V2Select value={category} onChange={(event) => setCategory(event.target.value)} className="w-[200px]">
              <option value="all">Todas las categorías</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </V2Select>
            <V2Select value={status} onChange={(event) => setStatus(event.target.value as "all" | VisualStatus)} className="w-[180px]">
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
    </V2AppShell>
  );
}
