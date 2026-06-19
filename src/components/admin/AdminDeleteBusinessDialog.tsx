"use client";

import type { Business } from "@/data/types";

type AdminDeleteBusinessDialogProps = {
  open: boolean;
  target: Business | null;
  slugInput: string;
  deleteMessage: string;
  isLastActive: boolean;
  isBaseBusiness: boolean;
  onSlugInputChange: (nextValue: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function AdminDeleteBusinessDialog({
  open,
  target,
  slugInput,
  deleteMessage,
  isLastActive,
  isBaseBusiness,
  onSlugInputChange,
  onClose,
  onConfirm,
}: AdminDeleteBusinessDialogProps) {
  if (!open || !target) {
    return null;
  }

  const canConfirm = !target.slug || slugInput.trim() === target.slug;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-business-title"
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-rose-300/80">
              Eliminar negocio
            </p>
            <h2 id="delete-business-title" className="mt-2 text-2xl font-semibold text-white">
              {target.name}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Slug: <span className="font-mono text-slate-100">{target.slug}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:text-white"
          >
            Cerrar
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
            Esta acción eliminará el negocio de la fuente actual y sus datos asociados.
            En Supabase, el esquema puede aplicar cascade sobre las tablas relacionadas.
            Esta acción no se puede deshacer.
          </p>

          {isLastActive ? (
            <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              Este es el último negocio activo. Podés eliminarlo, pero el sistema quedará sin webs
              públicas activas.
            </p>
          ) : null}

          {isBaseBusiness ? (
            <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              Este negocio base no se puede eliminar en modo mock. Podés desactivarlo en su lugar.
            </p>
          ) : (
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Para confirmar, escribe: <span className="font-mono text-white">{target.slug}</span>
              </span>
              <input
                value={slugInput}
                onChange={(event) => onSlugInputChange(event.target.value)}
                className="input-base"
                placeholder={target.slug}
              />
              {deleteMessage ? <p className="text-sm text-rose-300">{deleteMessage}</p> : null}
            </label>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t border-white/10 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
          >
            Cancelar
          </button>
          {!isBaseBusiness ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className="inline-flex items-center justify-center rounded-full border border-rose-400/30 bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Eliminar definitivamente
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
