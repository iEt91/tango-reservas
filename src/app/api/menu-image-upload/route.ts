import {
  mkdir,
  readdir,
  unlink,
  writeFile,
} from "fs/promises";
import path from "path";

const MENU_IMAGES_DIR =
  path.join(
    process.cwd(),
    "src",
    "app",
    "local",
    "menu",
    "img",
  );
const SUPPORTED_EXTENSIONS =
  [
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
  ];
const MAX_UPLOAD_DATA_URL_LENGTH =
  160_000;
const MAX_UPLOAD_BYTES =
  120_000;

function normalizeImageLookupValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/iu, "")
    .replace(/[_-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function sanitizeLocalImageBaseName(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 100);
}

async function listMenuImages() {
  try {
    const entries =
      await readdir(
        MENU_IMAGES_DIR,
        {
          withFileTypes: true,
        },
      );

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) =>
        SUPPORTED_EXTENSIONS.includes(
          path.extname(fileName).toLowerCase(),
        ),
      );
  } catch {
    return [];
  }
}

async function removeExistingProductImages(productName: string) {
  const lookup = normalizeImageLookupValue(productName);
  const files = await listMenuImages();

  await Promise.all(
    files
      .filter((fileName) =>
        normalizeImageLookupValue(
          fileName.replace(/\.[a-z0-9]+$/iu, ""),
        ) === lookup,
      )
      .map(async (fileName) => {
        try {
          await unlink(path.join(MENU_IMAGES_DIR, fileName));
        } catch {
          // Si desapareció entre listado y escritura, la carga puede continuar.
        }
      }),
  );
}

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV !== "development"
    || process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase"
  ) {
    return Response.json(
      {
        error:
          "La carga local de imágenes sólo está disponible en la demo de desarrollo.",
      },
      { status: 403 },
    );
  }

  let payload: {
    productName?: string;
    dataUrl?: string;
  };

  try {
    payload = await request.json() as typeof payload;
  } catch {
    return Response.json(
      { error: "Payload de imagen inválido." },
      { status: 400 },
    );
  }

  const productName = payload.productName?.trim() ?? "";
  const safeBaseName = sanitizeLocalImageBaseName(productName);
  const dataUrl = payload.dataUrl ?? "";

  if (!safeBaseName) {
    return Response.json(
      { error: "Nombre de producto inválido para la imagen." },
      { status: 400 },
    );
  }

  if (
    dataUrl.length > MAX_UPLOAD_DATA_URL_LENGTH
    || !dataUrl.startsWith("data:image/webp;base64,")
  ) {
    return Response.json(
      {
        error:
          "La imagen procesada no es WEBP o supera el tamaño permitido.",
      },
      { status: 413 },
    );
  }

  const encoded = dataUrl.slice("data:image/webp;base64,".length);
  const image = Buffer.from(encoded, "base64");

  if (image.length === 0 || image.length > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: "La imagen supera el límite local permitido." },
      { status: 413 },
    );
  }

  await mkdir(MENU_IMAGES_DIR, { recursive: true });
  await removeExistingProductImages(productName);

  await writeFile(
    path.join(MENU_IMAGES_DIR, `${safeBaseName}.webp`),
    image,
  );

  return Response.json({
    imageUrl:
      `/api/menu-images/${encodeURIComponent(productName)}?v=${Date.now()}`,
  });
}
