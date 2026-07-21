import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/v2/v2-utils";

type V2ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "dangerSolid"
  | "ghost";

type V2ButtonSize = "sm" | "md";

type V2ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: V2ButtonVariant;
  size?: V2ButtonSize;
  icon?: ReactNode;
};

const variantClasses: Record<V2ButtonVariant, string> = {
  primary:
    "border-transparent bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-white",
  secondary:
    "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60",
  danger:
    "border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-60",
  dangerSolid:
    "border-transparent bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300",
  ghost:
    "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 disabled:text-slate-400",
};

const sizeClasses: Record<V2ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export function V2Button({
  className,
  variant = "secondary",
  size = "md",
  icon,
  children,
  type = "button",
  ...props
}: V2ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600/20",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
