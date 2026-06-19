"use client";

import { useMemo, useState } from "react";
import { calculateAvailability } from "@/lib/availability";
import { getBusinessServices } from "@/data/scheduling";
import type { Business, Service } from "@/data/types";

type AvailabilityPreviewProps = {
  business: Business;
  selectedDate?: string;
  service?: Service | null;
  variant?: "elegant" | "visual" | "minimal";
};

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AvailabilityPreview({
  business,
  selectedDate,
  service,
  variant = "elegant",
}: AvailabilityPreviewProps) {
  const fallbackService =
    service ??
    getBusinessServices(business.id).find((entry) => entry.isActive) ??
    getBusinessServices(business.id)[0] ??
    null;
  const [date, setDate] = useState(selectedDate ?? toDateInputValue());

  const availability = useMemo(
    () =>
      calculateAvailability({
        businessId: business.id,
        date,
        serviceId: fallbackService?.id,
      }),
    [business.id, date, fallbackService?.id],
  );

  const accentStyle =
    variant === "minimal"
      ? "border-white/10 bg-slate-950/60"
      : variant === "visual"
        ? "border-cyan-400/20 bg-slate-950/70"
        : "border-white/10 bg-white/5";

  return (
    <section className={`space-y-5 rounded-[1.75rem] border p-5 ${accentStyle}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Disponibilidad
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            Selector de fecha
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Vista tecnica de horarios disponibles. La reserva real llegara en la
            etapa v0.5, pero la logica ya queda calculada aqui.
          </p>
        </div>

        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Fecha
          </span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="input-base max-w-[220px]"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">
          {fallbackService ? fallbackService.name : "Sin servicio activo"}
        </span>
        {fallbackService ? (
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">
            Duracion {fallbackService.durationMinutes} min
          </span>
        ) : null}
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">
          Capacidad por franja {availability.reservationRules?.maxReservationsPerSlot ?? 0}
        </span>
      </div>

      {availability.message ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          {availability.message}
        </div>
      ) : null}

      {availability.slots.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {availability.slots.map((slot) => (
            <div
              key={slot.time}
              className={`rounded-2xl border px-4 py-3 ${
                slot.available
                  ? "border-emerald-400/20 bg-emerald-500/10"
                  : "border-white/10 bg-slate-950/70"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{slot.time}</p>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                    slot.available
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "bg-white/5 text-slate-400"
                  }`}
                >
                  {slot.available ? "Disponible" : "Completo"}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {slot.available
                  ? `Quedan ${slot.remainingCapacity} lugares`
                  : slot.reason ?? "No disponible"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
          No hay horarios disponibles para la fecha elegida.
        </div>
      )}

      <p className="text-xs leading-6 text-slate-400">
        La creacion real de reservas se implementara en v0.5. Este modulo queda
        separado para poder reemplazarlo luego por un widget completo de
        reservas.
      </p>
    </section>
  );
}
