"use client";

import { use, useEffect, useMemo, useState } from "react";

type PublicReservationStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

type PublicReservation = {
  id: string;
  reservationCode?: string;
  date: string;
  time: string;
  client: string;
  people: number;
  phone: string;
  email?: string;
  note?: string;
  status: PublicReservationStatus;
  durationMinutes?: number;
  tableName?: string;
  origin?: "web" | "whatsapp" | "phone" | "instagram" | "manual";
  createdAt?: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  noShowAt?: string;
};

type ReservaTrackingPageProps = {
  params: Promise<{
    slug: string;
    reservationCode: string;
  }>;
};

const RESERVATIONS_STORAGE_KEY = "tango-v2-reservations-calendar-v2";
const RESERVATIONS_EVENT = "tango-v2-reservations-updated";
const RESERVATION_TRACKING_GRACE_MINUTES = 10;

const STATUS_LABELS: Record<PublicReservationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No-show",
};

function createPublicCode(prefix: "PED" | "RES", seed?: string) {
  if (!seed) {
    return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `${prefix}-${hash.toString(36).toUpperCase().slice(0, 5).padStart(5, "0")}`;
}

function getReservationCode(reservation: Pick<PublicReservation, "id" | "reservationCode">) {
  return reservation.reservationCode || createPublicCode("RES", reservation.id);
}

function normalizeCode(value: string) {
  return decodeURIComponent(value).trim().toUpperCase();
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isTimestampExpired(value?: string) {
  if (!value) return false;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return false;

  return Date.now() - time > RESERVATION_TRACKING_GRACE_MINUTES * 60 * 1000;
}

function getReservationTrackingExpiration(reservation: PublicReservation) {
  const [year, month, day] = reservation.date.split("-").map(Number);
  const [hour, minute] = reservation.time.split(":").map(Number);
  const reservationTime = new Date(
    year,
    (month ?? 1) - 1,
    day ?? 1,
    hour ?? 0,
    minute ?? 0,
    0,
    0,
  );

  if (Number.isNaN(reservationTime.getTime())) return null;

  return new Date(
    reservationTime.getTime() + RESERVATION_TRACKING_GRACE_MINUTES * 60 * 1000,
  );
}

function isReservationTrackingExpired(reservation: PublicReservation) {
  if (reservation.status === "cancelled") {
    return reservation.cancelledAt
      ? isTimestampExpired(reservation.cancelledAt)
      : Date.now() > (getReservationTrackingExpiration(reservation)?.getTime() ?? Infinity);
  }

  if (reservation.status === "no_show") {
    return reservation.noShowAt
      ? isTimestampExpired(reservation.noShowAt)
      : Date.now() > (getReservationTrackingExpiration(reservation)?.getTime() ?? Infinity);
  }

  const expiration = getReservationTrackingExpiration(reservation);

  if (!expiration) return false;

  return Date.now() > expiration.getTime();
}

function readReservations() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RESERVATIONS_STORAGE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as PublicReservation[]) : [];
  } catch {
    return [];
  }
}

