"use client";

import type { ReactNode } from "react";
import { LocalPremiumShell } from "@/components/local-premium/LocalPremiumShell";

type LocalPanelShellProps = {
  children: ReactNode;
};

export function LocalPanelShell({ children }: LocalPanelShellProps) {
  return <LocalPremiumShell>{children}</LocalPremiumShell>;
}
