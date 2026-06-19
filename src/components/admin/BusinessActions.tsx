import Link from "next/link";
import type { Business } from "@/data/types";

type BusinessActionsProps = {
  business: Business;
  onDuplicate: (businessId: string) => void;
  onToggleStatus: (businessId: string) => void;
  onDelete: (businessId: string) => void;
  readOnly?: boolean;
};

export function BusinessActions({
  business,
  onDuplicate,
  onToggleStatus,
  onDelete,
  readOnly = false,
}: BusinessActionsProps) {
  const slug = encodeURIComponent(business.slug);
  const disabledLinkClass = "pointer-events-none cursor-not-allowed opacity-50";

  function renderActionLink(
    href: string,
    label: string,
    disabled: boolean,
    extraClassName = "",
  ) {
    const className = `rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white ${
      disabled ? disabledLinkClass : ""
    } ${extraClassName}`;

    if (disabled) {
      return (
        <span aria-disabled="true" className={className}>
          {label}
        </span>
      );
    }

    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
      >
        Ver web
      </Link>
      <Link
        href={`/admin/businesses/${slug}`}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
      >
        Detalle
      </Link>
      {renderActionLink(
        `/admin/businesses/${slug}/edit`,
        "Editar",
        readOnly,
      )}
      {renderActionLink(
        `/local/configuracion?business=${slug}`,
        "Configurar",
        readOnly,
      )}
      <Link
        href={`/local/reservas?business=${slug}`}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
      >
        Panel local
      </Link>
      <button
        type="button"
        onClick={() => onDuplicate(business.id)}
        disabled={readOnly}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Duplicar
      </button>
      <button
        type="button"
        onClick={() => onToggleStatus(business.id)}
        disabled={readOnly}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-rose-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {business.status === "inactive" ? "Reactivar" : "Desactivar"}
      </button>
      <button
        type="button"
        onClick={() => onDelete(business.id)}
        disabled={readOnly}
        className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100 transition hover:border-rose-300/50 hover:bg-rose-500/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Eliminar
      </button>
    </div>
  );
}
