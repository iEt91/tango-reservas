import type { ReservationStatus } from "@/data/types";

type CalendarStatusBadgeProps = {
  status: ReservationStatus;
};

const labelByStatus: Record<ReservationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No-show",
};

const toneByStatus: Record<ReservationStatus, string> = {
  pending: "border-amber-400/20 bg-amber-500/10 text-amber-100",
  confirmed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  cancelled: "border-rose-400/20 bg-rose-500/10 text-rose-100",
  completed: "border-sky-400/20 bg-sky-500/10 text-sky-100",
  no_show: "border-orange-400/20 bg-orange-500/10 text-orange-100",
};

export function CalendarStatusBadge({ status }: CalendarStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${toneByStatus[status]}`}
    >
      {labelByStatus[status]}
    </span>
  );
}
