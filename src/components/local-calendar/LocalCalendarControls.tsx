import type { CalendarViewMode } from "@/lib/calendar";
import {
  addDaysToDateValue,
  getCalendarDateLabel,
  getCalendarWeekTitle,
} from "@/lib/calendar";

type LocalCalendarControlsProps = {
  currentDateValue: string;
  onDateChange: (value: string) => void;
  onViewModeChange: (value: CalendarViewMode) => void;
  selectedDate: string;
  viewMode: CalendarViewMode;
};

export function LocalCalendarControls({
  currentDateValue,
  onDateChange,
  onViewModeChange,
  selectedDate,
  viewMode,
}: LocalCalendarControlsProps) {
  const title =
    viewMode === "day"
      ? getCalendarDateLabel(selectedDate)
      : `Semana ${getCalendarWeekTitle(selectedDate)}`;

  function goPrevious() {
    onDateChange(addDaysToDateValue(selectedDate, viewMode === "day" ? -1 : -7));
  }

  function goNext() {
    onDateChange(addDaysToDateValue(selectedDate, viewMode === "day" ? 1 : 7));
  }

  function goToday() {
    onDateChange(currentDateValue);
  }

  const previousLabel = viewMode === "day" ? "Ayer" : "Semana anterior";
  const nextLabel = viewMode === "day" ? "Mañana" : "Semana siguiente";

  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3.5 shadow-2xl shadow-black/20 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
            Vista operativa
          </p>
          <h2 className="text-base font-semibold tracking-tight text-white">
            {title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="space-y-1">
            <span className="sr-only">Fecha</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="input-base min-w-[160px]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onViewModeChange("day")}
              className={`rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                viewMode === "day"
                  ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/30 hover:text-white"
              }`}
            >
              Dia
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("week")}
              className={`rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                viewMode === "week"
                  ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/30 hover:text-white"
              }`}
            >
              Semana
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={goPrevious}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
        >
          {previousLabel}
        </button>
        <button
          type="button"
          onClick={goToday}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={goNext}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
        >
          {nextLabel}
        </button>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
          {viewMode === "day" ? "Vista diaria" : "Vista semanal"}
        </span>
      </div>
    </section>
  );
}
