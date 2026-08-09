"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type {
  ActiveBusinessMembership,
} from "@/lib/auth/active-business-contract";

type ActiveBusinessContextValue = {
  active: ActiveBusinessMembership;
  memberships: ActiveBusinessMembership[];
};

const ActiveBusinessContext = createContext<
  ActiveBusinessContextValue | null
>(null);

type ActiveBusinessProviderProps = {
  value: ActiveBusinessMembership;
  memberships: ActiveBusinessMembership[];
  children: ReactNode;
};

export function ActiveBusinessProvider({
  value,
  memberships,
  children,
}: ActiveBusinessProviderProps) {
  return (
    <ActiveBusinessContext.Provider
      value={{ active: value, memberships }}
    >
      {children}
    </ActiveBusinessContext.Provider>
  );
}

function useActiveBusinessContext() {
  const value = useContext(ActiveBusinessContext);

  if (!value) {
    throw new Error(
      "El contexto de negocio activo no está disponible.",
    );
  }

  return value;
}

export function useActiveBusiness() {
  return useActiveBusinessContext().active;
}

export function useBusinessMemberships() {
  return useActiveBusinessContext().memberships;
}
