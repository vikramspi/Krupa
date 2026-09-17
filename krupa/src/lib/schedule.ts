import type { OrderLine, PickupSlot, SlotAvailability, Vendor } from "@/types";
import { addDays, atMumbaiHour, formatDayMonth, formatShortDate, formatWeekday, mumbaiHour, toDateKey } from "./format";

export interface PickupSlotTemplate {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
}

export const PICKUP_SLOT_TEMPLATES: PickupSlotTemplate[] = [
  { id: "slot-0900", label: "9:00 – 11:00 AM", startHour: 9, endHour: 11 },
  { id: "slot-1100", label: "11:00 AM – 1:00 PM", startHour: 11, endHour: 13 },
  { id: "slot-1400", label: "2:00 – 4:00 PM", startHour: 14, endHour: 16 },
  { id: "slot-1700", label: "5:00 – 7:00 PM", startHour: 17, endHour: 19 },
];

/** Slots starting within this many hours of now can no longer be booked. */
const BOOKING_CUTOFF_HOURS = 1;

export interface PickupDateOption {
  key: string;
  label: string;
  sublabel: string;
}

export function getPickupDateOptions(now: Date = new Date(), days = 5): PickupDateOption[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(now, i);
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatWeekday(date);
    const sublabel = formatDayMonth(date);
    return { key: toDateKey(date), label, sublabel };
  });
}

/**
 * Slots for one partner on one day.
 *
 * There is no capacity data yet, so every future slot is open. A slot closes when
 * it starts within the booking cut-off, and same-day slots are closed for partners
 * that don't take same-day pickups. (`limited` / `full` are reserved for real
 * capacity once partners report it.) Times are Mumbai time wherever this runs.
 */
export function buildPickupSlots(
  vendor: Pick<Vendor, "id" | "acceptsSameDay">,
  dateKey: string,
  now: Date = new Date(),
): PickupSlot[] {
  const isToday = dateKey === toDateKey(now);
  const currentHour = mumbaiHour(now);

  return PICKUP_SLOT_TEMPLATES.map((template): PickupSlot => {
    let availability: SlotAvailability = "available";
    if (isToday && template.startHour - BOOKING_CUTOFF_HOURS < currentHour) availability = "past";
    else if (isToday && !vendor.acceptsSameDay) availability = "full";
    return { ...template, availability };
  });
}

/** True when this partner still has a bookable slot today. */
export function hasPickupToday(vendor: Pick<Vendor, "id" | "acceptsSameDay">, now: Date = new Date()): boolean {
  return buildPickupSlots(vendor, toDateKey(now), now).some(isSlotBookable);
}

export function isSlotBookable(slot: PickupSlot): boolean {
  return slot.availability === "available" || slot.availability === "limited";
}

export function getSlotTemplate(slotId: string): PickupSlotTemplate | undefined {
  return PICKUP_SLOT_TEMPLATES.find((s) => s.id === slotId);
}

/** Specialty items (dry cleaning, premium) need an extra day on top of the partner's usual turnaround. */
export function effectiveTurnaround(
  vendor: Pick<Vendor, "turnaroundHours">,
  lines: Array<Pick<OrderLine, "category">>,
): { min: number; max: number } {
  const hasSpecialty = lines.some((line) => line.category === "specialty");
  const extra = hasSpecialty && vendor.turnaroundHours.max < 72 ? 24 : 0;
  return { min: vendor.turnaroundHours.min + extra, max: vendor.turnaroundHours.max + extra };
}

/** Delivery window measured from the end of the pickup slot. */
export function estimateDeliveryWindow(
  pickupDateKey: string,
  slotId: string,
  turnaround: { min: number; max: number },
): { from: Date; to: Date } {
  const slot = getSlotTemplate(slotId) ?? PICKUP_SLOT_TEMPLATES[0];
  const pickupEnd = atMumbaiHour(pickupDateKey, slot.endHour);
  const from = new Date(pickupEnd.getTime() + turnaround.min * 3_600_000);
  const to = new Date(pickupEnd.getTime() + turnaround.max * 3_600_000);
  return { from, to };
}

/** "Sat, 12 Sep – Sun, 13 Sep" (or a single day when both fall on the same date). */
export function formatDeliveryWindow(from: Date | string, to: Date | string): string {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  return toDateKey(a) === toDateKey(b) ? formatShortDate(a) : `${formatShortDate(a)} – ${formatShortDate(b)}`;
}
