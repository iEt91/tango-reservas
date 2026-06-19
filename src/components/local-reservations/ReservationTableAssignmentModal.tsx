"use client";

import { useEffect, useMemo, useState } from "react";
import type { Reservation } from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import { getFloorTablesByBusinessId } from "@/lib/data/floorPlan";
import { getAvailableTablesForReservationSlot } from "@/lib/reservation-availability";
import {
  assignReservationToJoinedTable,
  assignReservationToTable,
  getJoinedTableByReservationId,
  getReservationTableAvailability,
  updateReservationAssignedTables,
  unassignReservationFromTable,
} from "@/data/reservations";
import { getSupabaseFloorTablesByBusinessSync } from "@/lib/data/supabase/floorPlan";
import { getSupabaseReservationsByBusinessSync } from "@/lib/data/supabase/reservations";
import { getSupabaseServicesByBusinessSync } from "@/lib/data/supabase/services";

type AssignmentMode = "single" | "joined";

function dedupeTableIds(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim() ?? "").filter(Boolean))];
}

function resolveTableLabelsFromIds(
  tableIds: string[],
  tableLabelLookup: Map<string, string>,
) {
  const uniqueLabels = [
    ...new Set(
      dedupeTableIds(tableIds)
        .map((tableId) => tableLabelLookup.get(tableId) ?? null)
        .filter((label): label is string => Boolean(label)),
    ),
  ];

  if (uniqueLabels.length === 0) {
    return "Sin mesa";
  }

  return uniqueLabels.length > 1 ? uniqueLabels.join(" + ") : uniqueLabels[0];
}

type ReservationTableAssignmentModalProps = {
  open: boolean;
  reservation: Reservation | null;
  onAssigned: (message: string) => void;
  onClose: () => void;
};

