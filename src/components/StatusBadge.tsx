import type { BusinessStatus, ReservationStatus } from "@/data/types";

type StatusBadgeProps = {
  status: BusinessStatus | ReservationStatus;
};

const styles: Record<StatusBadgeProps["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  draft: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  inactive: "bg-slate-500/15 text-slate-300 ring-slate-400/20",
  pending: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  confirmed: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  cancelled: "bg-rose-500/15 text-rose-300 ring-rose-400/20",
  completed: "bg-sky-500/15 text-sky-300 ring-sky-400/20",
  no_show: "bg-orange-500/15 text-orange-200 ring-orange-400/20",
};

const labels: Record<StatusBadgeProps["status"], string> = {
  active: "Activo",
  draft: "Borrador",
  inactive: "Inactivo",
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No-show",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
