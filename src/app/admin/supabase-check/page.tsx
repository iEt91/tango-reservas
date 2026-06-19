import { getDataSource } from "@/lib/data/dataSource";
import { checkSupabaseConnection } from "@/lib/data/supabase/health";
import { hasSupabaseConfig } from "@/lib/supabase/client";

function Badge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

export default async function SupabaseCheckPage() {
  const dataSource = getDataSource();
  const envUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const envAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  const envServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const health = await checkSupabaseConnection();
  const hasBusinesses = health.businesses.length > 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Diagnostico
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Supabase Check</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Esta pagina prueba la conexion inicial a Supabase sin cambiar la fuente activa de la
            app. La app sigue usando local/mock mientras `NEXT_PUBLIC_DATA_SOURCE` permanezca en
            `local`.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Badge label="Data source" value={dataSource} />
          <Badge label="NEXT_PUBLIC_SUPABASE_URL" value={envUrl ? "Presente" : "Falta"} />
          <Badge label="NEXT_PUBLIC_SUPABASE_ANON_KEY" value={envAnon ? "Presente" : "Falta"} />
          <Badge label="SUPABASE_SERVICE_ROLE_KEY" value={envServiceRole ? "Presente" : "Falta"} />
        </section>

        {!hasSupabaseConfig() ? (
          <section className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
            Faltan variables de Supabase. La app sigue funcionando con local/mock sin tocar nada.
          </section>
        ) : null}

        {dataSource === "local" ? (
          <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5 text-sm text-cyan-100">
            La app sigue usando local/mock por configuracion actual. Este test solo valida que
            Supabase responda de forma paralela.
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
            <h2 className="text-lg font-semibold text-white">Estado de conexion</h2>
            <p className="mt-3 text-sm text-slate-300">
              {health.connected
                ? "Conexion exitosa a Supabase."
                : health.error ?? "No fue posible verificar la conexion."}
            </p>
            {health.connected && health.businessCount === 0 ? (
              <p className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                Supabase responde, pero la consulta a public.businesses no devolvio registros.
                Revisar RLS, API key, proyecto o tabla.
              </p>
            ) : null}
            {!health.connected && health.rawMessage ? (
              <p className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                {health.rawMessage}
              </p>
            ) : null}
            {health.connected && health.rawMessage ? (
              <p className="mt-3 rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs text-slate-300">
                {health.rawMessage}
              </p>
            ) : null}
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
              Tabla consultada: {health.table}
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <dt className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Conexion
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {health.connected ? "OK" : "Error"}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <dt className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Negocios
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">{health.businessCount}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <dt className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  BusinessesCount
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {health.businessesCount}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <dt className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Code
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {health.errorCode ?? "OK"}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <dt className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Registros
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {hasBusinesses ? "Si" : "No"}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
            <h2 className="text-lg font-semibold text-white">Slugs en Supabase</h2>
            {health.slugs.length > 0 ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {health.slugs.map((slug) => (
                  <li
                    key={slug}
                    className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-200"
                  >
                    {slug}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                No hay slugs cargados o la consulta no devolvio registros.
              </p>
            )}
            {health.businesses.length > 0 ? (
              <div className="mt-4 grid gap-2">
                {health.businesses.map((business) => (
                  <div
                    key={business.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-200"
                  >
                    <div className="font-semibold text-white">{business.slug}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {business.name} · {business.status ?? "sin estado"} ·{" "}
                      {business.city ?? "sin ciudad"} · {business.category ?? "sin rubro"}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </section>
      </div>
    </main>
  );
}
