import { redirect } from "next/navigation";

type DashboardPageProps = {
  searchParams?: {
    business?: string | string[];
  };
};

function getBusinessQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return typeof value === "string" ? value : "";
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  const business = getBusinessQueryValue(searchParams?.business);

  if (business) {
    redirect(`/local/reservas?business=${encodeURIComponent(business)}`);
  }

  redirect("/local/reservas");
}
