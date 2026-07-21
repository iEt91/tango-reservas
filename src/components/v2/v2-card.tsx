import type { ReactNode } from "react";
import { cn } from "@/lib/v2/v2-utils";

type V2CardProps = {
  children: ReactNode;
  className?: string;
};

export function V2Card({ children, className }: V2CardProps) {
  return (
    <section
      className={cn(
        "rounded-[14px] border border-slate-200 bg-white p-5",
        className
      )}
    >
      {children}
    </section>
  );
}

type V2MetricCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
  tone?: "blue" | "green" | "orange" | "red" | "purple" | "slate";
};

const metricToneClasses = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  orange: "bg-orange-50 text-orange-700",
  red: "bg-red-50 text-red-700",
  purple: "bg-violet-50 text-violet-700",
  slate: "bg-slate-100 text-slate-700",
};

export function V2MetricCard({
  label,
  value,
  helper,
  icon,
  tone = "slate",
}: V2MetricCardProps) {
  return (
    <V2Card className="flex items-center gap-4">
      {icon ? (
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full",
            metricToneClasses[tone]
          )}
        >
          {icon}
        </div>
      ) : null}
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold leading-none text-slate-950">
          {value}
        </p>
        {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
      </div>
    </V2Card>
  );
}
