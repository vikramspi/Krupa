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

// ─── Admin views ────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: number;
  createdAt: string;
  actorType: "customer" | "vendor" | "admin" | "system";
  actorLabel: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string;
}

export interface AdminOrderRow {
  code: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  vendor: { id: string; name: string };
  customer: { id: string | null; name: string; phone: string };
  area: string;
  pickup: { date: string; slotLabel: string };
  total: number;
  itemCount: number;
}

export interface AdminOrder extends VendorOrder {
  id: string;
  updatedAt: string;
  contactEmail: string | null;
  vendor: { id: string; name: string; phone: string };
  customerId: string | null;
  review: { rating: number; comment: string | null; isPublished: boolean } | null;
}

export interface AdminVendor {
  id: string;
  name: string;
  contactPhone: string;
  coverageAreas: string[];
  services: string[];
  turnaround: { minHours: number; maxHours: number };
  rating: number | null;
  isActive: boolean;
  priceMultiplier: number;
  pickupFee: number;
  latitude: number | null;
  longitude: number | null;
  acceptsSameDay: boolean;
  createdAt: string;
}

export interface AdminVendorSummary extends AdminVendor {
  openOrders: number;
  totalOrders: number;
  reviewAverage: number | null;
  reviewCount: number;
  logins: number;
}

export interface AdminVendorUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  hasPassword: boolean;
  invitePending: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminCustomerRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  emailVerified: boolean;
  google: boolean;
  createdAt: string;
  orderCount: number;
}

export interface AdminReview {
  id: string;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  createdAt: string;
  orderCode: string | null;
  vendor: { id: string; name: string };
  customer: { id: string; name: string | null };
}

export interface DashboardStats {
  ordersToday: number;
  awaitingPartner: number;
  staleAwaiting: number;
  inProgress: number;
  deliveredLast7Days: number;
  revenueLast7Days: number;
  customers: number;
  newCustomersLast7Days: number;
  activeVendors: number;
  totalVendors: number;
  reviewAverage: number | null;
  reviewCount: number;
}
