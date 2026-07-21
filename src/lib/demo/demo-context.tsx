"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultDemoScenarioKey,
  demoScenarios,
  getDemoScenario,
  type DemoScenario,
  type DemoScenarioKey,
} from "./demo-scenarios";

type DemoScenarioContextValue = {
  scenarioKey: DemoScenarioKey;
  scenario: DemoScenario;
  setScenarioKey: (nextScenario: DemoScenarioKey) => void;
  scenarios: typeof demoScenarios;
  hasHydrated: boolean;
};

const DemoScenarioContext = createContext<DemoScenarioContextValue | null>(null);

const STORAGE_KEY = "tango-demo-scenario";

function isDemoScenarioKey(value: string | null): value is DemoScenarioKey {
  return value === "low" || value === "medium" || value === "high";
}

export function DemoScenarioProvider({ children }: { children: ReactNode }) {
  const [scenarioKey, setScenarioKeyState] =
    useState<DemoScenarioKey>(defaultDemoScenarioKey);

  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const storedScenario = window.localStorage.getItem(STORAGE_KEY);

    if (isDemoScenarioKey(storedScenario)) {
      setScenarioKeyState(storedScenario);
    }

    setHasHydrated(true);
  }, []);

  const setScenarioKey = useCallback((nextScenario: DemoScenarioKey) => {
    setScenarioKeyState(nextScenario);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextScenario);
    }
  }, []);

  const value = useMemo<DemoScenarioContextValue>(
    () => ({
      scenarioKey,
      scenario: getDemoScenario(scenarioKey),
      setScenarioKey,
      scenarios: demoScenarios,
      hasHydrated,
    }),
    [scenarioKey, setScenarioKey, hasHydrated]
  );

  return (
    <DemoScenarioContext.Provider value={value}>
      {children}
    </DemoScenarioContext.Provider>
  );
}

export function useDemoScenario() {
  const context = useContext(DemoScenarioContext);

  if (!context) {
    throw new Error("useDemoScenario must be used inside DemoScenarioProvider");
  }

  return context;
}