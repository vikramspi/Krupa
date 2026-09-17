import type { OrderStatus } from "@/types";

export const ADMIN_STATUS: Record<OrderStatus, { label: string; tone: "neutral" | "info" | "warning" | "brand" | "success" }> = {
  placed: { label: "Awaiting partner", tone: "warning" },
  vendor_assigned: { label: "Partner accepted", tone: "info" },
  pickup_scheduled: { label: "Pickup scheduled", tone: "info" },
  picked_up: { label: "Picked up", tone: "brand" },
  processing: { label: "Processing", tone: "brand" },
  ready_for_delivery: { label: "Ready for delivery", tone: "brand" },
  out_for_delivery: { label: "Out for delivery", tone: "brand" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const ALL_STATUSES = Object.keys(ADMIN_STATUS) as OrderStatus[];
