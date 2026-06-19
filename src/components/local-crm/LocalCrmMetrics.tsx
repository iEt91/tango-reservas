type CrmMetricCard = {
  label: string;
  value: number | string;
  helper?: string;
  tone?: "default" | "emerald" | "cyan" | "amber" | "rose";
};

type LocalCrmMetricsProps = {
  metricCards: CrmMetricCard[];
};

export function LocalCrmMetrics({ metricCards }: LocalCrmMetricsProps) {
  return (
    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
      {metricCards.map((card) => (
        <article
          key={card.label}
          className="min-h-[76px] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-2xl shadow-black/20"
        >
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
            {card.label}
          </p>
          <p
            className={`mt-1 text-[1.15rem] font-semibold tracking-tight ${
              card.tone === "emerald"
                ? "text-emerald-200"
                : card.tone === "cyan"
                  ? "text-cyan-200"
                  : card.tone === "amber"
                    ? "text-amber-200"
                    : card.tone === "rose"
                      ? "text-rose-200"
                      : "text-white"
            }`}
          >
            {card.value}
          </p>
          {card.helper ? (
            <p className="mt-1 text-[10px] leading-4 text-slate-400">
              {card.helper}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
