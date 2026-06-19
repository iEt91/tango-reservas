"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { FloorTableFormValues } from "./types";
import {
  FLOOR_TABLE_SHAPE_OPTIONS,
  TABLE_MAX_CORNER_RADIUS,
  TABLE_MIN_HEIGHT,
  TABLE_MIN_WIDTH,
} from "./table-geometry";

type FloorTableModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (values: FloorTableFormValues) => void;
};

const defaultValues: FloorTableFormValues = {
  label: "",
  seats: "4",
  width: "110",
  height: "110",
  rotation: "0",
  status: "available",
  shape: "square",
  cornerRadius: "0",
  isJoinable: true,
};

export function FloorTableModal({ open, onClose, onSave }: FloorTableModalProps) {
  const [values, setValues] = useState<FloorTableFormValues>(defaultValues);
  const [error, setError] = useState("");

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
  }, [open, onClose]);

  function updateField<K extends keyof FloorTableFormValues>(
    field: K,
    value: FloorTableFormValues[K],
  ) {
    setValues((current) => {
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

  function handleSave() {
    const label = values.label.trim();
    const seats = Number(values.seats);
    const width = Number(values.width);
    const height = Number(values.height);
    const rotation = Number(values.rotation);
    const cornerRadius = Number(values.cornerRadius);

    if (!label) {
      setError("El nombre de la mesa es obligatorio.");
      return;
    }

    if (!Number.isFinite(seats) || seats <= 0) {
      setError("Los asientos deben ser mayores a 0.");
      return;
    }

    if (!Number.isFinite(width) || width < 70) {
      setError("El ancho debe ser razonable.");
      return;
    }

    if (!Number.isFinite(height) || height < 50) {
      setError("El alto debe ser razonable.");
      return;
    }

    if (!Number.isFinite(rotation)) {
      setError("La rotacion debe ser numerica.");
      return;
    }

    if (!Number.isFinite(cornerRadius) || cornerRadius < 0 || cornerRadius > TABLE_MAX_CORNER_RADIUS) {
      setError("El redondeo debe estar entre 0 y 64.");
      return;
    }

    onSave({
      ...values,
      label,
    });
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="floor-table-modal-title"
        className="w-full max-w-2xl rounded-[1.5rem] border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-black/40 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
              Plano
            </p>
            <h2
              id="floor-table-modal-title"
              className="mt-1 text-xl font-semibold text-white"
            >
              Nueva mesa
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              La mesa se colocara con una posicion inicial dentro del plano y luego
              la podras mover.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:text-white"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Label">
            <input
              value={values.label}
              onChange={(event) => updateField("label", event.target.value)}
              className="input-base"
              autoFocus
            />
          </Field>
          <Field label="Asientos">
            <input
              type="number"
              min={1}
              step={1}
              value={values.seats}
              onChange={(event) => updateField("seats", event.target.value)}
              className="input-base"
            />
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
          <Field label="Ancho">
            <input
              type="number"
              min={TABLE_MIN_WIDTH}
              step={1}
              value={values.width}
              onChange={(event) => updateField("width", event.target.value)}
              className="input-base"
            />
          </Field>
          <Field label="Alto">
            <input
              type="number"
              min={TABLE_MIN_HEIGHT}
              step={1}
              value={values.height}
              onChange={(event) => updateField("height", event.target.value)}
              className="input-base"
            />
          </Field>
          <Field label="Se puede unir">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={values.isJoinable}
                onChange={(event) =>
                  updateField("isJoinable", event.target.checked)
                }
                className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
              />
              <span>Si</span>
            </label>
          </Field>
          <Field label="Rotacion">
            <input
              type="number"
              value={values.rotation}
              onChange={(event) => updateField("rotation", event.target.value)}
              className="input-base"
            />
          </Field>
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
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Guardar mesa
          </button>
        </div>
      </section>
    </div>
  );
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
