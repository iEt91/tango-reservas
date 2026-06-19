import type { Business, PublicWebContent } from "@/data/types";

type PublicLocationProps = {
  business: Business;
  content: PublicWebContent;
  accentColor: string;
  variant?: "elegant" | "visual" | "minimal";
};

function buildFallbackMapsHref(address: string, city: string) {
  const query = [address.trim(), city.trim()].filter(Boolean).join(", ");

  if (!query) {
    return "";
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function PublicLocation({
  business,
  content,
  accentColor,
  variant = "elegant",
}: PublicLocationProps) {
  if (!content.showLocation) {
    return null;
  }

  const displayAddress = content.publicAddress?.trim() || business.address;
  const displayCity = content.publicCity?.trim() || business.city;
  const openLocationHref =
    content.googleMapsUrl?.trim() || buildFallbackMapsHref(displayAddress, displayCity);
  const embedUrl = content.mapEmbedUrl?.trim() || "";

  const contactItems = [
    content.publicPhone
      ? { label: "Teléfono", href: `tel:${content.publicPhone.replace(/\D/g, "")}` }
      : null,
    content.showSocials !== false && content.instagramUrl
      ? { label: "Instagram", href: content.instagramUrl }
      : null,
    content.showSocials !== false && content.facebookUrl
      ? { label: "Facebook", href: content.facebookUrl }
      : null,
    content.showSocials !== false && content.tiktokUrl
      ? { label: "TikTok", href: content.tiktokUrl }
      : null,
    content.showSocials !== false && content.websiteUrl ? { label: "Sitio", href: content.websiteUrl } : null,
    content.whatsapp
      ? {
          label: "WhatsApp",
          href: `https://wa.me/${content.whatsapp.replace(/\D/g, "")}`,
        }
      : null,
    content.showEmailButton !== false && content.email ? { label: "Email", href: `mailto:${content.email}` } : null,
    openLocationHref ? { label: "Abrir ubicación", href: openLocationHref } : null,
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <section
      className={`rounded-[2rem] border border-white/10 p-6 shadow-2xl shadow-black/20 ${
        variant === "minimal" ? "bg-slate-950/60" : "bg-white/5"
      }`}
    >
      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
        {content.mapLabel?.trim() || content.locationTitle}
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-2xl font-semibold text-white">{displayCity}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{content.locationText}</p>
          <p className="mt-3 text-sm leading-7 text-slate-400">{displayAddress}</p>
          <div className="mt-5 h-1.5 w-20 rounded-full" style={{ backgroundColor: accentColor }} />

          {contactItems.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {contactItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/80">
          {embedUrl ? (
            <div className="h-72">
              <iframe
                src={embedUrl}
                title={`Mapa de ${business.name}`}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5">
              <div className="max-w-sm rounded-[1.5rem] border border-white/10 bg-slate-950/75 p-5 text-center shadow-xl shadow-black/20">
                <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                  Mapa pendiente de configurar
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{content.locationText}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{displayAddress}</p>
                {openLocationHref ? (
                  <div className="mt-4">
                    <a
                      href={openLocationHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/20"
                    >
                      Abrir ubicación
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
