"use client";

import { useState } from "react";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import type { Business, PublicWebContent } from "@/data/types";
import type { PublicTheme } from "@/lib/themes";
import { useHasMounted } from "@/hooks/useHasMounted";

type PublicHeroProps = {
  business: Business;
  content: PublicWebContent;
  theme: PublicTheme;
  className?: string;
  compact?: boolean;
};

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0] ?? "").join("").toUpperCase() || "MN";
}

function splitAttributes(value: string | null | undefined) {
  return typeof value === "string"
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .slice(0, 4)
    : [];
}

function PublicHeroSkeleton({ theme, className = "", compact = false }: { theme: PublicTheme; className?: string; compact?: boolean }) {
  return (
    <section
      className={`overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/25 ${className}`}
      style={{
        background:
          theme.id === "cafe_minimal"
            ? "linear-gradient(180deg, rgba(41,37,36,0.92), rgba(15,23,42,0.95))"
            : "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.96))",
      }}
    >
      <div
        className={`grid gap-8 p-6 ${
          compact ? "xl:grid-cols-[1fr_0.9fr]" : "xl:grid-cols-[1.1fr_0.9fr]"
        } xl:p-10`}
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
              Cargando web
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {theme.previewLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              ··
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              ··
            </span>
          </div>

          <div className="space-y-3">
            <div className="h-12 w-4/5 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-6 w-full animate-pulse rounded-full bg-white/10" />
            <div className="h-6 w-11/12 animate-pulse rounded-full bg-white/10" />
            <div className="h-6 w-3/4 animate-pulse rounded-full bg-white/10" />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="h-12 w-36 animate-pulse rounded-full bg-white/10" />
            <div className="h-12 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="h-12 w-28 animate-pulse rounded-full bg-white/10" />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.75rem] border border-white/10 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                <div className="h-6 w-40 animate-pulse rounded-full bg-white/10" />
              </div>
              <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/10" />
            </div>
            <div className="mt-4 h-72 animate-pulse rounded-[1.5rem] border border-dashed border-white/10 bg-slate-950/35" />
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
            <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="mt-3 h-5 w-4/5 animate-pulse rounded-full bg-white/10" />
            <div className="mt-2 h-5 w-3/4 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function PublicHero({
  business,
  content,
  theme,
  className = "",
  compact = false,
}: PublicHeroProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasMounted = useHasMounted();

  if (!content.showHero) {
    return null;
  }

  if (!hasMounted) {
    return <PublicHeroSkeleton theme={theme} className={className} compact={compact} />;
  }

  const displayName = content.publicName?.trim() || business.name;
  const displayCategory = content.publicCategory?.trim() || business.category;
  const displayCity = content.publicCity?.trim() || business.city;
  const displayBadge = content.publicBadge?.trim() || displayCategory;
  const displaySubtitle =
    content.heroSubtitle ||
    content.heroDescription ||
    content.publicSubtitle ||
    content.publicDescription ||
    business.description;
  const showFeaturedMenu = content.showFeaturedMenu !== false;
  const showFullMenu = content.showMenu;
  const secondaryTarget = showFullMenu ? "#menu" : showFeaturedMenu ? "#platos" : "";
  const secondaryCtaLabel = showFullMenu
    ? content.heroSecondaryCtaLabel?.trim() || "Ver menu"
    : showFeaturedMenu
      ? "Ver platos"
      : null;
  const heroImageSource = content.heroImageDataUrl?.trim() || content.heroImageUrl?.trim() || "";
  const heroImagePlaceholder =
    content.heroImagePlaceholder?.trim() || getInitials(content.heroTitle || business.name);
  const attributes = splitAttributes(content.publicAttributesText);

  return (
    <section
      className={`overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/25 ${className}`}
      style={{
        background:
          theme.id === "cafe_minimal"
            ? "linear-gradient(180deg, rgba(41,37,36,0.92), rgba(15,23,42,0.95))"
            : "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.96))",
      }}
    >
      <div
        className={`grid gap-8 p-6 ${
          compact ? "xl:grid-cols-[1fr_0.9fr]" : "xl:grid-cols-[1.1fr_0.9fr]"
        } xl:p-10`}
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
              {theme.previewLabel}
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
              {displayBadge}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {displayCategory}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {displayCity}
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {content.heroTitle || displayName}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">{displaySubtitle}</p>
            {content.featuredPhrase ? (
              <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-200">
                {content.featuredPhrase}
              </p>
            ) : null}
            {attributes.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {attributes.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[11px] text-slate-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="#reservas"
              className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
              style={{
                backgroundColor: business.primaryColor,
              }}
            >
              {content.ctaLabel}
            </a>
            {secondaryCtaLabel ? (
              <a
                href={secondaryTarget}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
              >
                {secondaryCtaLabel}
              </a>
            ) : null}
            {content.showWhatsappButton && (content.whatsapp || business.whatsapp) ? (
              <WhatsAppButton
                phone={content.whatsapp || business.whatsapp}
                message={`Hola, quiero hacer una reserva en ${business.name}.`}
              >
                WhatsApp
              </WhatsAppButton>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Localidad</p>
              <p className="mt-2 text-sm font-medium text-white">{displayCity}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Direccion</p>
              <p className="mt-2 text-sm font-medium text-white">{business.address}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Theme</p>
              <p className="mt-2 text-sm font-medium text-white">{theme.name}</p>
            </article>
          </div>
        </div>

        <div className="grid gap-4">
          <div
            className="rounded-[1.75rem] border border-white/10 p-5"
            style={{
              background: `linear-gradient(180deg, rgba(15,23,42,0.4), rgba(15,23,42,0.95)), linear-gradient(135deg, ${business.primaryColor}22, ${business.secondaryColor}88)`,
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Hero visual</p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {heroImageSource ? "Imagen principal" : "Cover visual"}
                </h2>
              </div>
              <div
                className="h-12 w-12 rounded-2xl border border-white/10"
                style={{
                  background: `linear-gradient(135deg, ${business.primaryColor}, ${business.secondaryColor})`,
                }}
              />
            </div>
            <div className="mt-4 flex h-72 items-stretch overflow-hidden rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/35">
              {heroImageSource && !imageFailed ? (
                <img
                  src={heroImageSource}
                  alt={content.heroTitle || business.name}
                  className="h-full w-full object-cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/5 via-transparent to-white/10 p-5">
                  <div className="flex h-28 w-28 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/10 text-3xl font-semibold text-white">
                    {heroImagePlaceholder}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Atajo</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Diseñado para dejar visible el CTA principal y la identidad del negocio sin mezclar aquí el sistema de reservas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
