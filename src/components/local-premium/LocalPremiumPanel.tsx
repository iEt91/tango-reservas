import type { ReactNode } from "react";
import styles from "./LocalPremium.module.css";

type LocalPremiumPanelProps = {
  children: ReactNode;
  className?: string;
};

export function LocalPremiumPanel({ children, className = "" }: LocalPremiumPanelProps) {
  return <section className={`${styles.panel} ${className}`}>{children}</section>;
}
