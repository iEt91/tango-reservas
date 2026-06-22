"use client";

import { useEffect, useState } from "react";
import { AvailabilityPreview } from "@/components/AvailabilityPreview";
import { StatusBadge } from "@/components/StatusBadge";
import type {
  Business,
  BusinessHours,
  DayOfWeek,
  ReservationRules,
  Service,
} from "@/data/types";
import {
  getBusinessHours,
  getBusinessServices,
  getReservationRules,
  createDefaultReservationRules,
  updateBusinessHours,
  updateBusinessServices,
  updateReservationRules,
} from "@/lib/scheduling";
import {
  initialBusinessHours,
  initialReservationRules,
  initialServices,
} from "@/mocks/scheduling";

type BusinessSettingsFormProps = {
  business: Business;
};

const dayLabels: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miercoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sabado",
  sunday: "Domingo",
};

const dayOrder: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function createFallbackRules(businessId: string): ReservationRules {
  return createDefaultReservationRules(businessId);
}

function normalizeHours(businessId: string, hours: BusinessHours[]) {
  const map = new Map(hours.map((entry) => [entry.dayOfWeek, entry]));

  return dayOrder.map((dayOfWeek) => {
    const current = map.get(dayOfWeek);

    return (
      current ?? {
        id: `${businessId}-${dayOfWeek}`,
        businessId,
        dayOfWeek,
        isOpen: false,
        openTime: "",
        closeTime: "",
        breakStartTime: null,
        breakEndTime: null,
      }
    );
  });
}

