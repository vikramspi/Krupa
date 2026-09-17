/** Errors that are safe to show a partner as-is. */
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "unavailable" | "validation" | "network" | "unauthorised",
    /** The API's own, more specific code, when there is one. */
    readonly apiCode?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export type OrderStatus =
  | "placed"
  | "vendor_assigned"
  | "pickup_scheduled"
  | "picked_up"
  | "processing"
  | "ready_for_delivery"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface StatusEvent {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface OrderLine {
  itemId: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
}

export interface PickupAddress {
  line1: string;
  line2: string;
  landmark?: string;
  areaId: string;
  areaName: string;
  pincode: string;
  city: string;
}

/** An order as the partner sees it. */
export interface VendorOrder {
  code: string;
  status: OrderStatus;
  createdAt: string;
  customer: { name: string; phone: string };
  address: PickupAddress;
  instructions: string | null;
  pickup: { date: string; slotId: string; slotLabel: string };
  estimatedDelivery: { from: string | null; to: string | null };
  items: OrderLine[];
  pricing: { subtotal: number; pickupFee: number; discount: number; total: number; itemCount: number };
  history: StatusEvent[];
}

export interface VendorSessionUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vendor: { id: string; name: string; isActive: boolean };
}
