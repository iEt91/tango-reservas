import { Suspense } from "react";
import { LocalMenuPage } from "@/components/local-menu/LocalMenuPage";

export default function LocalMenuRoutePage() {
  return (
    <Suspense fallback={null}>
      <LocalMenuPage />
    </Suspense>
  );
}
