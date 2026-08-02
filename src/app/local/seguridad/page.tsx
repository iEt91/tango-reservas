import { redirect } from "next/navigation";
import { LogOut, ShieldCheck, UserRoundCheck } from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { buildLoginPath } from "@/lib/auth/redirects";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export default async function SecurityPilotPage() {
  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    redirect(`${buildLoginPath("/local/seguridad")}&error=config`);
  }

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect(buildLoginPath("/local/seguridad"));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <V2AppShell>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              <ShieldCheck size={14} />
              Ruta piloto protegida
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Seguridad y sesión
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Esta pantalla valida la identidad en el servidor antes de renderizar.
            </p>
          </div>

          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut size={17} />
              Cerrar sesión
            </button>
          </form>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-auto lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[20px] border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <UserRoundCheck size={23} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Sesión verificada
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Correo autenticado
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {user?.email ?? "Usuario autenticado"}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  El Proxy renueva las cookies y esta página vuelve a comprobar
                  el token mediante Supabase antes de mostrar contenido.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-[20px] border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-base font-bold text-amber-950">
              Alcance de esta fase
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-900/80">
              Solo esta sección exige autenticación. Las demás páginas de
              `/local` permanecen abiertas hasta aplicar la migración de
              membresías en staging y validar los roles.
            </p>
          </aside>
        </div>
      </div>
    </V2AppShell>
  );
}
