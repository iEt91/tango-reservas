import { AdminBusinessesPanel } from "@/components/admin/AdminBusinessesPanel";
import { loadAdminBusinessesSnapshot } from "@/lib/data/admin-businesses";

export default async function AdminPage() {
  const snapshot = await loadAdminBusinessesSnapshot();

  return <AdminBusinessesPanel snapshot={snapshot} />;
}
