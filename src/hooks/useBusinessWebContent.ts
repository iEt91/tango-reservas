"use client";

import { useEffect, useState } from "react";
import { getPublicWebContentByBusinessId, subscribePublicWeb } from "@/lib/data/webContent";
import type { PublicWebContent } from "@/data/types";

export function useBusinessWebContent(businessId?: string | null) {
  const [content, setContent] = useState<PublicWebContent | null>(null);

  useEffect(() => {
    if (!businessId) {
      setContent(null);
      return;
    }

    const syncContent = () => setContent(getPublicWebContentByBusinessId(businessId));

    syncContent();
    const unsubscribe = subscribePublicWeb(syncContent);
    return unsubscribe;
  }, [businessId]);

  return content;
}

