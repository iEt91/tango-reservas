import type { ReactNode } from "react";
import styles from "./LocalPremium.module.css";

type LocalPremiumTabsProps = {
  items: Array<{
    key: string;
    label: ReactNode;
    active?: boolean;
    onClick?: () => void;
  }>;
  className?: string;
};

export function LocalPremiumTabs({ items, className = "" }: LocalPremiumTabsProps) {
  return (
    <div className={`${styles.tabs} ${className}`}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClick}
          className={`${styles.tab} ${item.active ? styles.tabActive : ""}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
