import { AdminBusinessDetailPanel } from "@/components/admin/AdminBusinessDetailPanel";

type AdminBusinessDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminBusinessDetailPage({
  params,
}: AdminBusinessDetailPageProps) {
  const { slug } = await params;
  return <AdminBusinessDetailPanel slug={slug} />;
}
