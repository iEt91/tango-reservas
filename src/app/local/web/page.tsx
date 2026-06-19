import { Suspense } from "react";
import { LocalWebPage } from "@/components/local-web/LocalWebPage";

export default function LocalWebPageRoute() {
  return (
    <Suspense fallback={null}>
      <LocalWebPage />
    </Suspense>
  );
}
