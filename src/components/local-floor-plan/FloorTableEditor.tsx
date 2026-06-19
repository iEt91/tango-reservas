"use client";

import { useState, type ReactNode } from "react";
import type { FloorTable } from "@/data/types";
import type { FloorTableFormValues } from "./types";
import {
  FLOOR_TABLE_SHAPE_OPTIONS,
  TABLE_MAX_CORNER_RADIUS,
  TABLE_MIN_HEIGHT,
  TABLE_MIN_WIDTH,
} from "./table-geometry";

type FloorTableEditorProps = {
  table: FloorTable | null;
  isResizeMode: boolean;
  onClose: () => void;
  onDelete: (tableId: string) => void;
  onSave: (tableId: string, values: FloorTableFormValues) => void;
  onToggleResizeMode: () => void;
};

export function FloorTableEditor({
  table,
  isResizeMode,
  onClose,
  onDelete,
  onSave,
  onToggleResizeMode,
}: FloorTableEditorProps) {
  const [values, setValues] = useState<FloorTableFormValues | null>(
    table ? tableToFormValues(table) : null,
  );

  function updateField<K extends keyof FloorTableFormValues>(
    field: K,
    value: FloorTableFormValues[K],
  ) {
    setValues((current) => {
      if (!current) {
        return current;
      }

      const nextValues = {
        ...current,
        [field]: value,
      };

      if (field === "shape" && value === "square") {
        nextValues.height = nextValues.width;
      }

      if (field === "width" && current.shape === "square") {
        nextValues.height = value as string;
      }

      if (field === "height" && current.shape === "square") {
        nextValues.width = value as string;
      }

      return nextValues;
    });
  }

  if (!table || !values) {
    return (
      <aside className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-black/20 sm:px-5 sm:py-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
          Editor de mesa
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Selecciona una mesa para editarla.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-black/20 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Editor de mesa
          </p>
          <h3 className="mt-1 text-xl font-semibold text-white">{table.label}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Ajusta propiedades, estado y posicion sin salir del plano.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:text-white"
          aria-label="Cerrar editor"
        >
          ×
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <Field label="Label">
          <input
            value={values.label}
            onChange={(event) => updateField("label", event.target.value)}
            className="input-base"
          />
        </Field>
        <Field label="Asientos">
          <input
            value={values.seats}
            onChange={(event) => updateField("seats", event.target.value)}
            className="input-base"
            type="number"
            min={1}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estado">
            <select
              value={values.status}
              onChange={(event) =>
                updateField("status", event.target.value as FloorTableFormValues["status"])
              }
              className="input-base"
            >
              <option value="available">Disponible</option>
              <option value="occupied">Ocupada</option>
              <option value="reserved">Reservada</option>
              <option value="blocked">Bloqueada</option>
              <option value="out_of_service">Fuera de servicio</option>
            </select>
          </Field>
          <Field label="Forma">
            <select
              value={values.shape}
              onChange={(event) =>
                updateField("shape", event.target.value as FloorTableFormValues["shape"])
              }
              className="input-base"
            >
              {FLOOR_TABLE_SHAPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Ancho">
            <input
              value={values.width}
              onChange={(event) => updateField("width", event.target.value)}
              className="input-base"
              type="number"
              min={TABLE_MIN_WIDTH}
            />
          </Field>
          <Field label="Alto">
            <input
              value={values.height}
              onChange={(event) => updateField("height", event.target.value)}
              className="input-base"
              type="number"
              min={TABLE_MIN_HEIGHT}
            />
          </Field>
          <Field label="Rotacion">
            <input
              value={values.rotation}
              onChange={(event) => updateField("rotation", event.target.value)}
              className="input-base"
              type="number"
            />
          </Field>
        </div>

        <Field label="Redondeo de esquinas">
          <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
            <input
              type="range"
              min={0}
              max={TABLE_MAX_CORNER_RADIUS}
              step={1}
              value={values.cornerRadius}
              onChange={(event) => updateField("cornerRadius", event.target.value)}
              className="h-2 w-full cursor-pointer accent-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={values.shape === "round"}
            />
            <input
              type="number"
              min={0}
              max={TABLE_MAX_CORNER_RADIUS}
              step={1}
              value={values.cornerRadius}
              onChange={(event) => updateField("cornerRadius", event.target.value)}
              className="input-base"
              disabled={values.shape === "round"}
            />
          </div>
          <p className="text-[11px] leading-5 text-slate-400">
            0 deja esquinas rectas. En mesas redondas el redondeo no se aplica igual.
          </p>
        </Field>

        <button
          type="button"
          onClick={onToggleResizeMode}
          className={`inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-medium transition ${
            isResizeMode
              ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
              : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:text-white"
          }`}
        >
          {isResizeMode ? "Terminar redimensionado" : "Redimensionar mesa"}
        </button>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
          <input
            checked={values.isJoinable}
            onChange={(event) =>
              setValues((current) =>
                current ? { ...current, isJoinable: event.target.checked } : current,
              )
            }
            className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
            type="checkbox"
          />
          <span>Se puede unir en el futuro</span>
        </label>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">
        La union de mesas y la asignacion a reservas llegaran en proximas versiones.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => onDelete(table.id)}
          className="inline-flex items-center justify-center rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-500/15"
        >
          Eliminar mesa
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => onSave(table.id, values)}
            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </aside>
  );
}

function tableToFormValues(table: FloorTable): FloorTableFormValues {
  return {
    label: table.label,
    seats: String(table.seats),
    width: String(table.width),
    height: String(table.height),
    rotation: String(table.rotation),
    status: table.status,
    shape: table.shape,
    cornerRadius: String(table.cornerRadius ?? 0),
    isJoinable: table.isJoinable,
  };
}

type FieldProps = {
  label: string;
  children: ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <label className="space-y-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
