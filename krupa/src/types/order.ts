import type { ServiceCategory } from "./catalog";

export type OrderStatus =
  | "placed"
  | "vendor_assigned"
  | "pickup_scheduled"
  | "picked_up"
  | "processing"
  | "ready_for_delivery"
  | "out_for_delivery"
  | "delivered"
  /** Declined by the partner or cancelled by the operator. Terminal. */
  | "cancelled";

export interface OrderLine {
  itemId: string;
  name: string;
  category: ServiceCategory;
  unitPrice: number;
  quantity: number;
}

export interface PricingBreakdown {
  subtotal: number;
  pickupFee: number;
  /** Fee before any waiver, so the UI can show "₹49 → Free". */
  pickupFeeOriginal: number;
  discount: number;
  discountLabel: string | null;
  total: number;
  itemCount: number;
}

export interface ContactDetails {
  name: string;
  phone: string;
  email?: string;
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

export interface PickupSchedule {
  /** Local date key, yyyy-mm-dd. */
  date: string;
  slotId: string;
  slotLabel: string;
}

export interface StatusEvent {
  status: OrderStatus;
  /** ISO timestamp. */
  at: string;
  note?: string;
}

export interface OrderVendorSnapshot {
  id: string;
  name: string;
  phone: string;
  /** Null when the partner has no rating yet. */
  rating: number | null;
}

export interface Order {
  id: string;
  customerId: string | null;
  contact: ContactDetails;
  vendor: OrderVendorSnapshot;
  address: PickupAddress;
  pickup: PickupSchedule;
  lines: OrderLine[];
  pricing: PricingBreakdown;
  instructions?: string;
  status: OrderStatus;
  statusHistory: StatusEvent[];
  createdAt: string;
  /** ISO timestamps bounding the expected delivery window. */
  estimatedDelivery: { from: string; to: string };
  paymentMethod: "pay_on_delivery";
}

/** Payload for creating an order — mirrors a future `POST /orders` body. */
export interface CreateOrderInput {
  customerId: string | null;
  contact: ContactDetails;
  vendorId: string;
  address: PickupAddress;
  pickup: PickupSchedule;
  lines: Array<Pick<OrderLine, "itemId" | "quantity">>;
  instructions?: string;
  /** Hidden anti-bot field — always empty for real customers. */
  honeypot?: string;
  /** Total shown in the UI; the server compares it against its own and logs mismatches. */
  clientTotal?: number;
}
