import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePublicShippingSlug } from "@/lib/public-shipping/public-shipping-contract";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const slug = normalizePublicShippingSlug((await context.params).slug);

  if (!slug) {
    return NextResponse.json({ error: "El negocio p\u00fablico no es v\u00e1lido." }, { status: 404 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "La web p\u00fablica no est\u00e1 disponible." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("name, slug, description, address, phone, whatsapp, instagram_url, hero_eyebrow, hero_title, hero_subtitle, cta_label, secondary_cta_label, show_menu, show_reservation, show_whatsapp_button, show_gallery, show_location, show_delivery")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

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
