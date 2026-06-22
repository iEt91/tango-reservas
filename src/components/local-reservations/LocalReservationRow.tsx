import type { Reservation, ReservationStatus } from "@/data/types";
import { LocalReservationActions } from "@/components/local-reservations/LocalReservationActions";
import { LocalReservationStatusBadge } from "@/components/local-reservations/LocalReservationStatusBadge";

type LocalReservationRowProps = {
  onChangeStatus: (reservationId: string, status: ReservationStatus) => void;
  onOpenAssignTable: (reservation: Reservation) => void;
  onOpenDetail: (reservation: Reservation) => void;
  reservation: Reservation;
  availabilityLabel?: string | null;
  availabilityReason?: string | null;
  availabilityTone?: "cyan" | "amber" | "emerald" | "rose" | "slate";
  serviceName: string;
  tableLabel: string;
  compact?: boolean;
};

export function LocalReservationRow({
  onChangeStatus,
  onOpenAssignTable,
  onOpenDetail,
  reservation,
  availabilityLabel,
  availabilityReason,
  availabilityTone,
  serviceName,
  tableLabel,
  compact = false,
}: LocalReservationRowProps) {
  const displayTime = reservation.reservationTime.includes(":")
    ? reservation.reservationTime.slice(0, 5)
    : reservation.reservationTime;

  const availabilityToneStyles =
    availabilityTone === "rose"
      ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
      : availabilityTone === "emerald"
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : availabilityTone === "amber"
          ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
          : availabilityTone === "cyan"
            ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
            : "border-white/10 bg-slate-900/70 text-slate-200";

  const rowClassName = compact
    ? "grid gap-2 px-3 py-3 sm:px-4 xl:grid-cols-[84px_minmax(0,1fr)_248px] xl:items-start xl:gap-3"
    : "grid gap-3 px-4 py-4 sm:px-5 xl:grid-cols-[104px_minmax(0,1fr)_304px] xl:items-start xl:gap-4";

  return (
    <article className={rowClassName}>
      <div className="flex items-start justify-between gap-2 xl:flex-col xl:justify-start xl:gap-1">
        <div className="space-y-0.5">
          <p
            className={`font-semibold tracking-tight text-white ${
              compact ? "text-[1.4rem] sm:text-[1.5rem]" : "text-[1.65rem] sm:text-[1.8rem]"
            }`}
          >
            {displayTime}
          </p>
          <p className={`uppercase tracking-[0.18em] text-slate-400 ${compact ? "text-[9px]" : "text-[10px]"}`}>
            {reservation.partySize} personas
          </p>
        </div>
        <div className="xl:hidden">
          <LocalReservationStatusBadge status={reservation.status} />
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        <div className={`flex flex-wrap items-center gap-2.5 ${compact ? "gap-2" : ""}`}>
          <LocalReservationStatusBadge status={reservation.status} />
          <span className={`rounded-full border border-white/10 bg-slate-900/70 font-medium leading-none text-slate-100 shadow-sm shadow-black/10 ${compact ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-[13px]"}`}>
            {serviceName}
          </span>
          <span className={`rounded-full border border-white/10 bg-slate-900/70 font-medium leading-none text-slate-100 shadow-sm shadow-black/10 ${compact ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-[13px]"}`}>
            {tableLabel}
          </span>
          <span className={`rounded-full border border-white/10 bg-slate-900/70 font-medium leading-none text-slate-100 shadow-sm shadow-black/10 ${compact ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-[13px]"}`}>
            {reservation.source}
          </span>
          <button
            type="button"
            onClick={() => onOpenDetail(reservation)}
            className={`rounded-full border border-white/10 bg-white/5 font-medium leading-none text-slate-100 shadow-sm shadow-black/10 transition hover:border-cyan-400/30 hover:bg-white/10 hover:text-white ${compact ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-[13px]"}`}
          >
            Ver detalle
          </button>
        </div>

        <div className={`grid gap-x-4 gap-y-1.5 text-[13px] text-slate-100 sm:grid-cols-2 xl:grid-cols-2 ${compact ? "text-[11px]" : ""}`}>
          <InfoPill label="Cliente" value={reservation.customerName} />
          <InfoPill label="Telefono" value={reservation.customerPhone} />
          <InfoPill label="Email" value={reservation.customerEmail || "Sin email"} />
          <InfoPill
            label="Nota"
            value={reservation.notes || "Sin notas"}
            truncate
          />
        </div>

        {availabilityLabel ? (
          <div className={`inline-flex flex-wrap items-center gap-2 rounded-full border font-medium leading-none ${compact ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-[13px]"} ${availabilityToneStyles}`}>
            <span>{availabilityLabel}</span>
            {availabilityReason ? (
              <span className="text-[11px] text-white/70">{availabilityReason}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5 xl:min-w-[304px] xl:items-end xl:self-start">
        <button
          type="button"
          onClick={() => onOpenAssignTable(reservation)}
          className="inline-flex w-full items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3.5 py-2.5 text-[12px] font-medium text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-500/15"
        >
          {reservation.joinedTableLabel || reservation.tableLabel
            ? "Cambiar mesa"
            : "Asignar mesa"}
        </button>
        <LocalReservationActions
          reservation={reservation}
          onChangeStatus={onChangeStatus}
        />
        <div className="text-right text-[10px] uppercase tracking-[0.16em] text-slate-500">
          {reservation.reservationDate}
        </div>
      </div>
    </article>
  );
}

type InfoPillProps = {
  label: string;
  value: string;
  truncate?: boolean;
};

function InfoPill({ label, value, truncate }: InfoPillProps) {
  return (
    <div className="min-w-0 leading-tight">
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}:
      </span>{" "}
      <span
        className={`font-semibold text-slate-50 ${
          truncate ? "inline-block max-w-[240px] truncate align-bottom" : ""
        }`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
