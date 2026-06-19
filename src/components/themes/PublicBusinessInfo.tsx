import type { Business, PublicWebContent } from "@/data/types";

type PublicBusinessInfoProps = {
  business: Business;
  content: PublicWebContent;
  accentColor: string;
  variant?: "elegant" | "visual" | "minimal";
};

function compactFacts(business: Business, content: PublicWebContent) {
  return [
    business.category,
    content.publicCity?.trim() || business.city,
    content.publicAddress?.trim() || business.address,
  ].filter((value): value is string => value.trim().length > 0);
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

export function PublicBusinessInfo({
  business,
  content,
  accentColor,
  variant = "elegant",
}: PublicBusinessInfoProps) {
  if (!content.showAbout) {
    return null;
  }

  const facts = compactFacts(business, content);
  const aboutBody = content.aboutText?.trim() || content.presentationText || business.description;
  const highlights =
    Array.isArray(content.aboutHighlights) && content.aboutHighlights.length > 0
      ? content.aboutHighlights
      : facts.slice(0, 3);
  const attributes = splitAttributes(content.publicAttributesText);
  const badge = content.publicBadge?.trim() || business.category;

  return (
    <section
      className={`rounded-[2rem] border border-white/10 p-5 shadow-2xl shadow-black/20 xl:p-6 ${
        variant === "minimal" ? "bg-slate-950/60" : "bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            {content.aboutTitle?.trim() || content.presentationTitle}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {content.publicName?.trim() || business.name}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100">
              {badge}
            </span>
            {attributes.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-200"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="h-3 w-20 rounded-full" style={{ backgroundColor: accentColor }} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.05fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
          <p className="text-sm leading-7 text-slate-300">
            {content.publicSubtitle?.trim() || business.description}
          </p>
          {content.featuredPhrase ? (
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100">
              {content.featuredPhrase}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {facts.map((fact) => (
              <span
                key={fact}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
              >
                {fact}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
          <p className="text-sm leading-7 text-slate-300 sm:text-base">{aboutBody}</p>
          {highlights.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {highlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-50"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
