import { LogOut, ShieldX } from "lucide-react";

type AccessDeniedPageProps = {
  searchParams: Promise<{
    reason?: string;
  }>;
};

export default async function AccessDeniedPage({
  searchParams,
}: AccessDeniedPageProps) {
  const { reason } = await searchParams;
  const message =
    reason === "membership"
      ? "Tu usuario no tiene una membresía activa en ningún negocio."
      : "El negocio solicitado no pertenece a tu sesión activa.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <section className="w-full max-w-lg rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-7 shadow-2xl shadow-black/30 sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/15 text-rose-300">
          <ShieldX size={24} />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Acceso no autorizado</h1>
        <p className="mt-3 text-sm leading-6 text-rose-100/80">
          {message}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Un owner debe revisar la membresía antes de volver a intentar.
        </p>
        <form action="/auth/logout" method="post" className="mt-7">
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </form>
      </section>
    </main>
  );
}
