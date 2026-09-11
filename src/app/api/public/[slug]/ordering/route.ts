import { NextResponse } from "next/server";
import {
  PublicShippingGatewayError,
  getPublicShippingOrderingSnapshot,
} from "@/lib/data/server/public-shipping";
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
    const status = error instanceof PublicShippingGatewayError
      ? error.status
      : 500;

    console.error(
      "[public-shipping] ordering failed",
      { status },
    );

    return NextResponse.json(
      {
        error: status === 503
          ? "El menú público no está disponible."
          : "No se pudo cargar el menú público.",
      },
      {
        status: status === 503 ? 503 : 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
