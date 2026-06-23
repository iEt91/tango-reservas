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
  buildLocalBusinessHref,
  getActiveBusinessFallback,
  getBusinessByIdFromList,
  getBusinessBySlugFromList,
  getFallbackBusiness,
  getLocalAccessMode,
  getLocalBusinessSlugFromSearchParams,
  getStoredOwnerBusinessSlug,
  INVALID_LOCAL_BUSINESS_MESSAGE,
  NO_ACTIVE_LOCAL_BUSINESS_MESSAGE,
  navigateToBusiness,
  setStoredOwnerBusinessSlug,
  type LocalAccessMode,
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
  const accessMode = getLocalAccessMode(searchParams);
  const canChangeBusiness = accessMode === "support";
  const [warning, setWarning] = useState("");
  const [resolvedRequestedBusiness, setResolvedRequestedBusiness] = useState<Business | null>(null);
  const [requestedBusinessState, setRequestedBusinessState] = useState<
    "idle" | "loading" | "resolved"
  >("idle");
  const [pendingBusinessSlug, setPendingBusinessSlug] = useState("");
  const [ownerBusinessSlug, setOwnerBusinessSlug] = useState("");
  const [ownerBusinessReady, setOwnerBusinessReady] = useState(false);

  const queryBusinessSlug = getLocalBusinessSlugFromSearchParams(searchParams);

  const requestedBusiness = useMemo(() => {
    if (!canChangeBusiness || !queryBusinessSlug) {
      return null;
    }

    const immediateRequestedBusiness =
      getBusinessBySlugFromList(businesses, queryBusinessSlug) ??
      getBusinessByIdFromList(businesses, queryBusinessSlug);

    if (requestedBusinessState !== "resolved") {
      return immediateRequestedBusiness;
    }

    return (
      resolvedRequestedBusiness ?? immediateRequestedBusiness
    );
  }, [
    businesses,
    canChangeBusiness,
    queryBusinessSlug,
    requestedBusinessState,
    resolvedRequestedBusiness,
  ]);

  useEffect(() => {
    if (!canChangeBusiness) {
      setResolvedRequestedBusiness(null);
      setRequestedBusinessState("idle");
      return;
    }

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
  }, [canChangeBusiness, queryBusinessSlug]);

  useEffect(() => {
    if (canChangeBusiness) {
      setOwnerBusinessReady(false);
      setOwnerBusinessSlug("");
      return;
    }

    if (businesses.length === 0) {
      setOwnerBusinessReady(true);
      setOwnerBusinessSlug("");
      return;
    }

    const storedSlug = getStoredOwnerBusinessSlug();
    const storedBusiness = storedSlug
      ? getBusinessBySlugFromList(businesses, storedSlug) ??
        getBusinessByIdFromList(businesses, storedSlug)
      : null;
    const queryBusiness =
      queryBusinessSlug && !canChangeBusiness
        ? getBusinessBySlugFromList(businesses, queryBusinessSlug) ??
          getBusinessByIdFromList(businesses, queryBusinessSlug)
        : null;
    const fallbackBusiness = storedBusiness ?? queryBusiness ?? getFallbackBusiness(businesses);
    const nextSlug = fallbackBusiness?.slug ?? "";

    setOwnerBusinessSlug(nextSlug);
    setOwnerBusinessReady(true);

    if (nextSlug && nextSlug !== storedSlug) {
      setStoredOwnerBusinessSlug(nextSlug);
    }
  }, [businesses, canChangeBusiness, queryBusinessSlug]);

  const ownerSelectedBusiness = useMemo(() => {
    if (canChangeBusiness) {
      return null;
    }

    if (!ownerBusinessReady || !ownerBusinessSlug) {
      return null;
    }

    return (
      getBusinessBySlugFromList(businesses, ownerBusinessSlug) ??
      getBusinessByIdFromList(businesses, ownerBusinessSlug) ??
      getActiveBusinessFallback(businesses) ??
      getFallbackBusiness(businesses)
    );
  }, [businesses, canChangeBusiness, ownerBusinessReady, ownerBusinessSlug]);

  const selectedBusiness = useMemo(() => {
    if (!canChangeBusiness) {
      return ownerSelectedBusiness;
    }

    if (pendingBusinessSlug) {
      const pendingBusiness =
        getBusinessBySlugFromList(businesses, pendingBusinessSlug) ??
        getBusinessByIdFromList(businesses, pendingBusinessSlug);

      if (pendingBusiness) {
        return pendingBusiness;
      }
    }

    if (queryBusinessSlug) {
      if (requestedBusiness) {
        return requestedBusiness;
      }

      if (requestedBusinessState !== "resolved") {
        return (
          getBusinessBySlugFromList(businesses, queryBusinessSlug) ??
          getBusinessByIdFromList(businesses, queryBusinessSlug)
        );
      }

      if (requestedBusinessState === "resolved") {
        return requestedBusiness;
      }
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

    if (!queryBusinessSlug) {
      return getActiveBusinessFallback(businesses);
    }

    return null;
  }, [
    businesses,
    canChangeBusiness,
    ownerSelectedBusiness,
    pendingBusinessSlug,
    queryBusinessSlug,
    requestedBusiness,
    requestedBusinessState,
    selectedBusinessId,
  ]);

  const isSelectionReady = useMemo(() => {
    if (!canChangeBusiness) {
      return ownerBusinessReady && Boolean(ownerBusinessSlug);
    }

    if (queryBusinessSlug) {
      return Boolean(requestedBusiness) || requestedBusinessState === "resolved";
    }

    return businesses.length > 0;
  }, [
    businesses.length,
    canChangeBusiness,
    ownerBusinessReady,
    ownerBusinessSlug,
    queryBusinessSlug,
    requestedBusinessState,
  ]);

  useEffect(() => {
    if (businesses.length === 0) {
      return;
    }

    if (!canChangeBusiness) {
      if (!ownerBusinessReady || !ownerBusinessSlug) {
        return;
      }

      const ownerBusiness =
        getBusinessBySlugFromList(businesses, ownerBusinessSlug) ??
        getBusinessByIdFromList(businesses, ownerBusinessSlug) ??
        getActiveBusinessFallback(businesses) ??
        getFallbackBusiness(businesses);

      if (!ownerBusiness) {
        setSelectedBusinessId("");
        setWarning(NO_ACTIVE_LOCAL_BUSINESS_MESSAGE);
        return;
      }

      if (ownerBusiness.id !== selectedBusinessId) {
        setSelectedBusinessId(ownerBusiness.id);
      }

      if (queryBusinessSlug !== ownerBusiness.slug) {
        router.replace(buildLocalBusinessHref(pathname, ownerBusiness.slug, searchParams), {
          scroll: false,
        });
      }

      if (warning) {
        setWarning("");
      }

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
          router.replace(navigateToBusiness(pathname, requestedBusiness.slug, searchParams), {
            scroll: false,
          });
        }

        if (warning !== INVALID_LOCAL_BUSINESS_MESSAGE) {
          setWarning("");
        }
        return;
      }

      if (pendingBusinessSlug) {
        return;
      }

      setSelectedBusinessId("");
      setWarning(INVALID_LOCAL_BUSINESS_MESSAGE);
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
    canChangeBusiness,
    ownerBusinessReady,
    ownerBusinessSlug,
    pathname,
    queryBusinessSlug,
    requestedBusiness,
    requestedBusinessState,
    pendingBusinessSlug,
    router,
    searchParams,
    selectedBusinessId,
    setSelectedBusinessId,
    warning,
  ]);

  const syncBusinessInUrl = useCallback(
    (businessId: string) => {
      if (!canChangeBusiness) {
        return;
      }

      const nextBusiness = businesses.find((business) => business.id === businessId);

      if (!nextBusiness) {
        return;
      }

      setPendingBusinessSlug(nextBusiness.slug);
      router.replace(navigateToBusiness(pathname, nextBusiness.slug, searchParams), {
        scroll: false,
      });
    },
    [businesses, canChangeBusiness, pathname, router, searchParams],
  );

  const handleBusinessChange = useCallback(
    (businessId: string) => {
      if (!canChangeBusiness) {
        return;
      }

      setSelectedBusinessId(businessId);
      setWarning("");
      syncBusinessInUrl(businessId);
    },
    [canChangeBusiness, setSelectedBusinessId, syncBusinessInUrl],
  );

  return {
    accessMode,
    businessWarning: warning,
    canChangeBusiness,
    isSelectionReady,
    handleBusinessChange,
    selectedBusiness,
    syncBusinessInUrl,
  };
}
