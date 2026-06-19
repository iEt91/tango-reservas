"use client";

import type { FloorPlanBackground } from "@/data/types";

type FloorPlanBackgroundControlsProps = {
  background: FloorPlanBackground;
  backgroundEditMode: boolean;
  isExpanded: boolean;
  canToggleExpanded: boolean;
  isSupabase: boolean;
  onBackgroundImageChange: (file: File | null) => void;
  onBackgroundSettingChange: (
    field: "opacity" | "brightness" | "contrast" | "fit",
    value: number | FloorPlanBackground["fit"],
  ) => void;
  onBackgroundDimensionChange: (field: "backgroundX" | "backgroundY" | "backgroundWidth" | "backgroundHeight", value: number) => void;
  onResetBackground: () => void;
  onResetBackgroundTransform: () => void;
  onToggleExpanded: () => void;
  onToggleBackgroundEditMode: () => void;
};

export function FloorPlanBackgroundControls({
  background,
  backgroundEditMode,
  isExpanded,
  canToggleExpanded,
  isSupabase,
  onBackgroundImageChange,
  onBackgroundSettingChange,
  onBackgroundDimensionChange,
  onResetBackground,
  onResetBackgroundTransform,
  onToggleExpanded,
  onToggleBackgroundEditMode,
}: FloorPlanBackgroundControlsProps) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-black/20 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
              Fondo del plano
            </p>
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
              {background.backgroundImage ? "Imagen cargada" : "Sin imagen"}
            </span>
          </div>
          <h2 className="text-sm font-semibold text-white">
            Imagen, opacidad, brillo y contraste
          </h2>
          <p className="max-w-3xl text-xs leading-5 text-slate-300">
            Subi una imagen del salon para ubicar las mesas encima y ajustar su apariencia
            visual sin salir del panel del local.
          </p>
          {isSupabase ? (
            <p className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-100">
              Supabase Storage para imagenes de plano se implementara mas adelante. Por ahora usa URL o datos temporales.
            </p>
          ) : null}
          {backgroundEditMode ? (
            <p className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-100">
              Modo edicion de fondo activo: arrastra la imagen para moverla o sus
              esquinas para cambiar tamano.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleExpanded}
            disabled={!canToggleExpanded && isExpanded}
            className={`inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-medium transition ${
              canToggleExpanded
                ? "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:text-white"
                : "cursor-default border-white/10 bg-slate-900/60 text-slate-400"
            }`}
          >
            {isExpanded ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => onBackgroundImageChange(event.target.files?.[0] ?? null)}
              />
              Cargar imagen
            </label>
            <button
              type="button"
              onClick={onResetBackground}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              Quitar fondo
            </button>
            <button
              type="button"
              onClick={onToggleBackgroundEditMode}
              className={`inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                backgroundEditMode
                  ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:text-white"
              }`}
            >
              {backgroundEditMode ? "Editar fondo: ON" : "Editar fondo"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <RangeField
              label={`Opacidad ${background.backgroundOpacity}%`}
              min={0}
              max={100}
              step={1}
              value={background.backgroundOpacity}
              onChange={(value) => onBackgroundSettingChange("opacity", Number(value))}
            />
            <RangeField
              label={`Brillo ${background.backgroundBrightness}%`}
              min={0}
              max={100}
              step={1}
              value={background.backgroundBrightness}
              onChange={(value) => onBackgroundSettingChange("brightness", Number(value))}
            />
            <RangeField
              label={`Contraste ${background.backgroundContrast}%`}
              min={0}
              max={100}
              step={1}
              value={background.backgroundContrast}
              onChange={(value) => onBackgroundSettingChange("contrast", Number(value))}
            />
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Ajuste
              </span>
              <select
                value={background.fit}
                onChange={(event) =>
                  onBackgroundSettingChange("fit", event.target.value as FloorPlanBackground["fit"])
                }
                className="input-base"
              >
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
                <option value="stretch">Estirar</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                X
              </span>
              <input
                type="number"
                value={background.backgroundX}
                onChange={(event) =>
                  onBackgroundDimensionChange("backgroundX", Number(event.target.value))
                }
                className="input-base"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Y
              </span>
              <input
                type="number"
                value={background.backgroundY}
                onChange={(event) =>
                  onBackgroundDimensionChange("backgroundY", Number(event.target.value))
                }
                className="input-base"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Ancho
              </span>
              <input
                type="number"
                min={100}
                value={background.backgroundWidth}
                onChange={(event) =>
                  onBackgroundDimensionChange("backgroundWidth", Number(event.target.value))
                }
                className="input-base"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Alto
              </span>
              <input
                type="number"
                min={100}
                value={background.backgroundHeight}
                onChange={(event) =>
                  onBackgroundDimensionChange("backgroundHeight", Number(event.target.value))
                }
                className="input-base"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onResetBackgroundTransform}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              Resetear posicion/tamano
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

type RangeFieldProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: string) => void;
};

function RangeField({ label, min, max, step, value, onChange }: RangeFieldProps) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-2 w-full cursor-pointer accent-cyan-400"
      />
    </label>
  );
}
