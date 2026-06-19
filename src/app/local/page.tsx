import { redirect } from "next/navigation";

type LocalPageProps = {
  searchParams?: Promise<{
    business?: string | string[];
  }>;
};

function getBusinessQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return typeof value === "string" ? value : "";
}

export default async function LocalPage({ searchParams }: LocalPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const business = getBusinessQueryValue(resolvedSearchParams?.business);

  if (business) {
    redirect(`/local/reservas?business=${encodeURIComponent(business)}`);
  }

  redirect("/local/reservas");
}
