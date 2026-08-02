import nextVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...typescript,
  {
    rules: {
      // Estas pantallas se hidratan deliberadamente desde localStorage y otras
      // fuentes del navegador una vez montadas. Mantener esta excepción evita
      // reescrituras que alterarían el flujo local actual.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
