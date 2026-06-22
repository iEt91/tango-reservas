import { redirect } from "next/navigation";

type DashboardPageProps = {
  searchParams?: {
    business?: string | string[];
    mode?: string | string[];
    support?: string | string[];
  };
};

function getBusinessQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return typeof value === "string" ? value : "";
}

function buildQueryString(searchParams?: {
  business?: string | string[];
  mode?: string | string[];
  support?: string | string[];
}) {
  const query = new URLSearchParams();

  const business = getBusinessQueryValue(searchParams?.business);
  const mode = getBusinessQueryValue(searchParams?.mode);
  const support = getBusinessQueryValue(searchParams?.support);

  if (business) {
    query.set("business", business);
  }

  if (mode) {
    query.set("mode", mode);
  }

  if (support) {
    query.set("support", support);
  }

  return query.toString();
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  const query = buildQueryString(searchParams);

  if (query) {
    redirect(`/local/reservas?${query}`);
  }

  redirect("/local/reservas");
}
