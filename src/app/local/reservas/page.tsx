import { Suspense } from "react";
import { LocalReservationsPage } from "@/components/local-reservations/LocalReservationsPage";

export default function LocalReservationsRoutePage() {
  return (
    <Suspense fallback={null}>
      <LocalReservationsPage />
    </Suspense>
  );
}
