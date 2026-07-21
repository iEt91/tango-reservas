import type { ReactNode } from "react";
import { V2Card } from "./v2-card";
import { cn } from "@/lib/v2/v2-utils";

type V2SortDirection = "asc" | "desc";

type V2Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: "left" | "center" | "right";
  sortKey?: string;
};

function getCellAlignment(
  index: number,
  total: number,
  align?: "left" | "center" | "right"
) {
  if (align === "left") return "text-left";
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";

  if (index === 0) return "text-left";
  if (index === total - 1) return "text-right";

  return "text-center";
}

export function V2DataTable<T>({
  columns,
  rows,
  getRowKey,
  footer,
  className,
  rowClassName,
  sortKey,
  sortDirection,
  onSortChange,
}: {
  columns: Array<V2Column<T>>;
  rows: T[];
  getRowKey: (row: T) => string;
  rowClassName?: (row: T) => string;
  footer?: ReactNode;
  className?: string;
  sortKey?: string | null;
  sortDirection?: V2SortDirection;
  onSortChange?: (sortKey: string) => void;
}) {
  return (
    <V2Card className={cn("flex flex-col overflow-hidden p-0", className)}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-slate-200">
              {columns.map((column, index) => {
                const alignment = getCellAlignment(
                  index,
                  columns.length,
                  column.align
                );
                const isSortable = Boolean(column.sortKey && onSortChange);
                const isActiveSort = Boolean(column.sortKey && column.sortKey === sortKey);

                return (
                  <th
                    key={column.header}
                    className={cn(
                      "px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500",
                      alignment,
                      column.headerClassName
                    )}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => column.sortKey && onSortChange?.(column.sortKey)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-1 py-0.5 transition hover:bg-slate-100 hover:text-slate-950",
                          isActiveSort && "text-slate-950"
                        )}
                      >
                        <span>{column.header}</span>
                        <span className="text-[10px] leading-none text-slate-400">
                          {isActiveSort ? (sortDirection === "desc" ? "↓" : "↑") : "↕"}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className={cn(
                  "border-b border-slate-100 transition-colors last:border-b-0",
                  rowClassName?.(row) ?? "hover:bg-slate-50/70"
                )}
              >
                {columns.map((column, index) => {
                  const alignment = getCellAlignment(
                    index,
                    columns.length,
                    column.align
                  );

                  return (
                    <td
                      key={column.header}
                      className={cn(
                        "px-5 py-3 align-middle text-slate-700 [&>button]:!text-inherit",
                        alignment,
                        column.className
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {footer ? (
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
          {footer}
        </div>
      ) : null}
    </V2Card>
  );
}
