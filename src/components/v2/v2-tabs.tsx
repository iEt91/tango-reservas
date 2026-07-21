import type { ReactNode } from "react";
import { cn } from "@/lib/v2/v2-utils";

export function V2Tabs({
  items,
  active,
}: {
  items: Array<{ label: string; value: string }>;
  active: string;
}) {
  return (
    <div className="flex min-w-0 gap-6 overflow-x-auto border-b border-slate-200">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={cn(
            "h-11 shrink-0 border-b-2 text-sm font-semibold transition-colors",
            active === item.value
              ? "border-emerald-700 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-950"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function V2TabPanel({ children }: { children: ReactNode }) {
  return <div className="pt-6">{children}</div>;
}
