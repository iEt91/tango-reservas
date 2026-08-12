import { NextResponse } from "next/server";
import {
  PublicShippingGatewayError,
  createPublicShippingOrder,
} from "@/lib/data/server/public-shipping";
import {
  normalizePublicShippingPaymentMethod,
  normalizePublicShippingSlug,
} from "@/lib/public-shipping/public-shipping-contract";
import { createPublicRequestFingerprint } from "@/lib/security/public-request-fingerprint";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function textField(
  value: unknown,
  maximumLength: number,
) {
  return typeof value === "string"
    ? value
        .trim()
        .slice(
          0,
          maximumLength,
        )
    : "";
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const contentLength =
    Number(
      request.headers.get(
        "content-length",
      )
      ?? 0,
    );

  if (
    Number.isFinite(contentLength)
    && contentLength > 65536
  ) {
    return NextResponse.json(
      {
        error:
          "El pedido es demasiado grande.",
      },
      {
        status: 413,
      },
    );
  }

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
      },
    );
  }

  let body: unknown;

  try {
    const raw =
      await request.text();

    if (raw.length > 65536) {
      return NextResponse.json(
        {
          error:
            "El pedido es demasiado grande.",
        },
        {
          status: 413,
        },
      );
    }

    body =
      JSON.parse(raw);
  } catch {
    return NextResponse.json(
      {
        error:
          "El pedido no tiene un formato válido.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !body
    || typeof body !== "object"
    || Array.isArray(body)
  ) {
    return NextResponse.json(
      {
        error:
          "El pedido no tiene un formato válido.",
      },
      {
        status: 400,
      },
    );
  }

  const source =
    body as Record<
      string,
      unknown
    >;
  const deliveryType =
    source.deliveryType === "pickup"
      ? "pickup"
      : source.deliveryType === "delivery"
        ? "delivery"
        : null;
  const items =
    Array.isArray(source.items)
      ? source.items
          .slice(0, 100)
          .map(
            (value) => {
              if (
                !value
                || typeof value !== "object"
                || Array.isArray(value)
              ) {
                return null;
              }

              const item =
                value as Record<
                  string,
                  unknown
                >;

              return {
                menuItemId:
                  textField(
                    item.menuItemId,
                    36,
                  ),
                quantity:
                  Number(
                    item.quantity,
                  ),
              };
            },
          )
          .filter(
            (
              value,
            ): value is {
              menuItemId: string;
              quantity: number;
            } =>
              Boolean(value),
          )
      : [];

  if (
    !deliveryType
    || items.length < 1
    || items.length > 100
  ) {
    return NextResponse.json(
      {
        error:
          "Elegí productos y un tipo de entrega válidos.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const fingerprint =
      createPublicRequestFingerprint(
        request,
      );
    const result =
      await createPublicShippingOrder(
        {
          slug,
          client:
            textField(
              source.client,
              160,
            ),
          phone:
            textField(
              source.phone,
              80,
            ),
          deliveryType,
          address:
            textField(
              source.address,
              500,
            ),
          note:
            textField(
              source.note,
              4000,
            ),
          payment:
            normalizePublicShippingPaymentMethod(
              source.payment,
            ),
          items,
          requestKey:
            textField(
              source.requestKey,
              120,
            ),
          fingerprint,
        },
      );

    return NextResponse.json(
      {
        order:
          result,
      },
      {
        status: 201,
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
    const message =
      error
        instanceof PublicShippingGatewayError
        ? error.message
        : "No se pudo crear el pedido.";

    console.error(
      "[public-shipping] create failed",
      {
        status,
        message:
          status >= 500
            ? message
            : "public-error",
      },
    );

    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
