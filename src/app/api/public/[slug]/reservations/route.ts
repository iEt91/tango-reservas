import { NextResponse } from "next/server";
import {
  PublicReservationGatewayError,
  createPublicReservation,
} from "@/lib/data/server/public-reservations";
import { normalizePublicShippingSlug } from "@/lib/public-shipping/public-shipping-contract";
import { createPublicRequestFingerprint } from "@/lib/security/public-request-fingerprint";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function textField(value: unknown, maximumLength: number) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

export async function POST(request: Request, context: RouteContext) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (Number.isFinite(contentLength) && contentLength > 16384) {
    return NextResponse.json(
      { error: "La reserva es demasiado grande." },
      { status: 413 },
    );
  }

  const slug = normalizePublicShippingSlug((await context.params).slug);

  if (!slug) {
    return NextResponse.json(
      { error: "El negocio público no es válido." },
      { status: 404 },
    );
  }

  let body: unknown;

  try {
    const raw = await request.text();
    if (raw.length > 16384) {
      return NextResponse.json(
        { error: "La reserva es demasiado grande." },
        { status: 413 },
      );
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "La reserva no tiene un formato válido." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "La reserva no tiene un formato válido." },
      { status: 400 },
    );
  }

  const source = body as Record<string, unknown>;
  const people = Number(source.people);

  if (!Number.isInteger(people) || people < 1 || people > 200) {
    return NextResponse.json(
      { error: "La cantidad de personas no es válida." },
      { status: 400 },
    );
  }

  try {
    const reservation = await createPublicReservation({
      slug,
      client: textField(source.client, 160),
      phone: textField(source.phone, 80),
      email: textField(source.email, 320),
      date: textField(source.date, 10),
      time: textField(source.time, 8),
      people,
      note: textField(source.note, 4000),
      requestKey: textField(source.requestKey, 120),
      fingerprint: createPublicRequestFingerprint(request),
    });

    return NextResponse.json(
      { reservation },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof PublicReservationGatewayError
      ? error.status
      : 500;
    const message = error instanceof PublicReservationGatewayError
      ? error.message
      : "No se pudo registrar la reserva.";

    console.error("[public-reservations] create failed", {
      status,
      message: status >= 500 ? message : "public-error",
    });

    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
