import "server-only";
import type { OrderStatus, StatusEvent, VendorOrder } from "@/types";

/** What a partner may do next with an order, from its current status. */
export type OrderAction =
  | { type: "accept" }
  | { type: "decline" }
  | { type: "advance"; to: OrderStatus };

const ADVANCE: Partial<Record<OrderStatus, OrderStatus>> = {
  vendor_assigned: "pickup_scheduled",
  pickup_scheduled: "picked_up",
  picked_up: "processing",
  processing: "ready_for_delivery",
  ready_for_delivery: "out_for_delivery",
  out_for_delivery: "delivered",
};

export function nextAdvance(status: OrderStatus): OrderStatus | null {
  return ADVANCE[status] ?? null;
}

export function allowedActions(status: OrderStatus): OrderAction["type"][] {
  if (status === "placed") return ["accept", "decline"];
  return nextAdvance(status) ? ["advance"] : [];
}

/** Customer-facing notes, shown on the tracking page timeline. */
const ADVANCE_NOTES: Partial<Record<OrderStatus, string>> = {
  picked_up: "Collected from your door",
  processing: "Cleaning in progress",
  ready_for_delivery: "Cleaned, checked and packed",
  out_for_delivery: "On the way back to you",
  delivered: "Delivered",
};

/** The status and history entries an action produces. */
export function applyAction(
  order: VendorOrder,
  action: "accept" | "decline" | "advance",
  vendorName: string,
  reason: string | null,
  now = new Date(),
): { to: OrderStatus; events: StatusEvent[] } | null {
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString();
  if (action === "accept" && order.status === "placed") {
    return {
      to: "pickup_scheduled",
      events: [
        { status: "vendor_assigned", at: at(0), note: `${vendorName} accepted your order` },
        { status: "pickup_scheduled", at: at(1), note: order.pickup.slotLabel },
      ],
    };
  }
  if (action === "decline" && order.status === "placed" && reason) {
    return { to: "cancelled", events: [{ status: "cancelled", at: at(0), note: `${vendorName} couldn't take this order: ${reason}` }] };
  }
  if (action === "advance") {
    const to = nextAdvance(order.status);
    if (!to) return null;
    return { to, events: [{ status: to, at: at(0), note: ADVANCE_NOTES[to] }] };
  }
  return null;
}

export const DECLINE_REASONS = [
  "Fully booked for this pickup time",
  "Can't reach this area on that day",
  "We don't handle one or more of these items",
  "Shop closed on that day",
] as const;
