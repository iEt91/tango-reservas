import type { ReactNode } from "react";
import styles from "./LocalPremium.module.css";

type LocalPremiumMetricCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  footerLeft?: string;
  footerRight?: ReactNode;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function LocalPremiumMetricCard({
  title,
  value,
  subtitle,
  footerLeft,
  footerRight,
  icon,
  className = "",
  children,
}: LocalPremiumMetricCardProps) {
  return (
    <article className={`${styles.metricCard} p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            {icon}
            <span>{title}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-[1.7rem] font-bold leading-none text-white">{value}</div>
            {children}
          </div>
          {subtitle ? <div className="text-xs text-slate-400">{subtitle}</div> : null}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-[11px] text-slate-400">
        <span>{footerLeft ?? "Hoy"}</span>
        <span className="text-cyan-300">{footerRight}</span>
      </div>
    </article>
  );
}
