import { rmSync } from "node:fs";
import { resolve } from "node:path";

const targets = [".next", "tsconfig.tsbuildinfo"];

console.log("Preparando un QA limpio...");

for (const target of targets) {
  const absolutePath = resolve(process.cwd(), target);

  try {
    rmSync(absolutePath, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 200,
    });
    console.log(`✓ eliminado ${target}`);
  } catch (error) {
    console.error(`✗ no se pudo eliminar ${target}`);
    console.error(
      "Cerrá cualquier proceso de Next.js o npm run dev que esté usando el proyecto y volvé a ejecutar npm run qa.",
    );
    throw error;
  }
}

console.log("✓ entorno de tipos listo para regenerarse");
