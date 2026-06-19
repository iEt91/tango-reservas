type MetricCard = {
  label: string;
  value: number | string;
  tone?: "default" | "emerald" | "cyan" | "amber" | "rose";
  helper?: string;
};

type LocalReservationsStatsProps = {
  metricCards: MetricCard[];
};

export function LocalReservationsStats({
  metricCards,
}: LocalReservationsStatsProps) {
  const coreMetricCards = metricCards.slice(0, 7);
  const nextMetricCard = metricCards[7];

  return (
    <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.9fr)]">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
        {coreMetricCards.map((item) => (
          <article
            key={item.label}
            className="min-h-[74px] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-2xl shadow-black/20"
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
              {item.label}
            </p>
            <p
              className={`mt-1 text-[1.2rem] font-semibold tracking-tight sm:text-[1.3rem] ${
                item.tone === "emerald"
                  ? "text-emerald-200"
                  : item.tone === "cyan"
                    ? "text-cyan-200"
                    : item.tone === "amber"
                      ? "text-amber-200"
                      : item.tone === "rose"
                        ? "text-rose-200"
                        : "text-white"
              }`}
            >
              {item.value}
            </p>
          </article>
        ))}
      </div>

      <article className="min-h-[74px] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-2xl shadow-black/20">
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
          {nextMetricCard.label}
        </p>
        <p className="mt-1 text-[1.18rem] font-semibold tracking-tight text-white sm:text-[1.28rem]">
          {nextMetricCard.value}
        </p>
        {nextMetricCard.helper ? (
          <p className="mt-1 text-[10px] leading-4 text-slate-400">
            {nextMetricCard.helper}
          </p>
        ) : null}
      </article>
    </div>
  );
}
