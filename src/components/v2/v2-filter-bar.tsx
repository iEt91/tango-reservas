import type { ReactNode } from "react";
import { V2Card } from "./v2-card";

export function V2FilterBar({ children }: { children: ReactNode }) {
  return (
    <V2Card className="mb-4 flex flex-col gap-3 p-3 md:flex-row md:items-center">
      {children}
    </V2Card>
  );
}
