import type { Metadata } from "next";
import Link from "next/link";
import { WideContainer } from "@/components/WideContainer";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Base tecnica de Tango Reservas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <div className="min-h-screen">
          <header className="w-full border-b border-white/5 bg-slate-950/70 backdrop-blur">
            <WideContainer className="py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/" className="text-sm font-semibold tracking-wide text-white">
                  {APP_NAME}
                </Link>
                <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300 sm:gap-4">
                  <Link
                    className="rounded-full px-3 py-2 transition hover:bg-white/5 hover:text-white"
                    href="/"
                  >
                    Inicio
                  </Link>
                  <Link
                    className="rounded-full px-3 py-2 transition hover:bg-white/5 hover:text-white"
                    href="/admin"
                  >
                    Admin
                  </Link>
                  <Link
                    className="rounded-full px-3 py-2 transition hover:bg-white/5 hover:text-white"
                    href="/local"
                  >
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
      </body>
    </html>
  );
}
