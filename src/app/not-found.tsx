import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-16">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/20">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          Negocio no encontrado
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          La ruta existe, pero aun no hay datos mockeados para ese slug.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
