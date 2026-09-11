import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";
import { normalizePublicShippingSlug } from "@/lib/public-shipping/public-shipping-contract";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const slug = normalizePublicShippingSlug((await context.params).slug);

  if (!slug) {
    return NextResponse.json({ error: "El negocio p\u00fablico no es v\u00e1lido." }, { status: 404 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "La web p\u00fablica no est\u00e1 disponible." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc(
    "public_get_business_site",
    { p_slug: slug },
  );

  if (error) {
    console.error("[public-site] read failed", { code: error.code ?? null });
    return NextResponse.json({ error: "No se pudo cargar la web p\u00fablica." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "El negocio p\u00fablico no est\u00e1 disponible." }, { status: 404 });
  }

  return NextResponse.json(
    { site: data },
    { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" } },
  );
}
