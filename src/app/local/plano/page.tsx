import { Suspense } from "react";
import { LocalFloorPlanPage } from "@/components/local-floor-plan/LocalFloorPlanPage";

export default function LocalPlanoPage() {
  return (
    <Suspense fallback={null}>
      <LocalFloorPlanPage />
    </Suspense>
  );
}
