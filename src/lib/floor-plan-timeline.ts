import type { BusinessHours } from "@/data/types";
import { getBusinessHours } from "@/data/scheduling";

const dayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type FloorPlanTimelineMark = {
  time: string;
  label: string;
};

export type FloorPlanTimelineSlot = {
  time: string;
  minutes: number;
};

export type FloorPlanTimelineResult = {
  businessHours: BusinessHours | null;
  isClosed: boolean;
  openTimeLabel: string;
  closeTimeLabel: string;
  slots: FloorPlanTimelineSlot[];
  marks: FloorPlanTimelineMark[];
};

const TIMELINE_START_MINUTES = 8 * 60;
const TIMELINE_END_MINUTES = 24 * 60;

function parseDateOnly(dateValue: string) {
  const match = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getDayOfWeek(dateValue: string) {
  const date = parseDateOnly(dateValue);
  if (!date) {
    return null;
  }

  return dayNames[date.getDay()];
}

function formatMinutesToTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function getFloorPlanBusinessHours(businessId: string, dateValue: string) {
  const dayOfWeek = getDayOfWeek(dateValue);
  if (!dayOfWeek) {
    return null;
  }

  return getBusinessHours(businessId).find((entry) => entry.dayOfWeek === dayOfWeek) ?? null;
}

export function buildFloorPlanTimeline(
  businessHours: BusinessHours | null,
  slotDurationMinutes: number,
): FloorPlanTimelineResult {
  if (!businessHours || !businessHours.isOpen) {
    return {
      businessHours: businessHours ?? null,
      isClosed: true,
      openTimeLabel: "08:00",
      closeTimeLabel: "00:00",
      slots: [],
      marks: [],
    };
  }

  const step = Math.max(1, slotDurationMinutes || 30);

  const slots: FloorPlanTimelineSlot[] = [];
  for (let current = TIMELINE_START_MINUTES; current < TIMELINE_END_MINUTES; current += step) {
    slots.push({
      time: formatMinutesToTime(current),
      minutes: current,
    });
  }

  const marks = new Map<number, FloorPlanTimelineMark>();
  marks.set(TIMELINE_START_MINUTES, {
    time: formatMinutesToTime(TIMELINE_START_MINUTES),
    label: "08:00",
  });
  marks.set(TIMELINE_END_MINUTES, {
    time: "00:00",
    label: "00:00",
  });

  let nextMark = Math.ceil(TIMELINE_START_MINUTES / 60) * 60;
  if (nextMark === TIMELINE_START_MINUTES) {
    nextMark += 60;
  }

  for (; nextMark < TIMELINE_END_MINUTES; nextMark += 60) {
    marks.set(nextMark, {
      time: formatMinutesToTime(nextMark),
      label: formatMinutesToTime(nextMark),
    });
  }

  return {
    businessHours,
    isClosed: false,
    openTimeLabel: "08:00",
    closeTimeLabel: "00:00",
    slots,
    marks: [...marks.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, mark]) => mark),
  };
}
