import { Suspense } from "react";
import { LocalPlanoLabPage } from "@/components/local-plano-lab/LocalPlanoLabPage";

export default function LocalPlanoLabRoute() {
  return (
    <Suspense fallback={null}>
      <LocalPlanoLabPage />
    </Suspense>
  );
}
