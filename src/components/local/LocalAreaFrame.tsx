"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LocalPanelShell } from "@/components/local-panel/LocalPanelShell";

type LocalAreaFrameProps = {
  children: ReactNode;
};

export function LocalAreaFrame({ children }: LocalAreaFrameProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/local/design-lab")) {
    return <>{children}</>;
  }

  return <LocalPanelShell>{children}</LocalPanelShell>;
}
