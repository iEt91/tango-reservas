import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const paths = {
  migration: "supabase/migrations/20260830135322_public_reservation_booking.sql",
  rollback: "supabase/rollbacks/20260830135322_public_reservation_booking.down.sql",
  manifest: "supabase/MIGRATIONS.sha256",
  gateway: "src/lib/data/server/public-reservations.ts",
  route: "src/app/api/public/[slug]/reservations/route.ts",
  page: "src/app/[slug]/page.tsx",
  package: "package.json",
};

const sources = Object.fromEntries(
  await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, "utf8")]),
  ),
);

const checks = [];

function check(label, condition) {
  assert.ok(condition, label);
  checks.push(label);
  console.log(`✓ ${label}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

console.log("Ejecutando reservas públicas persistentes E39...");

check(
  "la reserva pública limita por fingerprint",
  /reservation_create/u.test(sources.migration)
    && /service_consume_business_public_request_limit/u.test(sources.migration)
    && /600,\s*5/u.test(sources.migration)
    && /rate limit exceeded/u.test(sources.migration),
);

check(
  "la RPC pública es service-only y SECURITY INVOKER",
  /service_create_public_reservation[\s\S]*?security invoker/u.test(sources.migration)
    && /revoke all on function public\.service_create_public_reservation/u.test(sources.migration)
    && /from public, anon, authenticated/u.test(sources.migration)
    && /to service_role/u.test(sources.migration),
);

check(
  "la reserva valida negocio reglas horario capacidad y solapamientos",
  /business\.status = 'active'/u.test(sources.migration)
    && /reservations_enabled/u.test(sources.migration)
    && /min_notice_minutes/u.test(sources.migration)
    && /max_days_ahead/u.test(sources.migration)
    && /Reservation is outside business hours/u.test(sources.migration)
    && /max_reservations_per_slot/u.test(sources.migration)
    && /max_people_per_slot/u.test(sources.migration)
    && /overlapping active reservation/u.test(sources.migration),
);

check(
  "la reserva usa idempotencia y sólo devuelve comprobante mínimo",
  /reservation-idempotency/u.test(sources.migration)
    && /idempotency_key = request_key_value/u.test(sources.migration)
    && /'reservationCode'/u.test(sources.migration)
    && !/jsonb_build_object\([\s\S]*?'customer_phone'/u.test(sources.migration),
);

check(
  "el gateway es server-only y traduce errores públicos",
  /assertServerOnly/u.test(sources.gateway)
    && /getSupabaseServerClient/u.test(sources.gateway)
    && /service_create_public_reservation/u.test(sources.gateway)
    && /429/u.test(sources.gateway)
    && /409/u.test(sources.gateway)
    && /400/u.test(sources.gateway),
);

check(
  "la ruta valida tamaño y usa fingerprint server-side",
  /16384/u.test(sources.route)
    && /createPublicRequestFingerprint/u.test(sources.route)
    && /createPublicReservation/u.test(sources.route)
    && !/SUPABASE_SERVICE_ROLE_KEY/u.test(sources.route),
);

check(
  "la web Supabase usa Route Handler e idempotencia sin perder demo local",
  /isSupabasePersistence/u.test(sources.page)
    && /reservationRequestKeyRef/u.test(sources.page)
    && /\/api\/public\/\$\{encodeURIComponent\(publicSlug\)\}\/reservations/u.test(sources.page)
    && /window\.localStorage\.setItem\(RESERVATIONS_STORAGE_KEY/u.test(sources.page),
);

check(
  "el rollback elimina la RPC y limpia sólo el bucket técnico nuevo",
  /drop function if exists public\.service_create_public_reservation/u.test(sources.rollback)
    && /where action = 'reservation_create'/u.test(sources.rollback)
    && !/drop table public\.reservations/u.test(sources.rollback),
);

check(
  "manifiesto protege migración y rollback",
  sources.manifest.includes("supabase/migrations/20260830135322_public_reservation_booking.sql")
    && sources.manifest.includes("supabase/rollbacks/20260830135322_public_reservation_booking.down.sql"),
);

check(
  "archivos SQL coinciden con hashes registrados",
  sha256(sources.migration) === "0dee6e102a1e6d9e826ad4c0ed1a999546ae1a3bf2dd720cfe02b9cdd0544d0f"
    && sha256(sources.rollback) === "325a6a24c8c91d475ed37efca1c002ebbac877c40cc6c390ccc10efaefcd2fdd",
);

const pkg = JSON.parse(sources.package);

check(
  "E39 forma parte del QA global",
  pkg.scripts?.["test:public-reservation-booking"]
    === "node scripts/public-reservation-booking-regression-tests.mjs"
    && (pkg.scripts?.["test:regression"] ?? "")
      .split(" && ")
      .filter((command) => command === "npm run test:public-reservation-booking")
      .length === 1,
);

console.log(`Todos los casos E39 pasaron (${checks.length}).`);
