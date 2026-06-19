"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { Business } from "@/data/types";
import { BusinessForm } from "@/components/admin/BusinessForm";
import { getDataSource } from "@/lib/data/dataSource";
import {
  getBusinessBySlug as getAdminBusinessBySlug,
  updateAdminBusiness,
} from "@/lib/data/admin-businesses";
import { toBusinessFormValues } from "@/lib/data/businesses";

export default function EditBusinessPage() {
  const params = useParams();
  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const dataSource = getDataSource();
  const modeLabel = dataSource === "supabase" ? "Modo Supabase" : "Modo local / mock";
  const sourceLabel = dataSource === "supabase" ? "Supabase" : "modo local/mock";
  const [mounted, setMounted] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const initialValues = useMemo(
    () => (business ? toBusinessFormValues(business) : null),
    [business],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const nextBusiness = slug ? await getAdminBusinessBySlug(slug) : null;

      if (!cancelled) {
        setBusiness(nextBusiness);
        setMounted(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!mounted) {
    return (
      <main className="w-full py-8">
        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-10">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
              Admin / Editar
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-white">Cargando negocio...</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Estamos cargando la ficha del negocio seleccionado.
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

  if (!business) {
    return (
      <main className="w-full py-8">
        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-10">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
              Admin / Editar
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-white">
              Negocio no encontrado
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              No pudimos cargar el negocio solicitado.
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
              Admin / Editar
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Editar negocio</h1>
            <p className="mt-2 text-sm text-slate-300">
              Este formulario guarda el negocio en {sourceLabel}. El resto de módulos sigue en la
              capa local/mock actual.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
          >
            Volver al admin
          </Link>
        </div>

        <BusinessForm
          key={business.id}
          mode="edit"
          initialValues={initialValues ?? toBusinessFormValues(business)}
          onSubmit={(values) => (slug ? updateAdminBusiness(business.id, values) : null)}
          modeLabel={modeLabel}
          successContextLabel={sourceLabel}
        />
      </div>
    </main>
  );
}
