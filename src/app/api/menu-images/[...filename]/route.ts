import { readFile, readdir } from "fs/promises";
import path from "path";

const SUPPORTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const MENU_IMAGES_DIR = path.join(process.cwd(), "src", "app", "local", "menu", "img");

function normalizeImageLookupValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUnsafeFileName(value: string) {
  const normalizedValue = value.toLowerCase();

  return (
    !value.trim() ||
    value.includes("..") ||
    value.includes("/") ||
    value.includes("\\") ||
    normalizedValue.includes("%2f") ||
    normalizedValue.includes("%5c")
  );
}

async function listMenuImageFiles() {
  try {
    const entries = await readdir(MENU_IMAGES_DIR, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => SUPPORTED_EXTENSIONS.includes(path.extname(fileName).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "es"));
  } catch {
    return [];
  }
}

function getImageNameWithoutExtension(fileName: string) {
  return fileName.replace(/\.[a-z0-9]+$/i, "");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string[] }> }
) {
  const params = await context.params;
  const rawFileName = decodeURIComponent(params.filename.join("/")).trim();

  if (rawFileName === "_list") {
    const files = await listMenuImageFiles();

    return Response.json({
      files: files.map((fileName) => ({
        fileName,
        name: getImageNameWithoutExtension(fileName),
        imageUrl: `/api/menu-images/${encodeURIComponent(getImageNameWithoutExtension(fileName))}`,
      })),
    });
  }

  if (isUnsafeFileName(rawFileName)) {
    return new Response("Nombre de imagen inválido", { status: 400 });
  }

  const files = await listMenuImageFiles();
  const requestedLookup = normalizeImageLookupValue(rawFileName);

  const exactMatch = files.find((fileName) => {
    const extension = path.extname(fileName).toLowerCase();
    const baseName = getImageNameWithoutExtension(fileName);

    return (
      SUPPORTED_EXTENSIONS.includes(extension) &&
      normalizeImageLookupValue(baseName) === requestedLookup
    );
  });

  if (!exactMatch) {
    return new Response("Imagen no encontrada", { status: 404 });
  }

  const extension = path.extname(exactMatch).toLowerCase();
  const filePath = path.join(MENU_IMAGES_DIR, exactMatch);

  try {
    const file = await readFile(filePath);

    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Imagen no encontrada", { status: 404 });
  }
}
