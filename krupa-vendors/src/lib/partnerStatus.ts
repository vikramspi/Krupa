import type { OrderStatus } from "@/types";

/** Status wording for partners (the customer site words these for customers). */
export const PARTNER_STATUS: Record<OrderStatus, { label: string; tone: "neutral" | "info" | "warning" | "brand" | "success" }> = {
  placed: { label: "New — needs your response", tone: "warning" },
  vendor_assigned: { label: "Accepted", tone: "info" },
  pickup_scheduled: { label: "Pickup scheduled", tone: "info" },
  picked_up: { label: "Picked up", tone: "brand" },
  processing: { label: "Processing", tone: "brand" },
  ready_for_delivery: { label: "Ready for delivery", tone: "brand" },
  out_for_delivery: { label: "Out for delivery", tone: "brand" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/** Label for the button that moves an order to `next`. */
export const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  pickup_scheduled: "Confirm pickup slot",
  picked_up: "Mark as picked up",
  processing: "Start processing",
  ready_for_delivery: "Mark ready for delivery",
  out_for_delivery: "Mark out for delivery",
  delivered: "Mark as delivered",
};
