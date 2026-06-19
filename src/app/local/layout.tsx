import { Suspense } from "react";
import { LocalAreaFrame } from "@/components/local/LocalAreaFrame";
import type { ReactNode } from "react";

export default function LocalLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Suspense fallback={null}>
      <LocalAreaFrame>{children}</LocalAreaFrame>
    </Suspense>
  );
}
