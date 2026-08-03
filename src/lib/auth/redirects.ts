const DEFAULT_PROTECTED_PATH = "/local";
const INTERNAL_ORIGIN = "https://tango.internal";

export function sanitizeNextPath(
  value: string | null | undefined,
  fallback = DEFAULT_PROTECTED_PATH,
): string {
  if (
    !value
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);

    if (parsed.origin !== INTERNAL_ORIGIN) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function buildLoginPath(nextPath?: string): string {
  const safeNextPath = sanitizeNextPath(nextPath);
  return `/auth/login?next=${encodeURIComponent(safeNextPath)}`;
}
