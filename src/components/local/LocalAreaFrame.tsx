"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LocalPanelShell } from "@/components/local-panel/LocalPanelShell";

type LocalAreaFrameProps = {
  children: ReactNode;
};

export function LocalAreaFrame({ children }: LocalAreaFrameProps) {
  const pathname = usePathname();

  useEffect(() => {
    const className = "tango-local-app-shell";
    const isLocalRoute = pathname.startsWith("/local");

    if (isLocalRoute) {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }

    return () => {
      document.body.classList.remove(className);
    };
  }, [pathname]);

  if (
    pathname === "/local" ||
    pathname === "/local/" ||
    pathname.startsWith("/local/design-lab")
  ) {
    return <>{children}</>;
  }

  return <LocalPanelShell>{children}</LocalPanelShell>;
}
