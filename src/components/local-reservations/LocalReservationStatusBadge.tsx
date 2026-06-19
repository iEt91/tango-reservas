import type { ReservationStatus } from "@/data/types";

type LocalReservationStatusBadgeProps = {
  status: ReservationStatus;
};

export function LocalReservationStatusBadge({
  status,
}: LocalReservationStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[13px] font-semibold leading-none ring-1 ${
        status === "pending"
          ? "bg-amber-500/15 text-amber-200 ring-amber-400/20"
          : status === "confirmed"
            ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20"
            : status === "cancelled"
              ? "bg-rose-500/15 text-rose-200 ring-rose-400/20"
              : status === "completed"
                ? "bg-sky-500/15 text-sky-200 ring-sky-400/20"
                : "bg-orange-500/15 text-orange-200 ring-orange-400/20"
      }`}
    >
      {status === "pending"
        ? "Pendiente"
        : status === "confirmed"
          ? "Confirmada"
          : status === "cancelled"
            ? "Cancelada"
            : status === "completed"
              ? "Completada"
              : "No-show"}
    </span>
  );
}
