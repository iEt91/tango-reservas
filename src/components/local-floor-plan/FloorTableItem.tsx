import type { PointerEvent } from "react";
import type { JoinedTable, Reservation, FloorTable } from "@/data/types";
import type { FloorTableResizeHandle } from "./types";
import { getTableBorderRadius } from "./table-geometry";
import { TableStatusStack } from "./TableStatusStack";

type FloorTableItemProps = {
  table: FloorTable;
  isSelected: boolean;
  isBackgroundEditMode: boolean;
  slotReservations: Reservation[];
  joinedTable: JoinedTable | null;
  warnings: string[];
  onPointerDown: (event: PointerEvent<HTMLElement>, table: FloorTable) => void;
  onResizePointerDown: (
    event: PointerEvent<HTMLElement>,
    table: FloorTable,
    handle: FloorTableResizeHandle,
  ) => void;
  onClick: (table: FloorTable) => void;
  isResizeMode: boolean;
};

const statusStyles: Record<FloorTable["status"], string> = {
  available: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  occupied: "border-rose-400/30 bg-rose-500/15 text-rose-100",
  reserved: "border-amber-400/30 bg-amber-500/15 text-amber-100",
  blocked: "border-violet-400/30 bg-violet-500/15 text-violet-100",
  out_of_service: "border-slate-500/30 bg-slate-800/80 text-slate-200",
};

export function FloorTableItem({
  table,
  isSelected,
  isBackgroundEditMode,
  slotReservations,
  joinedTable,
  warnings,
  onPointerDown,
  onResizePointerDown,
  onClick,
  isResizeMode,
}: FloorTableItemProps) {
  const activeReservation = slotReservations[0] ?? null;

  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.preventDefault();
        onPointerDown(event, table);
      }}
      onDragStart={(event) => event.preventDefault()}
      onClick={() => onClick(table)}
      className={`absolute z-10 flex min-w-0 touch-none select-none flex-col justify-between overflow-visible border px-2.5 py-2 text-left shadow-2xl shadow-black/25 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 ${statusStyles[table.status]} ${
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
        <span className="truncate text-[12px] font-semibold leading-none">
          {table.label}
        </span>
        <span className="truncate text-[9px] uppercase tracking-[0.14em] text-white/80">
          {table.seats} asientos
        </span>
        <TableStatusStack
          status={table.status}
          customerName={activeReservation ? activeReservation.customerName : null}
          partySize={activeReservation ? activeReservation.partySize : null}
        />
        {joinedTable ? (
          <span className="inline-flex max-w-full truncate rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-cyan-100">
            {joinedTable.label}
          </span>
        ) : null}
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
        <ResizeHandles
          table={table}
          onResizePointerDown={onResizePointerDown}
        />
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
