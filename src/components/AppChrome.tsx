"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WideContainer } from "@/components/WideContainer";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

type AppChromeProps = {
  children: ReactNode;
};

function shouldHideGlobalChrome(pathname: string) {
  if (pathname.startsWith("/local") || pathname.startsWith("/auth")) return true;

  const firstSegment = pathname.split("/").filter(Boolean)[0];
  const applicationRoutes = new Set(["admin", "api", "dashboard", "historial"]);

  // Los slugs de primer nivel representan la web pública de cada local.
  // Su propia plantilla incluye navegación y pie, por lo que no debe envolverse
  // con la barra técnica de Tango Reservas.
  return Boolean(firstSegment && !applicationRoutes.has(firstSegment));
}

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const isSupabase = process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase";

  if (shouldHideGlobalChrome(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <header className="w-full border-b border-white/5 bg-slate-950/70 backdrop-blur">
        <WideContainer className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="text-sm font-semibold tracking-wide text-white">
              {APP_NAME}
            </Link>
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300 sm:gap-4">
              <Link className="rounded-full px-3 py-2 transition hover:bg-white/5 hover:text-white" href="/">
                Inicio
              </Link>
              {!isSupabase ? (
                <Link className="rounded-full px-3 py-2 transition hover:bg-white/5 hover:text-white" href="/admin">
                  Admin
                </Link>
              ) : null}
              <Link className="rounded-full px-3 py-2 transition hover:bg-white/5 hover:text-white" href="/local">
                Panel local
              </Link>
            </nav>
          </div>
        </WideContainer>
      </header>

      <div className="w-full">{children}</div>

      <footer className="w-full border-t border-white/5 py-6">
        <WideContainer className="flex flex-col gap-2 text-sm text-slate-400">
          <p>{APP_NAME}</p>
          <p>Version {APP_VERSION}</p>
        </WideContainer>
      </footer>
    </div>
  );
}
