import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import type { Business, Customer, CustomerNote, Reservation } from "@/data/types";
import { buildDateTimeFromDateAndTime } from "@/lib/date-time";
import {
  classifyCustomer,
  createCustomerNote,
  deleteCustomerNote,
  getCustomerEstimatedSpend,
  getCustomerFavoriteServices,
  getCustomerNotes,
  getCustomerReservationHistory,
  getCustomerSuggestedTags,
  saveCustomerNote,
  saveCustomerPreferences,
  saveCustomerTags,
  updateCustomer,
} from "@/lib/data/crm";

type LocalCustomerDetailDrawerProps = {
  business: Business | null;
  customer: Customer | null;
  onClose: () => void;
  serviceNameById: Map<string, string>;
  sourceLabel: string;
};

function reservationSort(left: Reservation, right: Reservation) {
  const leftTime = buildDateTimeFromDateAndTime(left.reservationDate, left.reservationTime)?.getTime() ?? NaN;
  const rightTime = buildDateTimeFromDateAndTime(right.reservationDate, right.reservationTime)?.getTime() ?? NaN;
  const now = Date.now();
  const leftIsFuture = leftTime >= now;
  const rightIsFuture = rightTime >= now;

  if (leftIsFuture !== rightIsFuture) {
    return leftIsFuture ? -1 : 1;
  }

  if (leftIsFuture) {
    return leftTime - rightTime;
  }

  return rightTime - leftTime;
}

