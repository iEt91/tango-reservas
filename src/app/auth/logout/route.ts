import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/auth/active-business-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseAuthServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  const response = NextResponse.redirect(
    new URL("/auth/login", request.url),
    { status: 303 },
  );
  response.cookies.delete(ACTIVE_BUSINESS_COOKIE);
  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}
