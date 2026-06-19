import { Suspense } from "react";
import { LocalCrmPage } from "@/components/local-crm/LocalCrmPage";

export default function LocalCrmRoutePage() {
  return (
    <Suspense fallback={null}>
      <LocalCrmPage />
    </Suspense>
  );
}
