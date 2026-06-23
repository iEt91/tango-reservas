import type { ComponentProps } from "react";
import { LocalTopbar } from "@/components/local-panel/LocalTopbar";

export function LocalPremiumTopbar(props: ComponentProps<typeof LocalTopbar>) {
  return <LocalTopbar {...props} />;
}
