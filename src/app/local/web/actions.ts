"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveBusiness } from "@/lib/auth/active-business";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type PublicWebSettingsInput = {
  businessName?: unknown;
  status?: unknown;
  heroEyebrow?: unknown;
  heroTitle?: unknown;
  heroSubtitle?: unknown;
  primaryButtonLabel?: unknown;
  secondaryButtonLabel?: unknown;
  description?: unknown;
  address?: unknown;
  phone?: unknown;
  whatsapp?: unknown;
  instagram?: unknown;
  showMenu?: unknown;
  showReservations?: unknown;
  showWhatsApp?: unknown;
  showGallery?: unknown;
  showMap?: unknown;
  showDelivery?: unknown;
};

export type SaveBusinessPublicWebSettingsResult =
  | { ok: true }
  | { ok: false; error: string };

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function boolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export async function saveBusinessPublicWebSettingsAction(
  input: unknown,
): Promise<SaveBusinessPublicWebSettingsResult> {
  try {
    if (!input || typeof input !== "object") {
      return { ok: false, error: "Los datos de la web no son v\u00e1lidos." };
    }

    const activeBusiness = await resolveActiveBusiness();
    if (activeBusiness.status !== "ready") {
      return { ok: false, error: "La sesi\u00f3n o el negocio activo ya no son v\u00e1lidos." };
    }

    if (activeBusiness.membership.role !== "owner") {
      return { ok: false, error: "Solo el due\u00f1o puede cambiar la web p\u00fablica." };
    }

    const value = input as PublicWebSettingsInput;
    const businessName = text(value.businessName, 120);
    if (!businessName) {
      return { ok: false, error: "El nombre p\u00fablico es obligatorio." };
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "No se pudo acceder al servicio seguro de Supabase." };
    }

    const { error } = await supabase
      .from("businesses")
      .update({
        name: businessName,
        description: text(value.description, 2_000),
        address: text(value.address, 240),
        phone: text(value.phone, 60),
        whatsapp: text(value.whatsapp, 60),
        instagram_url: text(value.instagram, 240),
        hero_eyebrow: text(value.heroEyebrow, 120),
        hero_title: text(value.heroTitle, 180),
        hero_subtitle: text(value.heroSubtitle, 1_000),
        cta_label: text(value.primaryButtonLabel, 80),
        secondary_cta_label: text(value.secondaryButtonLabel, 80),
        show_menu: boolean(value.showMenu, true),
        show_reservation: boolean(value.showReservations, true),
        show_whatsapp_button: boolean(value.showWhatsApp, true),
        show_gallery: boolean(value.showGallery, true),
        show_location: boolean(value.showMap, true),
        show_delivery: boolean(value.showDelivery, true),
        status: value.status === "published" ? "active" : "draft",
      })
      .eq("id", activeBusiness.membership.businessId);

    if (error) {
      console.error("[public-web] save failed", { code: error.code ?? null });
      return { ok: false, error: "No se pudieron guardar los cambios de la web en Supabase." };
    }

    revalidatePath("/local/web");
    revalidatePath(`/${activeBusiness.membership.business.slug}`);

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudieron guardar los cambios de la web.",
    };
  }
}
