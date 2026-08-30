import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getDataSource } from "@/lib/data/dataSource";

type AdminLayoutProps = {
  children: ReactNode;
};

/**
 * The global panel is a local-demo tool. There is no platform-admin role yet,
 * so Supabase mode must not list every business nor replace an error with mocks.
 */
export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  if (getDataSource() === "supabase") {
    redirect("/local");
  }

  return children;
}
