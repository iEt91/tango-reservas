export function assertServerOnly(context: string): void {
  if (typeof window !== "undefined") {
    throw new Error(`${context} solo puede ejecutarse en el servidor.`);
  }
}
