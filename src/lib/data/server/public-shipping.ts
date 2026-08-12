import { assertServerOnly } from "@/lib/security/server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  mapPublicShippingCreateResult,
  mapPublicShippingOrderingSnapshot,
  mapPublicShippingTrackingSnapshot,
  type PublicShippingPaymentMethod,
} from "@/lib/public-shipping/public-shipping-contract";

assertServerOnly(
  "El gateway público de Shipping",
);

type SupabaseRpcError = {
  code?: string | null;
  message?: string | null;
};

export class PublicShippingGatewayError
  extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.name =
      "PublicShippingGatewayError";
    this.status = status;
  }
}

function getServerClient() {
  const supabase =
    getSupabaseServerClient();

  if (!supabase) {
    throw new PublicShippingGatewayError(
      "El servicio de pedidos no está disponible.",
      503,
    );
  }

  return supabase;
}

function publicGatewayError(
  error: SupabaseRpcError | null,
  fallback: string,
) {
  const message =
    error?.message
      ?.trim()
    ?? "";

  if (
    error?.code === "P0001"
    && /rate limit/iu.test(
      message,
    )
  ) {
    return new PublicShippingGatewayError(
      "Hay demasiadas solicitudes. Intentá nuevamente en unos minutos.",
      429,
    );
  }

  if (
    error?.code === "P0002"
    || /not available/iu.test(
      message,
    )
  ) {
    return new PublicShippingGatewayError(
      "El pedido público no está disponible.",
      404,
    );
  }

  if (
    error?.code === "22023"
    || error?.code === "22P02"
    || error?.code === "23505"
  ) {
    return new PublicShippingGatewayError(
      "Los datos del pedido no son válidos o ya cambiaron.",
      400,
    );
  }

  return new PublicShippingGatewayError(
    fallback,
    500,
  );
}

export async function getPublicShippingOrderingSnapshot(
  slug: string,
) {
  assertServerOnly(
    "getPublicShippingOrderingSnapshot",
  );

  const supabase =
    getServerClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "service_get_public_business_ordering_snapshot",
    {
      p_slug: slug,
    },
  );

  if (error) {
    throw publicGatewayError(
      error,
      "No se pudo cargar el menú público.",
    );
  }

  if (!data) {
    return null;
  }

  return mapPublicShippingOrderingSnapshot(
    data,
  );
}

export async function createPublicShippingOrder(
  input: {
    slug: string;
    client: string;
    phone: string;
    deliveryType:
      | "delivery"
      | "pickup";
    address: string;
    note: string;
    payment:
      PublicShippingPaymentMethod;
    items: Array<{
      menuItemId: string;
      quantity: number;
    }>;
    requestKey: string;
    fingerprint: string;
  },
) {
  assertServerOnly(
    "createPublicShippingOrder",
  );

  const supabase =
    getServerClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "service_create_public_shipping_order",
    {
      p_slug:
        input.slug,
      p_client_name:
        input.client,
      p_client_phone:
        input.phone,
      p_order_kind:
        input.deliveryType,
      p_address:
        input.address,
      p_note:
        input.note,
      p_preferred_payment_method:
        input.payment,
      p_items:
        input.items,
      p_request_key:
        input.requestKey,
      p_fingerprint:
        input.fingerprint,
    },
  );

  if (error || !data) {
    throw publicGatewayError(
      error,
      "No se pudo crear el pedido.",
    );
  }

  return mapPublicShippingCreateResult(
    data,
  );
}

export async function getPublicShippingTracking(
  input: {
    slug: string;
    trackingId: string;
    fingerprint: string;
  },
) {
  assertServerOnly(
    "getPublicShippingTracking",
  );

  const supabase =
    getServerClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "service_get_public_shipping_tracking",
    {
      p_slug:
        input.slug,
      p_tracking_code:
        input.trackingId,
      p_fingerprint:
        input.fingerprint,
    },
  );

  if (error) {
    throw publicGatewayError(
      error,
      "No se pudo consultar el seguimiento.",
    );
  }

  if (!data) {
    return null;
  }

  return mapPublicShippingTrackingSnapshot(
    data,
  );
}
