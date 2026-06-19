import { StatusBadge } from "@/components/StatusBadge";
import type { Business, Reservation } from "@/data/types";

type LocalReservationDetailDrawerProps = {
  business: Business | null;
  onClose: () => void;
  onOpenAssignTable?: (reservation: Reservation) => void;
  onChangeStatus?: (reservationId: string, status: Reservation["status"]) => void;
  reservation: Reservation | null;
  serviceName: string | null;
  tableLabel: string;
};

const quickActionOrder: Array<{
  label: string;
  status: Reservation["status"];
  tone: "emerald" | "rose" | "cyan" | "amber";
}> = [
  { label: "Confirmar", status: "confirmed", tone: "emerald" },
  { label: "Cancelar", status: "cancelled", tone: "rose" },
  { label: "Completar", status: "completed", tone: "cyan" },
  { label: "No-show", status: "no_show", tone: "amber" },
];

export function LocalReservationDetailDrawer({
  business,
  onClose,
  onChangeStatus,
  onOpenAssignTable,
  reservation,
  serviceName,
  tableLabel,
}: LocalReservationDetailDrawerProps) {
  if (!reservation || !business) {
    return null;
  }

  const displayTime = reservation.reservationTime.includes(":")
    ? reservation.reservationTime.slice(0, 5)
    : reservation.reservationTime;
  const displayServiceName = serviceName ?? (reservation.serviceId ? "Servicio eliminado" : "Sin servicio");

  const quickActions = quickActionOrder.filter((action) => {
    if (reservation.status === "pending") {
      return true;
    }

    if (reservation.status === "confirmed") {
      return action.status !== "confirmed";
    }

    return false;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur sm:items-center">
      <div className="w-full max-w-2xl rounded-[1.5rem] border border-white/10 bg-slate-950 p-5 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Detalle de reserva
            </p>
            <h3 className="mt-1 text-xl font-semibold text-white">
              {reservation.customerName}
            </h3>
            <p className="mt-1 text-sm text-slate-400">{business.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge status={reservation.status} />
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
            {displayServiceName}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
            {tableLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
            {reservation.source}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Telefono" value={reservation.customerPhone} />
          <DetailItem label="Email" value={reservation.customerEmail || "Sin email"} />
          <DetailItem label="Fecha" value={reservation.reservationDate} />
          <DetailItem label="Horario" value={displayTime} />
          <DetailItem label="Personas" value={String(reservation.partySize)} />
          <DetailItem label="Servicio" value={displayServiceName} />
          <DetailItem label="Creada" value={reservation.createdAt} />
          <DetailItem label="Actualizada" value={reservation.updatedAt} />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Nota
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {reservation.notes || "Sin notas."}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {onOpenAssignTable ? (
            <button
              type="button"
              onClick={() => onOpenAssignTable(reservation)}
              className="inline-flex items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-500/15"
              >
                {reservation.joinedTableLabel || reservation.tableLabel
                  ? "Cambiar mesa"
                  : "Asignar mesa"}
            </button>
          ) : null}

          {onChangeStatus && quickActions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.status}
                  type="button"
                  onClick={() => onChangeStatus(reservation.id, action.status)}
                  className={`inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                    action.tone === "emerald"
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400/40 hover:bg-emerald-500/15"
                      : action.tone === "rose"
                        ? "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:border-rose-400/40 hover:bg-rose-500/15"
                        : action.tone === "cyan"
                          ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:border-cyan-400/40 hover:bg-cyan-500/15"
                          : "border-amber-400/20 bg-amber-500/10 text-amber-100 hover:border-amber-400/40 hover:bg-amber-500/15"
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type DetailItemProps = {
  label: string;
  value: string;
};

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-white break-words">{value}</p>
    </div>
  );
}
