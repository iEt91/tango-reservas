import { Building2, LogOut, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath, sanitizeNextPath } from "@/lib/auth/redirects";

type SelectBusinessPageProps = {
  searchParams: Promise<{
    change?: string;
    next?: string;
  }>;
};

export default async function SelectBusinessPage({
  searchParams,
}: SelectBusinessPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next, "/local");
  const resolution = await resolveActiveBusiness();

  if (resolution.status === "config_missing") {
    redirect(`${buildLoginPath(nextPath)}&error=config`);
  }

  if (resolution.status === "unauthenticated") {
    redirect(buildLoginPath(nextPath));
  }

  if (resolution.status === "membership_missing") {
    redirect("/auth/access-denied?reason=membership");
  }

  const memberships = resolution.memberships;
  const isExplicitChange = params.change === "1";

  if (
    resolution.status === "ready"
    && (!isExplicitChange || memberships.length === 1)
  ) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                Sesión protegida
              </p>
              <h1 className="mt-2 text-2xl font-bold">
                Elegí el negocio activo
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                La selección se valida nuevamente contra tu membresía antes de
                crear la cookie privada de contexto.
              </p>
            </div>
          </div>

          <div className="mt-7 space-y-3">
            {memberships.map((membership) => (
              <form
                key={membership.businessId}
                action="/auth/select-business/activate"
                method="post"
              >
                <input
                  type="hidden"
                  name="businessId"
                  value={membership.businessId}
                />
                <input type="hidden" name="next" value={nextPath} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-left transition hover:border-emerald-400/40 hover:bg-emerald-400/10"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200">
                      <Building2 size={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {membership.business.name}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-400">
                        /{membership.business.slug}
                      </span>
                    </span>
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300">
                    {membership.role}
                  </span>
                </button>
              </form>
            ))}
          </div>

          <form action="/auth/logout" method="post" className="mt-7">
            <button
              type="submit"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
