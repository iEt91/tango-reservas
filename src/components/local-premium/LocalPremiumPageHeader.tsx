import type { ReactNode } from "react";
import styles from "./LocalPremium.module.css";

type LocalPremiumPageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export function LocalPremiumPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className = "",
}: LocalPremiumPageHeaderProps) {
  return (
    <header className={`${styles.pageHeader} ${className}`}>
      <div>
        {eyebrow ? (
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            {eyebrow}
          </p>
        ) : null}
        <h1 className={styles.pageHeaderTitle}>{title}</h1>
        {subtitle ? <p className={styles.pageHeaderSubtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
