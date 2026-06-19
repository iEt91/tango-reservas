import Link from "next/link";
import { WideContainer } from "@/components/WideContainer";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="w-full py-8">
      <WideContainer className="flex flex-col gap-10">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur sm:p-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
            Base tecnica
          </p>
          <div className="mt-4 max-w-3xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              {APP_NAME}
            </h1>
            <p className="text-lg leading-8 text-slate-300">
              Sistema multi-negocio para crear webs publicas con reservas y panel
              privado por negocio. Esta primera version deja preparada la base
              tecnica para crecer paso a paso.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/demuru"
              className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Ver demo
            </Link>
            <Link
              href="/local/reservas"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/40"
            >
              Acceder al panel local
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {[
            {
              title: "Web para negocios",
              text: "Cada negocio tendra su propia web publica con contenido y marca propios.",
            },
            {
              title: "Sistema de reservas",
              text: "La base ya deja listo el lugar donde luego se conectara el flujo real de reservas.",
            },
            {
              title: "Panel privado",
              text: "Panel del local, admin panel y web publica quedan separados para crecer sin mezclar conceptos.",
            },
            {
              title: "Automatizaciones futuras",
              text: "Queda preparada la arquitectura para WhatsApp, Instagram, Supabase y mas adelante.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/15"
            >
              <h2 className="text-lg font-semibold text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Estado de la version
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              {APP_VERSION}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Esta entrega no conecta Supabase todavia, no crea reservas reales y
              no incluye autenticacion. Solo deja la base tecnica limpia y lista
              para la siguiente etapa.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Rutas listas
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              <li>/</li>
              <li>/local</li>
              <li>/local/reservas</li>
              <li>/dashboard (compatibilidad)</li>
              <li>/admin</li>
              <li>/demuru</li>
              <li>/barbados</li>
              <li>/cafe-demo</li>
            </ul>
          </div>
        </section>
      </WideContainer>
    </main>
  );
}
