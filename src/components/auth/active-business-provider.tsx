"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type {
  ActiveBusinessMembership,
} from "@/lib/auth/active-business-contract";

const ActiveBusinessContext = createContext<
  ActiveBusinessMembership | null
>(null);

type ActiveBusinessProviderProps = {
  value: ActiveBusinessMembership;
  children: ReactNode;
};

export function ActiveBusinessProvider({
  value,
  children,
}: ActiveBusinessProviderProps) {
  return (
    <ActiveBusinessContext.Provider value={value}>
      {children}
    </ActiveBusinessContext.Provider>
  );
}

export function useActiveBusiness() {
  const value = useContext(ActiveBusinessContext);

  if (!value) {
    throw new Error(
      "useActiveBusiness debe utilizarse dentro de ActiveBusinessProvider.",
    );
  }

  return value;
}
