import { redirect } from "next/navigation";

export default function StockHistorialRedirectPage() {
  redirect("/local/historial?tab=stock");
}
