"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Eye,
  Image as ImageIcon,
  LayoutTemplate,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Card } from "@/components/v2/v2-card";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import {
  compressBrowserImage,
  writeLocalStorageSafely,
} from "@/lib/browser-image-storage";
import {
  V2_WEB_TEMPLATE_CONTENT_STORAGE_KEY,
  V2_WEB_TEMPLATE_SECTION_LABELS,
  V2_WEB_TEMPLATE_STORAGE_KEY,
  V2WebTemplateContent,
  V2WebTemplateSectionId,
  createDefaultV2WebTemplateContent,
  getV2WebTemplateById,
  mergeV2WebTemplateContent,
  v2WebTemplates,
} from "@/lib/v2/v2-web-templates";

type EditorTab = "texts" | "images" | "sections";

const SECTION_IDS: V2WebTemplateSectionId[] = [
  "hero",
  "menu",
  "experience",
  "gallery",
  "contact",
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function readStoredTemplateContent(): Record<string, V2WebTemplateContent> {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = window.localStorage.getItem(V2_WEB_TEMPLATE_CONTENT_STORAGE_KEY);

    return rawValue ? (JSON.parse(rawValue) as Record<string, V2WebTemplateContent>) : {};
  } catch {
    return {};
  }
}

function writeStoredTemplateContent(contentByTemplate: Record<string, V2WebTemplateContent>) {
  const result = writeLocalStorageSafely(
    V2_WEB_TEMPLATE_CONTENT_STORAGE_KEY,
    JSON.stringify(contentByTemplate)
  );

  if (!result.ok) return false;

  window.dispatchEvent(new CustomEvent("tango-v2-web-template-content-updated"));
  return true;
}

