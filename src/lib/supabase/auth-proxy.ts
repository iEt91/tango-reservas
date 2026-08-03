import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getSupabasePublicConfig } from "./auth-config";

function applyPrivateResponseHeaders(
  response: NextResponse,
): NextResponse {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive",
  );

  return response;
}

function copyResponseCookies(
  source: NextResponse,
  target: NextResponse,
): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  return applyPrivateResponseHeaders(target);
}

export async function updateSupabaseAuthSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = applyPrivateResponseHeaders(
    NextResponse.next({ request }),
  );
  const config = getSupabasePublicConfig();
  const pathname = request.nextUrl.pathname;
  const isProtectedLocal =
    pathname === "/local" || pathname.startsWith("/local/");
  const requestedPath = `${pathname}${request.nextUrl.search}`;

  if (!config) {
    if (!isProtectedLocal) {
      return supabaseResponse;
    }

    const loginUrl = new URL(
      buildLoginPath(requestedPath),
      request.url,
    );
    loginUrl.searchParams.set("error", "config");

    return applyPrivateResponseHeaders(
      NextResponse.redirect(loginUrl),
    );
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

        supabaseResponse = applyPrivateResponseHeaders(
          NextResponse.next({ request }),
        );

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

  if (isProtectedLocal && (claimsError || !claimsData?.claims)) {
    const loginUrl = new URL(
      buildLoginPath(requestedPath),
      request.url,
    );

    return copyResponseCookies(
      supabaseResponse,
      NextResponse.redirect(loginUrl),
    );
  }

  return applyPrivateResponseHeaders(supabaseResponse);
}
