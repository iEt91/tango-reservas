"use client";

type FloorPlanSlotControlsProps = {
  selectedDate: string;
  selectedTime: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  unassignedReservations: number;
  occupiedTables: number;
};

export function FloorPlanSlotControls({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  unassignedReservations,
  occupiedTables,
}: FloorPlanSlotControlsProps) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-black/20 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Ocupacion por horario
          </p>
          <h2 className="text-sm font-semibold text-white">Fecha y hora seleccionada</h2>
          <p className="max-w-3xl text-xs leading-5 text-slate-300">
            El plano toma la ocupacion real de las reservas asignadas para el horario
            seleccionado. Editar fondo sigue funcionando aparte.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Fecha
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="input-base"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Horario
            </span>
            <input
              type="time"
              value={selectedTime}
              onChange={(event) => onTimeChange(event.target.value)}
              className="input-base"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-300">
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
          Mesas ocupadas/reservadas: {occupiedTables}
        </span>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
          Reservas sin mesa: {unassignedReservations}
        </span>
      </div>
    </section>
  );
}
