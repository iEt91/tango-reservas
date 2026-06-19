"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Business } from "@/data/types";
import { resolveBusinessForDataSource } from "@/lib/data/business-resolution";
import {
  getActiveBusinessFallback,
  getBusinessByIdFromList,
  getBusinessBySlugFromList,
  INVALID_LOCAL_BUSINESS_MESSAGE,
  NO_ACTIVE_LOCAL_BUSINESS_MESSAGE,
  LOCAL_BUSINESS_QUERY_KEY,
  navigateToBusiness,
} from "@/lib/local-business-routing";

type UseLocalBusinessSelectionParams = {
  businesses: Business[];
  selectedBusinessId: string;
  setSelectedBusinessId: Dispatch<SetStateAction<string>>;
};

export function useLocalBusinessSelection({
  businesses,
  selectedBusinessId,
  setSelectedBusinessId,
}: UseLocalBusinessSelectionParams) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [warning, setWarning] = useState("");
  const [resolvedRequestedBusiness, setResolvedRequestedBusiness] = useState<Business | null>(null);
  const [requestedBusinessState, setRequestedBusinessState] = useState<"idle" | "loading" | "resolved">("idle");
  const [pendingBusinessSlug, setPendingBusinessSlug] = useState("");

  const queryBusinessSlug = searchParams.get(LOCAL_BUSINESS_QUERY_KEY)?.trim() ?? "";

  const requestedBusiness = useMemo(() => {
    if (!queryBusinessSlug) {
      return null;
    }

    if (requestedBusinessState !== "resolved") {
      return null;
    }

    return (
      resolvedRequestedBusiness ??
      getBusinessBySlugFromList(businesses, queryBusinessSlug) ??
      getBusinessByIdFromList(businesses, queryBusinessSlug)
    );
  }, [businesses, queryBusinessSlug, requestedBusinessState, resolvedRequestedBusiness]);

  useEffect(() => {
    let cancelled = false;

    const syncRequestedBusiness = async () => {
      if (!queryBusinessSlug) {
        setResolvedRequestedBusiness(null);
        setRequestedBusinessState("idle");
        return;
      }

      setRequestedBusinessState("loading");
      const resolved = await resolveBusinessForDataSource(queryBusinessSlug);

      if (!cancelled) {
        setResolvedRequestedBusiness(resolved);
        setRequestedBusinessState("resolved");
      }
    };

    void syncRequestedBusiness();

    return () => {
      cancelled = true;
    };
  }, [queryBusinessSlug]);

  const selectedBusiness = useMemo(
    () => {
      if (pendingBusinessSlug) {
        const pendingBusiness =
          getBusinessBySlugFromList(businesses, pendingBusinessSlug) ??
          getBusinessByIdFromList(businesses, pendingBusinessSlug);

        if (pendingBusiness) {
          return pendingBusiness;
        }
      }

      if (queryBusinessSlug && requestedBusinessState !== "resolved") {
        return null;
      }

      if (requestedBusinessState === "resolved" && requestedBusiness) {
        return requestedBusiness;
      }

      if (selectedBusinessId) {
        const nextSelectedBusiness = businesses.find((business) => business.id === selectedBusinessId);
        if (nextSelectedBusiness) {
          return nextSelectedBusiness;
        }
      }

      return getActiveBusinessFallback(businesses);
    },
    [businesses, pendingBusinessSlug, requestedBusiness, requestedBusinessState, selectedBusinessId, queryBusinessSlug],
  );

  useEffect(() => {
    if (businesses.length === 0) {
      return;
    }

    if (queryBusinessSlug) {
      if (requestedBusinessState !== "resolved") {
        return;
      }

      if (requestedBusiness) {
        if (pendingBusinessSlug && requestedBusiness.slug !== pendingBusinessSlug) {
          return;
        }

        if (requestedBusiness.id !== selectedBusinessId) {
          setSelectedBusinessId(requestedBusiness.id);
        }

        if (pendingBusinessSlug === requestedBusiness.slug) {
          setPendingBusinessSlug("");
        }

        if (requestedBusiness.slug !== queryBusinessSlug) {
          router.replace(
            navigateToBusiness(pathname, requestedBusiness.slug, searchParams),
            {
              scroll: false,
            },
          );
        }

        if (warning !== INVALID_LOCAL_BUSINESS_MESSAGE) {
          setWarning("");
        }
        return;
      }

      if (pendingBusinessSlug) {
        return;
      }

      const fallbackBusiness = getActiveBusinessFallback(businesses);
      if (fallbackBusiness && fallbackBusiness.id !== selectedBusinessId) {
        setSelectedBusinessId(fallbackBusiness.id);
      }

      if (fallbackBusiness) {
        setWarning(INVALID_LOCAL_BUSINESS_MESSAGE);

        if (fallbackBusiness.slug !== queryBusinessSlug) {
          router.replace(
            navigateToBusiness(pathname, fallbackBusiness.slug, searchParams),
            {
            scroll: false,
            },
          );
        }
      } else {
        setSelectedBusinessId("");
        setWarning(NO_ACTIVE_LOCAL_BUSINESS_MESSAGE);
      }
      return;
    }

    if (selectedBusinessId && businesses.some((business) => business.id === selectedBusinessId)) {
      setWarning("");
      return;
    }

    const fallbackBusiness = getActiveBusinessFallback(businesses);
    if (fallbackBusiness && fallbackBusiness.id !== selectedBusinessId) {
      setSelectedBusinessId(fallbackBusiness.id);
      setWarning("");
      return;
    }

    setSelectedBusinessId("");
    setWarning(NO_ACTIVE_LOCAL_BUSINESS_MESSAGE);
  }, [
    businesses,
    pathname,
    queryBusinessSlug,
    requestedBusiness,
    requestedBusinessState,
    pendingBusinessSlug,
    router,
    selectedBusinessId,
    setSelectedBusinessId,
    warning,
  ]);

  const syncBusinessInUrl = useCallback(
    (businessId: string) => {
      const nextBusiness = businesses.find((business) => business.id === businessId);

      if (!nextBusiness) {
        return;
      }

      setPendingBusinessSlug(nextBusiness.slug);
      router.replace(navigateToBusiness(pathname, nextBusiness.slug, searchParams), {
        scroll: false,
      });
    },
    [businesses, pathname, router, searchParams],
  );

  const handleBusinessChange = useCallback(
    (businessId: string) => {
      setSelectedBusinessId(businessId);
      setWarning("");
      syncBusinessInUrl(businessId);
    },
    [setSelectedBusinessId, syncBusinessInUrl],
  );

  return {
    businessWarning: warning,
    handleBusinessChange,
    selectedBusiness,
    syncBusinessInUrl,
  };
}
