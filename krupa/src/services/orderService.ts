/**
 * orderService — placing, fetching and tracking orders.
 *
 * Postgres is the source of truth; nothing about a placed order is kept in the
 * browser. Every call is scoped server-side to the session's verified phone.
 *
 *   createOrder(input)              → POST /api/orders          (requires a verified session)
 *   getOrder(orderId)               → GET  /api/orders/{code}   (must belong to the session)
 *   lookupOrder(orderId, phone)     → POST /api/orders/lookup   (guest tracking)
 *   getCustomerOrders()             → GET  /api/orders
 *   getOrderReview(orderId)         → GET  /api/orders/{code}/review
 *   saveOrderReview(orderId, input) → PUT  /api/orders/{code}/review
 */
import { demoMode } from "@/lib/config";
import { normalizeOrderId, normalizePhone } from "@/lib/validation";
import { ServiceError, type CreateOrderInput, type Order, type OrderReview } from "@/types";
import { apiRequest } from "./apiClient";

/**
 * Demo scenario (demo mode only): the first attempt with this number fails, so the
 * "couldn't place your order" state and retry can be demonstrated.
 */
export const DEMO_FAILURE_PHONE = "9999999999";
const failedOnce = new Set<string>();

export const orderService = {
  async createOrder(input: CreateOrderInput): Promise<Order> {
    const phone = normalizePhone(input.contact.phone);
    if (demoMode && phone === DEMO_FAILURE_PHONE && !failedOnce.has(phone)) {
      failedOnce.add(phone);
      throw new ServiceError("We couldn't place your order. Please try again.", "network");
    }

    const { order } = await apiRequest<{ order: Order }>("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        vendorId: input.vendorId,
        contact: { ...input.contact, phone },
        address: input.address,
        pickup: { date: input.pickup.date, slotId: input.pickup.slotId },
        lines: input.lines.filter((line) => line.quantity > 0),
        instructions: input.instructions,
        website: input.honeypot ?? "",
        clientTotal: input.clientTotal,
      }),
    });
    return order;
  },

  async getOrder(orderId: string): Promise<Order> {
    const { order } = await apiRequest<{ order: Order }>(`/api/orders/${encodeURIComponent(normalizeOrderId(orderId))}`);
    return order;
  },

  async lookupOrder(orderId: string, phone: string): Promise<Order> {
    const { order } = await apiRequest<{ order: Order }>("/api/orders/lookup", {
      method: "POST",
      body: JSON.stringify({ orderCode: normalizeOrderId(orderId), phone: normalizePhone(phone) }),
    });
    return order;
  },

  async getOrderReview(orderId: string): Promise<{ review: OrderReview | null; canReview: boolean }> {
    return apiRequest(`/api/orders/${encodeURIComponent(normalizeOrderId(orderId))}/review`);
  },

  async saveOrderReview(orderId: string, input: { rating: number; comment: string }): Promise<OrderReview> {
    const { review } = await apiRequest<{ review: OrderReview }>(
      `/api/orders/${encodeURIComponent(normalizeOrderId(orderId))}/review`,
      { method: "PUT", body: JSON.stringify(input) },
    );
    return review;
  },

  async getCustomerOrders(): Promise<Order[]> {
    const { orders } = await apiRequest<{ orders: Order[] }>("/api/orders");
    return orders;
  },
};
