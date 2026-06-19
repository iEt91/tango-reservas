"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import type { Business, BusinessFormValues } from "@/data/types";
import { createSlug } from "@/lib/slug";
import { THEME_OPTIONS } from "@/lib/themes";

type BusinessFormMode = "create" | "edit";

type BusinessFormProps = {
  mode: BusinessFormMode;
  initialValues: BusinessFormValues;
  onSubmit: (values: BusinessFormValues) => Business | null | Promise<Business | null>;
  modeLabel: string;
  successContextLabel: string;
};

type FieldErrors = Partial<Record<keyof BusinessFormValues, string>>;

function buildErrors(values: BusinessFormValues) {
  const errors: FieldErrors = {};

  if (!values.name.trim()) errors.name = "El nombre es obligatorio.";
  if (!values.slug.trim()) errors.slug = "El slug es obligatorio.";
  if (!values.category.trim()) errors.category = "El rubro es obligatorio.";
  if (!values.city.trim()) errors.city = "La localidad es obligatoria.";

  return errors;
}

export function BusinessForm({
  mode,
  initialValues,
  onSubmit,
  modeLabel,
  successContextLabel,
}: BusinessFormProps) {
  const [values, setValues] = useState<BusinessFormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  function updateField<K extends keyof BusinessFormValues>(
    field: K,
    value: BusinessFormValues[K],
  ) {
    setValues((current) => {
      const next = { ...current, [field]: value };

      if (field === "name" && !slugTouched && mode === "create") {
        next.slug = createSlug(String(value));
      }

      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = buildErrors(values);
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      setSuccessMessage("");
      return;
    }

    try {
      const result = await Promise.resolve(
        onSubmit({
          ...values,
          name: values.name.trim(),
          slug: values.slug.trim(),
          category: values.category.trim(),
          city: values.city.trim(),
          description: values.description.trim(),
          phone: values.phone.trim(),
          whatsapp: values.whatsapp.trim(),
          email: values.email.trim(),
          address: values.address.trim(),
          googleMapsUrl: values.googleMapsUrl.trim(),
          instagramUrl: values.instagramUrl.trim(),
          facebookUrl: values.facebookUrl.trim(),
          websiteUrl: values.websiteUrl.trim(),
          logoUrl: values.logoUrl.trim(),
          coverImageUrl: values.coverImageUrl.trim(),
          primaryColor: values.primaryColor.trim(),
          secondaryColor: values.secondaryColor.trim(),
          themeId: values.themeId,
          heroTitle: values.heroTitle.trim(),
          heroSubtitle: values.heroSubtitle.trim(),
          aboutTitle: values.aboutTitle.trim(),
          aboutText: values.aboutText.trim(),
          menuTitle: values.menuTitle.trim(),
          reservationTitle: values.reservationTitle.trim(),
          ctaLabel: values.ctaLabel.trim(),
          showHero: values.showHero,
          showAbout: values.showAbout,
          showGallery: values.showGallery,
          showMenu: values.showMenu,
          showLocation: values.showLocation,
          showReservation: values.showReservation,
          showWhatsappButton: values.showWhatsappButton,
          status: values.status,
        }),
      );

      if (result) {
        setSuccessMessage(
          mode === "create"
            ? `Negocio creado en ${successContextLabel}.`
            : `Cambios guardados en ${successContextLabel}.`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "No se pudo guardar el negocio.";
      setSuccessMessage("");

      if (errorMessage.toLowerCase().includes("slug")) {
        setErrors((current) => ({
          ...current,
          slug: errorMessage,
        }));
        setSubmitError("");
      } else {
        setSubmitError(errorMessage);
      }
    }
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20">
      <div className="border-b border-white/10 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              {modeLabel}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {mode === "create" ? "Crear negocio" : "Editar negocio"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              {modeLabel === "Modo Supabase"
                ? "La escritura del negocio se guarda en Supabase. El resto de módulos sigue en la capa que ya existía."
                : "Este formulario todavia no guarda en Supabase. Usa la capa local preparada para que luego podamos reemplazarla sin reescribir la UI."}
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
          >
            Volver al admin
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 p-6">
        {successMessage ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {successMessage}
          </div>
        ) : null}
        {submitError ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            {submitError}
          </div>
        ) : null}

        <FormSection title="Datos basicos">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre del negocio" error={errors.name}>
              <input
                value={values.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="input-base"
              />
            </Field>
            <Field label="Slug" error={errors.slug}>
              <input
                value={values.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  updateField("slug", event.target.value);
                }}
                className="input-base"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Rubro" error={errors.category}>
              <input
                value={values.category}
                onChange={(event) => updateField("category", event.target.value)}
                className="input-base"
              />
            </Field>
            <Field label="Localidad" error={errors.city}>
              <input
                value={values.city}
                onChange={(event) => updateField("city", event.target.value)}
                className="input-base"
              />
            </Field>
            <Field label="Estado">
              <select
                value={values.status}
                onChange={(event) =>
                  updateField("status", event.target.value as BusinessFormValues["status"])
                }
                className="input-base"
              >
                <option value="active">Activo</option>
                <option value="draft">Borrador</option>
                <option value="inactive">Inactivo</option>
              </select>
            </Field>
          </div>

          <Field label="Descripcion breve">
            <textarea
              value={values.description}
              onChange={(event) => updateField("description", event.target.value)}
              className="input-base min-h-32"
            />
          </Field>
        </FormSection>

        <FormSection title="Contacto">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Telefono">
              <input
                value={values.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="input-base"
              />
            </Field>
            <Field label="WhatsApp">
              <input
                value={values.whatsapp}
                onChange={(event) => updateField("whatsapp", event.target.value)}
                className="input-base"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Email">
              <input
                value={values.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="input-base"
              />
            </Field>
            <Field label="Web existente">
              <input
                value={values.websiteUrl}
                onChange={(event) => updateField("websiteUrl", event.target.value)}
                className="input-base"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Instagram URL">
              <input
                value={values.instagramUrl}
                onChange={(event) => updateField("instagramUrl", event.target.value)}
                className="input-base"
              />
            </Field>
            <Field label="Facebook URL">
              <input
                value={values.facebookUrl}
                onChange={(event) => updateField("facebookUrl", event.target.value)}
                className="input-base"
              />
            </Field>
          </div>

          <Field label="Google Maps URL">
            <input
              value={values.googleMapsUrl}
              onChange={(event) => updateField("googleMapsUrl", event.target.value)}
              className="input-base"
            />
          </Field>
        </FormSection>

        <FormSection title="Ubicacion">
          <Field label="Direccion">
            <textarea
              value={values.address}
              onChange={(event) => updateField("address", event.target.value)}
              className="input-base min-h-32"
            />
          </Field>
        </FormSection>

        <FormSection title="Visual y theme">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Theme asignado">
              <select
                value={values.themeId}
                onChange={(event) =>
                  updateField(
                    "themeId",
                    event.target.value as BusinessFormValues["themeId"],
                  )
                }
                className="input-base"
              >
                {THEME_OPTIONS.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Color principal">
              <input
                value={values.primaryColor}
                onChange={(event) => updateField("primaryColor", event.target.value)}
                className="input-base"
              />
            </Field>
            <Field label="Color secundario">
              <input
                value={values.secondaryColor}
                onChange={(event) =>
                  updateField("secondaryColor", event.target.value)
                }
                className="input-base"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Logo URL">
              <input
                value={values.logoUrl}
                onChange={(event) => updateField("logoUrl", event.target.value)}
                className="input-base"
              />
            </Field>
            <Field label="Imagen principal URL">
              <input
                value={values.coverImageUrl}
                onChange={(event) => updateField("coverImageUrl", event.target.value)}
                className="input-base"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Hero title">
              <input
                value={values.heroTitle}
                onChange={(event) => updateField("heroTitle", event.target.value)}
                className="input-base"
              />
            </Field>
            <Field label="Hero subtitle">
              <input
                value={values.heroSubtitle}
                onChange={(event) => updateField("heroSubtitle", event.target.value)}
                className="input-base"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="About title">
              <input
                value={values.aboutTitle}
                onChange={(event) => updateField("aboutTitle", event.target.value)}
                className="input-base"
              />
            </Field>
            <Field label="Menu title">
              <input
                value={values.menuTitle}
                onChange={(event) => updateField("menuTitle", event.target.value)}
                className="input-base"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Reservation title">
              <input
                value={values.reservationTitle}
                onChange={(event) =>
                  updateField("reservationTitle", event.target.value)
                }
                className="input-base"
              />
            </Field>
            <Field label="CTA label">
              <input
                value={values.ctaLabel}
                onChange={(event) => updateField("ctaLabel", event.target.value)}
                className="input-base"
              />
            </Field>
          </div>

          <Field label="About text">
            <textarea
              value={values.aboutText}
              onChange={(event) => updateField("aboutText", event.target.value)}
              className="input-base min-h-32"
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <CheckboxField
              label="Mostrar hero"
              checked={values.showHero}
              onChange={(checked) => updateField("showHero", checked)}
            />
            <CheckboxField
              label="Mostrar about"
              checked={values.showAbout}
              onChange={(checked) => updateField("showAbout", checked)}
            />
            <CheckboxField
              label="Mostrar galería"
              checked={values.showGallery}
              onChange={(checked) => updateField("showGallery", checked)}
            />
            <CheckboxField
              label="Mostrar menu"
              checked={values.showMenu}
              onChange={(checked) => updateField("showMenu", checked)}
            />
            <CheckboxField
              label="Mostrar ubicación"
              checked={values.showLocation}
              onChange={(checked) => updateField("showLocation", checked)}
            />
            <CheckboxField
              label="Mostrar reservas"
              checked={values.showReservation}
              onChange={(checked) => updateField("showReservation", checked)}
            />
            <CheckboxField
              label="Mostrar WhatsApp"
              checked={values.showWhatsappButton}
              onChange={(checked) => updateField("showWhatsappButton", checked)}
            />
          </div>
        </FormSection>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            {mode === "create" ? "Crear negocio" : "Guardar cambios"}
          </button>
          <p className="text-sm text-slate-400">
            Validaciones activas: nombre, slug, rubro y localidad.
          </p>
        </div>
      </form>
    </section>
  );
}

type FormSectionProps = {
  title: string;
  children: ReactNode;
};

function FormSection({ title, children }: FormSectionProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/50 p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

type FieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
};

function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </span>
      {children}
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
      />
      <span>{label}</span>
    </label>
  );
}
