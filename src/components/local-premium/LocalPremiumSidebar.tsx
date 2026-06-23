import type { ComponentProps } from "react";
import { LocalSidebar } from "@/components/local-panel/LocalSidebar";

export function LocalPremiumSidebar(props: ComponentProps<typeof LocalSidebar>) {
  return <LocalSidebar {...props} />;
}
