import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  ActiveBusinessProvider,
} from "@/components/auth/active-business-provider";
import { buildLoginPath } from "@/lib/auth/redirects";
import { resolveActiveBusiness } from "@/lib/auth/active-business";

export const dynamic = "force-dynamic";

type LocalLayoutProps = {
  children: ReactNode;
};

export default async function LocalLayout({
  children,
}: LocalLayoutProps) {
  const resolution = await resolveActiveBusiness();

  if (resolution.status === "config_missing") {
    redirect(`${buildLoginPath("/local")}&error=config`);
  }

  if (resolution.status === "unauthenticated") {
    redirect(buildLoginPath("/local"));
  }

  if (resolution.status === "membership_missing") {
    redirect("/auth/access-denied?reason=membership");
  }

  if (resolution.status === "selection_required") {
    redirect("/auth/select-business?next=%2Flocal");
  }

  return (
    <ActiveBusinessProvider
      value={resolution.membership}
      memberships={resolution.memberships}
    >
      {children}
    </ActiveBusinessProvider>
  );
}
