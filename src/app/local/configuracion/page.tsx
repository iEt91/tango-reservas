import { Suspense } from "react";
import { LocalConfigurationPage } from "@/components/local-configuration/LocalConfigurationPage";

export default function LocalConfiguracionPage() {
  return (
    <Suspense fallback={null}>
      <LocalConfigurationPage />
    </Suspense>
  );
}
