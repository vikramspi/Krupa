import type { OrderStatus } from "@/types";

export type ProgressStatus = Exclude<OrderStatus, "cancelled">;

export const ORDER_STATUS_SEQUENCE: ProgressStatus[] = [
  "placed",
  "vendor_assigned",
  "pickup_scheduled",
  "picked_up",
  "processing",
  "ready_for_delivery",
  "out_for_delivery",
  "delivered",
];

export type StatusTone = "neutral" | "info" | "progress" | "brand" | "success";

interface StatusMeta {
  label: string;
  /** Customer-facing explanation shown when this is the current status. */
  description: string;
  tone: StatusTone;
}

export const ORDER_STATUS_META: Record<ProgressStatus, StatusMeta> = {
  placed: {
    label: "Order placed",
    description: "We've sent your order to your laundry partner. They'll confirm it shortly.",
    tone: "info",
  },
  vendor_assigned: {
    label: "Vendor assigned",
    description: "Your laundry partner has accepted the order and is confirming your pickup slot.",
    tone: "info",
  },
  pickup_scheduled: {
    label: "Pickup scheduled",
    description: "A pickup executive will arrive during your selected slot. Keep your clothes ready in a bag.",
    tone: "info",
  },
  picked_up: {
    label: "Picked up",
    description: "Your clothes are on their way to the partner's facility for tagging and inspection.",
    tone: "progress",
  },
  processing: {
    label: "Processing",
    description: "Your laundry is being cleaned and finished with care.",
    tone: "progress",
  },
  ready_for_delivery: {
    label: "Ready for delivery",
    description: "Everything is cleaned, quality-checked and packed. Delivery will be assigned shortly.",
    tone: "progress",
  },
  out_for_delivery: {
    label: "Out for delivery",
    description: "Your fresh laundry is on its way back to you.",
    tone: "brand",
  },
  delivered: {
    label: "Delivered",
    description: "Your laundry has been delivered. Pay the partner by cash or UPI if you haven't already.",
    tone: "success",
  },
};

/** Not part of the happy-path sequence above. */
export const CANCELLED_META: StatusMeta = {
  label: "Cancelled",
  description: "This order was cancelled, so nothing will be collected and you won't be charged.",
  tone: "neutral",
};

export function statusMeta(status: OrderStatus): StatusMeta {
  return status === "cancelled" ? CANCELLED_META : ORDER_STATUS_META[status];
}

/** Position in the happy path; -1 for cancelled. */
export function statusIndex(status: OrderStatus): number {
  return status === "cancelled" ? -1 : ORDER_STATUS_SEQUENCE.indexOf(status);
}

export function isActiveOrder(status: OrderStatus): boolean {
  return status !== "delivered" && status !== "cancelled";
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  return ORDER_STATUS_SEQUENCE[statusIndex(status) + 1] ?? null;
}
