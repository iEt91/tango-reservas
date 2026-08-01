export const RESERVATION_TRACKING_GRACE_MINUTES = 10;
export const CLOSED_DELIVERY_TRACKING_GRACE_MINUTES = 1;

type ReservationTrackingRecord = {
  date: string;
  time: string;
  status: string;
  cancelledAt?: string;
  noShowAt?: string;
};

type DeliveryTrackingRecord = {
  status: string;
  deliveredAt?: string;
  cancelledAt?: string;
};

function parseTimestamp(value?: string) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getReservationTime(reservation: Pick<ReservationTrackingRecord, "date" | "time">) {
  const [year, month, day] = reservation.date.split("-").map(Number);
  const [hour, minute] = reservation.time.split(":").map(Number);
  const timestamp = new Date(
    year,
    (month ?? 1) - 1,
    day ?? 1,
    hour ?? 0,
    minute ?? 0,
    0,
    0,
  ).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function isReservationTrackingExpired(
  reservation: ReservationTrackingRecord,
  now = Date.now(),
) {
  const statusTimestamp =
    reservation.status === "cancelled"
      ? parseTimestamp(reservation.cancelledAt)
      : reservation.status === "no_show"
        ? parseTimestamp(reservation.noShowAt)
        : null;
  const referenceTime = statusTimestamp ?? getReservationTime(reservation);
  if (referenceTime === null) return false;
  return now > referenceTime + RESERVATION_TRACKING_GRACE_MINUTES * 60 * 1000;
}

export function isClosedDeliveryTrackingExpired(
  delivery: DeliveryTrackingRecord,
  now = Date.now(),
) {
  if (delivery.status !== "completed" && delivery.status !== "cancelled") return false;
  const closedAt =
    delivery.status === "completed" ? delivery.deliveredAt : delivery.cancelledAt;
  const closedTime = parseTimestamp(closedAt);
  if (closedTime === null) return false;
  return now > closedTime + CLOSED_DELIVERY_TRACKING_GRACE_MINUTES * 60 * 1000;
}
