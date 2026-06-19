import type { BusinessStatus } from "@/data/types";

type BusinessStatusBadgeProps = {
  status: BusinessStatus;
};

const styles: Record<BusinessStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  draft: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  inactive: "bg-slate-500/15 text-slate-300 ring-slate-400/20",
};

const labels: Record<BusinessStatus, string> = {
  active: "Activo",
  draft: "Borrador",
  inactive: "Inactivo",
};

export function BusinessStatusBadge({ status }: BusinessStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
