import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck, Utensils } from "lucide-react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-cyan-950/30 backdrop-blur sm:p-9">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-3 text-white"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600">
            <Utensils size={21} />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Tango <span className="text-emerald-400">Reservas</span>
          </span>
        </Link>

        <div className="mb-7">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <ShieldCheck size={14} />
            Acceso seguro
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>

        {children}

        {footer ? (
          <div className="mt-7 border-t border-white/10 pt-6 text-center text-sm text-slate-400">
            {footer}
          </div>
        ) : null}
      </section>
    </main>
  );
}
