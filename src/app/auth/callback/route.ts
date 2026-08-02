import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeNextPath(
    requestUrl.searchParams.get("next"),
  );
  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", "config");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", "callback");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", "callback");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
