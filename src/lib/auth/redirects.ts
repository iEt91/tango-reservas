const DEFAULT_PROTECTED_PATH = "/local/seguridad";

export function sanitizeNextPath(
  value: string | null | undefined,
  fallback = DEFAULT_PROTECTED_PATH,
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function buildLoginPath(nextPath?: string): string {
  const safeNextPath = sanitizeNextPath(nextPath);
  return `/auth/login?next=${encodeURIComponent(safeNextPath)}`;
}
