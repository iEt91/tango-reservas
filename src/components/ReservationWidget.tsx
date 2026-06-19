"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import {
  subscribeReservations,
  createReservation,
  getActiveReservationByPhone,
  getReservationsByBusinessId,
  validatePhone,
} from "@/data/reservations";
import type {
  Business,
  BusinessHours,
  CreateReservationInput,
  Reservation,
  ReservationRules,
  Service,
} from "@/data/types";
import { calculatePublicAvailability } from "@/lib/availability";

type ReservationWidgetProps = {
  business: Business;
  services: Service[];
  rules: ReservationRules;
  hours: BusinessHours[];
  variant?: "elegant" | "visual" | "minimal";
  hoursNotice?: string | null;
};

function toDateInputValue(date = new Date()) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeeklyHoursLabel(hours: BusinessHours[]) {
  const openDays = hours.filter((entry) => entry.isOpen).map((entry) => entry.dayOfWeek);

  if (openDays.length === 0) {
    return "Cerrado toda la semana";
  }

  const labels: Record<string, string> = {
    monday: "Lun",
    tuesday: "Mar",
    wednesday: "Mie",
    thursday: "Jue",
    friday: "Vie",
    saturday: "Sab",
    sunday: "Dom",
  };

  return `Abierto: ${openDays.map((day) => labels[day]).join(" / ")}`;
}

function createInitialServiceId(services: Service[]) {
  return services.find((service) => service.isActive)?.id ?? services[0]?.id ?? "";
}

function isSlotAvailable(
  availabilityTime: string,
  slots: ReturnType<typeof calculatePublicAvailability>["slots"],
  partySize: number,
) {
  return slots.some(
    (slot) =>
      slot.time === availabilityTime &&
      slot.available &&
      slot.remainingCapacity >= partySize,
  );
}

