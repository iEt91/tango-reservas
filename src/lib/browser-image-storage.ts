export type LocalStorageWriteResult =
  | { ok: true }
  | { ok: false; reason: "quota" | "unavailable" };

export function writeLocalStorageSafely(
  key: string,
  value: string
): LocalStorageWriteResult {
  if (typeof window === "undefined") return { ok: false, reason: "unavailable" };

  try {
    window.localStorage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.error(`[storage] No se pudo guardar ${key}: almacenamiento lleno.`, error);
      return { ok: false, reason: "quota" };
    }

    console.error(`[storage] No se pudo guardar ${key}.`, error);
    return { ok: false, reason: "unavailable" };
  }
}

type CompressBrowserImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
};

export async function compressBrowserImage(
  file: File,
  options: CompressBrowserImageOptions = {}
) {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new window.Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("No se pudo leer la imagen."));
      nextImage.src = sourceUrl;
    });

    const maxWidth = options.maxWidth ?? 1400;
    const maxHeight = options.maxHeight ?? 1000;
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) throw new Error("No se pudo procesar la imagen.");

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL(
      options.mimeType ?? "image/webp",
      options.quality ?? 0.76
    );
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
