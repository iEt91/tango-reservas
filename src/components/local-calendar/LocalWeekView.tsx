import type { Reservation } from "@/data/types";
import type { CalendarDaySchedule } from "@/lib/calendar";
import { CalendarReservationItem } from "@/components/local-calendar/CalendarReservationItem";
import { CalendarStatusBadge } from "@/components/local-calendar/CalendarStatusBadge";

type LocalWeekViewProps = {
  daySchedules: CalendarDaySchedule[];
  onChangeStatus?: (reservationId: string, status: Reservation["status"]) => void;
  onOpenDetail: (reservation: Reservation) => void;
  serviceNameById: Map<string, string>;
  showOnlySlotsWithReservations: boolean;
  slotTimes: string[];
  weekLabel: string;
};

function getStatusCount(daySchedule: CalendarDaySchedule, status: Reservation["status"]) {
  return daySchedule.slots.reduce((total, slot) => {
    return (
      total +
      slot.reservations.filter((reservation) => reservation.status === status).length
    );
  }, 0);
}

export function LocalWeekView({
  daySchedules,
  onChangeStatus,
  onOpenDetail,
  serviceNameById,
  showOnlySlotsWithReservations,
  slotTimes,
  weekLabel,
}: LocalWeekViewProps) {
  const hasVisibleSlots = slotTimes.length > 0;

  return (
    <section className="space-y-4">
      <header className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3.5 shadow-2xl shadow-black/20 sm:px-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
              Vista semana
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Semana {weekLabel}</h3>
          </div>
          <p className="text-xs text-slate-400">
            Grilla operativa simple por dia y horario.
          </p>
        </div>
      </header>

      <div className="hidden overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 xl:block">
        {!hasVisibleSlots && showOnlySlotsWithReservations ? (
          <div className="p-5">
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
              No hay reservas que coincidan con estos filtros.
            </div>
          </div>
        ) : (
          <>
        <div className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))] border-b border-white/10 bg-slate-950/60 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">
          <div>Horario</div>
          {daySchedules.map((daySchedule) => (
            <div key={daySchedule.date}>{daySchedule.label}</div>
          ))}
        </div>

        <div className="divide-y divide-white/10">
          {slotTimes.map((time) => (
            <div
              key={time}
              className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))] divide-x divide-white/10"
            >
              <div className="flex items-center border-r border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-white">
                {time}
              </div>

              {daySchedules.map((daySchedule) => {
                const slot = daySchedule.slots.find((entry) => entry.time === time);

                return (
                  <div
                    key={`${daySchedule.date}-${time}`}
                    className="min-h-[110px] px-3 py-3"
                  >
                    {!slot ? (
                      <div className="text-xs text-slate-500">-</div>
                    ) : slot.isBreak ? (
                      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-100">
                        Descanso
                      </div>
                    ) : slot.reservations.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CalendarStatusBadge status={slot.reservations[0].status} />
                          <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                            {slot.reservations.length} reservas
                          </span>
                          {(slot.unassignedReservationsCount ?? 0) > 0 ? (
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-cyan-100">
                              {slot.unassignedReservationsCount} sin mesa
                            </span>
                          ) : null}
                          {slot.hasTableConflicts ? (
                            <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-rose-100">
                              Conflicto
                            </span>
                          ) : null}
                        </div>

                        <div className="max-h-[240px] space-y-1.5 overflow-y-auto pr-1">
                          {slot.reservations.map((reservation) => (
                            <CalendarReservationItem
                              key={reservation.id}
                              compact
                              reservation={reservation}
                              serviceName={
                                serviceNameById.get(reservation.serviceId) ?? (reservation.serviceId ? "Servicio eliminado" : "Sin servicio")
                              }
                              onChangeStatus={onChangeStatus}
                              onOpenDetail={onOpenDetail}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 px-2.5 py-2 text-xs text-slate-400">
                        Libre
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
          </>
        )}
      </div>

      <div className="space-y-3 xl:hidden">
        {daySchedules.map((daySchedule) => (
          <article
            key={daySchedule.date}
            className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
                  {daySchedule.label}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {daySchedule.slots.length} slots
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                  {daySchedule.slots.reduce((total, slot) => total + slot.reservations.length, 0)} reservas
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100">
                  {daySchedule.slots.reduce(
                    (total, slot) => total + (slot.unassignedReservationsCount ?? 0),
                    0,
                  )} sin mesa
                </span>
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-100">
                  {getStatusCount(daySchedule, "pending")} pendientes
                </span>
              </div>
            </div>

            {daySchedule.message ? (
              <p className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-slate-300">
                {daySchedule.message}
              </p>
            ) : showOnlySlotsWithReservations && daySchedule.slots.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-slate-300">
                No hay reservas que coincidan con estos filtros.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {daySchedule.slots.map((slot) => (
                  <div
                    key={slot.time}
                    className="grid grid-cols-[74px_minmax(0,1fr)] gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{slot.time}</p>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        {slot.reservations.length} reservas
                      </p>
                    </div>

                    <div className="min-w-0">
                      {slot.isBreak ? (
                        <p className="text-sm text-amber-100">En descanso</p>
                      ) : slot.reservations.length > 0 ? (
                        <div className="space-y-1.5">
                          {slot.reservations.map((reservation) => (
                            <CalendarReservationItem
                              key={reservation.id}
                              compact
                              reservation={reservation}
                              serviceName={
                                serviceNameById.get(reservation.serviceId) ?? (reservation.serviceId ? "Servicio eliminado" : "Sin servicio")
                              }
                              onChangeStatus={onChangeStatus}
                              onOpenDetail={onOpenDetail}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">Libre</p>
                      )}
                    </div>
                  </div>
                ))}
                {daySchedule.slots.length > 5 ? (
                  <p className="text-xs text-slate-500">
                    +{daySchedule.slots.length - 5} slots mas
                  </p>
                ) : null}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