function formatMoney(value: number | null) {
  if (value == null) {
    return "Sin precio";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function copyValue(value: string) {
  if (!value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // keep silent in local/mock mode
  }
}

function extractMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function LocalCustomerDetailDrawer({
  business,
  customer,
  onClose,
  serviceNameById,
  sourceLabel,
}: LocalCustomerDetailDrawerProps) {
  const currentCustomer = customer;
  const currentBusiness = business;
  const [notes, setNotes] = useState(currentCustomer?.notes ?? "");
  const [tagsText, setTagsText] = useState(currentCustomer?.tags.join(", ") ?? "");
  const [preferences, setPreferences] = useState(currentCustomer?.preferences ?? "");
  const [email, setEmail] = useState(currentCustomer?.email ?? "");
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);
  const [historyNote, setHistoryNote] = useState("");

  useEffect(() => {
    setNotes(currentCustomer?.notes ?? "");
    setTagsText(currentCustomer?.tags.join(", ") ?? "");
    setPreferences(currentCustomer?.preferences ?? "");
    setEmail(currentCustomer?.email ?? "");
    setSavedMessage("");
    setErrorMessage("");
    setHistoryNote("");
    setCustomerNotes([]);
  }, [currentCustomer]);

  useEffect(() => {
    let cancelled = false;

    const loadNotes = async () => {
      if (!currentCustomer) {
        setCustomerNotes([]);
        return;
      }

      try {
        const loadedNotes = await getCustomerNotes(currentCustomer.id);
        if (!cancelled) {
          setCustomerNotes(loadedNotes);
        }
      } catch (error) {
        if (!cancelled) {
          setCustomerNotes([]);
          setErrorMessage(extractMessage(error, "No se pudieron cargar las notas del cliente."));
        }
      }
    };

    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [currentCustomer?.id]);

  const reservations = useMemo(() => {
    if (!currentCustomer) {
      return [];
    }

    return getCustomerReservationHistory(currentCustomer.id);
  }, [currentCustomer]);

  if (!currentCustomer || !currentBusiness) {
    return null;
  }

  const customerData = currentCustomer;
  const businessData = currentBusiness;
  const sortedReservations = [...reservations].sort(reservationSort);
  const commercialState = classifyCustomer(customerData);
  const suggestedTags = getCustomerSuggestedTags(customerData);
  const favoriteServices = getCustomerFavoriteServices(customerData.id);
  const estimatedSpend = getCustomerEstimatedSpend(customerData.id);
  const totalPeople = reservations.reduce((sum, reservation) => sum + reservation.partySize, 0);

  async function saveInternalNotes() {
    try {
      await saveCustomerNote(customerData.id, notes.trim());
      setErrorMessage("");
      setSavedMessage("Notas internas guardadas.");
    } catch (error) {
      setSavedMessage("");
      setErrorMessage(extractMessage(error, "No se pudieron guardar las notas internas."));
    }
  }

  async function saveTags() {
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      await saveCustomerTags(customerData.id, tags);
      setErrorMessage("");
      setSavedMessage("Tags guardados.");
    } catch (error) {
      setSavedMessage("");
      setErrorMessage(extractMessage(error, "No se pudieron guardar los tags."));
    }
  }

  async function savePreferences() {
    try {
      await saveCustomerPreferences(customerData.id, preferences.trim());
      setErrorMessage("");
      setSavedMessage("Preferencias guardadas.");
    } catch (error) {
      setSavedMessage("");
      setErrorMessage(extractMessage(error, "No se pudieron guardar las preferencias."));
    }
  }

  async function saveEmail() {
    try {
      await updateCustomer(customerData.id, {
        name: customerData.name,
        phone: customerData.phone,
        email: email.trim() || null,
        internalNotes: notes.trim(),
        preferences: preferences.trim(),
        tags: tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      setErrorMessage("");
      setSavedMessage(
        sourceLabel === "Supabase" ? "Email guardado en Supabase." : "Email registrado para este cliente.",
      );
    } catch (error) {
      setSavedMessage("");
      setErrorMessage(extractMessage(error, "No se pudo guardar el email."));
    }
  }

  async function handleAddHistoryNote() {
    const trimmed = historyNote.trim();
    if (!trimmed) {
      return;
    }

    try {
      await createCustomerNote(customerData.id, trimmed);
      const refreshedNotes = await getCustomerNotes(customerData.id);
      setCustomerNotes(refreshedNotes);
      setHistoryNote("");
      setErrorMessage("");
      setSavedMessage("Nota agregada al historial.");
    } catch (error) {
      setSavedMessage("");
      setErrorMessage(extractMessage(error, "No se pudo guardar la nota de historial."));
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      await deleteCustomerNote(noteId);
      const refreshedNotes = await getCustomerNotes(customerData.id);
      setCustomerNotes(refreshedNotes);
      setErrorMessage("");
      setSavedMessage("Nota eliminada.");
    } catch (error) {
      setSavedMessage("");
      setErrorMessage(extractMessage(error, "No se pudo eliminar la nota."));
    }
  }

  function appendTag(tag: string) {
    const currentTags = tagsText
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!currentTags.includes(tag)) {
      currentTags.push(tag);
    }

    setTagsText(currentTags.join(", "));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur sm:items-center">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Detalle de cliente
            </p>
            <h3 className="mt-1 text-xl font-semibold text-white">{customerData.name}</h3>
            <p className="mt-1 text-sm text-slate-400">{businessData.name}</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void copyValue(customerData.phone)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Copiar teléfono
            </button>
            <button
              type="button"
              onClick={() => void copyValue(customerData.email ?? "")}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Copiar email
            </button>
            <button
              type="button"
              onClick={() => {
                const digits = customerData.phone.replace(/\D/g, "");
                void copyValue(digits ? `https://wa.me/${digits}` : "");
              }}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Copiar WhatsApp
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-72px)] overflow-y-auto p-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              status={
                commercialState.key === "risk"
                  ? "no_show"
                  : commercialState.key === "vip"
                    ? "confirmed"
                    : commercialState.key === "recurrent"
                      ? "completed"
                      : "pending"
              }
            />
            <span
              className={`rounded-full border px-3 py-1 text-xs ${
                commercialState.key === "vip"
                  ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
                  : commercialState.key === "risk"
                    ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
                    : commercialState.key === "recurrent"
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                      : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
              }`}
            >
              {commercialState.label}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
              {customerData.phone}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
              {customerData.email ?? "Sin email"}
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
              {customerData.totalReservations} reservas
            </span>
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
              {totalPeople} personas acumuladas
            </span>
          </div>

          {savedMessage ? (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {savedMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Totales" value={String(customerData.totalReservations)} />
            <StatCard label="Confirmadas" value={String(customerData.confirmedReservations)} />
            <StatCard label="Canceladas" value={String(customerData.cancelledReservations)} />
            <StatCard label="No-show" value={String(customerData.noShowReservations)} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Notas internas
              </p>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="input-base mt-2 min-h-32"
                placeholder="Escribe notas internas sobre este cliente"
              />
              <button
                type="button"
                onClick={() => void saveInternalNotes()}
                className="mt-3 rounded-full border border-cyan-400/20 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/25"
              >
                Guardar notas internas
              </button>
            </section>

            <section className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Email y tags
              </p>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-base mt-2"
                placeholder="cliente@correo.com"
              />
              <button
                type="button"
                onClick={() => void saveEmail()}
                className="mt-3 rounded-full border border-cyan-400/20 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/25"
              >
                Guardar email
              </button>
              <input
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                className="input-base mt-4"
                placeholder="vip, familiar, cumpleanos"
              />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => appendTag(tag)}
                    className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-100 transition hover:border-amber-400/40 hover:bg-amber-500/15"
                  >
                    Agregar tag sugerido: {tag}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void saveTags()}
                className="mt-3 rounded-full border border-cyan-400/20 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/25"
              >
                Guardar tags
              </button>
            </section>
          </div>

          <section className="mt-4 rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Preferencias
            </p>
            <textarea
              value={preferences}
              onChange={(event) => setPreferences(event.target.value)}
              className="input-base mt-2 min-h-28"
              placeholder="Preferencias de mesa, horario, alergias, etc."
            />
            <button
              type="button"
              onClick={() => void savePreferences()}
              className="mt-3 rounded-full border border-cyan-400/20 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/25"
            >
              Guardar preferencias
            </button>
          </section>

          <section className="mt-4 rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Notas de historial
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Cada nota agrega una fila nueva en <code>customer_notes</code>.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={historyNote}
                onChange={(event) => setHistoryNote(event.target.value)}
                className="input-base flex-1"
                placeholder="Agregar una nota nueva"
              />
              <button
                type="button"
                onClick={() => void handleAddHistoryNote()}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
              >
                Agregar nota al historial
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {customerNotes.length > 0 ? (
                customerNotes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-white">{note.note}</p>
                      <button
                        type="button"
                        onClick={() => void handleDeleteNote(note.id)}
                        className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[11px] font-medium text-rose-100 transition hover:bg-rose-500/20 hover:text-white"
                      >
                        Eliminar
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Actualizada {formatDateTime(note.updatedAt)}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-6 text-sm text-slate-300">
                  Todavía no hay notas cargadas para este cliente.
                </div>
              )}
            </div>
          </section>

          <section className="mt-4 rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Historial de reservas
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Próximas primero, luego historial descendente.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.open("/local/reservas", "_blank", "noopener,noreferrer")}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                >
                  Ir a Reservas
                </button>
                <button
                  type="button"
                  onClick={() => window.open("/local/calendario", "_blank", "noopener,noreferrer")}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                >
                  Ir a Calendario
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {sortedReservations.map((reservation) => {
                const serviceLabel =
                  serviceNameById.get(reservation.serviceId) ??
                  (reservation.serviceId ? "Servicio eliminado" : "Sin servicio");
                const tableLabel =
                  reservation.joinedTableLabel ?? reservation.tableLabel ?? "Sin mesa";

                return (
                  <article
                    key={reservation.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {reservation.reservationDate} · {reservation.reservationTime}
                        </p>
                        <p className="text-xs text-slate-400">
                          {serviceLabel} · {reservation.partySize} personas · {tableLabel}
                        </p>
                      </div>
                      <StatusBadge status={reservation.status} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        Origen: {reservation.source}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        Mesa: {tableLabel}
                      </span>
                      {estimatedSpend ? (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-100">
                          Gasto estimado: {formatMoney(estimatedSpend)}
                        </span>
                      ) : null}
                    </div>

                    {reservation.notes ? (
                      <p className="mt-2 text-xs text-slate-300">{reservation.notes}</p>
                    ) : null}
                  </article>
                );
              })}
            </div>

            {favoriteServices.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {favoriteServices.map((service) => (
                  <span
                    key={service.serviceId}
                    className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300"
                  >
                    {service.name} · {service.count}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <p className="mt-4 text-xs text-slate-400">
            {sourceLabel === "Supabase"
              ? "CRM conectado a Supabase. Clientes y notas ya se guardan en la base."
              : "CRM local. Los datos se derivan de las reservas del negocio en este entorno."}
          </p>
        </div>
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
