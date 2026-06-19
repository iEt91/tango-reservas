import type { FloorTable } from "@/data/types";
import { getTableStatusLabel } from "./table-status";

type TableStatusStackProps = {
  status: FloorTable["status"] | string;
  customerName?: string | null;
  partySize?: number | null;
  className?: string;
};

export function TableStatusStack({
  status,
  customerName,
  partySize,
  className = "",
}: TableStatusStackProps) {
  return (
    <div className={`min-w-0 space-y-0.5 overflow-hidden ${className}`}>
      <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-white/90">
        {getTableStatusLabel(status).toUpperCase()}
      </span>
      {customerName ? (
        <span className="block truncate text-[9px] font-medium uppercase tracking-[0.12em] text-white/80">
          {customerName}
        </span>
      ) : null}
      {typeof partySize === "number" ? (
        <span className="block truncate text-[9px] uppercase tracking-[0.12em] text-white/70">
          {partySize} personas
        </span>
      ) : null}
    </div>
  );
}