export function BusinessSettingsForm({ business }: BusinessSettingsFormProps) {
  const [hours, setHours] = useState<BusinessHours[]>(() =>
    normalizeHours(
      business.id,
      initialBusinessHours.filter((entry) => entry.businessId === business.id),
    ),
  );
  const [rules, setRules] = useState<ReservationRules>(() => {
    return (
      initialReservationRules.find((entry) => entry.businessId === business.id) ??
      createFallbackRules(business.id)
    );
  });
  const [services, setServices] = useState<Service[]>(() =>
    initialServices
      .filter((service) => service.businessId === business.id)
      .map((service) => ({ ...service })),
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage("");
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHours(normalizeHours(business.id, getBusinessHours(business.id)));
      setRules(getReservationRules(business.id) ?? createFallbackRules(business.id));
      setServices(getBusinessServices(business.id));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [business.id]);

  function updateHour(
    dayOfWeek: DayOfWeek,
    field: keyof BusinessHours,
    value: string | boolean | null,
  ) {
    setHours((current) =>
      current.map((entry) => {
        if (entry.dayOfWeek !== dayOfWeek) {
          return entry;
        }

        const next: BusinessHours = {
          ...entry,
          [field]: value,
        } as BusinessHours;

        if (field === "isOpen" && !value) {
          next.openTime = "";
          next.closeTime = "";
          next.breakStartTime = null;
          next.breakEndTime = null;
        }

        return next;
      }),
    );
  }

  function saveSettings() {
    const normalizedHours = hours.map((entry) => ({
      ...entry,
      breakStartTime:
        entry.breakStartTime && entry.breakStartTime.trim().length > 0
          ? entry.breakStartTime
          : null,
      breakEndTime:
        entry.breakEndTime && entry.breakEndTime.trim().length > 0
          ? entry.breakEndTime
          : null,
    }));

    const savedHours = updateBusinessHours(business.id, normalizedHours);
    const savedRules = updateReservationRules(business.id, rules);
    const savedServices = updateBusinessServices(business.id, services);

    setHours(normalizeHours(business.id, savedHours));
    setRules(savedRules ?? rules);
    setServices(savedServices);
    setMessage("Guardado simulado. La persistencia real llegara con Supabase.");
  }

  return (
    <section className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">
              Configuracion de horarios
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              {business.name}
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
              Esta pantalla trabaja con datos locales para preparar el motor de
              disponibilidad. Mas adelante estas acciones se reemplazaran por
              Supabase sin cambiar la UI.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
              {business.category}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
              {business.city}
            </span>
            <StatusBadge status={business.status} />
          </div>
        </div>
        {message ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
          >
            {message}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Horarios semanales
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Lunes a domingo
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              Guardado simulado, listo para Supabase luego
            </p>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {hours.map((entry) => (
              <article
                key={entry.id}
                className="rounded-3xl border border-white/10 bg-slate-950/60 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {dayLabels[entry.dayOfWeek]}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {entry.isOpen ? "Abierto" : "Cerrado"}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                    <input
                      type="checkbox"
                      checked={entry.isOpen}
                      onChange={(event) =>
                        updateHour(entry.dayOfWeek, "isOpen", event.target.checked)
                      }
                      className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
                    />
                    Activo
                  </label>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Apertura
                    </span>
                    <input
                      type="time"
                      value={entry.openTime}
                      disabled={!entry.isOpen}
                      onChange={(event) =>
                        updateHour(entry.dayOfWeek, "openTime", event.target.value)
                      }
                      className="input-base disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Cierre
                    </span>
                    <input
                      type="time"
                      value={entry.closeTime}
                      disabled={!entry.isOpen}
                      onChange={(event) =>
                        updateHour(entry.dayOfWeek, "closeTime", event.target.value)
                      }
                      className="input-base disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Descanso inicio
                    </span>
                    <input
                      type="time"
                      value={entry.breakStartTime ?? ""}
                      disabled={!entry.isOpen}
                      onChange={(event) =>
                        updateHour(
                          entry.dayOfWeek,
                          "breakStartTime",
                          event.target.value || null,
                        )
                      }
                      className="input-base disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Descanso fin
                    </span>
                    <input
                      type="time"
                      value={entry.breakEndTime ?? ""}
                      disabled={!entry.isOpen}
                      onChange={(event) =>
                        updateHour(
                          entry.dayOfWeek,
                          "breakEndTime",
                          event.target.value || null,
                        )
                      }
                      className="input-base disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Reglas de reserva
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Motor de disponibilidad
            </h2>

            <div className="mt-6 grid gap-4">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Duracion del slot
                </span>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={rules.slotDurationMinutes}
                  onChange={(event) =>
                    setRules((current) => ({
                      ...current,
                      slotDurationMinutes: Number(event.target.value),
                    }))
                  }
                  className="input-base"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Capacidad por slot
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={rules.maxReservationsPerSlot}
                  onChange={(event) =>
                    setRules((current) => ({
                      ...current,
                      maxReservationsPerSlot: Number(event.target.value),
                    }))
                  }
                  className="input-base"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Anticipacion minima
                </span>
                <input
                  type="number"
                  min={0}
                  step={15}
                  value={rules.minNoticeMinutes}
                  onChange={(event) =>
                    setRules((current) => ({
                      ...current,
                      minNoticeMinutes: Number(event.target.value),
                    }))
                  }
                  className="input-base"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Dias maximos hacia adelante
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={rules.maxDaysAhead}
                  onChange={(event) =>
                    setRules((current) => ({
                      ...current,
                      maxDaysAhead: Number(event.target.value),
                    }))
                  }
                  className="input-base"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Limite de cancelacion en horas
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={rules.cancellationLimitHours}
                  onChange={(event) =>
                    setRules((current) => ({
                      ...current,
                      cancellationLimitHours: Number(event.target.value),
                    }))
                  }
                  className="input-base"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleField
                  label="Requiere confirmacion"
                  checked={rules.requiresConfirmation}
                  onChange={(checked) =>
                    setRules((current) => ({
                      ...current,
                      requiresConfirmation: checked,
                    }))
                  }
                />
                <ToggleField
                  label="Permite cancelacion"
                  checked={rules.allowCancellation}
                  onChange={(checked) =>
                    setRules((current) => ({
                      ...current,
                      allowCancellation: checked,
                    }))
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Servicios
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Listado mock
            </h2>
            <div className="mt-6 space-y-3">
              {services.map((service) => (
                <article
                  key={service.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {service.name}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        {service.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        service.isActive
                          ? "bg-emerald-500/15 text-emerald-200"
                          : "bg-slate-500/15 text-slate-300"
                      }`}
                    >
                      {service.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
                    <p>Duracion: {service.durationMinutes} min</p>
                    <p>Capacidad: {service.capacity}</p>
                    <p>
                      Precio:{" "}
                      {typeof service.price === "number"
                        ? `$ ${service.price.toLocaleString("es-AR")}`
                        : "Sin precio"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
        <AvailabilityPreview business={business} variant="elegant" />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveSettings}
          className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Guardar configuracion
        </button>
        <p className="text-sm text-slate-400">
          El guardado es simulado. La persistencia real llegara con Supabase.
        </p>
      </div>
    </section>
  );
}

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
      />
      <span>{label}</span>
    </label>
  );
}
