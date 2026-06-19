import type { Reservation } from "@/data/types";
import { CalendarStatusBadge } from "@/components/local-calendar/CalendarStatusBadge";

type CalendarReservationItemProps = {
  reservation: Reservation;
  serviceName: string;
  compact?: boolean;
  onChangeStatus?: (reservationId: string, status: Reservation["status"]) => void;
  onOpenDetail: (reservation: Reservation) => void;
};

const quickActionOrder: Array<{
  label: string;
  status: Reservation["status"];
  tone: "emerald" | "rose" | "cyan" | "amber";
}> = [
  { label: "Confirmar", status: "confirmed", tone: "emerald" },
  { label: "Cancelar", status: "cancelled", tone: "rose" },
  { label: "Completar", status: "completed", tone: "cyan" },
  { label: "No-show", status: "no_show", tone: "amber" },
];

export function CalendarReservationItem({
  reservation,
  serviceName,
  compact = false,
  onChangeStatus,
  onOpenDetail,
}: CalendarReservationItemProps) {
  const quickActions = quickActionOrder.filter((action) => {
    if (reservation.status === "pending") {
      return true;
    }

    if (reservation.status === "confirmed") {
      return action.status !== "confirmed";
    }

    return false;
  });

  return (
    <article
      className={`grid gap-2 rounded-2xl border border-white/10 bg-slate-950/70 ${
        compact ? "px-2.5 py-2" : "px-3 py-2.5"
      } sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center`}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`min-w-0 font-semibold text-white ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            {reservation.customerName}
          </p>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-300">
            {reservation.partySize} personas
          </span>
        </div>

        <div
          className={`flex flex-wrap items-center gap-2 text-slate-300 ${
            compact ? "text-[10px]" : "text-[11px]"
          }`}
        >
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
            {serviceName}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
            {reservation.joinedTableLabel ?? reservation.tableLabel ?? "Sin mesa"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
            {reservation.source}
          </span>
          {reservation.customerPhone ? (
            <span className="truncate">{reservation.customerPhone}</span>
          ) : null}
        </div>

        {onChangeStatus && quickActions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {quickActions.map((action) => (
              <button
                key={action.status}
                type="button"
                onClick={() => onChangeStatus(reservation.id, action.status)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                  action.tone === "emerald"
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400/40"
                    : action.tone === "rose"
                      ? "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:border-rose-400/40"
                      : action.tone === "cyan"
                        ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:border-cyan-400/40"
                        : "border-amber-400/20 bg-amber-500/10 text-amber-100 hover:border-amber-400/40"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <CalendarStatusBadge status={reservation.status} />
        <button
          type="button"
          onClick={() => onOpenDetail(reservation)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
        >
          Ver detalle
        </button>
      </div>
    </article>
  );
}
