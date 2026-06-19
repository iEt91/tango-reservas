"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BusinessForm } from "@/components/admin/BusinessForm";
import { getDataSource } from "@/lib/data/dataSource";
import { createAdminBusiness } from "@/lib/data/admin-businesses";
import { getEmptyBusinessFormValues } from "@/lib/data/businesses";

export default function NewBusinessPage() {
  const dataSource = getDataSource();
  const modeLabel = dataSource === "supabase" ? "Modo Supabase" : "Modo local / mock";
  const sourceLabel = dataSource === "supabase" ? "Supabase" : "modo local/mock";
  const initialValues = useMemo(() => getEmptyBusinessFormValues(), []);

  return (
    <main className="w-full py-8">
      <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
              Admin / Crear
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Nuevo negocio</h1>
            <p className="mt-2 text-sm text-slate-300">
              La escritura del negocio se guarda en {sourceLabel}. El resto de módulos sigue en
              la capa que ya existía.
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
          key="create-business"
          mode="create"
          initialValues={initialValues}
          onSubmit={createAdminBusiness}
          modeLabel={modeLabel}
          successContextLabel={
            dataSource === "supabase" ? "Supabase con configuración base" : sourceLabel
          }
        />
      </div>
    </main>
  );
}
