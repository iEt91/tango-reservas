import { assertServerOnly } from "@/lib/security/server-only";
import { createPublicRequestHmac } from "@/lib/supabase/server";

assertServerOnly(
  "El fingerprint público anti-abuso",
);

function compactHeader(
  value: string | null,
  maximumLength: number,
) {
  return (
    value
      ?.trim()
      .replace(/\s+/gu, " ")
      .slice(0, maximumLength)
    ?? ""
  );
}

export function createPublicRequestFingerprint(
  request: Request,
) {
  assertServerOnly(
    "El fingerprint público anti-abuso",
  );

  const forwardedFor =
    compactHeader(
      request.headers.get(
        "x-forwarded-for",
      ),
      512,
    );
  const realIp =
    compactHeader(
      request.headers.get(
        "x-real-ip",
      ),
      128,
    );
  const userAgent =
    compactHeader(
      request.headers.get(
        "user-agent",
      ),
      512,
    );

  return createPublicRequestHmac(
    [
      forwardedFor,
      realIp,
      userAgent,
    ].join("\n"),
  );
}
