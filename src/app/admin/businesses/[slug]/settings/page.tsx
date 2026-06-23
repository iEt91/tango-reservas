"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { BusinessSettingsForm } from "@/components/admin/BusinessSettingsForm";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinessBySlug } from "@/lib/data/businesses";

export default function BusinessSettingsPage() {
  const params = useParams();
  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const readOnly = getDataSource() === "supabase";
  const [mounted, setMounted] = useState(false);
  const [business, setBusiness] = useState(() => (slug ? getBusinessBySlug(slug) : null));
  const businessData = useMemo(() => business, [business]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setBusiness(() => (slug ? getBusinessBySlug(slug) : null));
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [slug]);

  if (readOnly) {
    return (
      <main className="w-full py-8">
        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-10">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
              Admin / Horarios
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-white">Modo solo lectura</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Supabase está activo en modo solo lectura para negocios. La escritura se
              implementará en una fase posterior.
            </p>
            <Link
              href="/admin"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Volver al admin
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (!mounted || !businessData) {
    return (
      <main className="w-full py-8">
        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-10">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
              Admin / Horarios
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-white">
              Negocio no encontrado
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              No pudimos cargar el negocio solicitado para configurar horarios.
            </p>
            <Link
              href="/admin"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Volver al admin
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full py-8">
      <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
              Admin / Horarios
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Configurar horarios
            </h1>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
          >
            Volver al admin
          </Link>
        </div>

        <BusinessSettingsForm business={businessData} />
      </div>
    </main>
  );
}
