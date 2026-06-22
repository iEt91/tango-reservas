import type { Reservation, ReservationStatus } from "@/data/types";
import { LocalReservationRow } from "@/components/local-reservations/LocalReservationRow";

type GroupedReservations = {
  date: string;
  label: string;
  items: Reservation[];
};

type LocalReservationsListProps = {
  groupedReservations: GroupedReservations[];
  onChangeStatus: (reservationId: string, status: ReservationStatus) => void;
  onOpenAssignTable: (reservation: Reservation) => void;
  onOpenDetail: (reservation: Reservation) => void;
  availabilityByReservationId: Map<
    string,
    {
      label: string;
      reason?: string | null;
      tone?: "cyan" | "amber" | "emerald" | "rose" | "slate";
    }
  >;
  serviceNameById: Map<string, string>;
  tableLabelByReservationId: Map<string, string>;
  compact?: boolean;
};

export function LocalReservationsList({
  groupedReservations,
  onChangeStatus,
  onOpenAssignTable,
  onOpenDetail,
  availabilityByReservationId,
  serviceNameById,
  tableLabelByReservationId,
  compact = false,
}: LocalReservationsListProps) {
  return (
    <section className={compact ? "space-y-3" : "space-y-4"}>
      {groupedReservations.map((group) => (
        <article
          key={group.date}
          className={`overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 ${
            compact ? "bg-white/[0.04]" : ""
          }`}
        >
          <header className={`border-b border-white/10 ${compact ? "px-3 py-2" : "px-4 py-2.5 sm:px-5"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
                  {group.label}
                </p>
                <p className={`mt-1 ${compact ? "text-[10px]" : "text-[11px]"} text-slate-400`}>
                  {group.items.length} reservas en esta fecha
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                {group.items.length} items
              </span>
            </div>
          </header>

          <div className="divide-y divide-white/10">
            {group.items.map((reservation) => (
              <LocalReservationRow
                key={reservation.id}
                reservation={reservation}
                availabilityLabel={availabilityByReservationId.get(reservation.id)?.label}
                availabilityReason={availabilityByReservationId.get(reservation.id)?.reason}
                availabilityTone={availabilityByReservationId.get(reservation.id)?.tone}
                serviceName={
                  reservation.serviceId
                    ? serviceNameById.get(reservation.serviceId) ?? "Servicio eliminado"
                    : "Sin servicio"
                }
                tableLabel={
                  tableLabelByReservationId.get(reservation.id) ??
                  reservation.joinedTableLabel ??
                  reservation.tableLabel ??
                  "Sin mesa"
                }
                onChangeStatus={onChangeStatus}
                onOpenAssignTable={onOpenAssignTable}
                onOpenDetail={onOpenDetail}
                compact={compact}
              />
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
