"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getPublicWebContentByBusinessId, subscribePublicWeb } from "@/lib/data/webContent";
import type { PublicWebContent } from "@/data/types";

export function useBusinessWebContent(businessId?: string | null) {
  const getSnapshot = () =>
    JSON.stringify(businessId ? getPublicWebContentByBusinessId(businessId) : null);
  const snapshot = useSyncExternalStore(
    businessId ? subscribePublicWeb : () => () => {},
    getSnapshot,
    () => "null",
  );

  return useMemo(() => {
    try {
      return JSON.parse(snapshot) as PublicWebContent | null;
    } catch {
      return null;
    }
  }, [snapshot]);
}
