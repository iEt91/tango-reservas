"use client";

import { useDemoScenario } from "@/lib/demo/demo-context";
import type { DemoScenarioKey } from "@/lib/demo/demo-scenarios";
import styles from "./DemoScenarioSwitcher.module.css";

const scenarioOrder: DemoScenarioKey[] = ["low", "medium", "high"];

export function DemoScenarioSwitcher() {
  const { scenarioKey, scenarios, setScenarioKey, hasHydrated } =
    useDemoScenario();

  if (!hasHydrated) {
    return <div className={styles.wrapper} aria-hidden="true" />;
  }

  return (
    <div className={styles.wrapper} aria-label="Escenario demo de ocupación">
      {scenarioOrder.map((key) => {
        const scenario = scenarios[key];

        return (
          <button
            key={key}
            type="button"
            className={`${styles.button} ${styles[scenario.tone]} ${
              scenarioKey === key ? styles.active : ""
            }`}
            onClick={() => setScenarioKey(key)}
            title={scenario.description}
            aria-pressed={scenarioKey === key}
          >
            <span className={styles.dot} />
            <span>{scenario.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}