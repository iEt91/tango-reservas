import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/auth/active-business-contract";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getStaffModuleForPathname } from "@/lib/staff/staff-contract";
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

function privateRedirect(
  request: NextRequest,
  supabaseResponse: NextResponse,
  path: string,
) {
  return copyResponseCookies(
    supabaseResponse,
    NextResponse.redirect(new URL(path, request.url)),
  );
}

type ProxyMembershipRow = {
  business_id: string;
  role: string;
  status: string;
  staff_role_id: string | null;
};

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
  const userId =
    typeof claimsData?.claims?.sub === "string"
      ? claimsData.claims.sub
      : null;

  if (isProtectedLocal && (claimsError || !userId)) {
    const loginUrl = new URL(
      buildLoginPath(requestedPath),
      request.url,
    );

    return copyResponseCookies(
      supabaseResponse,
      NextResponse.redirect(loginUrl),
    );
  }

  if (!isProtectedLocal || !userId) {
    return applyPrivateResponseHeaders(supabaseResponse);
  }

  const {
    data: accessControl,
    error: accessControlError,
  } = await supabase
    .from("user_access_controls")
    .select("reauth_after")
    .eq("user_id", userId)
    .maybeSingle();

  if (accessControlError) {
    return privateRedirect(
      request,
      supabaseResponse,
      "/auth/access-denied?reason=security",
    );
  }

  const reauthAfter =
    typeof accessControl?.reauth_after === "string"
      ? Date.parse(accessControl.reauth_after)
      : Number.NaN;

  if (Number.isFinite(reauthAfter)) {
    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser();
    const lastSignInAt = userData.user?.last_sign_in_at
      ? Date.parse(userData.user.last_sign_in_at)
      : Number.NaN;

    if (
      userError
      || !Number.isFinite(lastSignInAt)
      || reauthAfter > lastSignInAt
    ) {
      await supabase.auth.signOut({ scope: "global" });
      const loginUrl = new URL(
        buildLoginPath(requestedPath),
        request.url,
      );
      loginUrl.searchParams.set("error", "access_changed");

      return copyResponseCookies(
        supabaseResponse,
        NextResponse.redirect(loginUrl),
      );
    }
  }

  const {
    data: membershipData,
    error: membershipError,
  } = await supabase
    .from("business_members")
    .select("business_id, role, status, staff_role_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipError) {
    return privateRedirect(
      request,
      supabaseResponse,
      "/auth/access-denied?reason=membership",
    );
  }

  const memberships = (
    (membershipData ?? []) as unknown
  ) as ProxyMembershipRow[];

  if (memberships.length === 0) {
    return privateRedirect(
      request,
      supabaseResponse,
      "/auth/access-denied?reason=membership",
    );
  }

  const requestedBusinessId = request.cookies.get(
    ACTIVE_BUSINESS_COOKIE,
  )?.value;
  const membership =
    memberships.find(
      (candidate) => candidate.business_id === requestedBusinessId,
    )
    ?? (memberships.length === 1 ? memberships[0] : null);

  if (!membership) {
    return applyPrivateResponseHeaders(supabaseResponse);
  }

  if (membership.role === "owner") {
    return applyPrivateResponseHeaders(supabaseResponse);
  }

  if (
    pathname === "/local/configuracion"
    || pathname.startsWith("/local/configuracion/")
    || pathname === "/local/seguridad"
    || pathname.startsWith("/local/seguridad/")
  ) {
    return privateRedirect(
      request,
      supabaseResponse,
      "/auth/access-denied?reason=permission",
    );
  }

  if (membership.role === "admin") {
    return applyPrivateResponseHeaders(supabaseResponse);
  }

  if (membership.role !== "staff" || !membership.staff_role_id) {
    return privateRedirect(
      request,
      supabaseResponse,
      "/auth/access-denied?reason=permission",
    );
  }

  const moduleKey = getStaffModuleForPathname(pathname);

  if (!moduleKey) {
    return privateRedirect(
      request,
      supabaseResponse,
      "/auth/access-denied?reason=permission",
    );
  }

  const {
    data: permission,
    error: permissionError,
  } = await supabase
    .from("staff_role_permissions")
    .select("access_level")
    .eq("business_id", membership.business_id)
    .eq("role_id", membership.staff_role_id)
    .eq("module_key", moduleKey)
    .maybeSingle();

  if (
    permissionError
    || !permission
    || permission.access_level === "none"
  ) {
    return privateRedirect(
      request,
      supabaseResponse,
      "/auth/access-denied?reason=permission",
    );
  }

  return applyPrivateResponseHeaders(supabaseResponse);
}
