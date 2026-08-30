import { assertServerOnly } from "@/lib/security/server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

assertServerOnly("El gateway público de reservas");

type SupabaseRpcError = {
  code?: string | null;
  message?: string | null;
};

export type PublicReservationCreateResult = {
  reservationCode: string;
  status: "pending" | "confirmed";
  date: string;
  time: string;
  people: number;
};

export class PublicReservationGatewayError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PublicReservationGatewayError";
    this.status = status;
  }
}

function getServerClient() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new PublicReservationGatewayError(
      "El servicio de reservas no está disponible.",
      503,
    );
  }

  return supabase;
}

function publicGatewayError(error: SupabaseRpcError | null) {
  const message = error?.message?.trim() ?? "";

  if (error?.code === "P0001" && /rate limit/iu.test(message)) {
    return new PublicReservationGatewayError(
      "Hay demasiadas solicitudes. Intentá nuevamente en unos minutos.",
      429,
    );
  }

  if (error?.code === "P0002" || /not available/iu.test(message)) {
    return new PublicReservationGatewayError(
      "Las reservas online no están disponibles para este local.",
      404,
    );
  }

  if (error?.code === "P0001") {
    return new PublicReservationGatewayError(
      "Ese horario ya no está disponible. Elegí otro, por favor.",
      409,
    );
  }

  if (
    error?.code === "22023"
    || error?.code === "22P02"
    || error?.code === "23505"
  ) {
    return new PublicReservationGatewayError(
      "Los datos de la reserva no son válidos.",
      400,
    );
  }

  return new PublicReservationGatewayError(
    "No se pudo registrar la reserva.",
    500,
  );
}

function mapResult(value: unknown): PublicReservationCreateResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PublicReservationGatewayError(
      "No se pudo registrar la reserva.",
      500,
    );
  }

  const result = value as Record<string, unknown>;
  const reservationCode = typeof result.reservationCode === "string"
    ? result.reservationCode.trim()
    : "";
  const status = result.status;
  const date = typeof result.date === "string" ? result.date.trim() : "";
  const time = typeof result.time === "string" ? result.time.trim() : "";
  const people = Number(result.people);

  if (
    !/^RES-[A-Z0-9]{12}$/u.test(reservationCode)
    || (status !== "pending" && status !== "confirmed")
    || !/^\d{4}-\d{2}-\d{2}$/u.test(date)
    || !/^\d{2}:\d{2}/u.test(time)
    || !Number.isInteger(people)
    || people < 1
  ) {
    throw new PublicReservationGatewayError(
      "No se pudo registrar la reserva.",
      500,
    );
  }

  return {
    reservationCode,
    status,
    date,
    time: time.slice(0, 5),
    people,
  };
}

export async function createPublicReservation(input: {
  slug: string;
  client: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  people: number;
  note: string;
  requestKey: string;
  fingerprint: string;
}) {
  assertServerOnly("createPublicReservation");

  const { data, error } = await getServerClient().rpc(
    "service_create_public_reservation",
    {
      p_slug: input.slug,
      p_client_name: input.client,
      p_client_phone: input.phone,
      p_client_email: input.email,
      p_reservation_date: input.date,
      p_reservation_time: input.time,
      p_party_size: input.people,
      p_note: input.note,
      p_request_key: input.requestKey,
      p_fingerprint: input.fingerprint,
    },
  );

  if (error || !data) {
    throw publicGatewayError(error);
  }

  return mapResult(data);
}
