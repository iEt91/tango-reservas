"use client";

import { useEffect, type ReactNode } from "react";
import { V2Sidebar } from "./v2-sidebar";

export function V2AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add("tango-local-app-shell");

    return () => {
      document.body.classList.remove("tango-local-app-shell");
    };
  }, []);

  return (
    <div className="fixed inset-0 h-dvh w-screen overflow-hidden bg-slate-50 text-slate-950">
      <div className="flex h-full w-full overflow-hidden">
        <V2Sidebar />

        <main className="min-w-0 flex-1 overflow-hidden">
          <div className="flex h-full w-full max-w-none flex-col overflow-hidden px-6 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
