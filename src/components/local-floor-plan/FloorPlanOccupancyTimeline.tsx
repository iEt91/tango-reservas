"use client";

import type { TableOccupancySummary } from "@/data/types";
import type { FloorPlanTimelineResult } from "@/lib/floor-plan-timeline";

type FloorPlanOccupancyTimelineProps = {
  date: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  slotOccupancy: TableOccupancySummary;
  timeline: FloorPlanTimelineResult;
  selectedTime: string;
};

export function FloorPlanOccupancyTimeline({
  date,
  onDateChange,
  onTimeChange,
  slotOccupancy,
  timeline,
  selectedTime,
}: FloorPlanOccupancyTimelineProps) {
  const selectedIndex = Math.max(0, timeline.slots.findIndex((slot) => slot.time === selectedTime));
  const selectedSlot = timeline.slots[selectedIndex] ?? null;
  const availableTables = slotOccupancy.availableTableIds?.length ?? 0;
  const occupiedTables = slotOccupancy.occupiedTableIds.length;
  const unassignedReservations = slotOccupancy.reservationsWithoutTable.length;
  const capacityAvailable = slotOccupancy.capacityAvailable ?? 0;

  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-3 py-3 shadow-2xl shadow-black/20 sm:px-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Ocupacion por horario
          </p>
          <h2 className="text-sm font-semibold text-white">
            Timeline de ocupacion del salon
          </h2>
          <p className="max-w-3xl text-xs leading-5 text-slate-300">
            Mueve el horario para ver en vivo mesas ocupadas, reservas sin mesa y
            uniones temporales de mesas segun el slot seleccionado.
          </p>
        </div>

        <label className="space-y-1 xl:min-w-[220px]">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Fecha
          </span>
          <input
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className="input-base"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
          Horario seleccionado: {selectedSlot?.time ?? "--:--"}
        </span>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
          Mesas libres: {availableTables}
        </span>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
          Mesas ocupadas/reservadas: {occupiedTables}
        </span>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
          Reservas sin mesa: {unassignedReservations}
        </span>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
          Capacidad libre: {capacityAvailable}
        </span>
      </div>

      {timeline.isClosed ? (
        <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          El negocio esta cerrado este dia.
        </div>
      ) : timeline.slots.length > 0 ? (
        <div className="mt-3 space-y-2">
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[760px] space-y-2">
              <div className="flex items-start gap-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                {timeline.marks.map((mark, index) => (
                  <div
                    key={`${mark.time}-${mark.label}`}
                    className={`flex min-w-0 flex-1 flex-col items-center text-center ${
                      index % 2 === 1 ? "max-sm:hidden" : ""
                    }`}
                  >
                    <span className="block h-2 w-px bg-white/20" />
                    <span className="mt-1 block truncate text-[10px]">{mark.label}</span>
                  </div>
                ))}
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
                <input
                  type="range"
                  min={0}
                  max={timeline.slots.length - 1}
                  step={1}
                  value={selectedIndex}
                  onChange={(event) =>
                    onTimeChange(timeline.slots[Number(event.target.value)]?.time ?? selectedTime)
                  }
                  className="relative z-10 h-1.5 w-full cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-300">
          No hay horarios disponibles para esta fecha.
        </div>
      )}
    </section>
  );
}
