import { PublicBusinessRenderer } from "@/components/themes/PublicBusinessRenderer";
import type { Business } from "@/data/types";

type BusinessPublicPageProps = {
  business: Business;
};

export function BusinessPublicPage({ business }: BusinessPublicPageProps) {
  return <PublicBusinessRenderer business={business} />;
}
