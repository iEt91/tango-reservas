import { V2WebPage } from "./v2-web-page";
import { redirect } from "next/navigation";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { buildLoginPath } from "@/lib/auth/redirects";
import { getDataSource } from "@/lib/data/dataSource";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

type PublicWebBusinessRow = {
  name: string;
  slug: string;
  status: string;
  hero_eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  cta_label: string;
  secondary_cta_label: string;
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram_url: string;
  show_menu: boolean;
  show_reservation: boolean;
  show_whatsapp_button: boolean;
  show_gallery: boolean;
  show_location: boolean;
  show_delivery: boolean;
};

export default async function WebPage() {
  if (getDataSource() !== "supabase") {
    return <V2WebPage />;
  }

  const activeBusiness = await resolveActiveBusiness();
  if (activeBusiness.status === "unauthenticated") {
    redirect(buildLoginPath("/local/web"));
  }

  if (activeBusiness.status === "selection_required") {
    redirect("/auth/select-business?next=%2Flocal%2Fweb");
  }

  if (activeBusiness.status === "membership_missing") {
    redirect("/auth/access-denied");
  }

  if (activeBusiness.status !== "ready") {
    throw new Error("No se pudo resolver el negocio activo para Web.");
  }

  if (activeBusiness.membership.role !== "owner") {
    redirect("/auth/access-denied?reason=permission");
  }

  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) {
    throw new Error("No se pudo crear el cliente autenticado para Web.");
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("name, slug, status, hero_eyebrow, hero_title, hero_subtitle, cta_label, secondary_cta_label, description, address, phone, whatsapp, instagram_url, show_menu, show_reservation, show_whatsapp_button, show_gallery, show_location, show_delivery")
    .eq("id", activeBusiness.membership.businessId)
    .single();

  if (error || !data) {
    throw new Error("No se pudieron leer los datos p\u00fablicos del negocio.");
  }

  const business = data as PublicWebBusinessRow;

  return (
    <V2WebPage
      persistence="supabase"
      initialConfig={{
        businessName: business.name,
        publicUrl: `${business.slug}.tangoreservas.com`,
        status: business.status === "active" ? "published" : "draft",
        heroEyebrow: business.hero_eyebrow,
        heroTitle: business.hero_title,
        heroSubtitle: business.hero_subtitle,
        primaryButtonLabel: business.cta_label,
        secondaryButtonLabel: business.secondary_cta_label,
        description: business.description,
        address: business.address,
        phone: business.phone,
        whatsapp: business.whatsapp,
        instagram: business.instagram_url,
        showMenu: business.show_menu,
        showReservations: business.show_reservation,
        showWhatsApp: business.show_whatsapp_button,
        showGallery: business.show_gallery,
        showMap: business.show_location,
        showDelivery: business.show_delivery,
      }}
    />
  );
}
