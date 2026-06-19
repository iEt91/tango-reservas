import type { FloorTableStatus } from "@/data/types";

const legendItems: Array<{ label: string; status: FloorTableStatus }> = [
  { label: "Disponible", status: "available" },
  { label: "Ocupada", status: "occupied" },
  { label: "Reservada", status: "reserved" },
  { label: "Bloqueada", status: "blocked" },
  { label: "Fuera de servicio", status: "out_of_service" },
];

const statusStyles: Record<FloorTableStatus, string> = {
  available: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
  occupied: "bg-rose-500/15 text-rose-200 border-rose-400/20",
  reserved: "bg-amber-500/15 text-amber-200 border-amber-400/20",
  blocked: "bg-violet-500/15 text-violet-200 border-violet-400/20",
  out_of_service: "bg-slate-700/40 text-slate-200 border-slate-500/20",
};

export function FloorPlanLegend() {
  return (
    <section className="flex flex-wrap gap-2">
      {legendItems.map((item) => (
        <span
          key={item.status}
          className={`rounded-full border px-3 py-1 text-[11px] font-medium ${statusStyles[item.status]}`}
        >
          {item.label}
        </span>
      ))}
    </section>
  );
}
