import type { ReactNode } from "react";

type V2PageHeaderProps = {
  title: string;
  description?: string;
  descriptionAside?: ReactNode;
  actions?: ReactNode;
};

export function V2PageHeader({
  title,
  description,
  descriptionAside,
  actions,
}: V2PageHeaderProps) {
  if (descriptionAside) {
    return (
      <div className="mb-6 grid gap-x-6 gap-y-4 border-b border-slate-200 pb-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <p className="text-sm font-medium text-slate-500">Demuru</p>
          <h1 className="mt-2 text-[28px] font-bold leading-8 tracking-[-0.02em] text-slate-950">
            {title}
          </h1>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {actions}
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-2 md:col-span-2 md:flex-row md:items-center md:justify-between">
          {description ? (
            <p className="text-sm text-slate-500">{description}</p>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 md:justify-end">
            {descriptionAside}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">Demuru</p>
        <h1 className="mt-2 text-[28px] font-bold leading-8 tracking-[-0.02em] text-slate-950">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
