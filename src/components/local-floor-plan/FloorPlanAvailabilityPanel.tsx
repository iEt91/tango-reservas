"use client";

import type { Reservation, TableOccupancySummary } from "@/data/types";

const SHOW_DEBUG = false;

type FloorPlanAvailabilityPanelProps = {
  onOpenAssignTable: (reservation: Reservation) => void;
  slotOccupancy: TableOccupancySummary;
  debugInfo?: {
    selectedDate: string;
    selectedTime: string;
    reservationsLoaded: number;
    activeReservations: number;
    assignedReservationsForSelectedSlot: number;
    firstActiveReservationId: string | null;
  } | null;
};

export function FloorPlanAvailabilityPanel({
  onOpenAssignTable,
  slotOccupancy,
  debugInfo,
}: FloorPlanAvailabilityPanelProps) {
  const reservationsWithTable = Object.values(slotOccupancy.assignmentsByTableId)
    .flat()
    .reduce((unique, reservation) => {
      if (!unique.some((entry) => entry.id === reservation.id)) {
        unique.push(reservation);
      }

      return unique;
    }, [] as Reservation[]);

  const activeReservationsCount =
    reservationsWithTable.length + slotOccupancy.reservationsWithoutTable.length;
  const conflictCount = slotOccupancy.conflictCount ?? 0;
  const availableTableCount = slotOccupancy.availableTableIds?.length ?? 0;
  const occupiedTableCount = slotOccupancy.occupiedTableIds.length;
  const capacityAvailable = slotOccupancy.capacityAvailable ?? 0;
  const capacityOccupied = slotOccupancy.capacityOccupied ?? 0;

  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-black/20 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Disponibilidad interna
          </p>
          <h2 className="mt-1 text-sm font-semibold text-white">
            Mesa, ocupacion y reservas sin asignar
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-300">
            Este panel usa la logica interna de mesas para mostrar ocupacion,
            conflictos y reservas que todavia no tienen mesa asignada.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-slate-200">
          <Badge label="Reservas activas" value={activeReservationsCount} />
          <Badge label="Sin mesa" value={slotOccupancy.reservationsWithoutTable.length} tone="cyan" />
          <Badge label="Mesas disponibles" value={availableTableCount} tone="emerald" />
          <Badge label="Mesas ocupadas" value={occupiedTableCount} tone="amber" />
          <Badge label="Capacidad libre" value={capacityAvailable} tone="emerald" />
          <Badge label="Capacidad ocupada" value={capacityOccupied} tone="rose" />
          {conflictCount > 0 ? (
            <Badge label="Conflictos" value={conflictCount} tone="rose" />
          ) : null}
        </div>
      </div>

      {slotOccupancy.reservationsWithoutTable.length > 0 ? (
        <div className="mt-4 grid gap-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Reservas sin mesa para este horario
          </p>
          {slotOccupancy.reservationsWithoutTable.map((reservation) => (
            <div
              key={reservation.id}
              className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {reservation.customerName}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {reservation.reservationTime} · {reservation.partySize} personas ·{" "}
                  {reservation.joinedTableLabel ?? reservation.tableLabel ?? "Sin mesa"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenAssignTable(reservation)}
                className="inline-flex items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3.5 py-2 text-xs font-medium text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-500/15"
              >
                Asignar mesa
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {SHOW_DEBUG && process.env.NODE_ENV !== "production" && debugInfo ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-[11px] text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Debug plano
          </p>
          <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            <span>Fecha: {debugInfo.selectedDate || "--"}</span>
            <span>Hora: {debugInfo.selectedTime || "--:--"}</span>
            <span>Reservas cargadas: {debugInfo.reservationsLoaded}</span>
            <span>Reservas activas: {debugInfo.activeReservations}</span>
            <span>Asignadas en slot: {debugInfo.assignedReservationsForSelectedSlot}</span>
            <span>
              Primera activa: {debugInfo.firstActiveReservationId ?? "ninguna"}
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type BadgeProps = {
  label: string;
  value: number;
  tone?: "default" | "cyan" | "emerald" | "amber" | "rose";
};

function Badge({ label, value, tone = "default" }: BadgeProps) {
  const toneStyles =
    tone === "cyan"
      ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
      : tone === "emerald"
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : tone === "amber"
          ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
          : tone === "rose"
            ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
            : "border-white/10 bg-slate-900/70 text-slate-200";

  return (
    <span className={`rounded-full border px-3 py-1 ${toneStyles}`}>
      {label}: {value}
    </span>
  );
}
