import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./LocalPremium.module.css";

type LocalPremiumButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  primary?: boolean;
};

export function LocalPremiumButton({
  children,
  primary = false,
  className = "",
  ...props
}: LocalPremiumButtonProps) {
  return (
    <button
      {...props}
      className={`${styles.button} ${primary ? styles.buttonPrimary : ""} ${className}`}
    >
      {children}
    </button>
  );
}
