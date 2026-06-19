import type { Reservation } from "@/data/types";
import type { CalendarDaySchedule } from "@/lib/calendar";
import { CalendarReservationItem } from "@/components/local-calendar/CalendarReservationItem";

type LocalDayViewProps = {
  daySchedule: CalendarDaySchedule;
  onChangeStatus?: (reservationId: string, status: Reservation["status"]) => void;
  onOpenDetail: (reservation: Reservation) => void;
  serviceNameById: Map<string, string>;
  showOnlySlotsWithReservations: boolean;
};

export function LocalDayView({
  daySchedule,
  onChangeStatus,
  onOpenDetail,
  serviceNameById,
  showOnlySlotsWithReservations,
}: LocalDayViewProps) {
  const hasVisibleSlots = daySchedule.slots.length > 0;
  const emptyMessage = daySchedule.message ?? "No hay reservas que coincidan con estos filtros.";

  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20">
      <header className="border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
              Vista dia
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {daySchedule.label}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {daySchedule.businessHours ? (
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                {daySchedule.businessHours.openTime} - {daySchedule.businessHours.closeTime}
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
              {daySchedule.slots.length} slots
            </span>
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
              {daySchedule.slots.reduce(
                (total, slot) => total + (slot.unassignedReservationsCount ?? 0),
                0,
              )} sin mesa
            </span>
            {daySchedule.slots.some((slot) => slot.hasTableConflicts) ? (
              <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[11px] text-rose-100">
                Conflictos de mesa
              </span>
            ) : null}
          </div>
        </div>

        {daySchedule.message ? (
          <p className="mt-2 text-sm text-amber-100">{daySchedule.message}</p>
        ) : null}
      </header>

      {!daySchedule.isOpen ? (
        <div className="p-5">
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
            El negocio esta cerrado este dia.
          </div>
        </div>
      ) : !hasVisibleSlots && showOnlySlotsWithReservations ? (
        <div className="p-5">
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
            {emptyMessage}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {daySchedule.slots.map((slot) => (
            <article
              key={slot.time}
              className="grid gap-3 px-4 py-3 sm:px-5 xl:grid-cols-[110px_minmax(0,1fr)_170px] xl:items-start"
            >
              <div className="flex items-center justify-between gap-3 xl:flex-col xl:items-start xl:justify-start xl:gap-1">
                <div>
                  <p className="text-[1.35rem] font-semibold tracking-tight text-white sm:text-[1.55rem]">
                    {slot.time}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                    {slot.reservations.length} reservas
                  </p>
                </div>

                <div className="xl:hidden">
                  <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                    {slot.isBreak
                      ? "Descanso"
                      : slot.reservations.length > 0
                        ? "Con reservas"
                        : "Libre"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {slot.isBreak ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    En descanso
                  </div>
                ) : slot.reservations.length > 0 ? (
                  slot.reservations.map((reservation) => (
                    <CalendarReservationItem
                      key={reservation.id}
                      compact={false}
                      reservation={reservation}
                      onChangeStatus={onChangeStatus}
                      serviceName={
                        serviceNameById.get(reservation.serviceId) ??
                        (reservation.serviceId ? "Servicio eliminado" : "Sin servicio")
                      }
                      onOpenDetail={onOpenDetail}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-slate-400">
                    Sin reservas
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                {slot.isBreak ? (
                  <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-100">
                    Descanso
                  </span>
                ) : slot.reservations.length > 0 ? (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-100">
                    Con reservas
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                    Libre
                  </span>
                )}
                {!slot.isBreak ? (
                  <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                    {slot.occupiedTableCount} ocupadas
                  </span>
                ) : null}
                {(slot.unassignedReservationsCount ?? 0) > 0 ? (
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-100">
                    {slot.unassignedReservationsCount} sin mesa
                  </span>
                ) : null}
                {slot.hasTableConflicts ? (
                  <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-rose-100">
                    Conflicto
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
