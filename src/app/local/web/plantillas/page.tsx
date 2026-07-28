"use client";

import Link from "next/link";
import { Check, Eye, Image as ImageIcon, LayoutTemplate, Pencil, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Card } from "@/components/v2/v2-card";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import {
  V2_WEB_TEMPLATE_STORAGE_KEY,
  getV2WebTemplateById,
  v2WebTemplates,
} from "@/lib/v2/v2-web-templates";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function V2WebTemplatesPage() {
  const [activeTemplateId, setActiveTemplateId] = useState(v2WebTemplates[0]?.id ?? "");
  const activeTemplate = useMemo(
    () => getV2WebTemplateById(activeTemplateId),
    [activeTemplateId]
  );

  useEffect(() => {
    const storedTemplateId = window.localStorage.getItem(V2_WEB_TEMPLATE_STORAGE_KEY);

    if (storedTemplateId) {
      setActiveTemplateId(storedTemplateId);
    }
  }, []);

  function selectTemplate(templateId: string) {
    setActiveTemplateId(templateId);
    window.localStorage.setItem(V2_WEB_TEMPLATE_STORAGE_KEY, templateId);
    window.dispatchEvent(new CustomEvent("tango-v2-web-template-updated"));
  }

  return (
    <V2AppShell>
      <V2PageHeader
        title="Plantillas web"
        description="Elegí la base visual de la web pública del local. Los textos e imágenes se podrán editar por plantilla."
        actions={
          <>
            <Link
              href="/local/web/editor"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Pencil size={17} />
              Editar contenido
            </Link>
            <Link
              href="/local/web"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Pencil size={17} />
              Volver a Web
            </Link>
            <a
              href="/demuru"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Eye size={17} />
              Ver sitio público
            </a>
          </>
        }
      />

      <div className="grid h-[calc(100vh-175px)] min-h-[660px] gap-4 xl:grid-cols-[1fr_340px]">
        <div className="min-h-0 space-y-4 pr-2">
          <V2Card>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <LayoutTemplate size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Galería de plantillas
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cada plantilla define una estructura visual, pero los datos salen de Web, Configuración, Menú y Reservas.
                </p>
              </div>
            </div>
          </V2Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {v2WebTemplates.map((template) => {
              const isActive = template.id === activeTemplateId;

              return (
                <V2Card
                  key={template.id}
                  className={cn(
                    "max-w-[720px] overflow-hidden p-0 transition",
                    isActive ? "ring-2 ring-emerald-500" : "hover:border-emerald-200"
                  )}
                >
                  <div className="relative h-[220px] overflow-hidden bg-slate-950">
                    <img
                      src={template.previewImage}
                      alt={template.name}
                      className="h-full w-full object-cover"
                    />
                    <div className={cn("absolute inset-0 bg-gradient-to-t opacity-70", template.accent)} />
                    <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-950">
                      {template.category}
                    </div>
                    {isActive ? (
                      <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                        <Check size={14} />
                        Activa
                      </div>
                    ) : null}

                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200">
                        Plantilla editable
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight">
                        {template.name}
                      </h3>
                      <p className="mt-2 max-w-lg text-sm leading-6 text-white/80">
                        {template.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Recomendada para
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {template.recommendedFor.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Imágenes editables
                        </p>
                        <p className="mt-1 text-xl font-black text-slate-950">
                          {template.imageSlots.length}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Textos editables
                        </p>
                        <p className="mt-1 text-xl font-black text-slate-950">
                          {template.textSlots.length}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => selectTemplate(template.id)}
                        className={cn(
                          "inline-flex h-10 flex-1 items-center justify-center rounded-xl px-4 text-sm font-bold transition",
                          isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-emerald-700 text-white hover:bg-emerald-800"
                        )}
                      >
                        {isActive ? "Plantilla activa" : "Usar plantilla"}
                      </button>
                      <Link
                        href="/local/web/editor"
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Editar
                      </Link>
                    </div>
                  </div>
                </V2Card>
              );
            })}
          </div>
        </div>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 pr-1">
          <V2Card className="flex min-h-0 flex-col p-4">
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Sparkles size={19} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Plantilla activa
                </h2>
                <p className="text-sm text-slate-500">{activeTemplate.name}</p>
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
              <img
                src={activeTemplate.previewImage}
                alt={activeTemplate.name}
                className="h-32 w-full object-cover"
              />
            </div>

            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
              Esta selección queda guardada y luego será usada por el editor y por la web pública.
            </div>
          </V2Card>

          <V2Card className="flex min-h-0 flex-col p-4">
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ImageIcon size={19} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Imágenes reemplazables
                </h2>
                <p className="text-sm text-slate-500">
                  Slots que luego podrá editar el local.
                </p>
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {activeTemplate.imageSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2"
                >
                  <img
                    src={slot.defaultSrc}
                    alt={slot.label}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">
                      {slot.label}
                    </p>
                    <p className="line-clamp-2 text-xs text-slate-500">
                      {slot.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </V2Card>
        </div>
      </div>
    </V2AppShell>
  );
}