export default function ReservaTrackingPage({ params }: ReservaTrackingPageProps) {
  const resolvedParams = use(params);
  const reservationCode = normalizeCode(resolvedParams.reservationCode);
  const [reservations, setReservations] = useState<PublicReservation[]>([]);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    function syncReservations() {
      setReservations(readReservations());
    }

    syncReservations();

    window.addEventListener("storage", syncReservations);
    window.addEventListener("focus", syncReservations);
    window.addEventListener(RESERVATIONS_EVENT, syncReservations);

    return () => {
      window.removeEventListener("storage", syncReservations);
      window.removeEventListener("focus", syncReservations);
      window.removeEventListener(RESERVATIONS_EVENT, syncReservations);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowTick(Date.now());
    }, 30 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const reservation = useMemo(
    () =>
      reservations.find(
        (item) => getReservationCode(item).toUpperCase() === reservationCode,
      ),
    [reservations, reservationCode],
  );

  const isExpired = reservation ? isReservationTrackingExpired(reservation) : false;
  void nowTick;

  return (
    <main className="min-h-screen bg-[#130d09] px-4 py-10 text-[#f8ead6]">
      <section className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-3xl flex-col justify-center">
        <div className="rounded-[2rem] border border-[#d6a96a]/30 bg-[#1c130d] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex flex-col gap-4 border-b border-[#d6a96a]/20 pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#d6a96a]">
                Consulta de reserva
              </p>
              <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
                {reservation ? getReservationCode(reservation) : reservationCode}
              </h1>
              <p className="mt-2 text-sm text-[#cbb8a3]">
                Estado público de tu reserva.
              </p>
            </div>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                !reservation || isExpired
                  ? "border-[#d6a96a]/30 text-[#d6a96a]"
                  : reservation.status === "cancelled" || reservation.status === "no_show"
                    ? "border-red-400/40 bg-red-500/10 text-red-200"
                    : reservation.status === "completed"
                      ? "border-blue-300/40 bg-blue-500/10 text-blue-200"
                      : "border-emerald-300/40 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {!reservation
                ? "No encontrada"
                : isExpired
                  ? "No disponible"
                  : STATUS_LABELS[reservation.status]}
            </span>
          </div>

          {!reservation || isExpired ? (
            <div className="mt-8 rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
              <h2 className="text-xl font-semibold">
                {isExpired ? "Reserva no disponible" : "Reserva no encontrada"}
              </h2>
              <p className="mt-3 leading-7 text-[#cbb8a3]">
                {isExpired
                  ? "Este enlace expiró. Si necesitás ayuda o querés modificar la reserva, comunicate con el restaurante."
                  : "Revisá que el código sea correcto. Si el problema continúa, comunicate con el restaurante."}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                    Cliente
                  </p>
                  <p className="mt-2 text-lg font-semibold">{reservation.client}</p>
                  <p className="mt-1 text-sm text-[#cbb8a3]">
                    {reservation.people} {reservation.people === 1 ? "persona" : "personas"}
                  </p>
                </div>

                <div className="rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                    Fecha y hora
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {reservation.time}
                  </p>
                  <p className="mt-1 text-sm capitalize text-[#cbb8a3]">
                    {formatDate(reservation.date)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                    Mesa
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {reservation.tableName || "A asignar por el local"}
                  </p>
                  <p className="mt-1 text-sm text-[#cbb8a3]">
                    Duración estimada: {reservation.durationMinutes ?? 90} min
                  </p>
                </div>

                <div className="rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                    Estado
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {STATUS_LABELS[reservation.status]}
                  </p>
                  <p className="mt-1 text-sm text-[#cbb8a3]">
                    Si necesitás cambiar algo, comunicate con el restaurante.
                  </p>
                </div>
              </div>

              {(reservation.createdAt ||
                reservation.confirmedAt ||
                reservation.completedAt ||
                reservation.cancelledAt ||
                reservation.noShowAt) ? (
                <div className="mt-8 rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                    Timeline
                  </p>

                  <div className="mt-5 space-y-4">
                    {[
                      ["Reserva recibida", reservation.createdAt],
                      ["Reserva confirmada", reservation.confirmedAt],
                      ["Reserva completada", reservation.completedAt],
                      ["Reserva cancelada", reservation.cancelledAt],
                      ["No-show", reservation.noShowAt],
                    ].map(([label, value], index) =>
                      value ? (
                        <div key={label} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <span className="h-4 w-4 rounded-full border border-emerald-300 bg-emerald-400" />
                            {index < 4 ? (
                              <span className="mt-1 h-8 w-px bg-[#d6a96a]/20" />
                            ) : null}
                          </div>

                          <div className="pb-2">
                            <p className="font-semibold text-[#f8ead6]">{label}</p>
                            <p className="mt-1 text-sm text-[#cbb8a3]">
                              {formatTime(value)}
                            </p>
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