export default function V2WebEditorPage() {
  const [activeTemplateId, setActiveTemplateId] = useState(v2WebTemplates[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<EditorTab>("texts");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  const activeTemplate = useMemo(
    () => getV2WebTemplateById(activeTemplateId),
    [activeTemplateId]
  );

  const [content, setContent] = useState<V2WebTemplateContent>(() =>
    createDefaultV2WebTemplateContent(v2WebTemplates[0])
  );

  useEffect(() => {
    const storedTemplateId =
      window.localStorage.getItem(V2_WEB_TEMPLATE_STORAGE_KEY) ?? v2WebTemplates[0].id;
    const template = getV2WebTemplateById(storedTemplateId);
    const storedContent = readStoredTemplateContent()[template.id];

    setActiveTemplateId(template.id);
    setContent(mergeV2WebTemplateContent(template, storedContent));
  }, []);

  function markDirty() {
    setSaveStatus("idle");
    setSaveError("");
  }

  function updateTextSlot(slotId: string, value: string) {
    setContent((current) => ({
      ...current,
      textValues: {
        ...current.textValues,
        [slotId]: value,
      },
      updatedAt: new Date().toISOString(),
    }));
    markDirty();
  }

  function updateImageSlot(slotId: string, value: string) {
    setContent((current) => ({
      ...current,
      imageValues: {
        ...current.imageValues,
        [slotId]: value,
      },
      updatedAt: new Date().toISOString(),
    }));
    markDirty();
  }

  function updateSection(sectionId: V2WebTemplateSectionId, value: boolean) {
    setContent((current) => ({
      ...current,
      visibleSections: {
        ...current.visibleSections,
        [sectionId]: value,
      },
      updatedAt: new Date().toISOString(),
    }));
    markDirty();
  }

  async function handleImageUpload(slotId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;
    event.target.value = "";

    try {
      const imageDataUrl = await compressBrowserImage(file, {
        maxWidth: 1400,
        maxHeight: 900,
        quality: 0.74,
      });
      updateImageSlot(slotId, imageDataUrl);
    } catch (error) {
      console.error("[web-editor] No se pudo procesar la imagen.", error);
      setSaveStatus("error");
      setSaveError("No se pudo procesar la imagen seleccionada");
    }
  }

  function restoreImageSlot(slotId: string) {
    const slot = activeTemplate.imageSlots.find((item) => item.id === slotId);
    if (!slot) return;

    updateImageSlot(slotId, slot.defaultSrc);
  }

  function restoreDefaults() {
    setContent(createDefaultV2WebTemplateContent(activeTemplate));
    setSaveStatus("idle");
  }

  function saveContent() {
    const storedContent = readStoredTemplateContent();
    const nextContent: V2WebTemplateContent = {
      ...content,
      templateId: activeTemplate.id,
      updatedAt: new Date().toISOString(),
    };

    const wasSaved = writeStoredTemplateContent({
      ...storedContent,
      [activeTemplate.id]: nextContent,
    });

    if (!wasSaved) {
      setSaveStatus("error");
      setSaveError("No se pudo guardar: almacenamiento lleno");
      return;
    }

    setContent(nextContent);
    setSaveStatus("saved");
  }

  const tabItems: Array<{
    id: EditorTab;
    label: string;
    icon: typeof Type;
  }> = [
    { id: "texts", label: "Textos", icon: Type },
    { id: "images", label: "Imágenes", icon: ImageIcon },
    { id: "sections", label: "Secciones", icon: Settings2 },
  ];

  return (
    <V2AppShell>
      <V2PageHeader
        title="Editor web"
        description="Editá textos, imágenes y secciones de la plantilla pública seleccionada."
        actions={
          <>
            {saveStatus === "saved" ? (
              <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700">
                <Check size={17} />
                Cambios guardados
              </span>
            ) : saveStatus === "error" ? (
              <span className="inline-flex h-10 items-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700">
                {saveError || "No se pudo guardar el contenido"}
              </span>
            ) : null}
            <Link
              href="/local/web/plantillas"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <LayoutTemplate size={17} />
              Plantillas
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
            <button
              type="button"
              onClick={saveContent}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              <Save size={17} />
              Guardar cambios
            </button>
          </>
        }
      />

      <div className="grid h-[calc(100vh-175px)] min-h-[660px] gap-4 xl:grid-cols-[1fr_380px]">
        <V2Card className="flex min-h-0 flex-col overflow-hidden p-0">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {activeTemplate.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Editá una sección por vez para mantener el layout limpio y controlado.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={restoreDefaults}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw size={15} />
              Restaurar
            </button>
          </div>

          <div className="shrink-0 border-b border-slate-100 px-5 py-3">
            <div className="flex flex-wrap gap-2">
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition",
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {activeTab === "texts" ? (
              <div>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Textos editables</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Estos textos reemplazan los placeholders de la plantilla.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {activeTemplate.textSlots.map((slot) => (
                    <label
                      key={slot.id}
                      className={cn("block", slot.multiline ? "lg:col-span-2" : "")}
                    >
                      <span className="text-sm font-semibold text-slate-700">
                        {slot.label}
                      </span>
                      {slot.multiline ? (
                        <textarea
                          value={content.textValues[slot.id] ?? slot.defaultValue}
                          onChange={(event) => updateTextSlot(slot.id, event.target.value)}
                          className="mt-2 min-h-[120px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                        />
                      ) : (
                        <input
                          value={content.textValues[slot.id] ?? slot.defaultValue}
                          onChange={(event) => updateTextSlot(slot.id, event.target.value)}
                          className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "images" ? (
              <div>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">
                    Imágenes reemplazables
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Usá los placeholders o cargá imágenes propias del local.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {activeTemplate.imageSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      <div className="relative h-36 w-full overflow-hidden">
                        <Image
                          src={content.imageValues[slot.id] ?? slot.defaultSrc}
                          alt={slot.label}
                          fill
                          sizes="(min-width: 1024px) 50vw, 100vw"
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="space-y-3 p-3">
                        <div>
                          <p className="text-sm font-bold text-slate-950">{slot.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{slot.description}</p>
                        </div>

                        <div className="flex gap-2">
                          <label className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                            <Upload size={15} />
                            Cambiar imagen
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => handleImageUpload(slot.id, event)}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => restoreImageSlot(slot.id)}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            Restaurar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "sections" ? (
              <div>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Secciones visibles</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Activá o desactivá bloques de la web pública.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {SECTION_IDS.map((sectionId) => (
                    <div
                      key={sectionId}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-950">
                          {V2_WEB_TEMPLATE_SECTION_LABELS[sectionId]}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {content.visibleSections[sectionId] ? "Visible en la web" : "Oculta"}
                        </p>
                      </div>
                      <select
                        value={content.visibleSections[sectionId] ? "visible" : "hidden"}
                        onChange={(event) =>
                          updateSection(sectionId, event.target.value === "visible")
                        }
                        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      >
                        <option value="visible">Visible</option>
                        <option value="hidden">Oculta</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </V2Card>

        <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4">
          <V2Card className="flex min-h-0 flex-col overflow-hidden p-4">
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Eye size={19} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">Preview rápido</h2>
                <p className="text-sm text-slate-500">Vista aproximada de la plantilla.</p>
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-slate-200 bg-stone-950 text-white shadow-sm">
              {content.visibleSections.hero ? (
                <div className="relative h-[190px] overflow-hidden">
                  <Image
                    src={content.imageValues.hero ?? activeTemplate.previewImage}
                    alt="Hero"
                    fill
                    sizes="(min-width: 1024px) 360px, 100vw"
                    unoptimized
                    className="object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200">
                      {content.textValues.heroEyebrow}
                    </p>
                    <h3 className="mt-2 text-2xl font-black leading-tight">
                      {content.textValues.heroTitle}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/75">
                      {content.textValues.heroSubtitle}
                    </p>
                    <div className="mt-3 inline-flex rounded-full bg-amber-400 px-4 py-2 text-xs font-black text-stone-950">
                      {content.textValues.primaryButton}
                    </div>
                  </div>
                </div>
              ) : null}

              {content.visibleSections.menu ? (
                <div className="border-t border-white/10 p-4">
                  <h4 className="text-center text-lg font-black">
                    {content.textValues.menuTitle}
                  </h4>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {["menu1", "menu2", "menu3", "menu4"].map((slotId, index) => (
                      <div key={slotId} className="rounded-2xl bg-white/5 p-2">
                        <div className="relative h-14 w-full overflow-hidden rounded-xl">
                          <Image
                            src={content.imageValues[slotId] || activeTemplate.previewImage}
                            alt={`Plato ${index + 1}`}
                            fill
                            sizes="120px"
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <p className="mt-1 text-[11px] font-bold">
                          Plato destacado {index + 1}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {content.visibleSections.experience ? (
                <div className="border-t border-white/10 p-4">
                  <div className="relative h-16 w-full overflow-hidden rounded-2xl">
                    <Image
                      src={content.imageValues.espacio6 || activeTemplate.previewImage}
                      alt="Experiencia"
                      fill
                      sizes="(min-width: 1024px) 360px, 100vw"
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <h4 className="mt-3 text-lg font-black">
                    {content.textValues.experienceTitle}
                  </h4>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/70">
                    {content.textValues.experienceText}
                  </p>
                </div>
              ) : null}

              {content.visibleSections.contact ? (
                <div className="border-t border-white/10 p-4">
                  <h4 className="text-lg font-black">{content.textValues.contactTitle}</h4>
                  <p className="mt-2 text-xs text-white/70">
                    Dirección, WhatsApp y horarios se conectarán desde Configuración.
                  </p>
                </div>
              ) : null}
            </div>
          </V2Card>

          <V2Card className="shrink-0 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ImageIcon size={19} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">Guardado técnico</h2>
                <p className="text-sm text-slate-500">Contenido editable guardado en localStorage.</p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              <p>
                Clave: <strong>{V2_WEB_TEMPLATE_CONTENT_STORAGE_KEY}</strong>
              </p>
              <p>
                Plantilla: <strong>{activeTemplate.id}</strong>
              </p>
              <p>
                Estado:{" "}
                <strong>
                  {saveStatus === "saved"
                    ? "guardado"
                    : saveStatus === "error"
                      ? "error de almacenamiento"
                      : "sin guardar"}
                </strong>
              </p>
            </div>
          </V2Card>
        </div>
      </div>
    </V2AppShell>
  );
}
