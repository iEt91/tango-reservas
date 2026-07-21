import type { ReactNode } from "react";

type V2PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function V2PageHeader({ title, description, actions }: V2PageHeaderProps) {
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
