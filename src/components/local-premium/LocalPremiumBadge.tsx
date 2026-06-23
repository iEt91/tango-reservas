import styles from "./LocalPremium.module.css";

type LocalPremiumBadgeProps = {
  children: string;
  solid?: boolean;
  className?: string;
};

export function LocalPremiumBadge({
  children,
  solid = false,
  className = "",
}: LocalPremiumBadgeProps) {
  return (
    <span className={`${styles.badge} ${solid ? styles.badgeSolid : ""} ${className}`}>
      {children}
    </span>
  );
}
