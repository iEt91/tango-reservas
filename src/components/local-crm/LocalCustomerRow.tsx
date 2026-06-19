import type { Customer } from "@/data/types";
import {
  classifyCustomer,
  getCustomerEstimatedSpend,
  getCustomerFavoriteServices,
  getCustomerReservationHistory,
  getCustomerSuggestedTags,
} from "@/lib/data/crm";

type LocalCustomerRowProps = {
  customer: Customer;
  onOpenDetail: (customer: Customer) => void;
  variant?: "table" | "card";
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Sin dato";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value: number | null) {
  if (value == null) {
    return "Sin precio";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

async function copyValue(value: string) {
  if (!value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Silently ignore clipboard errors in local/mock mode.
  }
}

export function LocalCustomerRow({
  customer,
  onOpenDetail,
  variant = "table",
}: LocalCustomerRowProps) {
  const history = getCustomerReservationHistory(customer.id);
  const totalPeople = history.reduce((sum, reservation) => sum + reservation.partySize, 0);
  const commercialState = classifyCustomer(customer);
  const favoriteServices = getCustomerFavoriteServices(customer.id).slice(0, 2);
  const suggestedTags = getCustomerSuggestedTags(customer).slice(0, 3);
  const estimatedSpend = getCustomerEstimatedSpend(customer.id);

  return (
    <article
      className={`grid gap-3 px-4 py-3 sm:px-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.05fr)_minmax(0,0.95fr)_auto] xl:items-start ${
        variant === "card"
          ? "rounded-[1.35rem] border border-white/10 bg-slate-950/70 shadow-2xl shadow-black/20"
          : ""
      }`}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 text-[1.05rem] font-semibold tracking-tight text-white">
            {customer.name}
          </p>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${
              commercialState.key === "vip"
                ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
                : commercialState.key === "risk"
                  ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
                  : commercialState.key === "recurrent"
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                    : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
            }`}
          >
            {commercialState.label}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
            {customer.totalReservations} reservas
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
            {totalPeople} personas
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
            {customer.phone}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
            {customer.email ?? "Sin email"}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {customer.tags.length > 0 ? (
            customer.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-cyan-100"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-400">
              Sin tags
            </span>
          )}
        </div>

        {suggestedTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {suggestedTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-amber-100"
              >
                Sugerido: {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-1.5 text-[11px] text-slate-300 sm:grid-cols-2">
        <InfoLine label="Última reserva" value={formatDateTime(customer.lastReservationAt)} />
        <InfoLine
          label="Próxima reserva"
          value={customer.nextReservationAt ? formatDateTime(customer.nextReservationAt) : "Sin próxima"}
        />
        <InfoLine label="Cancelaciones" value={String(customer.cancelledReservations)} />
        <InfoLine label="No-show" value={String(customer.noShowReservations)} />
      </div>

      <div className="grid gap-1.5 text-[11px] text-slate-300 sm:grid-cols-2">
        <InfoLine label="Confirmadas" value={String(customer.confirmedReservations)} />
        <InfoLine label="Completadas" value={String(customer.completedReservations)} />
        <InfoLine label="Gasto estimado" value={formatMoney(estimatedSpend)} />
        <InfoLine
          label="Servicios top"
          value={
            favoriteServices.length > 0
              ? favoriteServices.map((service) => `${service.name} (${service.count})`).join(" / ")
              : "Sin datos"
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
        <button
          type="button"
          onClick={() => onOpenDetail(customer)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
        >
          Ver detalle
        </button>
        <button
          type="button"
          onClick={() => void copyValue(customer.phone)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
        >
          Copiar teléfono
        </button>
        <button
          type="button"
          onClick={() => void copyValue(customer.email ?? "")}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
        >
          Copiar email
        </button>
      </div>
    </article>
  );
}

type InfoLineProps = {
  label: string;
  value: string;
};

function InfoLine({ label, value }: InfoLineProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-medium text-white">{value}</p>
    </div>
  );
}
