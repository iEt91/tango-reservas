import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  ActiveBusinessProvider,
} from "@/components/auth/active-business-provider";
import { buildLoginPath } from "@/lib/auth/redirects";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

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

  // The sandbox's 29-day window is anchored to the Buenos Aires clock when it
  // is actually opened. Real businesses and non-owner sandbox members are no-ops.
  const supabase = await createSupabaseAuthServerClient();
  if (supabase) {
    const { error } = await supabase.rpc(
      "refresh_business_sandbox_reservation_window",
      { p_sandbox_business_id: resolution.membership.businessId },
    );

    if (error) {
      console.error("[business-sandbox] agenda refresh skipped", {
        code: error.code ?? null,
      });
    }
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
