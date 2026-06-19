import { Suspense } from "react";
import { LocalCalendarPage } from "@/components/local-calendar/LocalCalendarPage";

export default function LocalCalendarioPage() {
  return (
    <Suspense fallback={null}>
      <LocalCalendarPage />
    </Suspense>
  );
}
