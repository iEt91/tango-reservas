"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { PointerEvent, RefObject } from "react";
import type {
  FloorPlanBackground,
  JoinedTable,
  FloorTable,
  Reservation,
  TableOccupancySummary,
} from "@/data/types";
import type { FloorTableResizeHandle } from "./types";
import { FloorTableItem } from "./FloorTableItem";
import { getTableBorderRadius } from "./table-geometry";
import { TableStatusStack } from "./TableStatusStack";

type FloorPlanCanvasProps = {
  background: FloorPlanBackground;
  backgroundEditMode: boolean;
  backgroundSelected: boolean;
  slotOccupancy: TableOccupancySummary;
  tables: FloorTable[];
  selectedTableId: string | null;
  canvasRef: RefObject<HTMLDivElement | null>;
  onSelectTable: (table: FloorTable) => void;
  onPointerDownTable: (
    event: PointerEvent<HTMLElement>,
    table: FloorTable,
  ) => void;
  onResizePointerDownTable: (
    event: PointerEvent<HTMLElement>,
    table: FloorTable,
    handle: FloorTableResizeHandle,
  ) => void;
  onBackgroundPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onBackgroundResizePointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  isTableResizeMode: boolean;
};

export function FloorPlanCanvas({
  background,
  backgroundEditMode,
  backgroundSelected,
  slotOccupancy,
  tables,
  selectedTableId,
  canvasRef,
  onSelectTable,
  onPointerDownTable,
  onResizePointerDownTable,
  onBackgroundPointerDown,
  onBackgroundResizePointerDown,
  isTableResizeMode,
}: FloorPlanCanvasProps) {
  const hasBackground = Boolean(background.backgroundImage);
  const canEditBackground = backgroundEditMode && hasBackground;
  const showBackgroundFrame = canEditBackground && backgroundSelected;
  const visibleTables = useMemo(() => {
    function getVisualTableStatus(table: FloorTable, activeReservation: Reservation | null) {
      if (table.status === "blocked" || table.status === "out_of_service") {
        return table.status;
      }

      if (activeReservation) {
        return activeReservation.status === "completed" ? "occupied" : "reserved";
      }

      return table.status;
    }

    const joinedTables = Object.values(slotOccupancy.joinedTableByTableId).reduce(
      (unique, joinedTable) => {
        if (joinedTable && !unique.some((entry) => entry.id === joinedTable.id)) {
          unique.push(joinedTable);
        }

        return unique;
      },
      [] as JoinedTable[],
    );

    const hiddenTableIds = new Set<string>();
    const items: Array<
      | {
          kind: "single";
          table: FloorTable;
          slotReservations: Reservation[];
          joinedTable: JoinedTable | null;
          warnings: string[];
        }
      | {
          kind: "joined";
          table: FloorTable;
          baseTableId: string;
          baseTable: FloorTable;
          slotReservations: Reservation[];
          joinedTable: JoinedTable;
          warnings: string[];
        }
    > = [];

    for (const joinedTable of joinedTables) {
      const members = joinedTable.tableIds
        .map((tableId) => tables.find((entry) => entry.id === tableId) ?? null)
        .filter((entry): entry is FloorTable => entry !== null);

      if (members.length === 0) {
        continue;
      }

      const baseTable = members[0];
      const activeReservation =
        slotOccupancy.assignmentsByTableId[joinedTable.tableIds[0]]?.[0] ?? null;

      items.push({
        kind: "joined",
        table: {
          ...baseTable,
          id: joinedTable.id,
          label: joinedTable.label,
          seats: joinedTable.totalSeats,
          x: baseTable.x,
          y: baseTable.y,
          width: baseTable.width,
          height: baseTable.height,
          status: getVisualTableStatus(baseTable, activeReservation),
          shape: baseTable.shape,
          rotation: baseTable.rotation,
          isJoinable: false,
          createdAt: joinedTable.createdAt,
          updatedAt: joinedTable.updatedAt,
        },
        baseTableId: baseTable.id,
        baseTable,
        slotReservations: activeReservation ? [activeReservation] : [],
        joinedTable,
        warnings:
          members.flatMap((table) => slotOccupancy.warningsByTableId?.[table.id] ?? []),
      });

      members.forEach((table) => hiddenTableIds.add(table.id));
    }

    for (const table of tables) {
      if (hiddenTableIds.has(table.id)) {
        continue;
      }

      const activeReservation = slotOccupancy.assignmentsByTableId[table.id]?.[0] ?? null;

      items.push({
        kind: "single",
        table: {
          ...table,
          status: getVisualTableStatus(table, activeReservation),
        },
        slotReservations: slotOccupancy.assignmentsByTableId[table.id] ?? [],
        joinedTable: slotOccupancy.joinedTableByTableId[table.id] ?? null,
        warnings: slotOccupancy.warningsByTableId?.[table.id] ?? [],
      });
    }

    return items;
  }, [slotOccupancy, tables]);

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-3 shadow-2xl shadow-black/30 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
            Canvas del salon
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Arrastra una mesa para cambiar su posicion.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
          {tables.length} mesas
        </div>
      </div>

      <div className="overflow-auto rounded-[1.5rem] border border-white/10 bg-[linear-gradient(rgba(15,23,42,0.8),rgba(2,6,23,0.95))] p-3">
        <div
          ref={canvasRef}
          className="relative min-h-[620px] min-w-[900px] overflow-hidden rounded-[1.35rem] border border-white/5 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px] bg-slate-950"
          style={{
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          {hasBackground ? (
            <div
              className={`absolute ${canEditBackground ? "cursor-move" : "pointer-events-none"} z-0`}
              style={{
                left: background.backgroundX,
                top: background.backgroundY,
                width: background.backgroundWidth,
                height: background.backgroundHeight,
              }}
              onPointerDown={canEditBackground ? onBackgroundPointerDown : undefined}
            >
              <Image
                src={background.backgroundImage as string}
                alt="Plano del local"
                fill
                unoptimized
                sizes="100vw"
                className="select-none"
                draggable={false}
                style={{
                  objectFit: background.fit === "stretch" ? "fill" : background.fit,
                  opacity: background.backgroundOpacity / 100,
                  filter: `brightness(${background.backgroundBrightness}%) contrast(${background.backgroundContrast}%)`,
                }}
              />

              {showBackgroundFrame ? (
                <>
                  <div className="absolute inset-0 rounded-[1rem] border border-cyan-400/60 ring-1 ring-cyan-400/30" />
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onBackgroundResizePointerDown(event);
                    }}
                    className="absolute left-0 top-0 z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize rounded-full border border-cyan-300/80 bg-cyan-200 shadow-lg shadow-cyan-500/30"
                    data-corner="top-left"
                    aria-label="Redimensionar fondo arriba izquierda"
                  />
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onBackgroundResizePointerDown(event);
                    }}
                    className="absolute right-0 top-0 z-20 h-3 w-3 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize rounded-full border border-cyan-300/80 bg-cyan-200 shadow-lg shadow-cyan-500/30"
                    data-corner="top-right"
                    aria-label="Redimensionar fondo arriba derecha"
                  />
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onBackgroundResizePointerDown(event);
                    }}
                    className="absolute left-0 bottom-0 z-20 h-3 w-3 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize rounded-full border border-cyan-300/80 bg-cyan-200 shadow-lg shadow-cyan-500/30"
                    data-corner="bottom-left"
                    aria-label="Redimensionar fondo abajo izquierda"
                  />
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onBackgroundResizePointerDown(event);
                    }}
                    className="absolute bottom-0 right-0 z-20 h-3 w-3 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-full border border-cyan-300/80 bg-cyan-200 shadow-lg shadow-cyan-500/30"
                    data-corner="bottom-right"
                    aria-label="Redimensionar fondo"
                  />
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onBackgroundResizePointerDown(event);
                    }}
                    className="absolute right-0 top-1/2 z-20 h-3 w-3 translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border border-cyan-300/80 bg-cyan-200 shadow-lg shadow-cyan-500/30"
                    data-corner="right"
                    aria-label="Redimensionar fondo a la derecha"
                  />
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onBackgroundResizePointerDown(event);
                    }}
                    className="absolute bottom-0 left-1/2 z-20 h-3 w-3 -translate-x-1/2 translate-y-1/2 cursor-ns-resize rounded-full border border-cyan-300/80 bg-cyan-200 shadow-lg shadow-cyan-500/30"
                    data-corner="bottom"
                    aria-label="Redimensionar fondo abajo"
                  />
                </>
              ) : null}
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_45%)]" />
          )}

          <div className="pointer-events-none absolute inset-0 z-[1] bg-slate-950/20" />
          <div className="pointer-events-none absolute inset-0 z-[2] rounded-[1.35rem] border border-cyan-400/5" />

          {visibleTables.map((entry) =>
            entry.kind === "joined" ? (
              <JoinedTableVisualItem
                key={entry.table.id}
                table={entry.table}
                baseTable={entry.baseTable}
                isBackgroundEditMode={backgroundEditMode}
                isResizeMode={isTableResizeMode}
                isSelected={entry.baseTableId === selectedTableId}
                joinedTable={entry.joinedTable}
                slotReservations={entry.slotReservations}
                warnings={entry.warnings}
                onClick={() => onSelectTable(entry.baseTable)}
                onPointerDown={onPointerDownTable}
                onResizePointerDown={onResizePointerDownTable}
              />
            ) : (
              <FloorTableItem
                key={entry.table.id}
                table={entry.table}
                isSelected={entry.table.id === selectedTableId}
                isBackgroundEditMode={backgroundEditMode}
                isResizeMode={isTableResizeMode}
                slotReservations={entry.slotReservations}
                joinedTable={entry.joinedTable}
                warnings={entry.warnings}
                onClick={onSelectTable}
                onPointerDown={onPointerDownTable}
                onResizePointerDown={onResizePointerDownTable}
              />
            ),
          )}

          {tables.length === 0 ? (
            <div className="absolute inset-0 z-[3] flex items-center justify-center px-6 text-center">
              <div className="max-w-md rounded-[1.5rem] border border-dashed border-white/10 bg-slate-950/80 px-6 py-8">
                <p className="text-sm font-medium text-white">No hay mesas en este plano</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Crea la primera mesa para empezar a distribuir el salon.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type JoinedTableVisualItemProps = {
  table: FloorTable;
  baseTable: FloorTable;
  isSelected: boolean;
  isBackgroundEditMode: boolean;
  isResizeMode: boolean;
  joinedTable: JoinedTable;
  slotReservations: Reservation[];
  warnings: string[];
  onClick: () => void;
  onPointerDown: (
    event: PointerEvent<HTMLElement>,
    table: FloorTable,
  ) => void;
  onResizePointerDown: (
    event: PointerEvent<HTMLElement>,
    table: FloorTable,
    handle: FloorTableResizeHandle,
  ) => void;
};

function JoinedTableVisualItem({
  table,
  baseTable,
  isSelected,
  isBackgroundEditMode,
  isResizeMode,
  joinedTable,
  slotReservations,
  warnings,
  onClick,
  onPointerDown,
  onResizePointerDown,
}: JoinedTableVisualItemProps) {
  const activeReservation = slotReservations[0] ?? null;
  const statusStyles: Record<FloorTable["status"], string> = {
    available: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
    occupied: "border-rose-400/30 bg-rose-500/15 text-rose-100",
    reserved: "border-amber-400/30 bg-amber-500/15 text-amber-100",
    blocked: "border-violet-400/30 bg-violet-500/15 text-violet-100",
    out_of_service: "border-slate-500/30 bg-slate-800/80 text-slate-200",
  };

  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.preventDefault();
        onPointerDown(event, baseTable);
      }}
      onClick={onClick}
      className={`absolute z-10 flex min-w-0 select-none flex-col justify-between overflow-visible border px-2.5 py-2 text-left shadow-2xl shadow-black/25 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 ${statusStyles[table.status]} ${
        isSelected ? "ring-2 ring-cyan-300/70 ring-offset-2 ring-offset-slate-950" : ""
      } ${isBackgroundEditMode ? "pointer-events-none opacity-80" : ""}`}
      style={{
        left: table.x,
        top: table.y,
        width: table.width,
        height: table.height,
        transform: `rotate(${table.rotation}deg)`,
        borderRadius: getTableBorderRadius(table),
      }}
    >
      <div className="relative z-10 flex h-full min-w-0 flex-col justify-between overflow-hidden">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <span className="block truncate text-[12px] font-semibold leading-none">
              {table.label}
            </span>
            <span className="block truncate text-[9px] uppercase tracking-[0.14em] text-white/80">
              {table.seats} asientos
            </span>
          </div>
          <span className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-cyan-100">
            Unida
          </span>
        </div>

        <TableStatusStack
          status={table.status}
          customerName={activeReservation ? activeReservation.customerName : null}
          partySize={activeReservation ? activeReservation.partySize : null}
        />
        <span className="inline-flex max-w-full truncate rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-cyan-100">
          {joinedTable.label}
        </span>

        {warnings.length > 0 ? (
          <span
            title={warnings[0]}
            className="inline-flex max-w-full flex-wrap rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-rose-100"
          >
            Alerta
          </span>
        ) : null}
      </div>

      {isSelected && isResizeMode ? (
        <ResizeHandles table={baseTable} onResizePointerDown={onResizePointerDown} />
      ) : null}
    </button>
  );
}

