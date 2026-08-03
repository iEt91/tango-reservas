import { NextResponse, type NextRequest } from "next/server";
import {
  ACTIVE_BUSINESS_COOKIE,
  ACTIVE_BUSINESS_COOKIE_MAX_AGE_SECONDS,
  isValidBusinessId,
} from "@/lib/auth/active-business-contract";
import { buildLoginPath, sanitizeNextPath } from "@/lib/auth/redirects";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

function privateRedirect(
  request: NextRequest,
  path: string,
): NextResponse {
  const response = NextResponse.redirect(
    new URL(path, request.url),
    { status: 303 },
  );
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive",
  );
  return response;
}

export async function POST(request: NextRequest) {
  const requestOrigin = new URL(request.url).origin;
  const submittedOrigin = request.headers.get("origin");

  if (submittedOrigin && submittedOrigin !== requestOrigin) {
    return new NextResponse("Origen no permitido.", { status: 403 });
  }

  const formData = await request.formData();
  const businessId = formData.get("businessId");
  const nextPath = sanitizeNextPath(
    typeof formData.get("next") === "string"
      ? String(formData.get("next"))
      : null,
    "/local",
  );

  if (!isValidBusinessId(businessId)) {
    return privateRedirect(
      request,
      "/auth/access-denied?reason=selection",
    );
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return privateRedirect(
      request,
      `${buildLoginPath(nextPath)}&error=config`,
    );
  }

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();
  const userId =
    typeof claimsData?.claims?.sub === "string"
      ? claimsData.claims.sub
      : null;

  if (claimsError || !userId) {
    return privateRedirect(request, buildLoginPath(nextPath));
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership) {
    return privateRedirect(
      request,
      "/auth/access-denied?reason=selection",
    );
  }

  const response = privateRedirect(request, nextPath);
  response.cookies.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_BUSINESS_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
