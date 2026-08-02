import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getSupabasePublicConfig } from "./auth-config";

function copyResponseCookies(
  source: NextResponse,
  target: NextResponse,
): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  return target;
}

export async function updateSupabaseAuthSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });
  const config = getSupabasePublicConfig();
  const isProtectedPilot = request.nextUrl.pathname.startsWith(
    "/local/seguridad",
  );

  if (!config) {
    if (!isProtectedPilot) {
      return supabaseResponse;
    }

    const loginUrl = new URL(buildLoginPath(request.nextUrl.pathname), request.url);
    loginUrl.searchParams.set("error", "config");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  if (isProtectedPilot && (claimsError || !claimsData?.claims)) {
    const loginUrl = new URL(buildLoginPath(request.nextUrl.pathname), request.url);
    return copyResponseCookies(
      supabaseResponse,
      NextResponse.redirect(loginUrl),
    );
  }

  return supabaseResponse;
}
