import { PublicBusinessRenderer } from "@/components/themes/PublicBusinessRenderer";
import { getDataSource } from "@/lib/data/dataSource";
import { getPublicWebPageDataBySlug } from "@/lib/data/publicWeb";
import { getBusinessBySlug, getBusinessSlugs } from "@/data/businesses";
import { notFound } from "next/navigation";

type BusinessPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getBusinessSlugs();
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { slug } = await params;
  if (getDataSource() === "supabase") {
    const pageData = await getPublicWebPageDataBySlug(slug);

    if (!pageData) {
      notFound();
    }

    if (pageData.error) {
      return (
        <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center px-4 py-12">
          <section className="w-full rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-center shadow-2xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.22em] text-cyan-300/80">Supabase</p>
            <h1 className="mt-3 text-2xl font-semibold text-white">No se pudo cargar la web</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">{pageData.error.message}</p>
            {pageData.error.code || pageData.error.details || pageData.error.hint ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-left text-xs leading-5 text-slate-300">
                <p>Code: {pageData.error.code ?? "sin codigo"}</p>
                <p>Details: {pageData.error.details ?? "sin detalles"}</p>
                <p>Hint: {pageData.error.hint ?? "sin hint"}</p>
              </div>
            ) : null}
          </section>
        </main>
      );
    }

    return (
      <PublicBusinessRenderer
        business={pageData.business}
        contentOverride={pageData.content}
        galleryOverride={pageData.galleryImages}
        menuCategoriesOverride={pageData.menuCategories}
        menuItemsOverride={pageData.menuItems}
        servicesOverride={pageData.services}
        snapshotOverride={{
          content: pageData.content,
          gallery: pageData.galleryImages,
          services: pageData.services,
        }}
        publicDataSource="supabase"
      />
    );
  }

  const business = getBusinessBySlug(slug);

  if (!business) {
    notFound();
  }

  return <PublicBusinessRenderer business={business} publicDataSource="local" />;
}

