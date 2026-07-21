import type { ReactNode } from "react";
import { V2Card } from "./v2-card";

export function V2EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <V2Card className="flex min-h-64 flex-col items-center justify-center text-center">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </V2Card>
  );
}
