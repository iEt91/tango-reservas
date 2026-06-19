type FloorPlanStatsProps = {
  totalTables: number;
  totalSeats: number;
  available: number;
  occupied: number;
  blocked: number;
  unassignedReservations: number;
};

const metricCards = [
  { key: "totalTables", label: "Total mesas" },
  { key: "totalSeats", label: "Asientos totales" },
  { key: "available", label: "Mesas disponibles" },
  { key: "occupied", label: "Ocupadas / reservadas" },
  { key: "blocked", label: "Bloqueadas / fuera de servicio" },
  { key: "unassignedReservations", label: "Reservas sin mesa" },
] as const;

export function FloorPlanStats({
  totalTables,
  totalSeats,
  available,
  occupied,
  blocked,
  unassignedReservations,
}: FloorPlanStatsProps) {
  const values = {
    totalTables,
    totalSeats,
    available,
    occupied,
    blocked,
    unassignedReservations,
  };

  return (
    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
      {metricCards.map((item) => (
        <article
          key={item.key}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-2xl shadow-black/20"
        >
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
            {item.label}
          </p>
          <p className="mt-1 text-[1.2rem] font-semibold tracking-tight text-white">
            {values[item.key]}
          </p>
        </article>
      ))}
    </section>
  );
}
