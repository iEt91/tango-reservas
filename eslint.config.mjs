import nextVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [...nextVitals, ...typescript];

export default config;
