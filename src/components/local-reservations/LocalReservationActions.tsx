import type { Reservation, ReservationStatus } from "@/data/types";

const statusActions: Array<{ label: string; status: ReservationStatus }> = [
  { label: "Confirmar", status: "confirmed" },
  { label: "Cancelar", status: "cancelled" },
  { label: "Completar", status: "completed" },
  { label: "No-show", status: "no_show" },
];

type LocalReservationActionsProps = {
  reservation: Reservation;
  onChangeStatus: (reservationId: string, status: ReservationStatus) => void;
};

export function LocalReservationActions({
  reservation,
  onChangeStatus,
}: LocalReservationActionsProps) {
  const isConfirmed = reservation.status === "confirmed";
  const isCancelled = reservation.status === "cancelled";
  const isCompleted = reservation.status === "completed";
  const isNoShow = reservation.status === "no_show";

  return (
    <div className="grid w-full grid-cols-2 gap-1.5 xl:min-w-[312px]">
      {statusActions.map((action) => {
        const isDisabled =
          action.status === reservation.status ||
          (action.status === "confirmed" && isConfirmed) ||
          (action.status === "cancelled" && isCancelled) ||
          (action.status === "completed" && isCompleted) ||
          (action.status === "no_show" && isNoShow);

        return (
          <button
            key={action.status}
            type="button"
            onClick={() => onChangeStatus(reservation.id, action.status)}
            disabled={isDisabled}
            className={`inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border px-3 py-2.5 text-[11px] font-medium leading-none transition ${
              isDisabled
                ? "cursor-not-allowed border-white/5 bg-white/5 text-slate-500"
                : action.status === "confirmed"
                  ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/20 hover:text-white"
                  : action.status === "cancelled"
                    ? "border-rose-400/20 bg-rose-500/15 text-rose-100 hover:bg-rose-500/20 hover:text-white"
                    : action.status === "completed"
                      ? "border-sky-400/20 bg-sky-500/15 text-sky-100 hover:bg-sky-500/20 hover:text-white"
                      : "border-orange-400/20 bg-orange-500/15 text-orange-100 hover:bg-orange-500/20 hover:text-white"
            }`}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