export function ReservationWidget({
  business,
  services,
  rules,
  hours,
  variant = "elegant",
  hoursNotice = null,
}: ReservationWidgetProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const [serviceId, setServiceId] = useState(() => createInitialServiceId(services));
  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [duplicateReservation, setDuplicateReservation] = useState<Reservation | null>(null);
  const [successReservation, setSuccessReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsMounted(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncReservations = () => {
      if (cancelled) {
        return;
      }

      try {
        setReservations(getReservationsByBusinessId(business.id));
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No pudimos cargar las reservas de este negocio.",
          );
        }
      }
    };

    const timeout = window.setTimeout(syncReservations, 0);
    const unsubscribe = subscribeReservations(syncReservations);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [business.id]);

  useEffect(() => {
    if (!isMounted || reservationDate) {
      return;
    }

    const timeout = window.setTimeout(() => setReservationDate(toDateInputValue()), 0);
    return () => window.clearTimeout(timeout);
  }, [isMounted, reservationDate]);

  const service = useMemo(() => {
    if (!isMounted) {
      return null;
    }

    return (
      services.find((entry) => entry.id === serviceId) ??
      services.find((entry) => entry.isActive) ??
      services[0] ??
      null
    );
  }, [isMounted, serviceId, services]);

  const displayedReservations = useMemo(() => (isMounted ? reservations : []), [isMounted, reservations]);
  const effectiveReservationDate = reservationDate;

  const availability = useMemo(
    () => {
      if (!isMounted || !effectiveReservationDate) {
        return {
          status: "invalid_date" as const,
          message: "Cargando disponibilidad...",
          slots: [],
          businessHours: null,
          reservationRules: rules,
          service,
        };
      }

      return calculatePublicAvailability({
        businessId: business.id,
        date: effectiveReservationDate,
        services,
        reservations: displayedReservations,
        hours,
        rules,
        service,
        partySize,
      });
    },
    [
      business.id,
      displayedReservations,
      hours,
      effectiveReservationDate,
      isMounted,
      rules,
      service,
      services,
      partySize,
    ],
  );

  const availableSlots = availability.slots.filter(
    (slot) => slot.available && slot.remainingCapacity >= partySize,
  );
  const weeklyHoursLabel = getWeeklyHoursLabel(hours);

  function clearFeedback() {
    setErrorMessage("");
    setDuplicateReservation(null);
    setSuccessReservation(null);
  }

  function handleServiceChange(nextServiceId: string) {
    clearFeedback();
    setServiceId(nextServiceId);

    const nextService =
      services.find((entry) => entry.id === nextServiceId) ??
      services.find((entry) => entry.isActive) ??
      services[0] ??
      null;

    const nextAvailability = calculatePublicAvailability({
      businessId: business.id,
      date: effectiveReservationDate,
      services,
      reservations: displayedReservations,
      hours,
      rules,
      service: nextService,
      partySize,
    });

    if (!isSlotAvailable(reservationTime, nextAvailability.slots, partySize)) {
      setReservationTime(
        nextAvailability.slots.find(
          (slot) => slot.available && slot.remainingCapacity >= partySize,
        )?.time ?? "",
      );
    }
  }

  function handleDateChange(nextDate: string) {
    clearFeedback();
    setReservationDate(nextDate);

    const nextAvailability = calculatePublicAvailability({
      businessId: business.id,
      date: nextDate,
      services,
      reservations: displayedReservations,
      hours,
      rules,
      service,
      partySize,
    });

    if (!isSlotAvailable(reservationTime, nextAvailability.slots, partySize)) {
      setReservationTime(
        nextAvailability.slots.find(
          (slot) => slot.available && slot.remainingCapacity >= partySize,
        )?.time ?? "",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    if (!customerName.trim()) {
      setErrorMessage("El nombre es obligatorio.");
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMessage("El telefono es obligatorio.");
      return;
    }

    if (!effectiveReservationDate) {
      setErrorMessage("La fecha es obligatoria.");
      return;
    }

    if (!reservationTime) {
      setErrorMessage("Elegi un horario disponible.");
      return;
    }

    if (partySize < 1) {
      setErrorMessage("La cantidad de personas debe ser al menos 1.");
      return;
    }

    if (partySize > 20) {
      setErrorMessage("Por ahora el maximo permitido es 20 personas.");
      return;
    }

    if (!service) {
      setErrorMessage("Elegi un servicio valido.");
      return;
    }

    const phoneValidation = validatePhone(customerPhone);
    if (!phoneValidation.valid) {
      setErrorMessage(
        phoneValidation.error ?? "Ingresá un teléfono válido para poder reservar.",
      );
      return;
    }

    const activeReservation = getActiveReservationByPhone(
      business.id,
      phoneValidation.normalized,
    );
    if (activeReservation) {
      setDuplicateReservation(activeReservation);
      setErrorMessage(
        "Ya tenés una reserva activa con este teléfono. Si querés modificarla, ampliarla o cancelarla, contactate con el local.",
      );
      return;
    }

      const latestAvailability = calculatePublicAvailability({
        businessId: business.id,
        date: effectiveReservationDate,
        services,
        reservations: getReservationsByBusinessId(business.id),
        hours,
        rules,
        service,
      partySize,
    });

    const slot = latestAvailability.slots.find((entry) => entry.time === reservationTime);
    if (!slot || !slot.available) {
      setErrorMessage("Este horario ya no esta disponible. Elegi otro.");
      return;
    }

    if (slot.remainingCapacity < partySize) {
      setErrorMessage(
        "Este horario ya no tiene lugar para la cantidad de personas elegida.",
      );
      return;
    }

    try {
      const payload: CreateReservationInput = {
        businessId: business.id,
        serviceId: service.id,
        customerName,
        customerPhone,
        customerEmail: customerEmail.trim() || null,
        reservationDate: effectiveReservationDate,
        reservationTime,
        partySize,
        notes: notes.trim() || null,
        source: "web",
      };

      const created = await createReservation(payload);
      setSuccessReservation(created);

      const refreshedAvailability = calculatePublicAvailability({
        businessId: business.id,
        date: effectiveReservationDate,
        services,
        reservations: getReservationsByBusinessId(business.id),
        hours,
        rules,
        service,
        partySize,
      });

      if (!isSlotAvailable(reservationTime, refreshedAvailability.slots, partySize)) {
        setReservationTime(
          refreshedAvailability.slots.find(
            (entry) => entry.available && entry.remainingCapacity >= partySize,
          )?.time ?? "",
        );
      }

      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setPartySize(2);
      setNotes("");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No pudimos crear la reserva. Proba de nuevo.",
      );
    }
  }

  const cardClass =
    variant === "minimal"
      ? "border-white/10 bg-slate-950/60"
      : variant === "visual"
        ? "border-cyan-400/20 bg-slate-950/80"
        : "border-white/10 bg-white/5";

  return (
    <section className={`space-y-6 rounded-[1.75rem] border p-5 ${cardClass}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Reservas
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {business.reservationTitle}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            {weeklyHoursLabel}. Capacidad por slot: {rules.maxReservationsPerSlot}.
          </p>
          {hoursNotice ? (
            <p className="mt-2 text-xs leading-5 text-amber-200/80">{hoursNotice}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">
            Slot {rules.slotDurationMinutes} min
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">
            Anticipo {rules.minNoticeMinutes} min
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">
            Hasta {rules.maxDaysAhead} dias
          </span>
        </div>
      </div>

      {availability.message ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          {availability.message}
        </div>
      ) : null}

      {successReservation ? (
        <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 p-5 text-sm text-emerald-100">
          <p className="text-base font-semibold text-white">
            {successReservation.status === "confirmed"
              ? "Tu reserva fue confirmada."
              : "Tu reserva fue enviada. Quedo pendiente de confirmacion."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryItem label="Negocio" value={business.name} />
            <SummaryItem label="Fecha" value={successReservation.reservationDate} />
            <SummaryItem label="Horario" value={successReservation.reservationTime} />
            <SummaryItem
              label="Servicio"
              value={service?.name ?? successReservation.serviceId}
            />
            <SummaryItem label="Nombre" value={successReservation.customerName} />
            <SummaryItem
              label="Personas"
              value={String(successReservation.partySize)}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={successReservation.status} />
            <span className="text-sm text-emerald-100/80">
            {business.id ? (process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" ? "Guardado en Supabase" : "Guardado en modo local/mock") : "Guardado"}
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="space-y-5 rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5">
          {duplicateReservation ? (
            <div className="rounded-[1.35rem] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
              <p className="font-semibold text-white">
                Ya tenés una reserva activa con este teléfono.
              </p>
              <p className="mt-1.5 text-rose-100/90">
                Reserva existente: {duplicateReservation.reservationDate} ·{" "}
                {duplicateReservation.reservationTime}
              </p>
              <p className="mt-1.5 text-rose-100/80">
                Si escribiste mal el teléfono, corregilo y volvé a intentar.
              </p>
              {business.whatsapp ? (
                <a
                  href={business.whatsapp.startsWith("http") ? business.whatsapp : `https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-full border border-rose-300/30 bg-slate-950/40 px-3 py-2 text-xs font-medium text-white transition hover:border-rose-200/60"
                >
                  Contactar al local por WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Servicio
              </span>
              <select
                value={isMounted ? service?.id ?? "" : ""}
                onChange={(event) => handleServiceChange(event.target.value)}
                className="input-base"
                disabled={!isMounted}
              >
                {!isMounted ? (
                  <option value="">Cargando servicios...</option>
                ) : services.length > 0 ? (
                  services.map((entry) => (
                    <option key={entry.id} value={entry.id} disabled={!entry.isActive}>
                      {entry.name} {entry.isActive ? "" : "(Inactivo)"}
                    </option>
                  ))
                ) : (
                  <option value="">No hay servicios disponibles</option>
                )}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Fecha
              </span>
              <input
                type="date"
                value={effectiveReservationDate}
                onChange={(event) => handleDateChange(event.target.value)}
                className="input-base"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Personas
              </span>
              <input
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(event) => {
                  const nextPartySize = Number(event.target.value);
                  clearFeedback();
                  setPartySize(nextPartySize);

                  const nextAvailability = calculatePublicAvailability({
                    businessId: business.id,
                    date: effectiveReservationDate,
                    services,
                    reservations: displayedReservations,
                    hours,
                    rules,
                    service,
                    partySize: nextPartySize,
                  });

                  if (
                    !isSlotAvailable(
                      reservationTime,
                      nextAvailability.slots,
                      nextPartySize,
                    )
                  ) {
                    setReservationTime(
                      nextAvailability.slots.find(
                        (slot) =>
                          slot.available && slot.remainingCapacity >= nextPartySize,
                      )?.time ?? "",
                    );
                  }
                }}
                className="input-base"
              />
            </label>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Horarios disponibles
              </p>
              <p className="text-xs text-slate-400">
                {isMounted ? `${availableSlots.length} disponibles` : "Cargando disponibilidad..."}
              </p>
            </div>

            {isMounted && availableSlots.length > 0 ? (
              <div className="space-y-3">
                {availableSlots.map((slot) => {
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => {
                        clearFeedback();
                        setReservationTime(slot.time);
                      }}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        reservationTime === slot.time
                          ? "border-cyan-400/40 bg-cyan-500/15 ring-1 ring-cyan-400/20"
                          : "border-white/10 bg-slate-900/70 hover:border-cyan-400/30"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="text-sm font-semibold text-white">
                            {slot.time}
                          </div>
                          <p className="text-xs leading-5 text-slate-400">
                            Quedan {slot.remainingCapacity} lugares
                          </p>
                        </div>

                        <div className="shrink-0 sm:text-right">
                          <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-100">
                            Disponible
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : isMounted ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
                No hay horarios disponibles para la fecha elegida.
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
                Cargando disponibilidad...
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Datos de contacto
            </p>
            <h4 className="mt-2 text-lg font-semibold text-white">
              Completa tus datos
            </h4>
          </div>

          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Nombre
            </span>
            <input
              value={customerName}
              onChange={(event) => {
                clearFeedback();
                setCustomerName(event.target.value);
              }}
              className="input-base"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Telefono
            </span>
            <input
              value={customerPhone}
              onChange={(event) => {
                clearFeedback();
                setCustomerPhone(event.target.value);
              }}
              className="input-base"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Email opcional
            </span>
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => {
                clearFeedback();
                setCustomerEmail(event.target.value);
              }}
              className="input-base"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Nota opcional
            </span>
            <textarea
              value={notes}
              onChange={(event) => {
                clearFeedback();
                setNotes(event.target.value);
              }}
              className="input-base min-h-28"
            />
          </label>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Enviar reserva
          </button>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
              {errorMessage}
            </div>
          ) : null}

          <p className="text-xs leading-6 text-slate-400">
            La reserva se guarda{" "}
            {process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase"
              ? "en Supabase"
              : "en modo local/mock"} con estado{" "}
            {successReservation?.status === "confirmed"
              ? "confirmada"
              : "pendiente"}. No envia WhatsApp ni email reales.
          </p>
        </form>
      </div>
    </section>
  );
}

type SummaryItemProps = {
  label: string;
  value: string;
};

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
