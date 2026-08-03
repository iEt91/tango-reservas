import type { NextRequest } from "next/server";
import { updateSupabaseAuthSession } from "@/lib/supabase/auth-proxy";

export async function proxy(request: NextRequest) {
  return updateSupabaseAuthSession(request);
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/local/:path*",
  ],
};
