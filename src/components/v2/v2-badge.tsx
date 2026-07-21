import { cn } from "@/lib/v2/v2-utils";
import type { V2ClientStatus, V2ReservationStatus } from "@/lib/v2/v2-mock-data";

type V2BadgeTone = "green" | "orange" | "red" | "blue" | "slate" | "purple";

const toneClasses: Record<V2BadgeTone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function V2Badge({
  children,
  tone = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: V2BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-lg px-2.5 text-xs font-semibold ring-1",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function V2ReservationStatusBadge({
  status,
}: {
  status: V2ReservationStatus;
}) {
  const config: Record<V2ReservationStatus, { label: string; tone: V2BadgeTone }> =
    {
      pending: { label: "Pendiente", tone: "orange" },
      confirmed: { label: "Confirmada", tone: "green" },
      completed: { label: "Completada", tone: "blue" },
      cancelled: { label: "Cancelada", tone: "red" },
      no_show: { label: "No-show", tone: "red" },
    };

  return <V2Badge tone={config[status].tone}>{config[status].label}</V2Badge>;
}

export function V2ClientStatusBadge({ status }: { status: V2ClientStatus }) {
  const config: Record<V2ClientStatus, { label: string; tone: V2BadgeTone }> = {
    new: { label: "Nuevo", tone: "green" },
    active: { label: "Activo", tone: "green" },
    frequent: { label: "Frecuente", tone: "blue" },
    inactive: { label: "Inactivo", tone: "slate" },
    no_show: { label: "No-show", tone: "red" },
  };

  return <V2Badge tone={config[status].tone}>{config[status].label}</V2Badge>;
}
