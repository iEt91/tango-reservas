import nextVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  {
    // Paquetes de referencia/imagen: no forman parte del código ejecutable y
    // recorrer miles de archivos generados puede agotar el proceso de lint.
    ignores: [
      "public/web-templates/**",
      "public/template-concepts/**",
      "restaurant_templates_pixelperfect_pack/**",
    ],
  },
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