type ResizeHandlesProps = {
  table: FloorTable;
  onResizePointerDown: (
    event: PointerEvent<HTMLElement>,
    table: FloorTable,
    handle: FloorTableResizeHandle,
  ) => void;
};

function ResizeHandles({ table, onResizePointerDown }: ResizeHandlesProps) {
  return (
    <>
      <ResizeHandle
        ariaLabel="Redimensionar arriba izquierda"
        className="left-0 top-0 cursor-nwse-resize"
        handle="top-left"
        table={table}
        onResizePointerDown={onResizePointerDown}
      />
      <ResizeHandle
        ariaLabel="Redimensionar arriba derecha"
        className="right-0 top-0 cursor-nesw-resize"
        handle="top-right"
        table={table}
        onResizePointerDown={onResizePointerDown}
      />
      <ResizeHandle
        ariaLabel="Redimensionar abajo izquierda"
        className="left-0 bottom-0 cursor-nesw-resize"
        handle="bottom-left"
        table={table}
        onResizePointerDown={onResizePointerDown}
      />
      <ResizeHandle
        ariaLabel="Redimensionar abajo derecha"
        className="bottom-0 right-0 cursor-se-resize"
        handle="bottom-right"
        table={table}
        onResizePointerDown={onResizePointerDown}
      />
      <ResizeHandle
        ariaLabel="Redimensionar a la derecha"
        className="right-0 top-1/2 cursor-ew-resize"
        handle="right"
        table={table}
        onResizePointerDown={onResizePointerDown}
      />
      <ResizeHandle
        ariaLabel="Redimensionar abajo"
        className="bottom-0 left-1/2 cursor-ns-resize"
        handle="bottom"
        table={table}
        onResizePointerDown={onResizePointerDown}
      />
    </>
  );
}

type ResizeHandleProps = {
  ariaLabel: string;
  className: string;
  handle: FloorTableResizeHandle;
  table: FloorTable;
  onResizePointerDown: (
    event: PointerEvent<HTMLElement>,
    table: FloorTable,
    handle: FloorTableResizeHandle,
  ) => void;
};

function ResizeHandle({
  ariaLabel,
  className,
  handle,
  table,
  onResizePointerDown,
}: ResizeHandleProps) {
  return (
    <div
      aria-label={ariaLabel}
      data-handle={handle}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onResizePointerDown(event, table, handle);
      }}
      className={`absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/80 bg-cyan-200 shadow-lg shadow-cyan-500/30 ${className}`}
    />
  );
}
