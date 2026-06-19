import { Suspense } from "react";
import { LocalReportesPage } from "@/components/local-reportes/LocalReportesPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LocalReportesPage />
    </Suspense>
  );
}
