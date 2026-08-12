import { NextResponse } from "next/server";
import {
  PublicShippingGatewayError,
  getPublicShippingTracking,
} from "@/lib/data/server/public-shipping";
import {
  normalizePublicShippingSlug,
  normalizePublicTrackingCode,
} from "@/lib/public-shipping/public-shipping-contract";
import { createPublicRequestFingerprint } from "@/lib/security/public-request-fingerprint";

type RouteContext = {
  params: Promise<{
    slug: string;
    trackingId: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  const params =
    await context.params;
  const slug =
    normalizePublicShippingSlug(
      params.slug,
    );
  const trackingId =
    normalizePublicTrackingCode(
      params.trackingId,
    );

  if (
    !slug
    || !trackingId
  ) {
    return NextResponse.json(
      {
        error:
          "Pedido no encontrado.",
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
    const fingerprint =
      createPublicRequestFingerprint(
        request,
      );
    const tracking =
      await getPublicShippingTracking(
        {
          slug,
          trackingId,
          fingerprint,
        },
      );

    if (!tracking) {
      return NextResponse.json(
        {
          error:
            "Pedido no encontrado.",
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
        tracking,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    const status =
      error
        instanceof PublicShippingGatewayError
        ? error.status
        : 500;
    const responseStatus =
      status === 429
        ? 429
        : status === 404
          ? 404
          : 500;

    console.error(
      "[public-shipping] tracking failed",
      {
        status:
          responseStatus,
      },
    );

    return NextResponse.json(
      {
        error:
          responseStatus === 429
            ? "Hay demasiadas consultas. Intentá nuevamente en unos minutos."
            : "No se pudo consultar el seguimiento.",
      },
      {
        status:
          responseStatus,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
