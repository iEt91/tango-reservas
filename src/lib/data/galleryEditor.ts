import type { PublicWebGalleryItem } from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import {
  createPublicWebGalleryItem,
  deletePublicWebGalleryItem,
  togglePublicWebGalleryItemStatus,
  updatePublicWebGalleryItem,
  getPublicWebGalleryByBusinessId,
} from "@/lib/data/webContent";
import {
  createSupabaseGalleryImage,
  deleteSupabaseGalleryImage,
  deleteSupabaseGalleryImagesByBusiness,
  getSupabaseGalleryImagesByBusiness,
  reorderSupabaseGalleryImages,
  setSupabaseGalleryImageActive,
  updateSupabaseGalleryImage,
} from "@/lib/data/supabase/gallery";

type GalleryImageInput = Pick<
  PublicWebGalleryItem,
  "title" | "description" | "altText" | "imageDataUrl" | "imageUrl" | "imagePlaceholder" | "isActive"
>;

export async function getGalleryImagesByBusiness(businessId: string) {
  if (getDataSource() === "supabase") {
    return getSupabaseGalleryImagesByBusiness(businessId);
  }

  return getPublicWebGalleryByBusinessId(businessId);
}

export async function createGalleryImage(businessId: string, data: GalleryImageInput) {
  if (getDataSource() === "supabase") {
    return createSupabaseGalleryImage(businessId, data);
  }

  return createPublicWebGalleryItem(businessId, data);
}

export async function updateGalleryImage(imageId: string, data: Partial<GalleryImageInput>) {
  if (getDataSource() === "supabase") {
    return updateSupabaseGalleryImage(imageId, data);
  }

  return updatePublicWebGalleryItem(imageId, data);
}

export async function deleteGalleryImage(imageId: string) {
  if (getDataSource() === "supabase") {
    return deleteSupabaseGalleryImage(imageId);
  }

  return deletePublicWebGalleryItem(imageId);
}

export async function setGalleryImageActive(imageId: string, isActive: boolean) {
  if (getDataSource() === "supabase") {
    return setSupabaseGalleryImageActive(imageId, isActive);
  }

  return updatePublicWebGalleryItem(imageId, { isActive });
}

export async function reorderGalleryImages(businessId: string, images: PublicWebGalleryItem[]) {
  if (getDataSource() === "supabase") {
    return reorderSupabaseGalleryImages(businessId, images);
  }

  const ordered = images.filter((item) => item.businessId === businessId);

  await Promise.all(
    ordered.map((item, index) => updatePublicWebGalleryItem(item.id, { sortOrder: index })),
  );

  return getPublicWebGalleryByBusinessId(businessId);
}

export async function resetGalleryImagesByBusiness(businessId: string) {
  if (getDataSource() === "supabase") {
    await deleteSupabaseGalleryImagesByBusiness(businessId);
    return [];
  }

  return getPublicWebGalleryByBusinessId(businessId).filter(
    (item) => item.businessId !== businessId,
  );
}
