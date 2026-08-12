import { NextResponse } from "next/server";
import { getPublicShippingOrderingSnapshot } from "@/lib/data/server/public-shipping";
import { normalizePublicShippingSlug } from "@/lib/public-shipping/public-shipping-contract";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const params =
    await context.params;
  const slug =
    normalizePublicShippingSlug(
      params.slug,
    );

  if (!slug) {
    return NextResponse.json(
      {
        error:
          "El negocio público no es válido.",
      },
      {
        status: 404,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  try {
    const snapshot =
      await getPublicShippingOrderingSnapshot(
        slug,
      );

    if (!snapshot) {
      return NextResponse.json(
        {
          error:
            "El negocio público no está disponible.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      {
        snapshot,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=15, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    console.error(
      "[public-shipping] ordering failed",
      error instanceof Error
        ? error.message
        : "unknown",
    );

    return NextResponse.json(
      {
        error:
          "No se pudo cargar el menú público.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