export function ReservationTableAssignmentModal({
  open,
  reservation,
  onAssigned,
  onClose,
}: ReservationTableAssignmentModalProps) {
  const currentJoinedTable = useMemo(() => {
    if (!reservation) {
      return null;
    }

    return getJoinedTableByReservationId(reservation.id);
  }, [reservation]);

  const availability = useMemo(() => {
    if (!reservation) {
      return null;
    }

    return getReservationTableAvailability(reservation.id);
  }, [reservation]);

  const singleOptions = useMemo(
    () => availability?.singleSuggestions ?? [],
    [availability],
  );
  const joinedOptions = useMemo(
    () => availability?.joinedSuggestions ?? [],
    [availability],
  );
  const suggestedSingles = useMemo(
    () => singleOptions.filter((option) => option.suggested),
    [singleOptions],
  );
  const otherSingles = useMemo(
    () => singleOptions.filter((option) => !option.suggested),
    [singleOptions],
  );

  const initialSelectedTableId = useMemo(() => {
    if (!reservation) {
      return "";
    }

    return (
      reservation.tableId ?? suggestedSingles.find((option) => option.available)?.tableIds[0] ?? ""
    );
  }, [reservation, suggestedSingles]);

  const initialSelectedJoinedTableIds = useMemo(() => {
    if (!currentJoinedTable) {
      return [];
    }

    return [...new Set(currentJoinedTable.tableIds.filter(Boolean))];
  }, [currentJoinedTable]);

  const [mode, setMode] = useState<AssignmentMode>(currentJoinedTable ? "joined" : "single");
  const [selectedTableId, setSelectedTableId] = useState(initialSelectedTableId);
  const [selectedJoinedTableIds, setSelectedJoinedTableIds] = useState<string[]>(
    initialSelectedJoinedTableIds,
  );
  const [error, setError] = useState<string | null>(null);
  const [supabaseSelectedTableIds, setSupabaseSelectedTableIds] = useState<string[]>([]);
  const dataSource = getDataSource();
  const isSupabaseMode = dataSource === "supabase";

  const supabaseTables = useMemo(() => {
    if (!reservation || !isSupabaseMode) {
      return [] as ReturnType<typeof getFloorTablesByBusinessId>;
    }

    return getFloorTablesByBusinessId(reservation.businessId);
  }, [isSupabaseMode, reservation]);

  const supabaseAvailability = useMemo(() => {
    if (!reservation || !isSupabaseMode) {
      return null;
    }

    const tables = getSupabaseFloorTablesByBusinessSync(reservation.businessId);
    const services = getSupabaseServicesByBusinessSync(reservation.businessId);
    const currentService = services.find((entry) => entry.id === reservation.serviceId) ?? null;
    const reservations = getSupabaseReservationsByBusinessSync(reservation.businessId);

    return getAvailableTablesForReservationSlot({
      businessId: reservation.businessId,
      reservationDate: reservation.reservationDate,
      reservationTime: reservation.reservationTime,
      durationMinutes: currentService?.durationMinutes ?? 120,
      partySize: reservation.partySize,
      reservations,
      tables,
      services,
      fallbackDurationMinutes: currentService?.durationMinutes ?? 120,
      optionalReservationIdToIgnore: reservation.id,
    });
  }, [isSupabaseMode, reservation]);

  const supabaseSelectedTables = useMemo(
    () => {
      const uniqueSelectedTableIds = dedupeTableIds(supabaseSelectedTableIds);
      return supabaseTables.filter((table) => uniqueSelectedTableIds.includes(table.id));
    },
    [supabaseSelectedTableIds, supabaseTables],
  );

  const supabaseSelectedWarnings = useMemo(() => {
    if (!reservation || !supabaseAvailability) {
      return [] as string[];
    }

    const warnings = new Set<string>();

    for (const table of supabaseSelectedTables) {
      const tableWarnings = supabaseAvailability.reasonsByTableId?.[table.id] ?? [];
      for (const warning of tableWarnings) {
        warnings.add(warning);
      }

      if (table.seats < reservation.partySize) {
        warnings.add("La mesa tiene menos asientos que la cantidad de personas.");
      }

      const conflicts = supabaseAvailability.conflictsByTableId?.[table.id] ?? [];
      if (conflicts.length > 0) {
        warnings.add("Esta mesa ya esta asignada a otra reserva activa en ese horario.");
      }
    }

    return [...warnings];
  }, [reservation, supabaseSelectedTables, supabaseAvailability]);

  useEffect(() => {
    if (!open || !reservation || !isSupabaseMode) {
      return;
    }

    const initialTableIds =
      (reservation.assignedTableIds?.length ?? 0) > 0
        ? [...new Set((reservation.assignedTableIds ?? []).filter(Boolean))]
        : reservation.tableId
          ? [reservation.tableId]
          : [];

    setSupabaseSelectedTableIds(initialTableIds);
    setError(null);
  }, [isSupabaseMode, open, reservation]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !reservation) {
    return null;
  }

  const activeReservation = reservation;
  const title = activeReservation.tableId || activeReservation.joinedTableId ? "Cambiar mesa" : "Asignar mesa";
  const uniqueSelectedJoinedTableIds = dedupeTableIds(selectedJoinedTableIds);
  const uniqueSupabaseSelectedTableIds = dedupeTableIds(supabaseSelectedTableIds);
  const selectedJoinedTableIdSet = new Set(uniqueSelectedJoinedTableIds);
  const supabaseSelectedTableIdSet = new Set(uniqueSupabaseSelectedTableIds);
  const selectedJoinedTables = singleOptions.filter((option) =>
    selectedJoinedTableIdSet.has(option.tableIds[0]),
  );
  const currentAssignmentLabel = resolveTableLabelsFromIds(
    [
      ...(activeReservation.assignedTableIds ?? []),
      ...(currentJoinedTable?.tableIds ?? []),
      ...(activeReservation.tableId ? [activeReservation.tableId] : []),
    ],
    new Map(singleOptions.map((option) => [option.tableIds[0], option.tableLabel])),
  );
  const selectedJoinedTablesSeats = selectedJoinedTables.reduce((sum, table) => sum + table.seats, 0);
  const availableCount = suggestedSingles.length + joinedOptions.length;

  function handleAssignSingle() {
    if (!selectedTableId) {
      setError("Elige una mesa primero.");
      return;
    }

    const selectedOption = singleOptions.find(
      (option) => option.tableIds[0] === selectedTableId,
    );
    if (!selectedOption) {
      setError("La mesa seleccionada no existe.");
      return;
    }

    if (!selectedOption.available) {
      setError(selectedOption.reason ?? "La mesa no esta disponible.");
      return;
    }

    try {
      assignReservationToTable(activeReservation.id, selectedTableId);
      onAssigned("Mesa asignada en modo local/mock.");
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "No se pudo asignar la mesa.",
      );
    }
  }

  function handleToggleJoinedTable(tableId: string) {
    const selectedOption = singleOptions.find((option) => option.tableIds[0] === tableId);
    if (!selectedOption) {
      return;
    }

    if (!selectedOption.available && !selectedJoinedTableIdSet.has(tableId)) {
      setError(selectedOption.reason ?? "La mesa no esta disponible.");
      return;
    }

    setError(null);
    setSelectedJoinedTableIds((current) =>
      dedupeTableIds(
        current.includes(tableId)
          ? current.filter((currentTableId) => currentTableId !== tableId)
          : [...current, tableId],
      ),
    );
  }

  function handleUseJoinedSuggestion(tableIds: string[]) {
    setSelectedJoinedTableIds(dedupeTableIds(tableIds));
    setMode("joined");
    setError(null);
  }

  function handleAssignJoined() {
    if (uniqueSelectedJoinedTableIds.length < 2) {
      setError("Selecciona al menos 2 mesas.");
      return;
    }

    try {
      assignReservationToJoinedTable(activeReservation.id, uniqueSelectedJoinedTableIds);
      onAssigned("Mesa unida asignada en modo local/mock.");
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "No se pudo unir las mesas.",
      );
    }
  }

  function handleUnassign() {
    try {
      unassignReservationFromTable(activeReservation.id);
      onAssigned("Mesa desasignada en modo local/mock.");
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "No se pudo quitar la mesa.",
      );
    }
  }

  async function handleAssignSupabase() {
    if (uniqueSupabaseSelectedTableIds.length === 0) {
      setError("Elige al menos una mesa primero.");
      return;
    }

    if (supabaseSelectedWarnings.length > 0) {
      setError(supabaseSelectedWarnings[0] ?? "La asignacion necesita revision.");
      return;
    }

    try {
      await updateReservationAssignedTables(activeReservation.id, uniqueSupabaseSelectedTableIds);
      onAssigned(
        uniqueSupabaseSelectedTableIds.length > 1
          ? "Mesas asignadas en Supabase."
          : "Mesa asignada en Supabase.",
      );
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "No se pudo guardar la asignacion.",
      );
    }
  }

  async function handleUnassignSupabase() {
    try {
      await updateReservationAssignedTables(activeReservation.id, []);
      onAssigned("Mesa desasignada en Supabase.");
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "No se pudo quitar la mesa.",
      );
    }
  }

  if (isSupabaseMode) {
    const selectedTablesSeats = supabaseTables
      .filter((table) => supabaseSelectedTableIdSet.has(table.id))
      .reduce((sum, table) => sum + table.seats, 0);
    const tableLabelLookup = new Map(supabaseTables.map((table) => [table.id, table.label]));
    const supabaseCurrentAssignmentLabel = resolveTableLabelsFromIds(
      [
        ...(activeReservation.assignedTableIds ?? []),
        ...(activeReservation.tableId ? [activeReservation.tableId] : []),
      ],
      tableLabelLookup,
    );
    const selectedTablesLabel = resolveTableLabelsFromIds(
      uniqueSupabaseSelectedTableIds,
      tableLabelLookup,
    );
    const hasWarnings = supabaseSelectedWarnings.length > 0;
    const canSaveAssignment = uniqueSupabaseSelectedTableIds.length > 0 && !hasWarnings;
    const primaryButtonLabel = hasWarnings ? "Mesa no disponible" : "Guardar asignacion";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur sm:p-4">
        <div className="flex max-h-[calc(100dvh-24px)] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/40 sm:max-h-[calc(100dvh-48px)]">
          <header className="border-b border-white/10 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {title}
                </p>
                <h3 className="mt-1 truncate text-xl font-semibold text-white">
                  {activeReservation.customerName}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {activeReservation.reservationDate} - {activeReservation.reservationTime} -{" "}
                  {activeReservation.partySize} personas
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">
                Servicio: {activeReservation.serviceId}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">
                Mesa actual: {supabaseCurrentAssignmentLabel}
              </span>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-100">
                {supabaseTables.length} mesas reales
              </span>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-100">
                Seleccionadas: {uniqueSupabaseSelectedTableIds.length}
              </span>
            </div>

            {hasWarnings ? (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {supabaseSelectedWarnings[0]}
              </div>
            ) : null}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-h-0 space-y-4">
                <SectionTitle title="Mesas del negocio" />
                <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1 sm:max-h-[58vh] xl:max-h-none">
                  {supabaseTables.length > 0 ? (
                    supabaseTables.map((table) => {
                      const selected = uniqueSupabaseSelectedTableIds.includes(table.id);
                      const tableWarnings = supabaseAvailability?.reasonsByTableId?.[table.id] ?? [];
                      const tableConflicts =
                        supabaseAvailability?.conflictsByTableId?.[table.id] ?? [];
                      const reason = tableWarnings[0] ?? null;
                      const tone =
                        table.status === "blocked" || table.status === "out_of_service"
                          ? "rose"
                          : tableConflicts.length > 0 || table.status === "reserved"
                            ? "amber"
                            : "emerald";

                      return (
                        <OptionCard
                          key={table.id}
                          available={(supabaseAvailability?.availableTableIds ?? []).includes(table.id)}
                          active={selected}
                          label={table.label}
                          meta={`${table.seats} asientos • ${table.status}`}
                          reason={reason}
                          tone={tone}
                          onClick={() => {
                            setError(null);
                            setSupabaseSelectedTableIds((current) =>
                              dedupeTableIds(
                                current.includes(table.id)
                                  ? current.filter((currentTableId) => currentTableId !== table.id)
                                  : [...current, table.id],
                              ),
                            );
                          }}
                        />
                      );
                    })
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                      No hay mesas cargadas para este negocio.
                    </p>
                  )}
                </div>
              </div>

              <aside className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 xl:sticky xl:top-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Resumen de asignacion
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-3">
                      <span>Mesas seleccionadas</span>
                    <span className="font-semibold text-white">
                      {uniqueSupabaseSelectedTableIds.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Asientos totales</span>
                    <span className="font-semibold text-white">{selectedTablesSeats}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Personas necesarias</span>
                    <span className="font-semibold text-white">{activeReservation.partySize}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs text-slate-300">
                  {selectedTablesLabel}
                </div>

                {hasWarnings ? (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                    {supabaseSelectedWarnings.map((warning) => (
                      <p key={warning} className="mt-1 first:mt-0">
                        {warning}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs text-slate-300">
                    Elegi una o varias mesas y guarda la asignacion.
                  </div>
                )}
              </aside>
            </div>
          </div>

          <footer className="border-t border-white/10 bg-slate-950/95 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleUnassignSupabase}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                Quitar asignacion
              </button>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleAssignSupabase()}
                  disabled={!canSaveAssignment}
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  {primaryButtonLabel}
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur sm:p-4">
      <div className="flex max-h-[calc(100dvh-24px)] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/40 sm:max-h-[calc(100dvh-48px)]">
        <header className="border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {title}
              </p>
              <h3 className="mt-1 truncate text-xl font-semibold text-white">
                {activeReservation.customerName}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {activeReservation.reservationDate} - {activeReservation.reservationTime} -{" "}
                {activeReservation.partySize} personas
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">
              Servicio: {activeReservation.serviceId}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">
              Mesa actual: {currentAssignmentLabel}
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-100">
              {availableCount} mesas sugeridas
            </span>
            {availability?.validation.errors.length ? (
              <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-rose-100">
                Requiere revision
              </span>
            ) : null}
          </div>

          {availability?.validation.errors.length ? (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {availability.validation.errors[0]}
            </div>
          ) : null}

          <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode("single");
                setError(null);
              }}
              className={`rounded-full px-3 py-2 transition ${
                mode === "single"
                  ? "bg-cyan-400 text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Mesa individual
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("joined");
                setError(null);
              }}
              className={`rounded-full px-3 py-2 transition ${
                mode === "joined"
                  ? "bg-cyan-400 text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Unir mesas
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {mode === "single" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-h-0 space-y-4">
                <SectionTitle title="Mesas sugeridas" />
                <div className="max-h-[34vh] space-y-2 overflow-y-auto pr-1 sm:max-h-[40vh] xl:max-h-none">
                  {suggestedSingles.length > 0 ? (
                    suggestedSingles.map((option) => (
                      <OptionCard
                        key={option.tableIds[0]}
                        available={option.available}
                        active={selectedTableId === option.tableIds[0]}
                        label={option.tableLabel}
                        reason={option.reason}
                        meta={`${option.seats} asientos`}
                        tone="emerald"
                        onClick={() => {
                          setSelectedTableId(option.tableIds[0]);
                          setError(null);
                        }}
                      />
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                      No hay mesas sugeridas para esta reserva.
                    </p>
                  )}
                </div>

                <SectionTitle title="Otras mesas" />
                <div className="max-h-[34vh] space-y-2 overflow-y-auto pr-1 sm:max-h-[40vh] xl:max-h-none">
                  {otherSingles.length > 0 ? (
                    otherSingles.map((option) => (
                      <OptionCard
                        key={option.tableIds[0]}
                        available={option.available}
                        active={selectedTableId === option.tableIds[0]}
                        label={option.tableLabel}
                        reason={option.reason}
                        meta={`${option.seats} asientos`}
                        tone={option.available ? "default" : "rose"}
                        onClick={() => {
                          setSelectedTableId(option.tableIds[0]);
                          setError(null);
                        }}
                      />
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                      No hay mesas adicionales para mostrar.
                    </p>
                  )}
                </div>
              </div>

              <aside className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 xl:sticky xl:top-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Resumen de asignacion
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <span>Mesa elegida</span>
                    <span className="font-semibold text-white">
                      {selectedTableId || "Sin seleccionar"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Sugeridas</span>
                    <span className="font-semibold text-white">{suggestedSingles.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Otras mesas</span>
                    <span className="font-semibold text-white">{otherSingles.length}</span>
                  </div>
                </div>

                {availability?.validation.errors.length ? (
                  <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-100">
                    {availability.validation.errors[0]}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs text-slate-300">
                    Elegi una mesa sugerida para asignarla rapido o revisa las otras mesas si
                    quieres una opcion manual.
                  </div>
                )}
              </aside>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-h-0 space-y-4">
                <SectionTitle title="Combinaciones sugeridas" />
                <div className="max-h-[30vh] space-y-2 overflow-y-auto pr-1 sm:max-h-[36vh] xl:max-h-none">
                  {joinedOptions.length > 0 ? (
                    joinedOptions.map((option) => (
                      <button
                        key={option.tableIds.join("-")}
                        type="button"
                        onClick={() => handleUseJoinedSuggestion(option.tableIds)}
                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-500/10"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{option.tableLabel}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {option.seats} asientos - exceso {option.excessSeats}
                          </p>
                        </div>
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100">
                          Usar combinacion
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                      No hay combinaciones sugeridas disponibles para este horario.
                    </p>
                  )}
                </div>

                <SectionTitle title="Seleccion manual" />
                <div className="max-h-[34vh] space-y-2 overflow-y-auto pr-1 sm:max-h-[40vh] xl:max-h-none">
                  {singleOptions.map((option) => {
                    const selected = selectedJoinedTableIdSet.has(option.tableIds[0]);
                    const canSelect = option.available || selected;

                    return (
                      <button
                        key={option.tableIds[0]}
                        type="button"
                        onClick={() => handleToggleJoinedTable(option.tableIds[0])}
                        disabled={!canSelect}
                        className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                          selected
                            ? "border-cyan-400/40 bg-cyan-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        } ${
                          canSelect
                            ? "text-slate-100"
                            : "cursor-not-allowed border-white/5 bg-white/[0.03] text-slate-500"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{option.tableLabel}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {option.seats} asientos -{" "}
                            {option.tableIds.length > 1 ? "combinada" : "individual"}
                          </p>
                          {option.reason ? (
                            <p className="mt-1 text-xs text-rose-200">{option.reason}</p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right text-xs uppercase tracking-[0.14em]">
                          {selected ? (
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">
                              Seleccionada
                            </span>
                          ) : option.available ? (
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-100">
                              Disponible
                            </span>
                          ) : (
                            <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-slate-400">
                              No disponible
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 xl:sticky xl:top-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Resumen de combinacion
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <span>Mesas seleccionadas</span>
                    <span className="font-semibold text-white">
                      {uniqueSelectedJoinedTableIds.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Asientos totales</span>
                    <span className="font-semibold text-white">{selectedJoinedTablesSeats}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Personas necesarias</span>
                    <span className="font-semibold text-white">{activeReservation.partySize}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs text-slate-300">
                  {selectedJoinedTablesSeats >= activeReservation.partySize
                    ? "La combinacion alcanza para esta reserva."
                    : "La combinacion aun no alcanza para esta reserva."}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedJoinedTableIds([])}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
                  >
                    Limpiar seleccion
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignJoined}
                    className="rounded-full bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Guardar combinacion
                  </button>
                </div>
              </aside>
            </div>
          )}
        </div>

        <footer className="border-t border-white/10 bg-slate-950/95 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleUnassign}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              Quitar asignacion
            </button>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                Cancelar
              </button>
              {mode === "single" ? (
                <button
                  type="button"
                  onClick={handleAssignSingle}
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Asignar mesa
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAssignJoined}
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Guardar combinacion
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

type SectionTitleProps = {
  title: string;
};

function SectionTitle({ title }: SectionTitleProps) {
  return (
    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{title}</p>
  );
}

type OptionCardProps = {
  active: boolean;
  available: boolean;
  label: string;
  meta: string;
  reason?: string | null;
  tone?: "default" | "emerald" | "rose" | "amber" | "cyan";
  onClick: () => void;
};

function OptionCard({
  active,
  available,
  label,
  meta,
  reason,
  tone = "default",
  onClick,
}: OptionCardProps) {
  const toneStyles =
    tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10"
      : tone === "rose"
        ? "border-rose-400/20 bg-rose-500/10"
        : tone === "amber"
          ? "border-amber-400/20 bg-amber-500/10"
          : tone === "cyan"
            ? "border-cyan-400/20 bg-cyan-500/10"
        : "border-white/10 bg-white/5";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!available}
      className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        active ? "border-cyan-400/40 bg-cyan-500/10" : toneStyles
      } ${
        available
          ? "text-slate-100 hover:border-cyan-400/30"
          : "cursor-not-allowed border-white/5 bg-white/[0.03] text-slate-500"
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs text-slate-400">{meta}</p>
        {reason ? <p className="mt-1 text-xs text-rose-200">{reason}</p> : null}
      </div>
      <div className="shrink-0 text-right text-xs uppercase tracking-[0.14em]">
        {active ? (
          <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">
            Seleccionada
          </span>
        ) : available ? (
          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-100">
            Sugerida
          </span>
        ) : (
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-slate-400">
            No disponible
          </span>
        )}
      </div>
    </button>
  );
}
